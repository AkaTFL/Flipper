import test from 'node:test';
import assert from 'node:assert/strict';

import { DmdDisplay } from '../../frontend/dmd/DmdDisplay.js';

function createFakeElement(tagName) {
  return {
    tagName,
    children: [],
    style: {},
    textContent: '',
    attributes: {},
    parentNode: null,
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    }
  };
}

function createFakeDocument() {
  const body = createFakeElement('body');
  return {
    body,
    createElement(tagName) {
      return createFakeElement(tagName);
    }
  };
}

test('DmdDisplay mounts the small DMD screen with default content', () => {
  const documentRef = createFakeDocument();
  const display = new DmdDisplay({ documentRef, eventTarget: null });

  display.mount();

  assert.equal(documentRef.body.children.length, 1);
  assert.equal(display.lines[0].textContent, 'SCORE 0');
  assert.equal(display.lines[1].textContent, 'SÉRIE +0              MULT x1');
  assert.equal(display.lines[2].textContent, 'BALLES --');
  assert.equal(display.lines[3].textContent, '');
});

test('DmdDisplay updates score and balls on the summary screen', () => {
  const documentRef = createFakeDocument();
  const display = new DmdDisplay({ documentRef, eventTarget: null });
  display.mount();

  display.handleBackendEvent({
    type: 'score_update',
    payload: { score: 12500, comboMultiplier: 2, comboCount: 2, delta: 600 }
  });
  display.handleBackendEvent({
    type: 'player_state_update',
    payload: { hp: 100, maxHp: 100, balls: 3, maxBalls: 3, gameOver: false }
  });
  display.handleBackendEvent({
    type: 'quest_update',
    payload: { completedCount: 1, requiredCount: 3, activeQuests: [] }
  });

  assert.equal(display.lines[0].textContent, 'SCORE 12 500');
  assert.equal(display.lines[1].textContent, 'SÉRIE +600            MULT x2');
  assert.equal(display.lines[2].textContent, 'BALLES 3/3');
  assert.equal(display.lines[3].textContent, '');
});

test('DmdDisplay accumulates points during the same combo sequence', () => {
  const documentRef = createFakeDocument();
  const display = new DmdDisplay({ documentRef, eventTarget: null });
  display.mount();

  display.handleBackendEvent({
    type: 'score_update',
    payload: { score: 300, comboMultiplier: 1, comboCount: 1, delta: 300 }
  });
  assert.equal(display.lines[1].textContent, 'SÉRIE +300            MULT x1');

  display.handleBackendEvent({
    type: 'score_update',
    payload: { score: 700, comboMultiplier: 2, comboCount: 2, delta: 400 }
  });
  assert.equal(display.lines[1].textContent, 'SÉRIE +700            MULT x2');

  display.handleBackendEvent({
    type: 'score_update',
    payload: { score: 1800, comboMultiplier: 4, comboCount: 5, delta: 1100 }
  });
  assert.equal(display.lines[1].textContent, 'SÉRIE +1 800          MULT x4');

  display.handleBackendEvent({
    type: 'score_update',
    payload: { score: 1850, comboMultiplier: 1, comboCount: 1, delta: 50 }
  });
  assert.equal(display.lines[1].textContent, 'SÉRIE +50             MULT x1');
});

test('DmdDisplay clears the combo sequence when the combo timer expires', async () => {
  const documentRef = createFakeDocument();
  const display = new DmdDisplay({ documentRef, eventTarget: null, comboResetMs: 10 });
  display.mount();

  display.handleBackendEvent({
    type: 'score_update',
    payload: { score: 60000, comboMultiplier: 4, comboCount: 8, delta: 1100 }
  });
  assert.equal(display.lines[1].textContent, 'SÉRIE +1 100          MULT x4');

  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.equal(display.lines[1].textContent, 'SÉRIE +0              MULT x1');
});

test('DmdDisplay can show the list of three quests before the boss', () => {
  const documentRef = createFakeDocument();
  const display = new DmdDisplay({ documentRef, eventTarget: null });
  display.mount();

  display.handleBackendEvent({
    type: 'quest_update',
    payload: {
      completedCount: 1,
      requiredCount: 3,
      activeQuests: [
        { id: 'score_2000', label: 'Atteindre 2 000 points', progress: 2000, target: 2000, completed: true },
        { id: 'ramp_perfect_1', label: 'Réussir 1 rampe parfaite', progress: 0, target: 1, completed: false },
        { id: 'survive_20s', label: 'Survivre 20 secondes avec la même bille', progress: 8, target: 20, completed: false }
      ]
    }
  });

  display.currentScreen = 1;
  display.render();

  assert.equal(display.lines[0].textContent, 'QUÊTES 1/3');
  assert.equal(display.lines[1].textContent, '✓ Points 2000/2000');
  assert.equal(display.lines[2].textContent, '- Rampe parfaite 0/1');
  assert.equal(display.lines[3].textContent, '- Survivre 20s 8/20s');
});

test('DmdDisplay counts survival seconds locally while waiting for backend updates', async () => {
  const documentRef = createFakeDocument();
  const display = new DmdDisplay({ documentRef, eventTarget: null });
  display.mount();

  display.handleBackendEvent({
    type: 'quest_update',
    payload: {
      completedCount: 0,
      requiredCount: 3,
      activeQuests: [
        { id: 'survive_20s', label: 'Survivre 20 secondes avec la même bille', progress: 8, target: 20, completed: false }
      ]
    }
  });

  display.currentScreen = 1;
  display.render();
  assert.equal(display.lines[1].textContent, '- Survivre 20s 8/20s');

  display.survivalStartedAt = Date.now() - 2000;
  display.updateLocalSurvivalQuest();
  assert.equal(display.lines[1].textContent, '- Survivre 20s 10/20s');
});

test('DmdDisplay completes survival quest when local timer reaches target', () => {
  const documentRef = createFakeDocument();
  const display = new DmdDisplay({ documentRef, eventTarget: null });
  display.mount();

  display.handleBackendEvent({
    type: 'quest_update',
    payload: {
      completedCount: 2,
      requiredCount: 3,
      activeQuests: [
        { id: 'score_2000', label: 'Atteindre 2 000 points', progress: 2000, target: 2000, completed: true },
        { id: 'ramp_perfect_1', label: 'Réussir 1 rampe parfaite', progress: 1, target: 1, completed: true },
        { id: 'survive_20s', label: 'Survivre 20 secondes avec la même bille', progress: 18, target: 20, completed: false }
      ]
    }
  });

  display.currentScreen = 1;
  display.survivalStartedAt = Date.now() - 2000;
  display.updateLocalSurvivalQuest();

  assert.equal(display.lines[0].textContent, 'QUÊTES 3/3');
  assert.equal(display.lines[3].textContent, '✓ Survivre 20s 20/20s');
});

test('DmdDisplay keeps completed survival quest when a late backend update has lower progress', () => {
  const documentRef = createFakeDocument();
  const display = new DmdDisplay({ documentRef, eventTarget: null });
  display.mount();

  display.handleBackendEvent({
    type: 'quest_update',
    payload: {
      completedCount: 2,
      requiredCount: 3,
      activeQuests: [
        { id: 'score_2000', label: 'Atteindre 2 000 points', progress: 2000, target: 2000, completed: true },
        { id: 'ramp_perfect_1', label: 'Réussir 1 rampe parfaite', progress: 1, target: 1, completed: true },
        { id: 'survive_20s', label: 'Survivre 20 secondes avec la même bille', progress: 18, target: 20, completed: false }
      ]
    }
  });

  display.currentScreen = 1;
  display.survivalStartedAt = Date.now() - 2000;
  display.updateLocalSurvivalQuest();

  display.handleBackendEvent({
    type: 'quest_update',
    payload: {
      completedCount: 2,
      requiredCount: 3,
      activeQuests: [
        { id: 'score_2000', label: 'Atteindre 2 000 points', progress: 2000, target: 2000, completed: true },
        { id: 'ramp_perfect_1', label: 'Réussir 1 rampe parfaite', progress: 1, target: 1, completed: true },
        { id: 'survive_20s', label: 'Survivre 20 secondes avec la même bille', progress: 18, target: 20, completed: false }
      ]
    }
  });

  assert.equal(display.lines[0].textContent, 'QUÊTES 3/3');
  assert.equal(display.lines[3].textContent, '✓ Survivre 20s 20/20s');
});

test('DmdDisplay resets survival quest when the player loses a ball', () => {
  const documentRef = createFakeDocument();
  const display = new DmdDisplay({ documentRef, eventTarget: null });
  display.mount();

  display.handleBackendEvent({
    type: 'quest_update',
    payload: {
      completedCount: 0,
      requiredCount: 3,
      activeQuests: [
        { id: 'survive_20s', label: 'Survivre 20 secondes avec la même bille', progress: 12, target: 20, completed: false }
      ]
    }
  });

  display.currentScreen = 1;
  display.render();
  assert.equal(display.lines[1].textContent, '- Survivre 20s 12/20s');

  display.handleBackendEvent({
    type: 'player_state_update',
    payload: { hp: 100, maxHp: 100, balls: 2, maxBalls: 3, lastBallLost: true, gameOver: false }
  });

  assert.equal(display.lines[1].textContent, '- Survivre 20s 0/20s');
});

test('DmdDisplay does not restart survival timer on repeated quest updates', () => {
  const documentRef = createFakeDocument();
  const display = new DmdDisplay({ documentRef, eventTarget: null });
  display.mount();

  display.handleBackendEvent({
    type: 'quest_update',
    payload: {
      completedCount: 0,
      requiredCount: 3,
      activeQuests: [
        { id: 'survive_20s', label: 'Survivre 20 secondes avec la même bille', progress: 0, target: 20, completed: false }
      ]
    }
  });

  const firstStart = display.survivalStartedAt;

  display.handleBackendEvent({
    type: 'quest_update',
    payload: {
      completedCount: 0,
      requiredCount: 3,
      activeQuests: [
        { id: 'survive_20s', label: 'Survivre 20 secondes avec la même bille', progress: 0, target: 20, completed: false }
      ]
    }
  });

  assert.equal(display.survivalStartedAt, firstStart);
});

test('DmdDisplay keeps MULT aligned when serie points changes', () => {
  const documentRef = createFakeDocument();
  const display = new DmdDisplay({ documentRef, eventTarget: null });
  display.mount();

  display.handleBackendEvent({
    type: 'score_update',
    payload: { score: 600, comboMultiplier: 2, comboCount: 2, delta: 600 }
  });
  const smallSerieLine = display.lines[1].textContent;

  display.handleBackendEvent({
    type: 'score_update',
    payload: { score: 60600, comboMultiplier: 4, comboCount: 8, delta: 60000 }
  });
  const bigSerieLine = display.lines[1].textContent;

  assert.equal(smallSerieLine.indexOf('MULT'), bigSerieLine.indexOf('MULT'));
});

test('DmdDisplay stops on boss screen when the boss is active', () => {
  const documentRef = createFakeDocument();
  const display = new DmdDisplay({ documentRef, eventTarget: null });
  display.mount();

  display.handleBackendEvent({
    type: 'score_update',
    payload: { score: 18400, comboMultiplier: 3, comboCount: 3, delta: 900 }
  });
  display.handleBackendEvent({
    type: 'player_state_update',
    payload: { hp: 80, maxHp: 100, balls: 2, maxBalls: 3, gameOver: false }
  });
  display.handleBackendEvent({
    type: 'boss_state_update',
    payload: { active: true, hp: 750, maxHp: 1000 }
  });

  assert.equal(display.lines[0].textContent, 'SCORE 18 400');
  assert.equal(display.lines[1].textContent, 'LE BOSS ARRIVE !');
  assert.equal(display.lines[2].textContent, 'BOSS 750/1000');
  assert.equal(display.lines[3].textContent, 'JOUEUR 80/100  BALLES 2/3');
});

test('DmdDisplay shows inflicted boss damage after arrival message', () => {
  const documentRef = createFakeDocument();
  const display = new DmdDisplay({ documentRef, eventTarget: null });
  display.mount();

  display.handleBackendEvent({
    type: 'boss_state_update',
    payload: { active: true, hp: 900, maxHp: 1000 }
  });

  display.bossArrivalUntil = 0;
  display.handleBackendEvent({
    type: 'boss_state_update',
    payload: { active: true, hp: 850, maxHp: 1000, damageTaken: 50, mode: 'score_damage' }
  });

  assert.equal(display.lines[1].textContent, 'DÉGÂTS +50');
  assert.equal(display.lines[2].textContent, 'BOSS 850/1000');
});

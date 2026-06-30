import test from 'node:test';
import assert from 'node:assert/strict';

import { ScoreDisplay } from '../../frontend/playfield/ui/ScoreDisplay.js';

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

test('ScoreDisplay mounts with default values', () => {
  const documentRef = createFakeDocument();
  const display = new ScoreDisplay({ documentRef, eventTarget: null });

  const mounted = display.mount();

  assert.equal(mounted, display.container);
  assert.equal(documentRef.body.children.length, 3);
  assert.equal(display.scoreValue.textContent, '0');
  assert.equal(display.comboValue.textContent, 'Combo x1');
  assert.equal(display.deltaValue.textContent, '+0');
  assert.equal(display.detailValue.textContent, 'En attente des impacts');
  assert.equal(display.bossValue.textContent, 'Boss: en attente');
  assert.equal(display.bossDetailValue.textContent, 'Dégâts boss: --');
  assert.equal(display.playerValue.textContent, 'Joueur: en attente');
  assert.equal(display.playerBallsValue.textContent, 'Balles: --');
  assert.equal(display.playerDetailValue.textContent, 'État joueur: --');
  assert.equal(display.questValue.textContent, 'Quêtes: en attente');
  assert.equal(display.controlsContainer.children[0].textContent, 'CONTRÔLES');
  assert.equal(display.saveContainer.children[0].textContent, 'SAUVEGARDES');
});

test('ScoreDisplay updates player state when receiving player_state_update', () => {
  const documentRef = createFakeDocument();
  const display = new ScoreDisplay({ documentRef, eventTarget: null });
  display.mount();

  const handled = display.handleBackendEvent({
    type: 'player_state_update',
    payload: {
      hp: 80,
      maxHp: 100,
      balls: 3,
      maxBalls: 3,
      lastDamageTaken: 20,
      lastBallLost: false,
      gameOver: false
    }
  });

  assert.equal(handled, true);
  assert.equal(display.playerValue.textContent, 'Joueur: 80/100 HP');
  assert.equal(display.playerBallsValue.textContent, 'Balles: 3/3');
  assert.equal(display.playerDetailValue.textContent, 'Derniers dégâts joueur: -20');
});

test('ScoreDisplay updates its fields when receiving score_update', () => {
  const documentRef = createFakeDocument();
  const display = new ScoreDisplay({ documentRef, eventTarget: null });
  display.mount();

  const handled = display.handleBackendEvent({
    type: 'score_update',
    payload: {
      score: 1525,
      delta: 225,
      comboMultiplier: 3,
      comboCount: 3,
      objectType: 'launching_ramp_rail'
    }
  });

  assert.equal(handled, true);
  assert.equal(display.scoreValue.textContent, new Intl.NumberFormat('fr-FR').format(1525));
  assert.equal(display.comboValue.textContent, 'Combo x3');
  assert.equal(display.deltaValue.textContent, '+225');
  assert.equal(display.detailValue.textContent, 'Dernier impact: launching_ramp_rail');
});

test('ScoreDisplay updates quest state when receiving quest_update', () => {
  const documentRef = createFakeDocument();
  const display = new ScoreDisplay({ documentRef, eventTarget: null });
  display.mount();

  const handled = display.handleBackendEvent({
    type: 'quest_update',
    payload: {
      completedCount: 1,
      requiredCount: 3,
      allCompleted: false,
      activeQuests: [
        {
          id: 'score_2000',
          label: 'Atteindre 2 000 points',
          target: 2000,
          progress: 2000,
          completed: true
        }
      ]
    }
  });

  assert.equal(handled, true);
  assert.equal(display.questValue.textContent.includes('Quêtes: 1/3'), true);
  assert.equal(display.questValue.textContent.includes('✓ Atteindre 2 000 points: 2000/2000'), true);
});

test('ScoreDisplay updates boss state when receiving boss_state_update', () => {
  const documentRef = createFakeDocument();
  const display = new ScoreDisplay({ documentRef, eventTarget: null });
  display.mount();

  const handled = display.handleBackendEvent({
    type: 'boss_state_update',
    payload: {
      active: true,
      hp: 845,
      maxHp: 1000,
      damageTaken: 75,
      defeated: false
    }
  });

  assert.equal(handled, true);
  assert.equal(display.bossValue.textContent, 'Boss: 845/1000 (actif)');
  assert.equal(display.bossDetailValue.textContent, 'Derniers dégâts boss: -75');
});

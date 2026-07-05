import test from 'node:test';
import assert from 'node:assert/strict';

import { BackglassDisplay } from '../../frontend/backglass/js/BackglassDisplay.js';

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
    },
    getElementById(id) {
      return null;
    },
    querySelectorAll() {
      return [];
    }
  };
}

test('BackglassDisplay mounts with the default empty state', () => {
  const documentRef = createFakeDocument();
  const display = new BackglassDisplay({ documentRef, backendUrl: null });

  assert.equal(display.container, null);
  assert.equal(display.lastMessage, null);
  assert.equal(display.players[1].score, 0);
  assert.equal(display.comboState.multiplier, 1);
  assert.equal(display.questState.activeQuests.length, 0);
  assert.equal(display.bossState.active, false);
});

test('BackglassDisplay updates player state when receiving player_state_update', () => {
  const documentRef = createFakeDocument();
  const display = new BackglassDisplay({ documentRef, backendUrl: null });

  const handled = display.handleBackendMessage(JSON.stringify({
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
  }));

  assert.equal(handled.type, 'player_state_update');
  assert.equal(display.players[1].balls, 3);
});

test('BackglassDisplay updates its combo state when receiving score_update', () => {
  const documentRef = createFakeDocument();
  const display = new BackglassDisplay({ documentRef, backendUrl: null });

  const handled = display.handleBackendMessage(JSON.stringify({
    type: 'score_update',
    payload: {
      score: 1525,
      delta: 225,
      comboMultiplier: 3,
      comboCount: 3,
      objectType: 'launching_ramp_rail'
    }
  }));

  assert.equal(handled.type, 'score_update');
  assert.equal(display.comboState.score, 1525);
  assert.equal(display.comboState.multiplier, 3);
  assert.equal(display.comboState.comboCount, 3);
});

test('BackglassDisplay updates quest state when receiving quest_update', () => {
  const documentRef = createFakeDocument();
  const display = new BackglassDisplay({ documentRef, backendUrl: null });

  const handled = display.handleBackendMessage(JSON.stringify({
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
  }));

  assert.equal(handled.type, 'quest_update');
  assert.equal(display.questState.completedCount, 1);
  assert.equal(display.questState.requiredCount, 3);
  assert.equal(display.questState.activeQuests.length, 1);
});

test('BackglassDisplay updates boss state when receiving boss_state_update', () => {
  const documentRef = createFakeDocument();
  const display = new BackglassDisplay({ documentRef, backendUrl: null });

  const handled = display.handleBackendMessage(JSON.stringify({
    type: 'boss_state_update',
    payload: {
      active: true,
      hp: 845,
      maxHp: 1000,
      damageTaken: 75,
      defeated: false
    }
  }));

  assert.equal(handled.type, 'boss_state_update');
  assert.equal(display.bossState.hp, 845);
  assert.equal(display.bossState.maxHp, 1000);
  assert.equal(display.bossState.damageTaken, 75);
});

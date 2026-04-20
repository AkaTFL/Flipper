import test from 'node:test';
import assert from 'node:assert/strict';

import { ScoreDisplay } from '../../frontend/ui/ScoreDisplay.js';

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
  assert.equal(documentRef.body.children.length, 1);
  assert.equal(display.scoreValue.textContent, '0');
  assert.equal(display.comboValue.textContent, 'Combo x1');
  assert.equal(display.deltaValue.textContent, '+0');
  assert.equal(display.detailValue.textContent, 'En attente des impacts');
  assert.equal(display.bossValue.textContent, 'Boss: en attente');
  assert.equal(display.bossDetailValue.textContent, 'Dégâts boss: --');
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

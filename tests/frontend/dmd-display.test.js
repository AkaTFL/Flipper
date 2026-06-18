import test from 'node:test';
import assert from 'node:assert/strict';

import { DmdDisplay } from '../../frontend/dmd/DmdDisplay.js';

function createFakeElement(tagName) {
  return {
    tagName,
    children: [],
    style: {},
    textContent: '',
    className: '',
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
  const score = createFakeElement('div');
  return {
    score,
    createElement(tagName) {
      return createFakeElement(tagName);
    },
    getElementById(id) {
      return id === 'score' ? score : null;
    }
  };
}

test('DmdDisplay affiche le score par défaut', () => {
  const documentRef = createFakeDocument();
  const display = new DmdDisplay({ documentRef, backendUrl: null });

  assert.equal(display.titleEl.textContent, 'SCORE');
  assert.equal(display.mainEl.textContent, '0');
  assert.equal(display.subEl.textContent, 'BALLES --');
});

test('DmdDisplay affiche les points gagnés après un impact simple', () => {
  const documentRef = createFakeDocument();
  const display = new DmdDisplay({ documentRef, backendUrl: null });

  display.handleBackendEvent({
    type: 'score_update',
    payload: { score: 12500, comboMultiplier: 1, comboCount: 1, delta: 600 }
  });

  assert.equal(display.rootEl.className, 'dmd-screen dmd-points dmd-multiplier-1');
  assert.equal(display.titleEl.textContent, 'POINTS');
  assert.equal(display.mainEl.textContent, '+600');
  assert.equal(display.subEl.textContent, 'SCORE 12 500');
});

test('DmdDisplay affiche le combo quand le multiplicateur augmente', () => {
  const documentRef = createFakeDocument();
  const display = new DmdDisplay({ documentRef, backendUrl: null });

  display.handleBackendEvent({
    type: 'score_update',
    payload: { score: 1800, comboMultiplier: 2, comboCount: 2, delta: 400 }
  });

  assert.equal(display.rootEl.className, 'dmd-screen dmd-combo dmd-multiplier-2');
  assert.equal(display.titleEl.textContent, 'COMBO x2');
  assert.equal(display.mainEl.textContent, '+400');
  assert.equal(display.subEl.textContent, 'SCORE 1 800');
});

test('DmdDisplay affiche une séquence spéciale pour un gros multiplicateur', () => {
  const documentRef = createFakeDocument();
  const display = new DmdDisplay({ documentRef, backendUrl: null });

  display.handleBackendEvent({
    type: 'score_update',
    payload: { score: 60600, comboMultiplier: 4, comboCount: 8, delta: 60000 }
  });

  assert.equal(display.rootEl.className, 'dmd-screen dmd-super-combo dmd-multiplier-4');
  assert.equal(display.titleEl.textContent, 'SUPER COMBO');
  assert.equal(display.mainEl.textContent, 'x4');
  assert.equal(display.subEl.textContent, '+60 000  SCORE 60 600');
});

test('DmdDisplay revient au score et affiche le nombre de balles', () => {
  const documentRef = createFakeDocument();
  const display = new DmdDisplay({ documentRef, backendUrl: null, feedbackMs: 10 });

  display.handleBackendEvent({
    type: 'player_state_update',
    payload: { balls: 2, maxBalls: 3 }
  });
  display.handleBackendEvent({
    type: 'score_update',
    payload: { score: 700, comboMultiplier: 1, comboCount: 1, delta: 0 }
  });

  assert.equal(display.rootEl.className, 'dmd-screen dmd-score dmd-multiplier-1');
  assert.equal(display.titleEl.textContent, 'SCORE');
  assert.equal(display.mainEl.textContent, '700');
  assert.equal(display.subEl.textContent, 'BALLES 2/3');
});

test('DmdDisplay conserve la couleur du multiplicateur sur le score', () => {
  const documentRef = createFakeDocument();
  const display = new DmdDisplay({ documentRef, backendUrl: null, feedbackMs: 10 });

  display.handleBackendEvent({
    type: 'score_update',
    payload: { score: 4500, comboMultiplier: 3, comboCount: 5, delta: 900 }
  });
  display.state.mode = 'score';
  display.render();

  assert.equal(display.rootEl.className, 'dmd-screen dmd-score dmd-multiplier-3');
  assert.equal(display.mainEl.textContent, '4 500');
});

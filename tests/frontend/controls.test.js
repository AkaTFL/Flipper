import test from 'node:test';
import assert from 'node:assert/strict';

// Controls instantiates Objects which creates an AudioManager that calls new Audio()
if (typeof globalThis.Audio !== 'function') {
  globalThis.Audio = class {
    constructor() { this.currentTime = 0; this.preload = 'auto'; this.volume = 1; }
    play() { return Promise.resolve(); }
  };
}

import { Controls } from '../../frontend/flipper/core/Controls.js';

function createWindowStub() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(type, handler) {
      listeners.set(type, handler);
    }
  };
}

test('Controls triggers start_game callback on first launch impulse', () => {
  const previousWindow = globalThis.window;
  const previousDateNow = Date.now;
  const windowStub = createWindowStub();
  globalThis.window = windowStub;

  let now = 1000;
  Date.now = () => now;

  const controls = new Controls('x', 'c', 'd');
  let startGameCalls = 0;
  let impulses = 0;

  controls.setStartGameCallback(() => {
    startGameCalls += 1;
  });
  controls.setBallRef({
    rigidBody: {
      applyImpulse() {
        impulses += 1;
      }
    }
  });

  windowStub.listeners.get('keydown')({ key: 'd', preventDefault() {}, repeat: false });
  now = 1200;
  windowStub.listeners.get('keyup')({ key: 'd', preventDefault() {} });

  assert.equal(startGameCalls, 1);
  assert.equal(impulses, 1);

  Date.now = previousDateNow;
  globalThis.window = previousWindow;
});

test('Controls triggers boss_fight_started callback on debug key press', () => {
  const previousWindow = globalThis.window;
  const windowStub = createWindowStub();
  globalThis.window = windowStub;

  const controls = new Controls('x', 'c', 'd', 'b');
  let bossFightCalls = 0;

  controls.setBossFightStartCallback(() => {
    bossFightCalls += 1;
  });

  windowStub.listeners.get('keydown')({ key: 'b', preventDefault() {}, repeat: false });

  assert.equal(bossFightCalls, 1);

  globalThis.window = previousWindow;
});

test('Controls triggers player damage and ball lost callbacks on debug keys', () => {
  const previousWindow = globalThis.window;
  const windowStub = createWindowStub();
  globalThis.window = windowStub;

  const controls = new Controls('x', 'c', 'd', 'b');
  let damageCalls = 0;
  let ballLostCalls = 0;

  controls.setPlayerDamageCallback(() => {
    damageCalls += 1;
  });
  controls.setBallLostCallback(() => {
    ballLostCalls += 1;
  });

  windowStub.listeners.get('keydown')({ key: 'h', preventDefault() {}, repeat: false });
  windowStub.listeners.get('keydown')({ key: 'l', preventDefault() {}, repeat: false });

  assert.equal(damageCalls, 1);
  assert.equal(ballLostCalls, 1);

  globalThis.window = previousWindow;
});

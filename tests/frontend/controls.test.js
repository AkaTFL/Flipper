import test from 'node:test';
import assert from 'node:assert/strict';

import { Controls } from '../../frontend/core/Controls.js';

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

  const controls = new Controls('q', 'd', 'space');
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

  windowStub.listeners.get('keydown')({ key: ' ', preventDefault() {}, repeat: false });
  now = 1200;
  windowStub.listeners.get('keyup')({ key: ' ', preventDefault() {} });

  assert.equal(startGameCalls, 1);
  assert.equal(impulses, 1);

  Date.now = previousDateNow;
  globalThis.window = previousWindow;
});

test('Controls triggers boss_fight_started callback on debug key press', () => {
  const previousWindow = globalThis.window;
  const windowStub = createWindowStub();
  globalThis.window = windowStub;

  const controls = new Controls('q', 'd', 'space', 'b');
  let bossFightCalls = 0;

  controls.setBossFightStartCallback(() => {
    bossFightCalls += 1;
  });

  windowStub.listeners.get('keydown')({ key: 'b', preventDefault() {}, repeat: false });

  assert.equal(bossFightCalls, 1);

  globalThis.window = previousWindow;
});

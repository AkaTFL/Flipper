import test from 'node:test';
import assert from 'node:assert/strict';

import { CabinetButtons } from '../../frontend/flipper/core/CabinetButtons.js';

class FakeKeyboardEvent {
  constructor(type, options) {
    this.type = type;
    Object.assign(this, options);
  }
}

test('CabinetButtons transforme les changements ESP32 en touches du jeu', () => {
  const events = [];
  const windowRef = {
    KeyboardEvent: FakeKeyboardEvent,
    dispatchEvent: (event) => events.push(event)
  };
  const buttons = new CabinetButtons({ windowRef });

  buttons.handleState({ buttons: { 'white-left': false, plunger: false } });
  buttons.handleState({ buttons: { 'white-left': true, plunger: true } });
  buttons.handleState({ buttons: { 'white-left': false, plunger: true } });

  assert.deepEqual(events.map(({ type, key }) => ({ type, key })), [
    { type: 'keydown', key: 'x' },
    { type: 'keydown', key: 'd' },
    { type: 'keyup', key: 'x' }
  ]);
});

test('CabinetButtons ignore les états sans boutons', () => {
  const buttons = new CabinetButtons({
    windowRef: { KeyboardEvent: FakeKeyboardEvent, dispatchEvent: () => assert.fail() }
  });
  buttons.handleState({});
  buttons.handleState(null);
});

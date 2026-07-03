import test from 'node:test';
import assert from 'node:assert/strict';

import { BackglassDisplay } from '../../frontend/backglass/BackglassDisplay.js';

function createElement() {
  return { textContent: '' };
}

function createDocument() {
  const elements = {
    backglass: createElement(),
    combo: createElement(),
    quests: createElement(),
    'buttons-monitor': createElement()
  };

  return {
    elements,
    getElementById(id) {
      return elements[id] ?? null;
    }
  };
}

test('BackglassDisplay affiche les événements des boutons physiques', () => {
  const documentRef = createDocument();
  const display = new BackglassDisplay({ documentRef, backendUrl: null });

  display.handleBackendMessage(JSON.stringify({
    type: 'button_event',
    payload: { name: 'button_white_left', key: 'x', active: true }
  }));
  display.handleBackendMessage(JSON.stringify({
    type: 'button_event',
    payload: { name: 'button_white_left', key: 'x', active: false }
  }));

  assert.equal(
    documentRef.elements['buttons-monitor'].textContent,
    'TEST BOUTONS\nAPPUI button_white_left\nRELACHE button_white_left'
  );
});

test('BackglassDisplay conserve les huit derniers événements', () => {
  const documentRef = createDocument();
  const display = new BackglassDisplay({ documentRef, backendUrl: null });

  for (let index = 0; index < 10; index += 1) {
    display.handleBackendMessage(JSON.stringify({
      type: 'button_event',
      payload: { name: `button_${index}`, active: true }
    }));
  }

  assert.equal(display.buttonEvents.length, 8);
  assert.equal(display.buttonEvents[0], 'APPUI button_2');
  assert.equal(display.buttonEvents[7], 'APPUI button_9');
});

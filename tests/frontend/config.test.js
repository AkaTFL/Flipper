import test from 'node:test';
import assert from 'node:assert/strict';

import Config from '../../frontend/physics/Config.js';

test('config exposes the core physics sections used by the frontend', () => {
  assert.ok(Config.gravity, 'La gravité doit être définie');
  assert.ok(Config.ball, 'La configuration de la balle doit être définie');
  assert.ok(Config.layout.walls, 'Le tableau des murs doit exister dans layout');
  assert.ok(Config.scene, 'La configuration de la scène doit être définie');
  assert.ok(Config.palles, 'Les paramètres globaux des palles doivent être définis');
});

test('config uses positive values for gameplay-critical dimensions', () => {
  assert.ok(Config.ball.radius > 0, 'Le rayon de la balle doit être positif');
  assert.ok(Config.ball.density > 0, 'La densité de la balle doit être positive');
  assert.ok(Config.palles.rotationSpeed > 0, 'La vitesse de rotation des palles doit être positive');
  assert.ok(Config.forceMultiplier > 0, 'Le multiplicateur de force doit être positif');
});

test('gravity configuration is numeric on all axes', () => {
  for (const axis of ['x', 'y', 'z']) {
    assert.strictEqual(typeof Config.gravity[axis], 'number', `L'axe ${axis} de la gravité doit être un nombre`);
  }
});

test('layout contains elements', () => {
  assert.ok(Array.isArray(Config.layout.walls), 'Les murs doivent être un tableau');
  assert.ok(Config.layout.walls.length >= 4, 'Il devrait y avoir au moins 4 murs');
  assert.ok(Array.isArray(Config.layout.bumpers), 'Les bumpers doivent être un tableau');
});
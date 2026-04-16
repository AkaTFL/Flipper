import test from 'node:test';
import assert from 'node:assert/strict';

import Config from '../../frontend/physics/Config.js';

test('config exposes the core physics sections used by the frontend', () => {
  assert.ok(Config.gravity);
  assert.ok(Config.ball);
  assert.ok(Config.wall);
  assert.ok(Config.scene);
  assert.ok(Config.bumper);
  assert.ok(Config.palles);
});

test('config uses positive values for gameplay-critical dimensions', () => {
  assert.ok(Config.ball.radius > 0);
  assert.ok(Config.ball.density > 0);
  assert.ok(Config.bumper.power > 0);
  assert.ok(Config.forceMultiplier > 0);
});

test('gravity configuration is numeric on all axes', () => {
  for (const axis of ['x', 'y', 'z']) {
    assert.equal(typeof Config.gravity[axis], 'number');
  }
});

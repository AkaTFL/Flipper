import test from 'node:test';
import assert from 'node:assert/strict';
import Config from '../../frontend/playfield/physics/Config.js';

const positioning = Config.global.positioning;

test('la configuration expose les sections physiques actuelles', () => {
  assert.ok(positioning.ball);
  assert.ok(positioning.scene);
  assert.ok(positioning.bumper);
  assert.ok(positioning.palles);
});

test('les dimensions et forces critiques sont positives', () => {
  assert.ok(positioning.ball.radius > 0);
  assert.ok(positioning.ball.density > 0);
  assert.ok(positioning.bumper.power > 0);
  assert.ok(positioning.launchingRamp.curveStartZ < positioning.launchingRamp.exitZ);
  assert.ok(positioning.launchingRamp.exitZ > positioning.ball.position.z);
  assert.ok(positioning.launchingRamp.exitX > positioning.ball.position.x);
  assert.ok(positioning.launchingRamp.curveTurnRate > 0);
  assert.ok(positioning.launchingRamp.exitRadius > positioning.ball.radius);
  assert.ok(Config.forceMultiplier > 0);
});

test('chaque niveau possède une gravité numérique', () => {
  for (const level of ['lvl_1', 'lvl_2', 'lvl_3', 'lvl_4', 'post_lvl']) {
    for (const axis of ['x', 'y', 'z']) {
      assert.equal(typeof Config[level].gravity[axis], 'number');
    }
  }
});

test('les palettes possèdent quatre instances et leurs modèles', () => {
  assert.equal(positioning.palles.instances.length, 4);
  assert.match(positioning.palles.modelLeft, /Left_flipper/);
  assert.match(positioning.palles.modelRight, /Right_flipper/);
});

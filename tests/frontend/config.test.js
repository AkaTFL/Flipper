import test from 'node:test';
import assert from 'node:assert/strict';

import Config from '../../frontend/flipper/physics/Config.js';

const positioning = Config.global?.positioning || {};

test('config exposes the core physics sections used by the frontend', () => {
  assert.ok(positioning.ball);
  assert.ok(positioning.wall);
  assert.ok(positioning.scene);
  assert.ok(positioning.bumper);
  assert.ok(positioning.palles);
});

test('config uses positive values for gameplay-critical dimensions', () => {
  assert.ok(positioning.ball.radius > 0);
  assert.ok(positioning.ball.density > 0);
  assert.ok(positioning.bumper.power > 0);
  assert.ok(Config.forceMultiplier > 0);
});

test('gravity configuration is numeric on all axes for the current level', () => {
  const gravity = Config[Config.currentLevel]?.gravity;
  assert.ok(gravity);

  for (const axis of ['x', 'y', 'z']) {
    assert.equal(typeof gravity[axis], 'number');
  }
});

test('config.staticMeshes lists the key wall and target assets', () => {
  assert.ok(Array.isArray(positioning.staticMeshes));
  assert.ok(positioning.staticMeshes.length > 0);

  const ids = positioning.staticMeshes.map((m) => m.objectId);
  assert.ok(ids.includes('murs-cible-left'));
  assert.ok(ids.includes('murs-cible-right'));
  assert.ok(ids.includes('quadri-left-cible'));
  assert.ok(ids.includes('quadri-right-cible'));
  assert.ok(ids.includes('raque-side-left') || ids.includes('raque-side-right'));
});

test('config.staticMeshes entries each have required fields', () => {
  for (const entry of positioning.staticMeshes) {
    assert.ok(entry.model,    `${entry.objectId} is missing model`);
    assert.ok(entry.objectId, `entry is missing objectId`);
    assert.ok(entry.position, `${entry.objectId} is missing position`);
    assert.ok(entry.rotation, `${entry.objectId} is missing rotation`);
  }
});

test('triangle bumpers and launching ramp models use the expected asset families', () => {
  const triangleBumpers = positioning.bumper.instances.filter((item) => item.objectId.includes('triangle'));
  assert.ok(triangleBumpers.length >= 2);
  assert.ok(triangleBumpers.some((item) => item.objectId.includes('left')));
  assert.ok(triangleBumpers.some((item) => item.objectId.includes('right')));
  assert.ok(triangleBumpers.every((item) => item.model.includes('bumpers_triangle')));

  assert.ok(positioning.ramps.B.model.includes('ramp'));
  assert.ok(positioning.palles.modelLeft.includes('palles'));
  assert.ok(positioning.palles.modelRight.includes('palles'));
});

test('triangle bumpers use distinct left and right models', () => {
  const triangleBumpers = positioning.bumper.instances.filter((item) => item.objectId.includes('triangle'));
  const left  = triangleBumpers.find((t) => t.objectId.includes('left'));
  const right = triangleBumpers.find((t) => t.objectId.includes('right'));
  assert.ok(left, 'left triangle bumper missing');
  assert.ok(right, 'right triangle bumper missing');
  assert.notEqual(left.model, right.model);
});

test('ramp pales config includes death-state model paths', () => {
  assert.ok(positioning.rampPales?.rightDeath?.model,  'rightDeath model is missing');
  assert.ok(positioning.rampPales?.leftDeath?.model,   'leftDeath model is missing');
  assert.ok(positioning.rampPales.rightDeath.model.includes('death'));
  assert.ok(positioning.rampPales.leftDeath.model.includes('death'));
});

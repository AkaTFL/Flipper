import test from 'node:test';
import assert from 'node:assert/strict';

import Config from '../../frontend/flipper/physics/Config.js';

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

test('config.StaticMesh lists the Mesh_final assets to integrate', () => {
  assert.ok(Array.isArray(Config.StaticMesh));
  assert.ok(Config.StaticMesh.length > 0);

  const ids = Config.StaticMesh.map((m) => m.objectId);
  assert.ok(ids.includes('murs-cible-left'));
  assert.ok(ids.includes('murs-cible-right'));
  assert.ok(ids.includes('quadri-left-cible'));
  assert.ok(ids.includes('quadri-right-cible'));
  assert.ok(ids.includes('raque-side'));
});

test('config.StaticMesh entries each have required fields', () => {
  for (const entry of Config.StaticMesh) {
    assert.ok(entry.model,    `${entry.objectId} is missing model`);
    assert.ok(entry.objectId, `entry is missing objectId`);
    assert.ok(entry.position, `${entry.objectId} is missing position`);
    assert.ok(entry.rotation, `${entry.objectId} is missing rotation`);
  }
});

test('bumper, triangle, ramp and palles model paths reference Mesh_final', () => {
  assert.ok(Config.bumper.instances.every((b) => b.model.includes('Mesh_final')));
  assert.ok(Config.bumpers_triangle.every((t) => t.model.includes('Mesh_final')));
  assert.ok(Config.ramps.B.model.includes('Mesh_final'));
  assert.ok(Config.palles.modelLeft.includes('Mesh_final'));
  assert.ok(Config.palles.modelRight.includes('Mesh_final'));
});

test('triangle bumpers use distinct left and right models', () => {
  const left  = Config.bumpers_triangle.find((t) => t.variant === 'left');
  const right = Config.bumpers_triangle.find((t) => t.variant === 'right');
  assert.ok(left.model.includes('Left'));
  assert.ok(right.model.toLowerCase().includes('right'));
  assert.notEqual(left.model, right.model);
});

test('palles config includes death-state model paths', () => {
  assert.ok(Config.palles.modelLeftDeath,  'modelLeftDeath is missing');
  assert.ok(Config.palles.modelRightDeath, 'modelRightDeath is missing');
  assert.ok(Config.palles.modelLeftDeath.includes('death'));
  assert.ok(Config.palles.modelRightDeath.includes('death'));
});

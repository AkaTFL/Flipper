import test from 'node:test';
import assert from 'node:assert/strict';

import Config from '../../frontend/physics/Config.js';
import { GamePhysics } from '../../frontend/physics/GamePhysics.js';

test('GamePhysics initializes bumper/object registries', () => {
  const physics = new GamePhysics(Config);

  assert.deepEqual(physics.bumpers, []);
  assert.deepEqual(physics.objects, []);
});

test('registerObjects appends every provided object', () => {
  const physics = new GamePhysics(Config);
  const objects = [{ id: 'a' }, { id: 'b' }];

  physics.registerObjects(objects);

  assert.equal(physics.objects.length, 2);
  assert.equal(physics.objects[0], objects[0]);
  assert.equal(physics.objects[1], objects[1]);
});

test('registerObjects can be called multiple times', () => {
  const physics = new GamePhysics(Config);
  const first = { id: 'first' };
  const second = { id: 'second' };

  physics.registerObjects([first]);
  physics.registerObjects([second]);

  assert.equal(physics.objects.length, 2);
  assert.equal(physics.objects[0], first);
  assert.equal(physics.objects[1], second);
});

import test from 'node:test';
import assert from 'node:assert/strict';

import Config from '../../frontend/physics/Config.js';
import { GamePhysics } from '../../frontend/physics/GamePhysics.js';

test('applyBumperForce applies a normalized impulse scaled by bumper power', () => {
  const physics = new GamePhysics(Config);
  let appliedImpulse = null;

  const otherBody = {
    translation: () => ({ x: 3, y: 4, z: 0 }),
    applyImpulse: (impulse, wakeUp) => {
      appliedImpulse = { impulse, wakeUp };
    },
  };

  physics.world = {
    colliders: {
      get: (handle) => {
        assert.equal(handle, 2);
        return {
          parent: () => otherBody,
        };
      },
    },
  };

  const bumper = {
    collider: { handle: 1 },
    rigidBody: {
      translation: () => ({ x: 0, y: 0, z: 0 }),
    },
  };

  physics.applyBumperForce(bumper, 1, 2);

  assert.ok(appliedImpulse);
  assert.equal(appliedImpulse.wakeUp, true);
  assert.equal(appliedImpulse.impulse.x, Config.bumper.power * Config.forceMultiplier * 0.6);
  assert.equal(appliedImpulse.impulse.y, Config.bumper.power * Config.forceMultiplier * 0.8);
  assert.equal(appliedImpulse.impulse.z, 0);
});

test('applyBumperForce exits safely when the other collider is missing', () => {
  const physics = new GamePhysics(Config);

  physics.world = {
    colliders: {
      get: () => null,
    },
  };

  const bumper = {
    collider: { handle: 1 },
    rigidBody: {
      translation: () => ({ x: 0, y: 0, z: 0 }),
    },
  };

  assert.doesNotThrow(() => physics.applyBumperForce(bumper, 1, 2));
});

test('registerBumper stores bumpers for future collision handling', () => {
  const physics = new GamePhysics(Config);
  const bumper = { collider: { handle: 42 } };

  physics.registerBumper(bumper);

  assert.equal(physics.bumpers.length, 1);
  assert.equal(physics.bumpers[0], bumper);
});

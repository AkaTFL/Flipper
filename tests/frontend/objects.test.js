import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

import Config from '../../frontend/flipper/physics/Config.js';
import { Bumper } from '../../frontend/flipper/objects/Bumper.js';
import { LaunchingRamp } from '../../frontend/flipper/objects/LaunchingRamp.js';
import { Palles } from '../../frontend/flipper/objects/Palles.js';
import { Wall } from '../../frontend/flipper/objects/Wall.js';

mock.method(global, 'fetch', () => new Promise(() => {}));

function createWorldStub() {
  const state = {
    rigidBodies: [],
    colliders: [],
    joints: [],
  };

  const world = {
    createRigidBody(desc) {
      const body = {
        desc,
        translation: () => ({ x: 0, y: 0, z: 0 }),
        rotation: () => ({ x: 0, y: 0, z: 0, w: 1 }),
      };
      state.rigidBodies.push(body);
      return body;
    },
    createCollider(desc, rigidBody) {
      const collider = {
        desc,
        rigidBody,
        handle: state.colliders.length + 1,
        parent: () => rigidBody,
      };
      state.colliders.push(collider);
      return collider;
    },
    createImpulseJoint(joint, pivotBody, rigidBody, wakeUp) {
      const record = {
        joint,
        pivotBody,
        rigidBody,
        wakeUp,
        limits: null,
        motorPosition: null,
        setLimits(min, max) {
          this.limits = { min, max };
        },
        configureMotorPosition(angle, stiffness, damping) {
          this.motorPosition = { angle, stiffness, damping };
        },
      };
      state.joints.push(record);
      return record;
    },
  };

  return { world, state };
}

test('Bumper registers a collider and uses the expected radius', () => {
  const { world, state } = createWorldStub();
  const bumper = new Bumper(world, 60, { x: 10, y: 20, z: 30 });

  assert.equal(bumper.radius, 30);
  assert.equal(state.rigidBodies.length, 1);
  assert.equal(state.colliders.length, 1);
  assert.equal(bumper.mesh.position.x, 10);
  assert.equal(bumper.mesh.position.y, 20);
  assert.equal(bumper.mesh.position.z, 30);
});

test('Palles constructor creates physics body/collider and defers joint setup until model load', () => {
  const { world, state } = createWorldStub();
  const palles = new Palles(
    world,
    120,
    10,
    10,
    { x: 200, y: 150, z: 0 },
    { x: 0, y: 0, z: 0 },
    'left'
  );

  assert.equal(state.rigidBodies.length, 1);
  assert.equal(state.colliders.length, 1);
  assert.equal(state.joints.length, 0);

  assert.doesNotThrow(() => palles.setActive(true));
});

test('Palles keeps rest-angle semantics when inactive', () => {
  const { world, state } = createWorldStub();
  const palles = new Palles(
    world,
    120,
    10,
    10,
    { x: 200, y: 150, z: 0 },
    { x: 0, y: 0, z: 0 },
    'right'
  );

  assert.equal(state.joints.length, 0);
  assert.equal(palles.restAngle, Math.abs(Config.palles.initialAngle ?? (Math.PI / 6)));

  assert.doesNotThrow(() => palles.setActive(false));
});

test('Wall creates a fixed rigid body and a collider', () => {
  const { world, state } = createWorldStub();
  const wall = new Wall(
    world,
    950,
    100,
    { x: 255, y: 0, z: 0 },
    { x: 0, y: Math.PI / 2, z: 0 }
  );

  assert.equal(wall.objectType, 'wall');
  assert.equal(state.rigidBodies.length, 1);
  assert.equal(state.colliders.length, 1);
  assert.ok(wall.collider);
});

import test from 'node:test';
import assert from 'node:assert/strict';

import Config from '../../frontend/physics/Config.js';
import { Bumper } from '../../frontend/objects/Bumper.js';
import { LaunchingRamp } from '../../frontend/objects/LaunchingRamp.js';
import { Palles } from '../../frontend/objects/Palles.js';
import { Rail } from '../../frontend/objects/Rail.js';

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

test('Rail creates a static physics body and keeps the configured position', () => {
  const { world, state } = createWorldStub();
  const rail = new Rail(world, 300, 12, 24, { x: 50, y: 70, z: 90 });

  assert.equal(state.rigidBodies.length, 1);
  assert.equal(state.colliders.length, 1);
  assert.equal(rail.length, 300);
  assert.equal(rail.width, 12);
  assert.equal(rail.height, 24);
  assert.equal(rail.mesh.position.x, 50);
  assert.equal(rail.mesh.position.y, 70);
  assert.equal(rail.mesh.position.z, 90);
});

test('LaunchingRamp builds three rails with the expected offsets', () => {
  const { world } = createWorldStub();
  const ramp = new LaunchingRamp(world, 40, 20, 200, { x: 100, y: 300, z: 15 });

  assert.equal(ramp.meshes.length, 3);
  assert.equal(ramp.leftRail.mesh.position.x, 80);
  assert.equal(ramp.rightRail.mesh.position.x, 120);
  assert.equal(ramp.bottomRail.mesh.position.y, 290);
  assert.equal(ramp.leftRail.objectId, 'launching-ramp-right-rail');
  assert.equal(ramp.rightRail.objectId, 'launching-ramp-left-rail');
  assert.equal(ramp.bottomRail.objectId, 'launching-ramp-base-rail');
  assert.equal(ramp.collisionEntries.length, 3);
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

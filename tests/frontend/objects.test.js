import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import Config from '../../frontend/flipper/physics/Config.js';
import { Bumper } from '../../frontend/flipper/objects/Bumper.js';
import { LaunchingRamp } from '../../frontend/flipper/objects/LaunchingRamp.js';
import { Palles } from '../../frontend/flipper/objects/Palles.js';
import { StaticMesh } from '../../frontend/flipper/objects/StaticMesh.js';
import { Wall } from '../../frontend/flipper/objects/Wall.js';

if (typeof globalThis.Audio !== 'function') {
  globalThis.Audio = class {
    constructor() {
      this.currentTime = 0;
      this.preload = 'auto';
      this.volume = 1;
    }

    play() {
      return Promise.resolve();
    }
  };
}

mock.method(GLTFLoader.prototype, 'loadAsync', async () => ({
  scene: createLoadedModelRoot()
}));

function createLoadedModelRoot() {
  const root = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(2, 4, 6),
    new THREE.MeshStandardMaterial({ color: 0xffffff })
  );

  root.add(mesh);
  return root;
}

function flushAsyncLoads() {
  return new Promise((resolve) => setImmediate(resolve));
}

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

test('Bumper registers a collider and uses the expected radius', async () => {
  const { world, state } = createWorldStub();
  const bumper = new Bumper(world, 60, { x: 10, y: 20, z: 30 }, { x: 0, y: 0, z: 0 }, 'bumper-1');

  await flushAsyncLoads();

  assert.equal(bumper.radius, 30);
  assert.equal(state.rigidBodies.length, 1);
  assert.equal(state.colliders.length, 1);
  assert.equal(bumper.mesh.position.x, 10);
  assert.equal(bumper.mesh.position.y, 20);
  assert.equal(bumper.mesh.position.z, 30);
});

test('Palles constructor creates physics body/collider and defers joint setup until model load', async () => {
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
  assert.equal(state.colliders.length, 0);
  assert.equal(state.joints.length, 0);

  await flushAsyncLoads();

  assert.equal(state.rigidBodies.length, 2);
  assert.equal(state.colliders.length, 1);
  assert.equal(state.joints.length, 1);

  assert.doesNotThrow(() => palles.setActive(true));
});

test('Palles keeps rest-angle semantics when inactive', async () => {
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

  await flushAsyncLoads();

  assert.equal(state.joints.length, 1);
  assert.equal(palles.restAngle, Math.abs(Config.palles.initialAngle ?? (Math.PI / 6)));

  assert.doesNotThrow(() => palles.setActive(false));
});

test('StaticMesh creates a fixed rigid body and a trimesh collider after model load', async () => {
  const { world, state } = createWorldStub();
  const sm = new StaticMesh(world, '../assets/mesh/Mesh_final/murs_cible_left.glb', {
    objectId: 'murs-cible-left',
    objectType: 'wall',
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 }
  });

  assert.equal(state.rigidBodies.length, 1);
  assert.equal(state.colliders.length, 0);

  await flushAsyncLoads();

  assert.equal(state.colliders.length, 1);
  assert.equal(sm.objectId, 'murs-cible-left');
  assert.equal(sm.objectType, 'wall');
});

test('StaticMesh defaults objectType to "static" when not provided', async () => {
  const { world } = createWorldStub();
  const sm = new StaticMesh(world, '../assets/mesh/Mesh_final/raque_side.glb', {
    objectId: 'raque-side'
  });

  assert.equal(sm.objectType, 'static');
});

test('Wall creates a fixed rigid body and a collider', () => {
  const { world, state } = createWorldStub();
  const gamePhysics = { world };  // Wall expects gamePhysics.world, not world directly
  const wall = new Wall(
    gamePhysics,
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

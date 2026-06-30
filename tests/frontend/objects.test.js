import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import Config from '../../frontend/playfield/physics/Config.js';
import { Bumper } from '../../frontend/playfield/objects/Bumper.js';
import { LaunchingRamp } from '../../frontend/playfield/objects/LaunchingRamp.js';
import { Palles } from '../../frontend/playfield/objects/Palles.js';
import { Repulse } from '../../frontend/playfield/objects/Repulse.js';
import { StaticMesh } from '../../frontend/playfield/objects/StaticMesh.js';
import { Wall } from '../../frontend/playfield/objects/Wall.js';

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
    getCollider(handle) {
      return state.colliders.find((collider) => collider.handle === handle) ?? null;
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

test('Bumper triangle applies an impulse using ramp mesh orientation', async () => {
  const { world, state } = createWorldStub();
  let applied = null;

  const rampRoot = new THREE.Group();
  const rampMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xffffff })
  );
  rampMesh.name = 'ramp';
  rampRoot.add(rampMesh);

  mock.method(GLTFLoader.prototype, 'loadAsync', async () => ({
    scene: rampRoot
  }));

  const bumper = new Bumper(
    world,
    70,
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 0 },
    'bumper-triangle-left'
  );

  await flushAsyncLoads();

  const otherBody = {
    translation: () => ({ x: 0, y: 0, z: 1 }),
    applyImpulse: (impulse) => { applied = impulse; }
  };
  const otherCollider = { handle: 99, parent: () => otherBody };
  state.colliders.push(otherCollider);

  bumper.applyBumperForce(1, 99);

  assert.ok(applied, 'Expected triangle bumper to apply an impulse');
  assert.equal(applied.y, 0);
  assert.ok(Number.isFinite(applied.x));
  assert.ok(Number.isFinite(applied.z));
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

test('Repulse does not throw when a loaded model has no usable geometry', async () => {
  const { world } = createWorldStub();

  const emptyRoot = new THREE.Group();
  const emptyMesh = new THREE.Mesh(new THREE.BufferGeometry());
  emptyRoot.add(emptyMesh);

  mock.method(GLTFLoader.prototype, 'loadAsync', async () => ({
    scene: emptyRoot
  }));

  assert.doesNotThrow(() => new Repulse(world, 80, 40, 40, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 'repulse-zone'));

  await flushAsyncLoads();
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

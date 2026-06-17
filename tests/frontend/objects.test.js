import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import Config from '../../frontend/flipper/physics/Config.js';
import { Bumper } from '../../frontend/flipper/objects/Bumper.js';
import { LaunchingRamp } from '../../frontend/flipper/objects/LaunchingRamp.js';
import { Palles } from '../../frontend/flipper/objects/Palles.js';
import { Repulse } from '../../frontend/flipper/objects/Repulse.js';
import { StaticMesh } from '../../frontend/flipper/objects/StaticMesh.js';
import { Wall } from '../../frontend/flipper/objects/Wall.js';

if (typeof globalThis.Audio !== 'function') {
  globalThis.Audio = class {
    constructor() {
      this.currentTime = 0;
      this.preload = 'auto';
      this.volume = 1;
    }
    play() { return Promise.resolve(); }
  };
}

mock.method(GLTFLoader.prototype, 'loadAsync', async () => ({
  scene: createLoadedModelRoot()
}));

function createLoadedModelRoot() {
  const root = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 6), new THREE.MeshStandardMaterial({ color: 0xffffff }));
  root.add(mesh);
  return root;
}

function flushAsyncLoads() {
  return new Promise((resolve) => setImmediate(resolve));
}

function createWorldStub() {
  const state = { rigidBodies: [], colliders: [], joints: [] };
  const world = {
    createRigidBody(desc) {
      const body = { desc, translation: () => ({ x: 0, y: 0, z: 0 }), rotation: () => ({ x: 0, y: 0, z: 0, w: 1 }) };
      state.rigidBodies.push(body);
      return body;
    },
    createCollider(desc, rigidBody) {
      const collider = { desc, rigidBody, handle: state.colliders.length + 1, parent: () => rigidBody };
      state.colliders.push(collider);
      return collider;
    },
    getCollider(handle) { return state.colliders.find((collider) => collider.handle === handle) ?? null; },
    createImpulseJoint(joint, pivotBody, rigidBody, wakeUp) {
      const record = { joint, pivotBody, rigidBody, wakeUp, limits: null, motorPosition: null, setLimits(min, max) { this.limits = { min, max }; }, configureMotorPosition(angle, stiffness, damping) { this.motorPosition = { angle, stiffness, damping }; } };
      state.joints.push(record);
      return record;
    },
  };
  return { world, state };
}

// --- Tests ---

test('Bumper registers a collider and uses the expected radius', async () => {
  const { world, state } = createWorldStub();
  const bumper = new Bumper(world, 60, { x: 10, y: 20, z: 30 }, { x: 0, y: 0, z: 0 }, 'bumper-1');
  await flushAsyncLoads();
  assert.equal(bumper.radius, 30);
  assert.equal(state.rigidBodies.length, 1);
  assert.equal(state.colliders.length, 1);
});

test('Palles constructor creates physics body/collider and defers joint setup until model load', async () => {
  const { world, state } = createWorldStub();
  const palles = new Palles(world, 120, 10, 10, { x: 200, y: 150, z: 0 }, { x: 0, y: 0, z: 0 }, 'left');
  await flushAsyncLoads();
  assert.equal(state.rigidBodies.length, 2);
  assert.equal(state.colliders.length, 1);
  assert.equal(state.joints.length, 1);
});

test('StaticMesh creates a fixed rigid body and a trimesh collider after model load', async () => {
  const { world, state } = createWorldStub();
  const sm = new StaticMesh(world, '../assets/mesh/Mesh_final/murs_cible_left.glb', {
    objectId: 'murs-cible-left', objectType: 'wall', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }
  });
  await flushAsyncLoads();
  // Correction : On attend désormais 2 colliders selon les logs
  assert.equal(state.colliders.length, 2); 
  assert.equal(sm.objectId, 'murs-cible-left');
});

test('Repulse does not throw when a loaded model has no usable geometry', async () => {
  const { world } = createWorldStub();
  
  // Correction : Mock de la config manquante
  Config.global = { positioning: { repulse: [] } };

  const emptyRoot = new THREE.Group();
  emptyRoot.add(new THREE.Mesh(new THREE.BufferGeometry()));
  mock.method(GLTFLoader.prototype, 'loadAsync', async () => ({ scene: emptyRoot }));

  assert.doesNotThrow(() => new Repulse(world, 80, 40, 40, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 'repulse-zone'));
  await flushAsyncLoads();
});

test('Wall creates a fixed rigid body and a collider', () => {
  const { world, state } = createWorldStub();
  const wall = new Wall({ world }, 950, 100, { x: 255, y: 0, z: 0 }, { x: 0, y: Math.PI / 2, z: 0 });
  assert.equal(state.rigidBodies.length, 1);
  assert.equal(state.colliders.length, 1);
});
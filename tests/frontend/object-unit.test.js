import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { Ball } from '../../frontend/playfield/objects/Ball.js';
import { Bumper } from '../../frontend/playfield/objects/Bumper.js';
import { Palles } from '../../frontend/playfield/objects/Palles.js';
import { Repulse } from '../../frontend/playfield/objects/Repulse.js';
import { Wall } from '../../frontend/playfield/objects/Wall.js';
import { Objects } from '../../frontend/playfield/objects/Objects.js';

if (typeof globalThis.Audio !== 'function') {
  globalThis.Audio = class {
    constructor() {
      this.currentTime = 0;
      this.preload = 'auto';
      this.volume = 1;
      this.loop = false;
      this.paused = false;
    }

    play() {
      this.paused = false;
      return Promise.resolve();
    }

    pause() {
      this.paused = true;
    }
  };
}

const originalLoadAsync = GLTFLoader.prototype.loadAsync;
GLTFLoader.prototype.loadAsync = async () => ({ scene: new THREE.Group() });

if (!globalThis.fetch) {
  globalThis.fetch = async () => ({ ok: true });
}

THREE.TextureLoader.prototype.load = () => new THREE.Texture();

function createWorldStub() {
  const state = { rigidBodies: [], colliders: [], joints: [] };

  const world = {
    colliders: new Map(),
    createRigidBody(desc) {
      const body = {
        desc,
        translation: () => ({ x: 0, y: 0, z: 0 }),
        rotation: () => ({ x: 0, y: 0, z: 0, w: 1 }),
        linvel: () => ({ x: 0, y: 0, z: 0 }),
        setLinvel() {},
        applyImpulse() {},
        isFixed: () => false,
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
        userData: null,
        getUserData: () => collider.userData,
      };
      state.colliders.push(collider);
      world.colliders.set(collider.handle, collider);
      return collider;
    },
    getCollider(handle) {
      return world.colliders.get(handle) ?? null;
    },
    createImpulseJoint(joint, pivotBody, rigidBody) {
      const record = {
        joint,
        pivotBody,
        rigidBody,
        setLimits() {},
        configureMotorPosition() {},
      };
      state.joints.push(record);
      return record;
    },
  };

  return { world, state };
}

function flushAsyncLoads() {
  return new Promise((resolve) => setImmediate(resolve));
}

test('Objects builds a mesh and exposes the initial properties', () => {
  const object = new Objects({}, 10, 20, 30, { x: 1, y: 2, z: 3 }, { x: 0.1, y: 0.2, z: 0.3 }, 4);

  assert.equal(object.length, 10);
  assert.equal(object.width, 20);
  assert.equal(object.height, 30);
  assert.equal(object.position.x, 1);
  assert.equal(object.mesh.position.x, 1);
  assert.equal(object.mesh.rotation.x, 0.1);
});

test('Ball creates a dynamic rigid body and a ball collider', () => {
  const { world, state } = createWorldStub();
  const scene = { effectManager: { impact() {} } };

  const ball = new Ball(scene, world, { x: 5, y: 6, z: 7 });

  assert.equal(state.rigidBodies.length, 1);
  assert.equal(state.colliders.length, 1);
  assert.equal(ball.objectType, 'ball');
  assert.equal(ball.radius, 14);
});

test('Bumper stores its radius and object identity', () => {
  const { world } = createWorldStub();
  const bumper = new Bumper({}, world, 40, { x: 2, y: 3, z: 4 }, { x: 0, y: 0, z: 0 }, 'bumper-1');

  assert.equal(bumper.objectType, 'bumper');
  assert.equal(bumper.objectId, 'bumper-1');
  assert.equal(bumper.radius, 20);
});

test('Palles exposes the expected rest angle and side metadata', async () => {
  const { world } = createWorldStub();
  const scene = { effectManager: { impact() {} } };

  const palles = new Palles(scene, world, 120, 10, 10, { x: 200, y: 150, z: 0 }, { x: 0, y: 0, z: 0 }, 'left');

  await flushAsyncLoads();

  assert.equal(palles.side, 'left');
  assert.equal(palles.isLeft, true);
  assert.equal(palles.restAngle, -palles.initialAngle);
});

test('Repulse keeps its power and type metadata', () => {
  const { world } = createWorldStub();
  const repulse = new Repulse({}, world, 80, 40, 40, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 'repulse-zone');

  assert.equal(repulse.objectType, 'repulse');
  assert.equal(repulse.objectId, 'repulse-zone');
  assert.equal(repulse.power, 200);
});

test('Wall creates a visible mesh and a collider', () => {
  const { world } = createWorldStub();
  const gamePhysics = { world };
  const wall = new Wall({}, gamePhysics, 200, 100, { x: 10, y: 20, z: 30 }, { x: 0, y: 0, z: 0 }, 'wall-1');

  assert.equal(wall.objectType, 'wall');
  assert.equal(wall.objectId, 'wall-1');
  assert.ok(wall.mesh);
});

process.on('exit', () => {
  GLTFLoader.prototype.loadAsync = originalLoadAsync;
});

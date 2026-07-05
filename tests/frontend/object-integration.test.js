import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { Ball } from '../../frontend/playfield/objects/Ball.js';
import { Bumper } from '../../frontend/playfield/objects/Bumper.js';
import { Palles } from '../../frontend/playfield/objects/Palles.js';

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

let mockModelRoot = new THREE.Group();

const loadAsyncMock = async () => ({ scene: mockModelRoot });

const loadAsyncStub = new Map();

if (!loadAsyncStub.has(GLTFLoader.prototype.loadAsync)) {
  loadAsyncStub.set(GLTFLoader.prototype.loadAsync, GLTFLoader.prototype.loadAsync);
}

const originalLoadAsync = GLTFLoader.prototype.loadAsync;
GLTFLoader.prototype.loadAsync = loadAsyncMock;

if (!globalThis.fetch) {
  globalThis.fetch = async () => ({ ok: true });
}

THREE.TextureLoader.prototype.load = () => new THREE.Texture();

function flushAsyncLoads() {
  return new Promise((resolve) => setImmediate(resolve));
}

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
        setLinvel(velocity) {
          this.lastLinvel = velocity;
        },
        applyImpulse(impulse) {
          this.lastImpulse = impulse;
        },
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
    createImpulseJoint(joint, pivotBody, rigidBody, wakeUp) {
      const record = {
        joint,
        pivotBody,
        rigidBody,
        wakeUp,
        setLimits() {},
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

test('integration: bumper impulse reaches a ball through the shared world', async () => {
  const { world } = createWorldStub();
  const scene = { effectManager: { impact() {} } };

  const ball = new Ball(scene, world, { x: 0, y: 0, z: 0 });
  const bumper = new Bumper(scene, world, 40, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 'bumper-1');

  ball.rigidBody.translation = () => ({ x: 1, y: 0, z: 0 });
  bumper.rigidBody.translation = () => ({ x: 0, y: 0, z: 0 });

  await flushAsyncLoads();

  const ballCollider = { handle: 7, parent: () => ball.rigidBody };
  const bumperCollider = { handle: 8, parent: () => bumper.rigidBody };

  world.colliders.set(ballCollider.handle, ballCollider);
  world.colliders.set(bumperCollider.handle, bumperCollider);
  ball.collider = ballCollider;
  bumper.collider = bumperCollider;

  bumper.applyBumperForce(bumperCollider.handle, ballCollider.handle);

  const impulse = ball.rigidBody.lastImpulse;
  assert.ok(impulse, 'expected the ball body to receive an impulse');
  assert.equal(typeof impulse.x, 'number');
  assert.equal(typeof impulse.y, 'number');
  assert.equal(typeof impulse.z, 'number');
  assert.ok(Math.abs(impulse.x) > 0 || Math.abs(impulse.y) > 0 || Math.abs(impulse.z) > 0);
});

test('integration: palles activation configures the joint motor', async () => {
  const { world } = createWorldStub();
  const scene = { effectManager: { impact() {} } };

  const palles = new Palles(scene, world, 120, 10, 10, { x: 200, y: 150, z: 0 }, { x: 0, y: 0, z: 0 }, 'left');

  await flushAsyncLoads();

  palles.joint = {
    configureMotorPosition(angle, stiffness, damping) {
      this.motorPosition = { angle, stiffness, damping };
    },
    setLimits() {},
  };

  palles.setActive(true);

  assert.ok(palles.joint.motorPosition, 'expected the joint motor to be configured');
  assert.equal(palles.joint.motorPosition.angle, palles.angle);
  assert.equal(palles.joint.motorPosition.stiffness, palles.motorStiffness);
  assert.equal(palles.joint.motorPosition.damping, palles.motorDamping);
});

process.on('exit', () => {
  GLTFLoader.prototype.loadAsync = originalLoadAsync;
});

import test from 'node:test';
import assert from 'node:assert/strict';

import Config from '../../frontend/physics/Config.js';
import { GamePhysics } from '../../frontend/physics/GamePhysics.js';

test('GamePhysics initializes object and collider registries', () => {
  const physics = new GamePhysics(Config);

  assert.deepEqual(physics.bumpers, []);
  assert.deepEqual(physics.objects, []);
  assert.equal(physics.colliderOwners.size, 0);
  assert.equal(physics.colliderResponders.size, 0);
});

test('registerObjects appends every provided object and indexes their colliders', () => {
  const physics = new GamePhysics(Config);
  const first = { collider: { handle: 11 } };
  const responder = { name: 'launching-ramp' };
  const second = {
    collisionEntries: [
      { collider: { handle: 21 }, owner: { objectId: 'left-rail' }, responder },
      { collider: { handle: 22 }, owner: { objectId: 'right-rail' }, responder }
    ]
  };

  physics.registerObjects([first, second]);

  assert.equal(physics.objects.length, 2);
  assert.equal(physics.colliderOwners.get(11), first);
  assert.equal(physics.colliderOwners.get(21).objectId, 'left-rail');
  assert.equal(physics.colliderOwners.get(22).objectId, 'right-rail');
  assert.equal(physics.colliderResponders.get(21), responder);
  assert.equal(physics.colliderResponders.get(22), responder);
});

test('resolveBackendUrl falls back to local websocket endpoint when no browser config is provided', () => {
  const physics = new GamePhysics(Config);

  assert.equal(physics.resolveBackendUrl(), 'ws://localhost:8080/ws');
});

test('sendImpact emits a structured impact payload when the backend socket is ready', () => {
  const physics = new GamePhysics(Config);
  const sentPayloads = [];
  const previousWebSocket = globalThis.WebSocket;

  class FakeWebSocket {}
  FakeWebSocket.OPEN = 1;

  globalThis.WebSocket = FakeWebSocket;
  physics.backendSocket = {
    readyState: 1,
    send(payload) {
      sentPayloads.push(JSON.parse(payload));
    }
  };

  const sent = physics.sendImpact({ objectId: 'bumper-1', objectType: 'bumper' });

  assert.equal(sent, true);
  assert.equal(sentPayloads.length, 1);
  assert.equal(sentPayloads[0].type, 'impact');
  assert.equal(sentPayloads[0].payload.objectId, 'bumper-1');
  assert.equal(sentPayloads[0].payload.objectType, 'bumper');

  if (previousWebSocket === undefined) {
    delete globalThis.WebSocket;
  } else {
    globalThis.WebSocket = previousWebSocket;
  }
});

test('handleCollisionEvents notifies objects and forwards the contacted gameplay object to the backend', () => {
  const physics = new GamePhysics(Config);
  const calls = [];

  const bumper = {
    objectId: 'bumper-1',
    objectType: 'bumper',
    collider: { handle: 10 },
    handleCollision() {
      calls.push('bumper:collision');
    },
    applyBumperForce(handle1, handle2) {
      calls.push(`bumper:force:${handle1}-${handle2}`);
    }
  };

  const ball = {
    objectId: 'ball',
    objectType: 'ball',
    collider: { handle: 11 },
    handleCollision() {
      calls.push('ball:collision');
    }
  };

  physics.registerObjects([bumper, ball]);
  physics.sendImpact = (object) => {
    calls.push(`impact:${object.objectId}`);
    return true;
  };
  physics.eventQueue = {
    drainCollisionEvents(callback) {
      callback(10, 11, true);
    }
  };

  physics.handleCollisionEvents();

  assert.deepEqual(calls, [
    'bumper:collision',
    'ball:collision',
    'bumper:force:10-11',
    'impact:bumper-1'
  ]);
});

test('handleCollisionEvents can report a rail collision while delegating the gameplay response to the ramp', () => {
  const physics = new GamePhysics(Config);
  const calls = [];

  const launchingRamp = {
    handleCollision() {
      calls.push('ramp:collision');
    },
    applyLaunchingRampForce(handle1, handle2) {
      calls.push(`ramp:force:${handle1}-${handle2}`);
    }
  };

  const leftRail = {
    objectId: 'launching-ramp-right-rail',
    objectType: 'launching_ramp_rail'
  };

  const ball = {
    objectId: 'ball',
    objectType: 'ball',
    collider: { handle: 11 }
  };

  physics.registerObjects([
    {
      collisionEntries: [
        { collider: { handle: 10 }, owner: leftRail, responder: launchingRamp }
      ]
    },
    ball
  ]);

  physics.sendImpact = (object) => {
    calls.push(`impact:${object.objectId}`);
    return true;
  };
  physics.eventQueue = {
    drainCollisionEvents(callback) {
      callback(10, 11, true);
    }
  };

  physics.handleCollisionEvents();

  assert.deepEqual(calls, [
    'ramp:collision',
    'ramp:force:10-11',
    'impact:launching-ramp-right-rail'
  ]);
});

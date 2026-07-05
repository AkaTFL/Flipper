import test from 'node:test';
import assert from 'node:assert/strict';

import Config from '../../frontend/playfield/physics/Config.js';
import { GamePhysics } from '../../frontend/playfield/physics/GamePhysics.js';

function withConfigPatch(key, value, callback) {
  const previousValue = Config[key];
  Config[key] = value;

  try {
    return callback();
  } finally {
    Config[key] = previousValue;
  }
}

function withPositioningPatch(key, value, callback) {
  const previousValue = Config.global.positioning[key];
  Config.global.positioning[key] = value;

  try {
    return callback();
  } finally {
    Config.global.positioning[key] = previousValue;
  }
}

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

test('setLaunchingRampVisible alterne la rampe de lancement et la rampe droite déjà chargées', () => {
  const physics = new GamePhysics(Config);
  const launchStates = [];
  const rightRampStates = [];
  const launchCollider = {
    collisionGroups() { return 0xffffffff; },
    setCollisionGroups(value) { launchStates.push(value); }
  };
  const rightRampCollider = {
    collisionGroups() { return 0xffffffff; },
    setCollisionGroups(value) { rightRampStates.push(value); }
  };

  physics.launchingRamp = {
    mesh: { visible: false },
    collider: launchCollider
  };
  physics.rampB = {
    mesh: { visible: true },
    collider: rightRampCollider
  };

  physics.setLaunchingRampVisible(true);
  assert.equal(physics.launchingRamp.mesh.visible, true);
  assert.equal(physics.rampB.mesh.visible, false);

  physics.setLaunchingRampVisible(false);
  assert.equal(physics.launchingRamp.mesh.visible, false);
  assert.equal(physics.rampB.mesh.visible, true);
  assert.deepEqual(launchStates, [0xffffffff, 0]);
  assert.deepEqual(rightRampStates, [0, 0xffffffff]);
});

test('checkLaunchingRampHeight attend la courbe puis échange les rampes à la sortie supérieure', () => {
  const physics = new GamePhysics(Config);
  let position = { x: -260, y: 10, z: 0 };
  const visibilityChanges = [];
  const velocityChanges = [];

  physics.controls = { impulseUsed: true };
  physics.launchingRampVisible = true;
  physics.ball = {
    rigidBody: {
      translation() { return position; },
      linvel() { return { x: 0, y: 2, z: 1234 }; },
      setLinvel(velocity) { velocityChanges.push(velocity); }
    }
  };
  physics.setLaunchingRampVisible = (visible) => {
    visibilityChanges.push(visible);
    physics.launchingRampVisible = visible;
  };

  physics.checkLaunchingRampHeight();
  assert.deepEqual(visibilityChanges, []);

  position = {
    x: Config.global.positioning.ball.position.x,
    y: 10,
    z: Config.global.positioning.launchingRamp.curveStartZ
  };
  physics.checkLaunchingRampHeight();
  assert.ok(velocityChanges[0].x > 0);
  assert.ok(Math.abs(
    Math.hypot(velocityChanges[0].x, velocityChanges[0].z) - 1234
  ) < 0.001);
  assert.deepEqual(visibilityChanges, []);

  position = {
    x: Config.global.positioning.launchingRamp.exitX
      - Config.global.positioning.launchingRamp.exitRadius - 1,
    y: 10,
    z: Config.global.positioning.launchingRamp.exitZ
  };
  physics.checkLaunchingRampHeight();
  assert.deepEqual(visibilityChanges, []);

  position = {
    x: Config.global.positioning.launchingRamp.exitX,
    y: 10,
    z: Config.global.positioning.launchingRamp.exitZ
  };
  physics.checkLaunchingRampHeight();
  assert.equal(physics.ballPassedAboveTriggerAfterRespawn, true);
  assert.deepEqual(visibilityChanges, [false]);
});

test('connectBackend uses the local backend endpoint when no browser config is provided', () => {
  const physics = new GamePhysics(Config);
  const previousWebSocket = globalThis.WebSocket;
  let createdUrl = null;

  class FakeWebSocket {
    constructor(url) {
      createdUrl = url;
    }

    addEventListener() {}
  }

  globalThis.WebSocket = FakeWebSocket;

  physics.connectBackend();

  assert.equal(createdUrl, 'ws://localhost:8080/ws');

  if (previousWebSocket === undefined) {
    delete globalThis.WebSocket;
  } else {
    globalThis.WebSocket = previousWebSocket;
  }
});

test('connectBackend uses the current frontend host when a browser proxy is available', () => {
  const physics = new GamePhysics(Config);
  const previousWebSocket = globalThis.WebSocket;
  const previousLocation = globalThis.location;
  let createdUrl = null;

  class FakeWebSocket {
    constructor(url) {
      createdUrl = url;
    }

    addEventListener() {}
  }

  globalThis.WebSocket = FakeWebSocket;
  globalThis.location = { protocol: 'http:', host: 'localhost:3001' };

  physics.connectBackend();

  assert.equal(createdUrl, 'ws://localhost:3001/ws');

  if (previousWebSocket === undefined) delete globalThis.WebSocket;
  else globalThis.WebSocket = previousWebSocket;

  if (previousLocation === undefined) delete globalThis.location;
  else globalThis.location = previousLocation;
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

test('sendMessage sends the documented high-level game event types', () => {
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

  assert.equal(physics.sendMessage('start_game'), true);
  assert.equal(physics.sendMessage('boss_fight_toggled'), true);
  assert.equal(physics.sendMessage('player_damage_test'), true);
  assert.equal(physics.sendMessage('ball_lost'), true);
  assert.equal(physics.sendMessage('save_game', { slot: 1 }), true);
  assert.equal(physics.sendMessage('load_game', { slot: 2 }), true);

  assert.deepEqual(sentPayloads.map((message) => message.type), [
    'start_game',
    'boss_fight_toggled',
    'player_damage_test',
    'ball_lost',
    'save_game',
    'load_game'
  ]);

  if (previousWebSocket === undefined) {
    delete globalThis.WebSocket;
  } else {
    globalThis.WebSocket = previousWebSocket;
  }
});

test('handleBackendMessage stores score_update payload for later UI consumption', () => {
  const physics = new GamePhysics(Config);

  const message = physics.handleBackendMessage(JSON.stringify({
    type: 'score_update',
    payload: {
      score: 325,
      delta: 200,
      comboMultiplier: 2,
      comboCount: 2,
      objectType: 'bumper'
    }
  }));

  assert.equal(message.type, 'score_update');
  assert.deepEqual(physics.lastScoreUpdate, {
    score: 325,
    delta: 200,
    comboMultiplier: 2,
    comboCount: 2,
    objectType: 'bumper'
  });
});

test('handleCollisionEvents triggers ball_lost when the ball hits the bottom wall drain', () => {
  const physics = new GamePhysics(Config);
  const sent = [];

  const ball = {
    objectId: 'ball',
    objectType: 'ball',
    collider: { handle: 11 },
    rigidBody: {
      setTranslation() {},
      setLinvel() {},
      setAngvel() {}
    },
    mesh: { position: { set() {} } }
  };

  const drain = {
    objectId: 'body-bottom-wall',
    objectType: 'drain',
    collider: { handle: 12 }
  };

  physics.ball = ball;
  physics.registerObjects([ball, drain]);
  physics.sendMessage = (type) => {
    sent.push(type);
    return true;
  };
  physics.setLaunchingRampVisible = () => {};
  physics.eventQueue = {
    drainCollisionEvents(callback) {
      callback(11, 12, true);
    }
  };

  physics.handleCollisionEvents();

  assert.deepEqual(sent, ['ball_lost']);
  assert.equal(physics._ballLostReported, true);
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

  // reportContactImpacts skips balls intentionally — only non-ball objects trigger sendImpact
  assert.deepEqual(calls, [
    'bumper:collision',
    'ball:collision',
    'bumper:force:10-11',
    'impact:bumper-1'
  ]);
});

test('handleCollisionEvents can report a ramp-side collision while delegating the gameplay response to the ramp', () => {
  const physics = new GamePhysics(Config);
  const calls = [];

  const launchingRamp = {
    objectType: 'launching_ramp',
    collider: { handle: 10 },
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

  // reportContactImpacts skips balls intentionally — only non-ball objects trigger sendImpact
  assert.deepEqual(calls, [
    'ramp:collision',
    'impact:launching-ramp-right-rail'
  ]);
});

test('step only verifies ramp traversal after a collision is detected', () => {
  const physics = new GamePhysics(Config);
  const calls = [];

  physics.world = {
    step() {
      calls.push('world:step');
    }
  };

  physics.eventQueue = {
    drainCollisionEvents(callback) {
      callback(10, 11, true);
    }
  };

  // updateRollingBallSound requires a live ball with rigidBody — stub it out
  physics.updateRollingBallSound = function () {};

  physics.handleCollisionEvents = function () {
    calls.push('collision');
    return true;
  };

  physics.detectRampTraversal = function () {
    calls.push('ramp-check');
  };

  physics.detectScoreZoneEntries = function () {
    calls.push('score-check');
  };

  physics.checkLaunchingRampHeight = function () {};
  physics.checkBallOutOfBounds = function () {};

  physics.step();

  assert.deepEqual(calls, [
    'world:step',
    'collision',
    'score-check'
  ]);
});

test('detectScoreZoneEntries emits more specific target and star impacts when the ball enters configured zones', () => {
  withPositioningPatch('scoreZones', {
    instances: [
      {
        id: 'target-left-centre',
        type: 'target',
        center: { x: 10, y: 0, z: -10 },
        size: { x: 20, y: 20, z: 20 }
      },
      {
        id: 'star-center-exact',
        type: 'star_zone',
        center: { x: 0, y: 0, z: -30 },
        size: { x: 30, y: 20, z: 20 }
      }
    ]
  }, () => {
    const physics = new GamePhysics(Config);
    const sent = [];
    physics.sendImpact = (payload) => {
      sent.push(`${payload.objectType}:${payload.objectId}`);
      return true;
    };

    const ball = {
      objectId: 'ball',
      objectType: 'ball',
      rigidBody: {
        translation() {
          return { x: 10, y: 0, z: -10 };
        }
      }
    };

    physics.registerObjects([ball]);
    physics.detectScoreZoneEntries();

    assert.deepEqual(sent, ['target:target-left-centre']);

    ball.rigidBody.translation = () => ({ x: 0, y: 0, z: -30 });
    physics.detectScoreZoneEntries();

    assert.deepEqual(sent, [
      'target:target-left-centre',
      'star_zone:star-center-exact'
    ]);
  });
});

test('detectScoreZoneEntries does not spam the same zone until the ball exits and re-enters', () => {
  withPositioningPatch('scoreZones', {
    instances: [
      {
        id: 'loop-left',
        type: 'lane',
        center: { x: 50, y: 0, z: 50 },
        size: { x: 40, y: 20, z: 40 }
      }
    ]
  }, () => {
    const physics = new GamePhysics(Config);
    const sent = [];
    physics.sendImpact = (payload) => {
      sent.push(payload.objectId);
      return true;
    };

    const ball = {
      objectId: 'ball',
      objectType: 'ball',
      rigidBody: {
        translation() {
          return { x: 50, y: 0, z: 50 };
        }
      }
    };

    physics.registerObjects([ball]);

    physics.detectScoreZoneEntries();
    physics.detectScoreZoneEntries();
    assert.deepEqual(sent, ['loop-left']);

    ball.rigidBody.translation = () => ({ x: 200, y: 0, z: 200 });
    physics.detectScoreZoneEntries();

    ball.rigidBody.translation = () => ({ x: 50, y: 0, z: 50 });
    physics.detectScoreZoneEntries();

    assert.deepEqual(sent, ['loop-left', 'loop-left']);
  });
});

test('detectRampTraversal emits ramp-main-perfect when the ball crosses the ramp without wall bounce', () => {
  withPositioningPatch('ramps', {
    instances: [
      {
        entryZone: {
          id: 'ramp-main-entry',
          center: { x: 0, y: 0, z: 0 },
          size: { x: 20, y: 20, z: 20 }
        }
      }
    ],
    exitZone: {
      id: 'ramp-main-exit',
      center: { x: 0, y: 0, z: 100 },
      size: { x: 20, y: 20, z: 20 }
    },
    timeoutMs: 4000
  }, () => {
    const physics = new GamePhysics(Config);
    const sent = [];
    physics.sendImpact = (payload) => {
      sent.push(`${payload.objectType}:${payload.objectId}`);
      return true;
    };

    const ball = {
      objectId: 'ball',
      objectType: 'ball',
      rigidBody: {
        translation() {
          return { x: 0, y: 0, z: 0 };
        }
      }
    };

    physics.registerObjects([ball]);

    physics.detectRampTraversal();
    ball.rigidBody.translation = () => ({ x: 0, y: 0, z: 100 });
    physics.activeRampZones.clear();
    physics.detectRampTraversal();

    assert.deepEqual(sent, ['launching-ramp:ramp-main-perfect']);
  });
});

test('detectRampTraversal emits ramp-main-simple when the traversal records a wall bounce', () => {
  withPositioningPatch('ramps', {
    instances: [
      {
        entryZone: {
          id: 'ramp-main-entry',
          center: { x: 0, y: 0, z: 0 },
          size: { x: 20, y: 20, z: 20 }
        }
      }
    ],
    exitZone: {
      id: 'ramp-main-exit',
      center: { x: 0, y: 0, z: 100 },
      size: { x: 20, y: 20, z: 20 }
    },
    timeoutMs: 4000
  }, () => {
    const physics = new GamePhysics(Config);
    const sent = [];
    physics.sendImpact = (payload) => {
      sent.push(`${payload.objectType}:${payload.objectId}`);
      return true;
    };

    const ball = {
      objectId: 'ball',
      objectType: 'ball',
      rigidBody: {
        translation() {
          return { x: 0, y: 0, z: 0 };
        }
      }
    };

    physics.registerObjects([ball]);

    physics.detectRampTraversal();
    physics.rampTraversal.hasWallBounce = true;
    ball.rigidBody.translation = () => ({ x: 0, y: 0, z: 100 });
    physics.detectRampTraversal();

    assert.deepEqual(sent, ['launching-ramp:ramp-main-simple']);
  });
});

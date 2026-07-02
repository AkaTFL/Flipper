import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import Config from '../../frontend/playfield/physics/Config.js';
import { Palles } from '../../frontend/playfield/objects/Palles.js';
import { Ramp } from '../../frontend/playfield/objects/Ramp.js';

test('la rampe garantit une vitesse minimale pour atteindre le rail', () => {
  const ramp = Object.create(Ramp.prototype);
  ramp.objectId = 'ramp-b';
  ramp._railCenter = new THREE.Vector3(0, 90, 120);

  let appliedVelocity = null;
  const ballBody = {
    translation: () => ({ x: 0, y: 0, z: 0 }),
    linvel: () => ({ x: 1, y: 0, z: 1 }),
    setLinvel: (velocity) => {
      appliedVelocity = velocity;
    }
  };

  ramp._launchBallTowardRail(ballBody);

  const resultingSpeed = Math.hypot(
    appliedVelocity.x,
    appliedVelocity.y,
    appliedVelocity.z
  );

  assert.ok(appliedVelocity.y > 0);
  assert.ok(appliedVelocity.z > 0);
  assert.ok(Math.abs(resultingSpeed - Config.global.positioning.ramps.B.minimumLaunchSpeed) < 1e-9);
});

test('la rampe conserve une vitesse supérieure au minimum', () => {
  const ramp = Object.create(Ramp.prototype);
  ramp.objectId = 'ramp-b';
  ramp._railCenter = new THREE.Vector3(0, 90, 120);

  let appliedVelocity = null;
  const ballBody = {
    translation: () => ({ x: 0, y: 0, z: 0 }),
    linvel: () => ({ x: 0, y: 0, z: 250 }),
    setLinvel: (velocity) => {
      appliedVelocity = velocity;
    }
  };

  ramp._launchBallTowardRail(ballBody);

  assert.ok(Math.abs(Math.hypot(
    appliedVelocity.x,
    appliedVelocity.y,
    appliedVelocity.z
  ) - 250) < 1e-9);
});

test('le propulseur guide immédiatement la bille vers le rail', () => {
  const ramp = Object.create(Ramp.prototype);
  ramp._railCenter = new THREE.Vector3(0, 90, 120);
  ramp._railExit = new THREE.Vector3(0, 180, 240);
  ramp._propulsionTimer = null;

  let appliedVelocity = null;
  const ballBody = {
    translation: () => ({ x: 0, y: 0, z: 0 }),
    setLinvel: (velocity) => {
      appliedVelocity = velocity;
    }
  };

  ramp._startGuidedPropulsion(ballBody);
  clearInterval(ramp._propulsionTimer);
  ramp._propulsionTimer = null;

  assert.ok(appliedVelocity.y > 0);
  assert.ok(appliedVelocity.z > 0);
  assert.ok(Math.abs(Math.hypot(
    appliedVelocity.x,
    appliedVelocity.y,
    appliedVelocity.z
  ) - Config.global.positioning.ramps.B.propulsionSpeed) < 1e-9);
});

test("seule la collision avec l'entrée physique de la rampe déclenche le propulseur", () => {
  const ramp = Object.create(Ramp.prototype);
  ramp.objectId = 'ramp-b';
  ramp._railCenter = new THREE.Vector3(0, 90, 120);
  ramp._launching = false;
  ramp.entranceCollider = { handle: 42 };
  ramp.scene = { effectManager: { impact() {} } };
  ramp.mesh = { position: new THREE.Vector3() };

  let activationCount = 0;
  ramp._activatePropulsion = () => {
    activationCount += 1;
    return true;
  };

  ramp.gamePhysics = { ball: { rigidBody: {} } };

  ramp.handleCollision({ handle1: 7, handle2: 8 });
  assert.equal(activationCount, 0);
  ramp.handleCollision({ handle1: 7, handle2: 42 });
  assert.equal(activationCount, 1);
});

test('les palles appliquent immédiatement leur force maximale et un relâchement court interrompt le coup', () => {
  const palle = Object.create(Palles.prototype);
  palle.isLeft = true;
  palle.angle = Math.PI / 4;
  palle.rotationSpeed = Config.global.positioning.palles.rotationSpeed;
  palle.motorStiffness = Config.global.positioning.palles.motorStiffness;
  palle.motorDamping = Config.global.positioning.palles.motorDamping;
  palle.wasActive = false;
  palle.playSound = () => {};

  let motor = null;
  palle.joint = {
    configureMotorPosition(angle, stiffness, damping) {
      motor = { angle, stiffness, damping };
    }
  };

  palle.setActive(true);
  assert.equal(motor.angle, palle.angle);
  assert.equal(motor.stiffness, Config.global.positioning.palles.motorStiffness);

  palle.setActive(false);

  assert.equal(motor.angle, 0);
  assert.equal(motor.stiffness, Config.global.positioning.palles.motorStiffness);
  assert.equal(motor.damping, Config.global.positioning.palles.motorDamping);
  assert.ok(motor.damping > 5);
});

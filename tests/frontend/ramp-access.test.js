import test from 'node:test';
import assert from 'node:assert/strict';
import Config from '../../frontend/playfield/physics/Config.js';
import { Palles } from '../../frontend/playfield/objects/Palles.js';
import { Controls } from '../../frontend/playfield/core/Controls.js';

test('les palles appliquent immédiatement leur force maximale et un relâchement court interrompt le coup', () => {
  const palle = Object.create(Palles.prototype);
  palle.isLeft = true;
  palle.angle = Math.PI / 4;
  palle.rotationSpeed = Config.global.positioning.palles.rotationSpeed;
  palle.motorStiffness = Config.global.positioning.palles.motorStiffness;
  palle.motorDamping = Config.global.positioning.palles.motorDamping;
  palle.wasActive = null;
  palle.playSound = () => {};

  let motor = null;
  let motorUpdates = 0;
  palle.joint = {
    configureMotorPosition(angle, stiffness, damping) {
      motorUpdates += 1;
      motor = { angle, stiffness, damping };
    }
  };

  palle.setActive(false);
  assert.equal(motor.angle, 0);
  assert.equal(motorUpdates, 1);

  palle.setActive(true);
  palle.setActive(true);
  assert.equal(motor.angle, palle.angle);
  assert.equal(motor.stiffness, Config.global.positioning.palles.motorStiffness);
  assert.equal(motorUpdates, 2);

  palle.setActive(false);

  assert.equal(motor.angle, 0);
  assert.equal(motor.stiffness, Config.global.positioning.palles.motorStiffness);
  assert.equal(motor.damping, Config.global.positioning.palles.motorDamping);
  assert.ok(motor.damping > 5);
  assert.equal(motorUpdates, 3);
});

test('le lanceur garantit une vitesse minimale utile et plafonne les appuis longs', () => {
  const controls = Object.create(Controls.prototype);
  const launch = Config.global.positioning.launchingRamp;

  assert.equal(controls.calculateLaunchSpeed(0), launch.minimalSpeed);
  assert.ok(controls.calculateLaunchSpeed(200) > launch.minimalSpeed);
  assert.equal(controls.calculateLaunchSpeed(launch.chargeDurationMs), launch.maximalSpeed);
  assert.equal(controls.calculateLaunchSpeed(10000), launch.maximalSpeed);
});

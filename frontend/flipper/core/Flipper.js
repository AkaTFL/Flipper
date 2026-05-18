import { Scene } from './Scene.js';

import { Ball } from '../objects/Ball.js';
import { Wall } from '../objects/Wall.js';
import { Bumper } from '../objects/Bumper.js';
import { BumperTriangleLeft, BumperTriangleRight } from '../objects/BumperTriangle.js';
import { LaunchingRamp } from '../objects/LaunchingRamp.js';
import { Palles } from '../objects/Palles.js';
import { RampA, RampB } from '../objects/Ramp.js';
import { Controls } from './Controls.js';
import { ScoreDisplay } from '../../ui/ScoreDisplay.js';

import Config from '../physics/Config.js';
import { GamePhysics } from '../physics/GamePhysics.js';

async function initFlipper() {
    const physics = new GamePhysics();
    await physics.init();

    const sceneManager = new Scene(
        physics.world, 
        Config.scene.manager.width, 
        Config.scene.manager.height, 
        Config.scene.manager.position, 
        Config.scene.manager.rotation
    );

    const container = document.getElementById('three');
    const controls = new Controls('q', 'd', 'space');
    const scoreDisplay = new ScoreDisplay();
    scoreDisplay.mount(container);
    container.appendChild(sceneManager.renderer.domElement);
    let startGameSent = false;

    controls.setStartGameCallback(() => {
        if (startGameSent) {
            return;
        }

        if (physics.sendMessage('start_game')) {
            startGameSent = true;
        }
    });
    controls.setBossFightStartCallback(() => {
        physics.sendMessage('boss_fight_toggled');
    });
    controls.setPlayerDamageCallback(() => {
        physics.sendMessage('boss_attack_test');
    });
    controls.setBallLostCallback(() => {
        physics.sendMessage('ball_lost');
    });

    const mesh = [];

    // Walls
    Config.wall.instances.forEach(wall => {
        mesh.push(new Wall(physics, wall.length, wall.height, wall.position, wall.rotation, wall.objectId));
    });

    // Launching Ramp
    const launching = new LaunchingRamp(
      physics.world,
      Config.launchingRamp.length,
      Config.launchingRamp.width,
      Config.launchingRamp.height,
      Config.launchingRamp.position,
      Config.launchingRamp.rotation,
      Config.launchingRamp.objectId
    );
    controls.setLaunchingRampRef(launching);
    mesh.push(launching);

    // // Ramps
    // const rampA = new RampA(physics.world, Config.ramps?.A);
    // mesh.push(rampA);

    const rampB = new RampB(physics.world, Config.ramps.B);
    mesh.push(rampB);

    // Bumpers
    Config.bumpers = Config.bumper.instances;
    Config.bumpers.forEach((bumperConfig) => {
        mesh.push(new Bumper(
            physics.world,
            bumperConfig.width,
            bumperConfig.position,
            bumperConfig.rotation,
            bumperConfig.objectId
        ));
    });

    // Triangle Bumpers
    (Config.bumpers_triangle || []).forEach((triangleConfig) => {
        const TriangleClass = triangleConfig.variant === 'right'
            ? BumperTriangleRight
            : BumperTriangleLeft;

        mesh.push(new TriangleClass(
            physics.world,
            triangleConfig.width,
            triangleConfig.position,
            triangleConfig.rotation,
            triangleConfig.objectId
        ));
    });

    // Palles
    Config.palles.instances.forEach(pnl => {
        mesh.push(new Palles(physics.world, pnl.length, pnl.width, pnl.height, pnl.position, pnl.rotation, pnl.side));
    });

    // Ball
    const ball = new Ball(physics.world, Config.ball.position);
    mesh.push(ball);
    controls.setBallRef(ball);

    physics.registerObjects(mesh);

    sceneManager.scene.add(...mesh.map(obj => obj.mesh));

    sceneManager.startRender(physics, () => {
        controls.setLaunchChargeCount(0);

        for (let i = 0; i < mesh.length; i++) {
            if (typeof mesh[i].syncPalle === 'function') {
                mesh[i].syncPalle();
            }
            else if (typeof mesh[i].syncBall === 'function') {
                mesh[i].syncBall();
            }
            if (typeof mesh[i].setActive === 'function') {
                if (mesh[i].side === 'left') {
                    mesh[i].setActive(controls.input.left);
                } else if (mesh[i].side === 'right') {
                    mesh[i].setActive(controls.input.right);
                }
            }
        }
    });
}

initFlipper();

import { Scene } from './Scene.js';

import { Ball } from '../objects/Ball.js';
import { Wall } from '../objects/Wall.js';
import { Bumper } from '../objects/Bumper.js';
import { BumperTriangleLeft, BumperTriangleRight } from '../objects/BumperTriangle.js';
import { LaunchingRamp } from '../objects/LaunchingRamp.js';
import { Palles } from '../objects/Palles.js';
import { Controls } from './Controls.js';
import { Ramp } from '../objects/Ramp.js';
import { StaticMesh } from '../objects/StaticMesh.js';


import { ScoreDisplay } from '../ui/ScoreDisplay.js';
import { DmdDisplay } from '../ui/DmdDisplay.js';

import Config from '../physics/Config.js';
import { GamePhysics } from '../physics/GamePhysics.js';

export async function initFlipper() {
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
    const dmdDisplay = new DmdDisplay();
    scoreDisplay.mount(container);
    dmdDisplay.mount(container);
    container.appendChild(sceneManager.renderer.domElement);

    scoreDisplay.setSaveSlotHandler((slot) => {
        physics.sendMessage('save_game', { slot });
    });

    scoreDisplay.setLoadSlotHandler((slot) => {
        physics.sendMessage('load_game', { slot });
    });

    let startGameSent = false;

    const startGame = () => {
        if (startGameSent) {
            return;
        }

        if (physics.sendMessage('start_game')) {
            startGameSent = true;
        }
    };

    controls.setStartGameCallback(startGame);
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
    
    launching.gamePhysics = physics;
    controls.setLaunchingRampRef(launching);
    mesh.push(launching);

    const rampB = new Ramp(
        physics.world,
        Config.ramps.B.model,
        Config.ramps.B,
        Config.ramps.B.objectId
    );
    rampB.gamePhysics = physics;
    mesh.push(rampB);

    // Bumpers
    Config.bumpers = Config.bumper.instances;
    Config.bumpers.forEach((bumperConfig) => {
        const bumper = new Bumper(
            physics.world,
            bumperConfig.width,
            bumperConfig.position,
            bumperConfig.rotation,
            bumperConfig.objectId
        );
        bumper.gamePhysics = physics;
        mesh.push(bumper);
    });

    // Triangle Bumpers
    (Config.bumpers_triangle || []).forEach((triangleConfig) => {
        const TriangleClass = triangleConfig.variant === 'right'
            ? BumperTriangleRight
            : BumperTriangleLeft;

        const tri = new TriangleClass(
            physics.world,
            triangleConfig.width,
            triangleConfig.position,
            triangleConfig.rotation,
            triangleConfig.objectId
        );
        tri.gamePhysics = physics;
        mesh.push(tri);
    });

    // Palles
    Config.palles.instances.forEach(pnl => {
        const pal = new Palles(physics.world, pnl.length, pnl.width, pnl.height, pnl.position, pnl.rotation, pnl.side);
        pal.gamePhysics = physics;
        mesh.push(pal);
    });

    // Etage (sol principal du flipper)
    const etage = new StaticMesh(physics.world, Config.etage.model, {
        length:    Config.etage.length,
        width:     Config.etage.width,
        height:    Config.etage.height,
        radius:    Config.etage.radius,
        side:      Config.etage.side,
        position:  Config.etage.position,
        rotation:  Config.etage.rotation,
        objectId:  Config.etage.objectId,
        objectType: Config.etage.objectType
    });
    etage.gamePhysics = physics;
    mesh.push(etage);

    // Body flipper (structure principale depuis Mesh_final)
    const bodyFlipper = new StaticMesh(physics.world, Config.bodyFlipper.model, {
        length:     Config.bodyFlipper.length,
        width:      Config.bodyFlipper.width,
        height:     Config.bodyFlipper.height,
        radius:     Config.bodyFlipper.radius,
        side:       Config.bodyFlipper.side,
        color:      Config.bodyFlipper.color,
        position:   Config.bodyFlipper.position,
        rotation:   Config.bodyFlipper.rotation,
        objectId:   Config.bodyFlipper.objectId,
        objectType: Config.bodyFlipper.objectType
    });
    bodyFlipper.gamePhysics = physics;
    mesh.push(bodyFlipper);

    // Static meshes from Mesh_final (murs_cible, quadri_cible, raque_side)
    (Config.staticMeshes || []).forEach((cfg) => {
        const staticMesh = new StaticMesh(physics.world, cfg.model, {
            position: cfg.position,
            rotation: cfg.rotation,
            objectId: cfg.objectId,
            objectType: cfg.objectType
        });
        staticMesh.gamePhysics = physics;
        mesh.push(staticMesh);
    });

    // Ramp pales (right, left, rightDeath, leftDeath)
    Object.values(Config.rampPales).forEach(cfg => {
        const rampPale = new StaticMesh(physics.world, cfg.model, {
            length:     cfg.length,
            width:      cfg.width,
            height:     cfg.height,
            position:   cfg.position,
            rotation:   cfg.rotation,
            objectId:   cfg.objectId,
            objectType: cfg.objectType
        });
        rampPale.gamePhysics = physics;
        mesh.push(rampPale);
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

import { Scene } from './Scene.js';

import { Ball } from '../objects/Ball.js';
import { Wall } from '../objects/Wall.js';
import { Bumper } from '../objects/Bumper.js';
import { LaunchingRamp } from '../objects/LaunchingRamp.js';
import { Palles } from '../objects/Palles.js';
import { Controls } from './Controls.js';
import { Ramp } from '../objects/Ramp.js';
import { StaticMesh } from '../objects/StaticMesh.js';
import { Repulse } from '../objects/Repulse.js';


import { ScoreDisplay } from '../ui/ScoreDisplay.js';

import Config from '../physics/Config.js';
import { GamePhysics } from '../physics/GamePhysics.js';

export async function initFlipper() {
    const physics = new GamePhysics();
    await physics.init();

    const waitForMesh = (obj) => {
        return new Promise((resolve) => {
            if (obj?.mesh) {
                resolve();
                return;
            }

            const interval = setInterval(() => {
                if (obj?.mesh) {
                    clearInterval(interval);
                    resolve();
                }
            }, 8);
        });
    };

    const mesh = [];
    const loadingPromises = [];

    const sceneManager = new Scene(
        physics.world, 
        Config.global.positioning.scene.manager.width, 
        Config.global.positioning.scene.manager.height, 
        Config.global.positioning.scene.manager.position, 
        Config.global.positioning.scene.manager.rotation
    );

    const container = document.getElementById('three');
    const controls = new Controls('q', 'd', 'space');
    physics.controls = controls;
    physics.scene = sceneManager.scene;
    const scoreDisplay = new ScoreDisplay();
    scoreDisplay.mount(container);
    container.appendChild(sceneManager.renderer.domElement);

    const saveSlotHandler = (slot) => {
        physics.sendMessage('save_game', { slot });
    };

    const loadSlotHandler = (slot) => {
        physics.sendMessage('load_game', { slot });
    };

    if (typeof scoreDisplay.setSaveSlotHandler === 'function') {
        scoreDisplay.setSaveSlotHandler(saveSlotHandler);
    } else {
        scoreDisplay.onSaveSlot = saveSlotHandler;
    }

    if (typeof scoreDisplay.setLoadSlotHandler === 'function') {
        scoreDisplay.setLoadSlotHandler(loadSlotHandler);
    } else {
        scoreDisplay.onLoadSlot = loadSlotHandler;
    }

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
        physics.triggerBallLost('manual');
    });

    // Launching Ramp
    const launching = new LaunchingRamp(
      physics.world,
      Config.global.positioning.launchingRamp.length,
      Config.global.positioning.launchingRamp.width,
      Config.global.positioning.launchingRamp.height,
      Config.global.positioning.launchingRamp.position,
      Config.global.positioning.launchingRamp.rotation,
      Config.global.positioning.launchingRamp.objectId
    );
    
    launching.gamePhysics = physics;
    controls.setLaunchingRampRef(launching);
    mesh.push(launching);
    loadingPromises.push(waitForMesh(launching));

    const rampB = new Ramp(
        physics.world,
        Config.global.positioning.ramps.B.model,
        Config.global.positioning.ramps.B,
        Config.global.positioning.ramps.B.objectId
    );
    rampB.gamePhysics = physics;
    mesh.push(rampB);
    loadingPromises.push(waitForMesh(rampB));
    // Bumpers
    Config.global.positioning.bumpers = Config.global.positioning.bumper.instances;
    Config.global.positioning.bumpers.forEach((bumperConfig) => {
        const bumper = new Bumper(
            sceneManager.getCamera(),
            physics.world,
            bumperConfig.width,
            bumperConfig.position,
            bumperConfig.rotation,
            bumperConfig.objectId
        );
        bumper.gamePhysics = physics;
        mesh.push(bumper);
        loadingPromises.push(waitForMesh(bumper));
    });

    // Repulse
    Config.global.positioning.repulse = Config.global.positioning.repulse.instances;
    Config.global.positioning.repulse.forEach((repulseConfig) => {
        const repulse = new Repulse(
            sceneManager.getCamera(),
            physics.world,
            repulseConfig.length,
            repulseConfig.width,
            repulseConfig.height,
            repulseConfig.position,
            repulseConfig.rotation,
            repulseConfig.objectId
        );
        repulse.gamePhysics = physics;
        mesh.push(repulse);
        loadingPromises.push(waitForMesh(repulse));
    });

    // Palles
    Config.global.positioning.palles.instances.forEach(pnl => {
        const pal = new Palles(physics.world, pnl.length, pnl.width, pnl.height, pnl.position, pnl.rotation, pnl.side);
        pal.gamePhysics = physics;
        mesh.push(pal);
        loadingPromises.push(waitForMesh(pal));
    });

    // Etage (sol principal du flipper)
    const etage = new StaticMesh(physics.world, Config.global.positioning.etage.model, {
        length:    Config.global.positioning.etage.length,
        width:     Config.global.positioning.etage.width,
        height:    Config.global.positioning.etage.height,
        radius:    Config.global.positioning.etage.radius,
        side:      Config.global.positioning.etage.side,
        position:  Config.global.positioning.etage.position,
        rotation:  Config.global.positioning.etage.rotation,
        objectId:  Config.global.positioning.etage.objectId,
        objectType: Config.global.positioning.etage.objectType
    });
    etage.gamePhysics = physics;
    mesh.push(etage);
    loadingPromises.push(waitForMesh(etage));

    // Body flipper (structure principale depuis Mesh_final)
    const bodyFlipper = new StaticMesh(physics.world, Config.global.positioning.bodyFlipper.model, {
        length:     Config.global.positioning.bodyFlipper.length,
        width:      Config.global.positioning.bodyFlipper.width,
        height:     Config.global.positioning.bodyFlipper.height,
        radius:     Config.global.positioning.bodyFlipper.radius,
        side:       Config.global.positioning.bodyFlipper.side,
        position:   Config.global.positioning.bodyFlipper.position,
        rotation:   Config.global.positioning.bodyFlipper.rotation,
        objectId:   Config.global.positioning.bodyFlipper.objectId,
        objectType: Config.global.positioning.bodyFlipper.objectType
    });
    bodyFlipper.gamePhysics = physics;
    mesh.push(bodyFlipper);
    loadingPromises.push(waitForMesh(bodyFlipper));

    // Static meshes from Mesh_final (murs_cible, quadri_cible, raque_side)
    (Config.global.positioning.staticMeshes || []).forEach((cfg) => {
        const staticMesh = new StaticMesh(physics.world, cfg.model, {
            length: cfg.length,
            width: cfg.width,
            height: cfg.height,
            position: cfg.position,
            rotation: cfg.rotation,
            objectId: cfg.objectId,
            objectType: cfg.objectType
        });
        staticMesh.gamePhysics = physics;
        mesh.push(staticMesh);
        loadingPromises.push(waitForMesh(staticMesh));
    });

    // Ramp pales (right, left, rightDeath, leftDeath)
    Object.values(Config.global.positioning.rampPales).forEach(cfg => {
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
        loadingPromises.push(waitForMesh(rampPale));
    });


    setTimeout(() => {
        const ball = new Ball(sceneManager.scene, physics.world, Config.global.positioning.ball.position, physics);
        mesh.push(ball);

        controls.setBallRef(ball);
        physics.registerObjects(mesh);
        sceneManager.scene.add(ball.mesh);
    }, 5000);

    sceneManager.scene.add(...mesh.map(obj => obj.mesh));
    
    physics.setLaunchingRampVisible(true);

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
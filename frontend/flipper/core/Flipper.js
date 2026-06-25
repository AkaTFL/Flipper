import { Scene } from './Scene.js';

import { Ball } from '../objects/Ball.js';
import { Wall } from '../objects/Wall.js';
import { Bumper } from '../objects/Bumper.js';
import { LaunchingRamp } from '../objects/LaunchingRamp.js';
import { Palles } from '../objects/Palles.js';
import { Controls } from './Controls.js';
import { CabinetButtons } from './CabinetButtons.js';
import { Ramp } from '../objects/Ramp.js';
import { StaticMesh } from '../objects/StaticMesh.js';
import { Repulse } from '../objects/Repulse.js';

import Config from '../physics/Config.js';
import { GamePhysics } from '../physics/GamePhysics.js';
import { AudioManager } from '../physics/Audio.js';

export async function initFlipper() {
    AudioManager.getShared().unlock();

    const physics = new GamePhysics();
    await physics.init();

    const waitFormeshes = (obj) => {
    return new Promise((resolve) => {
        if (obj?.objectType === 'ball') { resolve(); return;} 

        if (obj?.modelRoot) { resolve(); return; }
            const interval = setInterval(() => {
                if (obj?.modelRoot) { clearInterval(interval); resolve(); }
            }, 8);
        });
    };

    const meshes = [];
    const loadingPromises = [];

    const sceneManager = new Scene(
        physics.world, 
        Config.global.positioning.scene.manager.width, 
        Config.global.positioning.scene.manager.height, 
        Config.global.positioning.scene.manager.position, 
        Config.global.positioning.scene.manager.rotation
    );

    const container = document.getElementById('three');
    const controls = new Controls(['q', 'w'], ['d', 'c'], 'space', 'b');
    const cabinetButtons = new CabinetButtons();
    cabinetButtons.connect();
    physics.controls = controls;
    physics.scene = sceneManager.scene;

    container.appendChild(sceneManager.renderer.domElement);

    const saveSlotHandler = (slot) => {
        physics.sendMessage('save_game', { slot });
    };

    const loadSlotHandler = (slot) => {
        physics.sendMessage('load_game', { slot });
    };

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
        sceneManager,
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
    meshes.push(launching);
    loadingPromises.push(waitFormeshes(launching));

    const rampB = new Ramp(
        sceneManager,
        physics.world,
        Config.global.positioning.ramps.B.length,
        Config.global.positioning.ramps.B.width,
        Config.global.positioning.ramps.B.height,
        Config.global.positioning.ramps.B.position,
        Config.global.positioning.ramps.B.rotation,
        Config.global.positioning.ramps.B.model,
        Config.global.positioning.ramps.B.objectId
    );
    rampB.gamePhysics = physics;
    meshes.push(rampB);
    loadingPromises.push(waitFormeshes(rampB));
    // Bumpers
    Config.global.positioning.bumpers = Config.global.positioning.bumper.instances;
    Config.global.positioning.bumpers.forEach((bumperConfig) => {
        const bumper = new Bumper(
            sceneManager,
            physics.world,
            bumperConfig.width,
            bumperConfig.position,
            bumperConfig.rotation,
            bumperConfig.objectId
        );
        bumper.gamePhysics = physics;
        meshes.push(bumper);
        loadingPromises.push(waitFormeshes(bumper));
    });

    // Repulse
    Config.global.positioning.repulse.instances.forEach((repulseConfig) => {
        const repulse = new Repulse(
            sceneManager,
            physics.world,
            repulseConfig.length,
            repulseConfig.width,
            repulseConfig.height,
            repulseConfig.position,
            repulseConfig.rotation,
            repulseConfig.objectId
        );
        repulse.gamePhysics = physics;
        meshes.push(repulse);
        loadingPromises.push(waitFormeshes(repulse));
    });

    // Palles
    const pallesInstances = Config.global.positioning.palles.instances;

    pallesInstances.forEach((pnl) => {
        const pal = new Palles(sceneManager, physics.world, pnl.length, pnl.width, pnl.height, pnl.position, pnl.rotation, pnl.side);
        pal.gamePhysics = physics;
        meshes.push(pal);
        loadingPromises.push(waitFormeshes(pal));
    });

    // Etage (sol principal du flipper)
    const etage = new StaticMesh(sceneManager, physics.world, Config.global.positioning.etage.model, {
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
    meshes.push(etage);
    loadingPromises.push(waitFormeshes(etage));

    // Body flipper (structure principale depuis meshes_final)
    const bodyFlipper = new StaticMesh(sceneManager, physics.world, Config.global.positioning.bodyFlipper.model, {
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
    meshes.push(bodyFlipper);
    loadingPromises.push(waitFormeshes(bodyFlipper));

    // Static meshes from meshes_final (murs_cible, quadri_cible, raque_side)
    (Config.global.positioning.StaticMesh || []).forEach((cfg) => {
        const staticMesh = new StaticMesh(sceneManager, physics.world, cfg.model, {
            length: cfg.length,
            width: cfg.width,
            height: cfg.height,
            position: cfg.position,
            rotation: cfg.rotation,
            objectId: cfg.objectId,
            objectType: cfg.objectType
        });
        staticMesh.gamePhysics = physics;
        meshes.push(staticMesh);
        loadingPromises.push(waitFormeshes(staticMesh));
    });

    // Ramp pales (right, left, rightDeath, leftDeath)
    Object.values(Config.global.positioning.rampPales).forEach(cfg => {
        const rampPale = new StaticMesh(sceneManager, physics.world, cfg.model, {
            length:     cfg.length,
            width:      cfg.width,
            height:     cfg.height,
            position:   cfg.position,
            rotation:   cfg.rotation,
            objectId:   cfg.objectId,
            objectType: cfg.objectType
        });
        rampPale.gamePhysics = physics;
        meshes.push(rampPale);
        loadingPromises.push(waitFormeshes(rampPale));
    });

    
    const ball = new Ball(sceneManager, physics.world, Config.global.positioning.ball.position, physics);
    meshes.push(ball);

    controls.setBallRef(ball);
    physics.registerObjects(meshes);

    await Promise.all(loadingPromises);

    await waitFormeshes(ball);
    
    if (ball.rigidBody) {
        ball.rigidBody.setEnabled(false);
    }

    // Attendre que tout soit chargé
    await Promise.all(loadingPromises);

    if (ball.rigidBody) {
        setTimeout(() => {
            ball.rigidBody.setEnabled(true);
        }, 8000);
    }

    sceneManager.scene.add(...meshes.map(obj => obj.mesh));
    sceneManager.postProcessing.updateOutlineObjects();
    
    physics.setLaunchingRampVisible(true);

    sceneManager.startRender(physics, () => {
        controls.setLaunchChargeCount(0);

        for (let i = 0; i < meshes.length; i++) {
            if (typeof meshes[i].syncPalle === 'function') {
                meshes[i].syncPalle();
            }
            else if (typeof meshes[i].syncBall === 'function') {
                meshes[i].syncBall();
            }
            if (typeof meshes[i].setActive === 'function') {
                if (meshes[i].side === 'left') {
                    meshes[i].setActive(controls.input.left);
                } else if (meshes[i].side === 'right') {
                    meshes[i].setActive(controls.input.right);
                }
            }
        }
    });
    
}

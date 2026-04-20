import { Scene } from './Scene.js';

import { Ball } from '../objects/Ball.js';
import { Wall } from '../objects/Wall.js';
import { Bumper } from '../objects/Bumper.js';
import { LaunchingRamp } from '../objects/LaunchingRamp.js';
import { Palles } from '../objects/Palles.js';
import { Controls } from './Controls.js';
import { ScoreDisplay } from '../ui/ScoreDisplay.js';

import Config from '../physics/Config.js';
import { GamePhysics } from '../physics/GamePhysics.js';

async function initFlipper() {
    const physics = new GamePhysics(Config);
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

    const mesh = [];

    // Walls
    Config.wall.instances.forEach(wall => {
        mesh.push(new Wall(physics.world, wall.length, wall.height, wall.position, wall.rotation));
    });

    // Launching Ramp
    const launching = new LaunchingRamp(
      physics.world,
      Config.launchingRamp.length,
      Config.launchingRamp.width,
      Config.launchingRamp.height,
      Config.launchingRamp.position,
      Config.launchingRamp.rotation
    );
    controls.setLaunchingRampRef(launching);
    mesh.push(launching);

    // Bumpers
    Config.bumper.instances.forEach(bumper => {
        mesh.push(new Bumper(physics.world, bumper.radius, bumper.position, bumper.rotation, bumper.id));
    });

    // Palles
    Config.palles.instances.forEach(pnl => {
        mesh.push(new Palles(physics.world, pnl.length, pnl.width, pnl.height, pnl.position, pnl.rotation, pnl.side));
    });

    physics.registerObjects(mesh);

    // Ball
    mesh.push(new Ball(physics.world, Config.ball.position));
    controls.setBallRef(mesh[mesh.length - 1]);

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

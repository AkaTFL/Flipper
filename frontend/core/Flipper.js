import { Scene } from './Scene.js';

import { Ball } from '../objects/Ball.js';
import { Wall } from '../objects/Wall.js';
import { Bumper } from '../objects/Bumper.js';
import { LaunchingRamp } from '../objects/LaunchingRamp.js';
import { Palles } from '../objects/Palles.js';
import { Controls } from './Controls.js';

import Config from '../physics/Config.js';
import { GamePhysics } from '../physics/GamePhysics.js';

async function initFlipper() {
    const physics = new GamePhysics(Config);
    await physics.init();

    const sceneManager = new Scene(physics.world, 950, 540, { x: 0, y: 500, z: 0 }, { x: (-Math.PI / 2), y: 0, z: 0 });

    const controls = new Controls('q', 'd', 'space');

    const container = document.getElementById('three');
    container.appendChild(sceneManager.renderer.domElement);

    const gameObjects = [];

    const rightWall = new Wall(physics.world, 950, 100, { x: 255, y: 0, z: 0 }, { x: 0, y: (Math.PI / 2), z: 0 });
    rightWall.objectId = 'wall-left';
    gameObjects.push(rightWall);

    const leftWall = new Wall(physics.world, 950, 100, { x: -255, y: 0, z: 0 }, { x: 0, y: (-Math.PI / 2), z: 0 });
    leftWall.objectId = 'wall-right';
    gameObjects.push(leftWall);

    const topWall = new Wall(physics.world, 540, 100, { x: 0, y: 0, z: -471 }, { x: 0, y: 0, z: 0 });
    topWall.objectId = 'wall-bottom';
    gameObjects.push(topWall);

    const bottomWall = new Wall(physics.world, 540, 100, { x: 0, y: 0, z: 471 }, { x: 0, y: 0, z: 0 });
    bottomWall.objectId = 'wall-top';
    gameObjects.push(bottomWall);

    const launching = new LaunchingRamp(physics.world, 30, 10, 850, { x: -230, y: 10, z: -50 }, { x: (Math.PI / 2), y: 0, z: 0 });
    controls.setLaunchingRampRef(launching);
    sceneManager.scene.add(...launching.meshes);

    const bumperCenter = new Bumper(physics.world, 50, { x: 0, y: 0, z: 100 }, { x: 0, y: 0, z: 0 }, 'bumper-1');
    const bumperRight = new Bumper(physics.world, 50, { x: 100, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 'bumper-2');
    const bumperLeft = new Bumper(physics.world, 50, { x: -100, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 'bumper-3');
    gameObjects.push(bumperCenter, bumperRight, bumperLeft);

    const leftPalle = new Palles(physics.world, 70, 10, 10, { x: 100, y: 10, z: -400 }, { x: 0, y: 0, z: 0 }, 'left');
    const rightPalle = new Palles(physics.world, 70, 10, 10, { x: -100, y: 10, z: -400 }, { x: 0, y: 0, z: 0 }, 'right');
    gameObjects.push(leftPalle, rightPalle);

    const ball = new Ball(physics.world, { x: -230, y: 25, z: -400 });
    controls.setBallRef(ball);
    gameObjects.push(ball);

    physics.registerObjects([launching, ...gameObjects]);

    sceneManager.scene.add(...gameObjects.map((obj) => obj.mesh));

    sceneManager.startRender(physics, () => {
      controls.setLaunchChargeCount(0);

      for (let i = 0; i < gameObjects.length; i++) {
        if (typeof gameObjects[i].syncPalle === 'function') {
          gameObjects[i].syncPalle();
        }
        else if (typeof gameObjects[i].syncBall === 'function') {
          gameObjects[i].syncBall();
        }
        if (typeof gameObjects[i].setActive === 'function') {
          if (gameObjects[i].side === 'left') {
            gameObjects[i].setActive(controls.input.left);
          } else if (gameObjects[i].side === 'right') {
            gameObjects[i].setActive(controls.input.right);
          }
        }
      }
    });
}

initFlipper();

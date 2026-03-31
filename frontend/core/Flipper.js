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

    const mesh = [];

    mesh.push(new Wall(physics.world, 950, 100, { x: 255, y: 0, z: 0 }, { x: 0, y: (Math.PI / 2), z: 0 }));
    mesh.push(new Wall(physics.world, 950, 100, { x: -255, y: 0, z: 0 }, { x: 0, y: (-Math.PI / 2), z: 0 }));
    mesh.push(new Wall(physics.world, 540, 100, { x: 0, y: 0, z: -471 }, { x: 0, y: 0, z: 0 }));
    mesh.push(new Wall(physics.world, 540, 100, { x: 0, y: 0, z: 471 }, { x: 0, y: 0, z: 0 }));

    const launching = (new LaunchingRamp(physics.world, 30, 10, 850, { x: -230, y: 10, z: -50 }, { x: (Math.PI / 2), y: 0, z: 0 })); //
    controls.setLaunchingRampRef(launching); //

    sceneManager.scene.add(...launching.meshes); // Solution temporaire pour ajouter les rails du ramp à la scène, à revoir pour une meilleure intégration

    mesh.push(new Bumper(physics.world, 50, { x: 0, y: 0, z: 100 }, {x: 0, y: 0, z: 0}, 'bumper-1'));
    mesh.push(new Bumper(physics.world, 50, { x: 100, y: 0, z: 0 }, {x: 0, y: 0, z: 0}, 'bumper-2'));
    mesh.push(new Bumper(physics.world, 50, { x: -100, y: 0, z: 0 }, {x: 0, y: 0, z: 0}, 'bumper-3'));

    mesh.push(new Palles(physics.world, 70, 10, 10, { x: 100, y: 10, z: -400 }, { x: 0, y: 0, z: 0 }, 'left'));
    mesh.push(new Palles(physics.world, 70, 10, 10, { x: -100, y: 10, z: -400 }, { x: 0, y: 0, z: 0 }, 'right'));

    physics.registerObjects(mesh);

    mesh.push(new Ball(physics.world, { x: -230, y: 25, z: -400 }));
    controls.setBallRef(mesh[mesh.length - 1]);

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
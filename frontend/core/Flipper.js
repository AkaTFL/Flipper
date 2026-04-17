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

    const sceneManager = new Scene(physics.world, Config.scene.height, Config.scene.width, Config.scene.position, Config.scene.rotation);

    const controls = new Controls('q', 'd', 'space');

    const container = document.getElementById('three');
    container.appendChild(sceneManager.renderer.domElement);


    const mesh = [];

    mesh.push(new Wall(physics.world, Config.wall.width, Config.wall.height, Config.wall.position, Config.wall.rotation));
    mesh.push(new Wall(physics.world, Config.wall1.width, Config.wall1.height, Config.wall1.position, Config.wall1.rotation));
    mesh.push(new Wall(physics.world, Config.wall2.width, Config.wall2.height, Config.wall2.position, Config.wall2.rotation));
    mesh.push(new Wall(physics.world, Config.wall3.width, Config.wall3.height, Config.wall3.position, Config.wall3.rotation));

    
    const launching = new LaunchingRamp(
      physics.world,
      Config.launchingRamp.length,
      Config.launchingRamp.width,
      Config.launchingRamp.height,
      { x: -230, y: 30, z: -50 },
      { x: 0, y: 0, z: 0 }
    );

    const walls = mesh.filter(obj => obj instanceof Wall);
    controls.setLaunchingRampRef(launching);
    mesh.push(launching);

    mesh.push(new Bumper(physics.world, Config.bumper1.width, Config.bumper1.position, Config.bumper1.rotation, 'bumper-1'));
    mesh.push(new Bumper(physics.world, Config.bumper2.width, Config.bumper2.position, Config.bumper2.rotation, 'bumper-2'));

    mesh.push(new Palles(physics.world, Config.palles1.length, Config.palles1.width, Config.palles1.height, Config.palles1.position, Config.palles1.rotation, Config.palles1.side));
    mesh.push(new Palles(physics.world, Config.palles2.length, Config.palles2.width, Config.palles2.height, Config.palles2.position, Config.palles2.rotation, Config.palles2.side));

    physics.registerObjects(mesh);

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
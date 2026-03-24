import { Scene } from './Scene.js';

import { Ball } from '../objects/Ball.js';
import { Wall } from '../objects/Wall.js';
import { Bumper } from '../objects/Bumper.js';
import { LaunchingRamp } from '../objects/LaunchingRamp.js';
import { Palles } from '../objects/Palles.js';

import Config from '../physics/Config.js';
import { GamePhysics } from '../physics/GamePhysics.js';


const input = { left: false, right: false, launch: false, launchPower: 0 };
let launchChargeStart = 0;
let launchChargeCount = 0;
let launchingRampRef = null;

function getInputKey(event) {
    if (event.code === 'Space' || event.key === ' ') return 'space';

    const key = (event.key || '').toLowerCase();
    if (key === 'arrowleft') return 'left';
    if (key === 'arrowright') return 'right';

    return key;
}

window.addEventListener('keydown', (e) => {
  const key = getInputKey(e);

  if (key === 'e' || key === 'q' || key === 'left') {
    input.left = true;
    console.log('Left flipper pressed');
    return;
    }
  if (key === 'a' || key === 'd' || key === 'right') {
    input.right = true;
    console.log('Right flipper pressed');
    return;
  }
  if (key === 'space') {
    if (e.repeat) return;

    input.launch = true;
    launchChargeStart = Date.now();
    launchChargeCount += 1;
    if (launchingRampRef) launchingRampRef.resetLaunchImpulse();
    console.log('Launch button pressed');
  }
});

window.addEventListener('keyup', (e) => {
  const key = getInputKey(e);

  if (key === 'e' || key === 'q' || key === 'left') {
    input.left = false;
    console.log('Left flipper released');
    return;
  }
  if (key === 'a' || key === 'd' || key === 'right') {
    input.right = false;
    console.log('Right flipper released');
    return;
  }
  if (key === 'space') {
    input.launch = false;

    const chargeDuration = launchChargeStart > 0 ? Date.now() - launchChargeStart : 0;
    input.launchPower = Math.min(chargeDuration * Config.launchingRamp.powerBuild, 1000);
    launchChargeStart = 0;
    console.log(`Launch button released after charging for ${chargeDuration}ms, power: ${input.launchPower}`);

    if (launchingRampRef) {
        const launchRatio = Math.max(0.1, input.launchPower / 1000);
        launchingRampRef.rampDirection = {
            x: launchingRampRef.rampDirection.x,
            y: launchingRampRef.rampDirection.y,
            z: launchingRampRef.rampDirection.z * launchRatio
        };
    }
  }
});

async function initFlipper() {
    const physics = new GamePhysics(Config);
    await physics.init();

    const sceneManager = new Scene(physics.world, 950, 540, { x: 0, y: 500, z: 0 }, { x: (-Math.PI / 2), y: 0, z: 0 });

    const container = document.getElementById('three');
    container.appendChild(sceneManager.renderer.domElement);

    const wallR = new Wall(physics.world, 950, 100, { x: 255, y: 0, z: 0 }, { x: 0, y: (Math.PI / 2), z: 0 });
    const wallL = new Wall(physics.world, 950, 100, { x: -255, y: 0, z: 0 }, { x: 0, y: (-Math.PI / 2), z: 0 });
    const wallT = new Wall(physics.world, 540, 100, { x: 0, y: 0, z: -471 }, { x: 0, y: 0, z: 0 });
    const wallB = new Wall(physics.world, 540, 100, { x: 0, y: 0, z: 471 }, { x: 0, y: 0, z: 0 });

    const launchingRamp = new LaunchingRamp(physics.world, 20, 10, 850, { x: -230, y: 10, z: -50 }, { x: (Math.PI / 2), y: 0, z: 0 });
    launchingRampRef = launchingRamp;

    const bumper1 = new Bumper(physics.world, 50, { x: 0, y: 0, z: 100 }, {x: 0, y: 0, z: 0});
    const bumper2 = new Bumper(physics.world, 50, { x: 100, y: 0, z: 0 }, {x: 0, y: 0, z: 0});
    const bumper3 = new Bumper(physics.world, 50, { x: -100, y: 0, z: 0 }, {x: 0, y: 0, z: 0});

    const palles1 = new Palles(physics.world, 70, 10, 10, { x: 100, y: 10, z: -450 }, { x: 0, y: 0, z: 0 }, 'left');
    const palles2 = new Palles(physics.world, 70, 10, 10, { x: -100, y: 10, z: -450 }, { x: 0, y: 0, z: 0 }, 'right');

    // Enregistrer les bumpers dans le système physique
    physics.registerBumper(bumper1);
    physics.registerBumper(bumper2);
    physics.registerBumper(bumper3);
    physics.registerLaunchingRamp(launchingRamp);

    const ball = new Ball(physics.world, { x: -230, y: 12, z: -460 });

    sceneManager.scene.add(ball.mesh);
    sceneManager.scene.add(wallR.mesh);
    sceneManager.scene.add(wallL.mesh);
    sceneManager.scene.add(wallT.mesh);
    sceneManager.scene.add(wallB.mesh);
    sceneManager.scene.add(...launchingRamp.meshes);
    sceneManager.scene.add(bumper1.mesh);
    sceneManager.scene.add(bumper2.mesh);
    sceneManager.scene.add(bumper3.mesh);
    sceneManager.scene.add(palles1.mesh);
    sceneManager.scene.add(palles2.mesh);

    sceneManager.startRender(physics, () => {
      // Keep variable "used" for future tuning/UI feedback.
      if (launchChargeCount < 0) launchChargeCount = 0;

        palles1.syncPalle();
        palles2.syncPalle();
        ball.syncBall();

        palles1.setActive(input.left);
        palles2.setActive(input.right);
    });
}

initFlipper();


// import { Scene } from './Scene.js';
// import { Ball } from '../objects/Ball.js';
// import Config from '../physics/Config.js';
// import { GamePhysics } from '../physics/GamePhysics.js';
// import { Wall } from '../objects/Wall.js';


// async function initFlipper() {
//     const physics = new GamePhysics(Config);
//     await physics.init();

//     const sceneManager = new Scene(physics.world, 500, 500, { x: 0, y: 500, z: 0 });

//     const container = document.getElementById('three');
//     container.appendChild(sceneManager.renderer.domElement);

//     const mesh = [];

//     mesh.push(new Wall(500, 500, { x: 250, y: 500, z: 0 }));
//     mesh.push(new Wall(500, 500, { x: -250, y: 500, z: 0 }));
//     mesh.push(new Wall(500, 500, { x: 0, y: 750, z: 0 }));
//     mesh.push(new Wall(500, 500, { x: 0, y: 250, z: 0 }));

//     mesh.push(new Ball(physics.world, { x: 0, y: 500, z: 0 }))

//     sceneManager.scene.add(...mesh);

//     sceneManager.startRender(physics, () => mesh[mesh.length - 1].syncBall());
// }

// // Start the game
// initFlipper();

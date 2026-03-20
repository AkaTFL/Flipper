import { Scene } from './Scene.js';

import { Ball } from '../objects/Ball.js';
import { Wall } from '../objects/Wall.js';
import { Bumper } from '../objects/Bumper.js';
import { LaunchingRamp } from '../objects/LaunchingRamp.js';
import { Palles } from '../objects/Palles.js';

import Config from '../physics/Config.js';
import { GamePhysics } from '../physics/GamePhysics.js';

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

    const bumper1 = new Bumper(physics.world, 50, { x: 0, y: 0, z: 100 }, {x: 0, y: 0, z: 0});
    const bumper2 = new Bumper(physics.world, 50, { x: 100, y: 0, z: 0 }, {x: 0, y: 0, z: 0});
    const bumper3 = new Bumper(physics.world, 50, { x: -100, y: 0, z: 0 }, {x: 0, y: 0, z: 0});

    const palles1 = new Palles(physics.world, 200, 10, 10, { x: 0, y: 0, z: -200 }, { x: 0, y: 0, z: 0 }, 'left');
    const palles2 = new Palles(physics.world, 200, 10, 10, { x: 0, y: 0, z: 200 }, { x: 0, y: 0, z: 0 }, 'right');

    // Enregistrer les bumpers dans le système physique
    physics.registerBumper(bumper1);
    physics.registerBumper(bumper2);
    physics.registerBumper(bumper3);

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
        palles1.syncPalle();
        palles2.syncPalle();
        ball.syncBall();
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

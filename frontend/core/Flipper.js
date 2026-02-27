import { Scene } from './Scene.js';
import { Ball } from '../objects/Ball.js';
import Config from '../physics/Config.js';
import { GamePhysics } from '../physics/GamePhysics.js';
import { Wall } from '../objects/Wall.js';


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


    const ball = new Ball(physics.world, { x: 0, y: 500, z: 0 });

    sceneManager.scene.add(ball.mesh);
    sceneManager.scene.add(wallR.mesh);
    sceneManager.scene.add(wallL.mesh);
    sceneManager.scene.add(wallT.mesh);
    sceneManager.scene.add(wallB.mesh);


    sceneManager.startRender(physics, () => ball.syncBall());
}

// Start the game
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

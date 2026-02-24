import { Scene } from './Scene.js';
import { Ball } from '../objects/Ball.js';
import Config from '../physics/Config.js';
import { GamePhysics } from '../physics/GamePhysics.js';


async function initFlipper() {
    const physics = new GamePhysics(Config);
    await physics.init();

    const sceneManager = new Scene(physics.world, 500, 500, { x: 0, y: 500, z: 0 });
    const ball = new Ball(physics.world, { x: 0, y: 500, z: 0 });

    sceneManager.scene.add(ball.mesh);
    sceneManager.startRender(physics, () => ball.syncFromPhysics());
}

// Start the game
initFlipper();

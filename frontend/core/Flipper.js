import { initScene, startRender } from './Scene.js';
import { Ball } from '../objects/Ball.js';
import Config from '../physics/Config.js';
import GamePhysics from '../physics/GamePhysics.js';


async function initFlipper() {
    const { scene } = initScene();


    const physics = new GamePhysics(Config)
    await physics.init()

    const ball = new Ball(physics.world, Config.ball.radius);
    scene.add(ball.mesh);

    startRender(physics, ball);
}

// Start the game
initFlipper();

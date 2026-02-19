import { initScene, startRender } from './core/Scene.js';
import { createBall } from './objects/ball.js';


function initFlipper() {
    const { scene } = initScene();

    const ball = createBall();
    scene.add(ball);

    startRender();
}

// Start the game
initFlipper();
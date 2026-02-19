import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

/**
 * @returns {THREE.Mesh}
 */
function createBall(height = 5, position = {x: 0, y: 0, z: 0}) {
    const ball = new THREE.Mesh(
        new THREE.SphereGeometry(height, 32, 32),
        new THREE.MeshStandardMaterial({ 
            color: 0xff0000,
            roughness: 0.7,
            metalness: 0.2 
        })
    );

    ball.position.copy(position);

    return ball;
}

export { createBall };

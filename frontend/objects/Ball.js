import * as RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

export class Ball {
    /**
     * @param {number} radius - The radius of the ball
     * @param {Object} position - The position object with x, y, z properties
     */
    constructor(world, radius = 5, position = {x: 0, y: 0, z: 0}) {
        this.world = world;
        this.radius = radius;
        
        this.mesh = new THREE.Mesh(
            new THREE.SphereGeometry(radius, 32, 32),
            new THREE.MeshStandardMaterial({ 
                color: 0xff0000,
                roughness: 0.7,
                metalness: 0.2 
            })
        );

        this.mesh.position.copy(position);

        // Physics properties
        const rigidBodyDesc = RAPIER.RigidBodyDesc.ball(radius).setTranslation(position.x, position.y, position.z);
        this.rigidBody = this.world.createRigidBody(rigidBodyDesc);
        
        const colliderDesc = RAPIER.ColliderDesc.ball(radius);
        this.world.createCollider(colliderDesc, this.rigidBody);
    }

    syncFromPhysics() {
        const position = this.rigidBody.translation();
        this.mesh.position.set(position.x, position.y, position.z);
        
        const rotation = this.rigidBody.rotation();
        this.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    }
}
    
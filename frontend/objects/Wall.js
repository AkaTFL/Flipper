import * as RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import Config from '../physics/Config.js';

export class Wall {
    /**
     * @param {Object} world - The physics world
     * @param {number} width - The width of the wall
     * @param {number} height - The height of the wall
     * @param {Object} position - The position object with x, y, z properties
     */
    constructor(world, width = 500, height = 500, position = {x: 250, y: 500, z: 0}) {
        this.world = world;
        this.width = width;
        this.height = height;

        this.mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(this.width, this.height),
            new THREE.MeshStandardMaterial({
                color: 0xaaaaaa,
                side: THREE.DoubleSide,
                metalness: 0.0,
                roughness: 1.0
            })
        );

        this.mesh.position.copy(position);

        const rotation = 0;
        this.mesh.rotation.x = rotation;

        // Physics properties - Fixed (Static)
        const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed()
            .setTranslation(position.x, position.y, position.z)
            .setRotation({ x: Math.sin(rotation / 2), y: 0, z: 0, w: Math.cos(rotation / 2) });

        this.rigidBody = this.world.createRigidBody(rigidBodyDesc);

        const colliderDesc = RAPIER.ColliderDesc.cuboid(this.width / 2, this.height / 2, 0.1)
            .setRestitution(Config.wall.restitution)
            .setFriction(Config.wall.friction);

        this.world.createCollider(colliderDesc, this.rigidBody);
    }
}

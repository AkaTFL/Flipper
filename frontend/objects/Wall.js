import * as RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import Config from '../physics/Config.js';

export class Wall {
    /**
     * @param {Object} world - The physics world
     * @param {number} width - The width of the wall
     * @param {number} height - The height of the wall
     * @param {Object} position - The position object with x, y, z properties
     * @param {number} rotation - The rotation of the wall in radians (default is 0, which means no rotation)
     */
    constructor(world, width = 500, height = 500, position = {x: 250, y: 500, z: 0}, rotation = {x: 0, y: 0, z: 0}) {
        this.world = world;
        this.width = width;
        this.height = height;
        this.position = position;
        this.rotation = rotation;

        this.mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(this.width, this.height),
            new THREE.MeshStandardMaterial({
                color: 0xa0a0a0,
                side: THREE.DoubleSide,
                metalness: 0.0,
                roughness: 1.0
            })
        );

        this.mesh.position.copy(position);

        this.mesh.rotation.x = rotation.x;
        this.mesh.rotation.y = rotation.y;
        this.mesh.rotation.z = rotation.z;

        // Physics properties - Fixed (Static)
        const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed()
            .setTranslation(position.x, position.y, position.z)
            .setRotation({ x: Math.sin(rotation.x / 2), y: Math.sin(rotation.y / 2), z: Math.sin(rotation.z / 2), w: Math.cos(rotation.x / 2) * Math.cos(rotation.y / 2) * Math.cos(rotation.z / 2) });

        this.rigidBody = this.world.createRigidBody(rigidBodyDesc);

        const colliderDesc = RAPIER.ColliderDesc.cuboid(this.width / 2, this.height / 2, 0.1)
            .setRestitution(Config.wall.restitution)
            .setFriction(Config.wall.friction);

        this.world.createCollider(colliderDesc, this.rigidBody);
    }
}

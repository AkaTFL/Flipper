import * as RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import Config from '../physics/Config.js';
import { Objects } from './Objects.js';

export class Wall extends Objects {
    /**
     * @param {Object} world - The physics world
     * @param {number} width - The width of the wall
     * @param {number} height - The height of the wall
     * @param {Object} position - The position object with x, y, z properties
     * @param {number} rotation - The rotation of the wall in radians (default is 0, which means no rotation)
     */
    constructor(world, width = 500, height = 500, position = {x: 250, y: 500, z: 0}, rotation = {x: 0, y: 0, z: 0}) {
        super(world, null, width, height, position, rotation, null, [], null);
        this.objectType = 'wall';

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
        this.createFixedRigidBody(position, rotation, true);

        const colliderDesc = RAPIER.ColliderDesc.cuboid(this.width / 2, this.height / 2, 0.1)
            .setRestitution(Config.wall.restitution)
            .setFriction(Config.wall.friction);

        this.attachCollider(colliderDesc);
    }
    
    handleCollision() {
        // Par défaut, joue le son s'il existe
        if (this.audio) {
            this.playSound();
        }
    }
}

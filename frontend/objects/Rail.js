import * as RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import Config from '../physics/Config.js';
import { Objects } from './Objects.js';

export class Rail extends Objects {
    /**
     * @param {Object} world - The physics world
     * @param {number} length - The length of the rail
     * @param {number} height - The height of the rail
     * @param {Object} position - The position object with x, y, z properties
     * @param {Object} rotation - The rotation object with x, y, z properties
     */
    constructor(world, length = 500, width = 10, height = 10, position = {x: 250, y: 500, z: 0}, rotation = {x: 0, y: 0, z: 0}) {
        super(world, length, width, height, position, rotation);

        this.mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(this.height / 2, this.height / 2, this.length, this.width),
            new THREE.MeshStandardMaterial({
                color: 0x606060,
                metalness: 0.5,
                roughness: 0.5
            })
        );

        this.mesh.position.copy(position);

        this.mesh.rotation.x = rotation.x;
        this.mesh.rotation.y = rotation.y;
        this.mesh.rotation.z = rotation.z;

        // Physics properties - Fixed (Static)
        this.createFixedRigidBody(position, rotation, true);

        const colliderDesc = RAPIER.ColliderDesc.cylinder(this.length / 2, this.height / 2)
            .setRestitution(Config.rail.restitution)
            .setFriction(Config.rail.friction)
            .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

        this.attachCollider(colliderDesc);
    }

    handleCollision() {
        // Par défaut, joue le son s'il existe
        if (this.audio) {
            this.playSound();
        }
    }

}
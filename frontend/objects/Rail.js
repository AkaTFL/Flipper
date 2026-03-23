import * as RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import Config from '../physics/Config.js';

export class Rail {
    /**
     * @param {Object} world - The physics world
     * @param {number} length - The length of the rail
     * @param {number} height - The height of the rail
     * @param {Object} position - The position object with x, y, z properties
     * @param {Object} rotation - The rotation object with x, y, z properties
     */
    constructor(world, length = 500, width = 10, height = 10, position = {x: 250, y: 500, z: 0}, rotation = {x: 0, y: 0, z: 0}) {
        this.world = world;
        this.length = length;
        this.width = width;
        this.height = height;
        this.position = position;
        this.rotation = rotation;

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
        const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed()
            .setTranslation(position.x, position.y, position.z)
            .setRotation({ x: Math.sin(rotation.x / 2), y: Math.sin(rotation.y / 2), z: Math.sin(rotation.z / 2), w: Math.cos(rotation.x / 2) * Math.cos(rotation.y / 2) * Math.cos(rotation.z / 2) });

        this.rigidBody = this.world.createRigidBody(rigidBodyDesc);

        const colliderDesc = RAPIER.ColliderDesc.cylinder(this.length / 2, this.height / 2)
            .setRestitution(Config.rail.restitution)
            .setFriction(Config.rail.friction)
            .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

        this.collider = this.world.createCollider(colliderDesc, this.rigidBody);
    }

}
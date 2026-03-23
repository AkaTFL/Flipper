import * as RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import Config from '../physics/Config.js';

export class Bumper {
    /**
     * @param {Object} world - The physics world
     * @param {number} width - The radius of the bumper
     * @param {number} height - The radius of the bumper
     * @param {Object} position - The position object with x, y, z properties
     * @param {number} rotation - The rotation of the bumper in radians
     */
    constructor(world, width = 50, position = {x: 0, y: 300, z: 0}, rotation = {x: 0, y: 0, z: 0}) {
        this.world = world;
        this.radius = width / 2;
        this.position = position;
        this.rotation = rotation;

        this.mesh = new THREE.Mesh(
            new THREE.SphereGeometry(this.radius, 32, 32),
            new THREE.MeshStandardMaterial({
                color: 0xffaa00,
                metalness: 0.4,
                roughness: 0.5
            })
        );

        this.mesh.position.copy(position);
        this.mesh.rotation.x = rotation.x;
        this.mesh.rotation.y = rotation.y;
        this.mesh.rotation.z = rotation.z;

        // Physics properties - Fixed (Static)
        const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed()
            .setTranslation(position.x, position.y, position.z);

        this.rigidBody = this.world.createRigidBody(rigidBodyDesc);

        const colliderDesc = RAPIER.ColliderDesc.ball(this.radius)
            .setRestitution(Config.bumper.restitution)
            .setFriction(Config.bumper.friction)
            .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

        this.collider = this.world.createCollider(colliderDesc, this.rigidBody);
    }

    
    applyBumperForce(handle1, handle2) {
        const otherHandle = this.collider.handle === handle1 ? handle2 : handle1
        const otherCollider = this.world.colliders.get(otherHandle)
        if (!otherCollider) return

        const otherBody = otherCollider.parent()
        if (!otherBody) return

        const bumperPos = this.rigidBody.translation()
        const ballPos = otherBody.translation()

        const dirX = ballPos.x - bumperPos.x
        const dirY = ballPos.y - bumperPos.y
        const dirZ = ballPos.z - bumperPos.z

        // Normaliser
        const length = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ)
        if (length === 0) return

        const X = dirX / length
        const Y = dirY / length
        const Z = dirZ / length

        // Appliquer force
        const power = Config.bumper.power * Config.forceMultiplier
        otherBody.applyImpulse(
            { x: X * power, y: Y * power, z: Z * power },
            true
        )
    }
}
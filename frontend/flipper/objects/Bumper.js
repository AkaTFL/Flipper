import * as RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import Config from '../physics/Config.js';
import { Objects } from './Objects.js';

export class Bumper extends Objects {
    /**
     * @param {Object} world - The physics world
     * @param {number} width - The radius of the bumper
     * @param {number} height - The radius of the bumper
     * @param {Object} position - The position object with x, y, z properties
     * @param {number} rotation - The rotation of the bumper in radians
     */
    constructor(world, width = 50, position = {x: 0, y: 300, z: 0}, rotation = {x: 0, y: 0, z: 0}, objectId = null) {
        super(world, null, null, null, position, rotation, width / 2, [], null);
        this.objectId = objectId ?? 'bumper';
        this.objectType = 'bumper';
        this.radius = width / 2;
        this.length = width;
        this.width = width;
        this.height = width;

        // Physics properties - Fixed (Static)
        this.createFixedRigidBody(position, rotation, false);

        // Keep group from Objects; add either GLB model or procedural sphere
        this.mesh.position.copy(position);
        this.mesh.rotation.x = rotation.x;
        this.mesh.rotation.y = rotation.y;
        this.mesh.rotation.z = rotation.z;

        const bumperConfig = (Config.bumpers || []).find((entry) => entry.objectId === this.objectId) || null;
        const modelRelative = bumperConfig?.model || null;

        if (modelRelative) {
            const modelPath = new URL(modelRelative, import.meta.url).href;
            this.addMesh(modelPath, (modelRoot) => {
                this.rebuildTrimeshColliderFromMesh(modelRoot, {
                    restitution: Config.bumper.restitution,
                    friction: Config.bumper.friction,
                    activeEvents: RAPIER.ActiveEvents.COLLISION_EVENTS
                });
            });
        } else {
            const sphere = new THREE.Mesh(
                new THREE.SphereGeometry(this.radius, 32, 32),
                new THREE.MeshStandardMaterial({
                    color: 0xffaa00,
                    metalness: 0.4,
                    roughness: 0.5
                })
            );
            this.mesh.add(sphere);

            this.rebuildTrimeshColliderFromMesh(sphere, {
                restitution: Config.bumper.restitution,
                friction: Config.bumper.friction,
                activeEvents: RAPIER.ActiveEvents.COLLISION_EVENTS
            });
        }

        if (!this.collider) {
            const fallbackMesh = new THREE.Mesh(new THREE.SphereGeometry(this.radius, 16, 16));
            this.rebuildTrimeshColliderFromMesh(fallbackMesh, {
                restitution: Config.bumper.restitution,
                friction: Config.bumper.friction,
                activeEvents: RAPIER.ActiveEvents.COLLISION_EVENTS
            });
        }
    }

    
    applyBumperForce(handle1, handle2) {
        const otherHandle = this.collider.handle === handle1 ? handle2 : handle1
        const otherCollider = typeof this.world.getCollider === 'function'
            ? this.world.getCollider(otherHandle)
            : this.world.colliders?.get(otherHandle)

        if (!otherCollider) return

        const otherBody = otherCollider.parent()
        if (!otherBody || otherBody.isFixed && otherBody.isFixed()) return

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

        this.playSound(Config.sounds.bumper.move) // Joue le son du bumper
    }

    handleCollision() {
        // Par défaut, joue le son s'il existe
        if (this.audio) {
            this.playSound(Config.sounds.bumper.collision); // Son de collision des palles
        }
    }
}
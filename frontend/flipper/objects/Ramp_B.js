import * as RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import Config from '../physics/Config.js';
import { Objects } from './Objects.js';

export class RampB extends Objects {
    /**
     * @param {Object} world - The physics world
     * @param {number} length - The length of the ramp
     * @param {number} width - The width of the ramp
     * @param {number} height - The height of the ramp
     * @param {Object} position - The position object with x, y, z properties
     * @param {Object} rotation - The rotation object with x, y, z properties
     */
    constructor(
        world,
        length = Config.ramp_B.length,
        width = Config.ramp_B.width,
        height = Config.ramp_B.height,
        position = Config.ramp_B.position,
        rotation = Config.ramp_B.rotation
    ) {
        super(world, length, width, height, position, rotation, null, null);

        if (this.TreeMesh) {
            this.mesh.remove(this.TreeMesh);
            this.TreeMesh = null;
        }

        this.rampDirection = this.computeRampDirection();
        this.pushedBodyHandles = new Set();
        this.sound = Config.sounds.launchingRamp.rolling;

        this.createFixedRigidBody(position, rotation, true);
        this.rebuildColliderFromHalfExtents(this.length / 2, this.width / 2, this.height / 2);

        const modelPath = new URL(
            '../assets/mesh/ramp_B.glb',
            import.meta.url
        ).href;

        this.addMesh(modelPath, (modelRoot) => {
            const { size, center } = this.getMeshMetrics(modelRoot);

            modelRoot.position.y = -center.y;
            modelRoot.position.z = -center.z;

            this.rebuildColliderFromHalfExtents(
                Math.max(size.x / 1, 1),
                Math.max(size.y / 1, 1),
                Math.max(size.z / 1, 1)
            );
        });
    }

    rebuildColliderFromHalfExtents(halfX, halfY, halfZ) {
        if (this.collider && typeof this.world.removeCollider === 'function') {
            this.world.removeCollider(this.collider, true);
        }

        const colliderDesc = RAPIER.ColliderDesc.cuboid(halfX, halfY, halfZ)
            .setRestitution(Config.ramp_B?.restitution)
            .setFriction(Config.ramp_B?.friction)
            .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

        this.attachCollider(colliderDesc);
    }

    computeRampDirection() {
        const rx = this.rotation.x || 0;
        const ry = this.rotation.y || 0;
        const rz = this.rotation.z || 180;

        const direction = new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(rx, ry, rz, 'XYZ')).normalize();
        if (!Number.isFinite(direction.x) || !Number.isFinite(direction.y) || !Number.isFinite(direction.z)) {
            return { x: 0, y: 0, z: 1 };
        }

        return { x: direction.x, y: direction.y, z: direction.z };
    }

    hasCollider(handle) {
        return this.collider && this.collider.handle === handle;
    }

    resetLaunchImpulse() {
        this.pushedBodyHandles.clear();
    }

    handleCollision() {
        this.playSound(Config.sounds.launchingRamp.rolling);
    }

    applyLaunchingRampForce(handle1, handle2, powerOverride = null) {
        if (!this.collider) return;

        if (this.collider.handle !== handle1 && this.collider.handle !== handle2) return;

        const otherHandle = this.collider.handle === handle1 ? handle2 : handle1;
        const otherCollider = this.world.colliders.get(otherHandle);
        if (!otherCollider) return;

        const otherBody = otherCollider.parent();
        if (!otherBody || otherBody.isFixed()) return;

        if (this.pushedBodyHandles.has(otherBody.handle)) return;

        const launchPower = powerOverride ?? Config.launchingRamp.maximalPower;
        const power = launchPower * Config.forceMultiplier;
        otherBody.applyImpulse(
            {
                x: this.rampDirection.x * power,
                y: this.rampDirection.y * power,
                z: this.rampDirection.z * power
            },
            true
        );
        this.pushedBodyHandles.add(otherBody.handle);
        this.playSound(Config.sounds.launchingRamp.launch);
    }
}

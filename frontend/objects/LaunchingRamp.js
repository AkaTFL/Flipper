import * as RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import Config from '../physics/Config.js';
import { Objects } from './Objects.js';

export class LaunchingRamp extends Objects {
    /**
     * @param {Object} world - The physics world
     * @param {number} length - The length of the ramp
     * @param {number} width - The width of the ramp
     * @param {number} height - The height of the ramp
     * @param {Object} position - The position object with x, y, z properties
     * @param {Object} rotation - The rotation object with x, y, z properties
     */
<<<<<<< HEAD
    constructor(
        world,
        length = Config.launchingRamp.length,
        width = Config.launchingRamp.width,
        height = Config.launchingRamp.height,
        position = {x: 0, y: 0, z: 0},
        rotation = {x: 0, y: 0, z: 0}
    ) {
        super(world, length, width, height, position, rotation, null, null);

        // Remove the default TreeMesh
        if (this.TreeMesh) {
            this.mesh.remove(this.TreeMesh);
            this.TreeMesh = null;
        }

=======
    constructor(world, width, height, length, position = {x: 0, y: 0, z: 0}, rotation = {x: 0, y: 0, z: 0}) {
        super(world, length, width, height, position, rotation, null, [], null);
        this.objectId = 'launching-ramp';
        this.objectType = 'launching_ramp';

        this.leftRail = new Rail(
            world,
            this.length,
            this.width,
            this.height,
            {x: position.x - this.width / 2, y: position.y, z: position.z},
            rotation,
            'launching-ramp-right-rail',
            'launching_ramp_rail'
        );
        this.rightRail = new Rail(
            world,
            this.length,
            this.width,
            this.height,
            {x: position.x + this.width / 2, y: position.y, z: position.z},
            rotation,
            'launching-ramp-left-rail',
            'launching_ramp_rail'
        );
        this.bottomRail = new Rail(
            world,
            this.length,
            (this.width - 5),
            this.height,
            {x: position.x, y: position.y - this.height / 2, z: position.z},
            rotation,
            'launching-ramp-base-rail',
            'launching_ramp_rail'
        );

        this.rails = [this.leftRail, this.rightRail, this.bottomRail];
        this.meshes = [this.leftRail.mesh, this.rightRail.mesh, this.bottomRail.mesh];

        this.colliders = this.rails.map((rail) => rail.collider);
        this.collisionEntries = this.rails.map((rail) => ({
            collider: rail.collider,
            owner: rail,
            responder: this
        }));
>>>>>>> 74a56cff3108a72276c2df81793d5f48bad82a04
        this.rampDirection = this.computeRampDirection();
        this.pushedBodyHandles = new Set();
        this.sound = Config.sounds.launchingRamp.rolling;

        // Physics properties - Fixed (Static)
        this.createFixedRigidBody(position, rotation, true);

        this.rebuildColliderFromHalfExtents(this.length / 2, this.width / 2, this.height / 2);

        // Load the 3D model
        const modelPath = new URL(
            '../assets/mesh/launch_ramp.glb',
            import.meta.url
        ).href;
        
        this.addMesh(modelPath, (modelRoot) => {
            const { size, center } = this.getMeshMetrics(modelRoot);

            // Center the model
            modelRoot.position.y = -center.y;
            modelRoot.position.z = -center.z;

            // Fit collider to visual mesh once the GLB is loaded and scaled.
            this.rebuildColliderFromHalfExtents(
                Math.max(size.x / 2, 0.1),
                Math.max(size.y / 2, 0.1),
                Math.max(size.z / 2, 0.1)
            );
        });
    }

    rebuildColliderFromHalfExtents(halfX, halfY, halfZ) {
        if (this.collider && typeof this.world.removeCollider === 'function') {
            this.world.removeCollider(this.collider, true);
        }

        const colliderDesc = RAPIER.ColliderDesc.cuboid(halfX, halfY, halfZ)
            .setRestitution(Config.launchingRamp?.restitution)
            .setFriction(Config.launchingRamp?.friction)
            .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

        this.attachCollider(colliderDesc);
    }

    computeRampDirection() {
        const rx = this.rotation.x || 0;
        const ry = this.rotation.y || 0;
        const rz = this.rotation.z || 0;

        // Compute the launch direction by rotating the Y-axis according to the ramp's rotation
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

<<<<<<< HEAD
        // Check if the ramp collider matches one of the handles
        if (this.collider.handle !== handle1 && this.collider.handle !== handle2) return;
=======
            const otherHandle = rail.collider.handle === handle1 ? handle2 : handle1;
            const otherCollider = typeof this.world.getCollider === 'function'
                ? this.world.getCollider(otherHandle)
                : this.world.colliders?.get(otherHandle);
            if (!otherCollider) continue;
>>>>>>> 74a56cff3108a72276c2df81793d5f48bad82a04

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
        this.playSound(Config.sounds.launchingRamp.launch); // Joue le son de lancement
    }
}

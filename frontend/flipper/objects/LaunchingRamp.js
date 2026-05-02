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

        this.rampDirection = this.computeRampDirection();
        this.pushedBodyHandles = new Set();
        this.sound = Config.sounds.launchingRamp.rolling;

        // Physics properties - Fixed (Static)
        this.createFixedRigidBody(position, rotation, true);

        const fallbackMesh = new THREE.Mesh(new THREE.BoxGeometry(this.length, this.width, this.height));
        this.rebuildTrimeshColliderFromMesh(fallbackMesh, {
            restitution: Config.launchingRamp?.restitution,
            friction: Config.launchingRamp?.friction,
            activeEvents: RAPIER.ActiveEvents.COLLISION_EVENTS
        });

        // Load the 3D model (use `model` from Config.launchingRamp when present)
        const launchModelRelative = (Config.launchingRamp && Config.launchingRamp.model) || '../assets/mesh/launch_ramp.glb';
        const modelPath = new URL(launchModelRelative, import.meta.url).href;

        this.addMesh(modelPath, (modelRoot) => {
            const { size, center } = this.getMeshMetrics(modelRoot);

            // Center the model
            modelRoot.position.y = -center.y;
            modelRoot.position.z = -center.z;

            // Fit collider to visual mesh once the GLB is loaded and scaled.
            this.rebuildTrimeshColliderFromMesh(modelRoot, {
                restitution: Config.launchingRamp?.restitution,
                friction: Config.launchingRamp?.friction,
                activeEvents: RAPIER.ActiveEvents.COLLISION_EVENTS
            });
        });
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

        // Check if the ramp collider matches one of the handles
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
        this.playSound(Config.sounds.launchingRamp.launch); // Joue le son de lancement
    }
}

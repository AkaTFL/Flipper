import * as RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import Config from '../physics/Config.js';
import { Objects } from './Objects.js';

export class LaunchingRamp extends Objects {
    constructor(
        world,
        length = Config.global.positioning.launchingRamp.length,
        width = Config.global.positioning.launchingRamp.width,
        height = Config.global.positioning.launchingRamp.height,
        position = Config.global.positioning.launchingRamp.position,
        rotation = Config.global.positioning.launchingRamp.rotation
    ) {
        super(world, length, width, height, position, rotation, null, null);

        if (this.TreeMesh) {
            this.mesh.remove(this.TreeMesh);
            this.TreeMesh = null;
        }

        this.rampDirection = this.computeRampDirection();
        this.objectType = 'launching-ramp';
        this.objectId = Config.global.positioning.launchingRamp.objectId;
        this.pushedBodyHandles = new Set();

        // Load the 3D model (use `model` from Config.global.positioning.launchingRamp when present)
        const modelPath = new URL(Config.global.positioning.launchingRamp.model, import.meta.url).href;

        this.addMesh(modelPath, (modelRoot) => {
            this.addTexture(Config[Config.currentLevel].textures.launching_ramp, modelRoot);

            if (!this.rigidBody) this.createFixedRigidBody(position, rotation);

            const desc = this.buildTrimeshCollider(modelRoot);
            if (desc) this.attachCollider(desc);

            this.mesh.position.copy(position);
        });
    }

    computeRampDirection() {
        const rx = this.rotation.x || 0;
        const ry = this.rotation.y || 0;
        const rz = this.rotation.z || 0;

        // Compute the launch direction by rotating the Y-axis according to the ramp's rotation
        const direction = new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(rx, ry, rz, 'XYZ')).normalize();
        return { x: direction.x, y: direction.y, z: direction.z };
    }

    /**
     * Application de la force avec bride de sécurité absolue
     */
    applyLaunchingRampForce(handle1, handle2, powerOverride = null) {
        if (!this.collider) return;
        if (this.collider.handle !== handle1 && this.collider.handle !== handle2) return;

        const otherHandle = this.collider.handle === handle1 ? handle2 : handle1;
        const otherCollider = this.world.colliders.get(otherHandle);
        if (!otherCollider) return;

        const otherBody = otherCollider.parent();
        if (!otherBody || otherBody.isFixed()) return;

        // Anti-répétition
        if (this.pushedBodyHandles.has(otherBody.handle)) return;

        // --- LE PLAFOND VIRTUEL ---
        const absoluteMax = Config.global.positioning.launchingRamp.maximalPower;
        let targetSpeed = powerOverride;

        if (targetSpeed > absoluteMax) targetSpeed = absoluteMax;

        otherBody.setLinvel(
            {
                x: this.rampDirection.x * targetSpeed,
                y: this.rampDirection.y * targetSpeed,
                z: this.rampDirection.z * targetSpeed
            },
            true
        );

        this.pushedBodyHandles.add(otherBody.handle);
    }

    resetLaunchImpulse() {
        this.pushedBodyHandles.clear();
    }
}
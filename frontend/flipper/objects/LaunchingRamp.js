import * as RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import Config from '../physics/Config.js';
import { Objects } from './Objects.js';

export class LaunchingRamp extends Objects {
    constructor(
        world,
        length = Config.launchingRamp.length,
        width = Config.launchingRamp.width,
        height = Config.launchingRamp.height,
        position = Config.launchingRamp.position,
        rotation = Config.launchingRamp.rotation
    ) {
        super(world, length, width, height, position, rotation, null, null);

        if (this.TreeMesh) {
            this.mesh.remove(this.TreeMesh);
            this.TreeMesh = null;
        }

        this.rampDirection = this.computeRampDirection();
        this.pushedBodyHandles = new Set();

        // Load the 3D model (use `model` from Config.launchingRamp when present)
        const modelPath = new URL(Config.launchingRamp.model, import.meta.url).href;

        this.addMesh(modelPath, (modelRoot) => {
            if (!this.rigidBody) this.createFixedRigidBody(position, rotation);
            
            const desc = this.buildTrimeshCollider(modelRoot);
            if (desc) {
                this.replaceCollider(desc, this.rigidBody);
            } else {
                this.attachCollider(RAPIER.ColliderDesc.cuboid(this.length/2, this.width/2, this.height/2));
            }

            this.mesh.add(modelRoot); // si vous ne l'avez pas déjà ajouté ailleurs
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
        const absoluteMax = Config.launchingRamp.maximalPower;
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
        this.playSound(Config.sounds.launchingRamp.launch);
    }

    resetLaunchImpulse() {
        this.pushedBodyHandles.clear();
    }
}
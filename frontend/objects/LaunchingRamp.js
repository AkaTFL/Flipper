import { Rail } from './Rail.js';
import { Objects } from './Objects.js';
import Config from '../physics/Config.js';
import * as THREE from 'three';

export class LaunchingRamp extends Objects {
    /**
     * @param {Object} world - The physics world
     * @param {Object} position - The position object with x, y, z properties
     */
    constructor(world, width, height, length, position = {x: 0, y: 0, z: 0}, rotation = {x: 0, y: 0, z: 0}) {
        super(world, length, width, height, position, rotation, null, [], null, Config.sounds.launchingRamp.file);

        this.leftRail = new Rail(world, this.length, this.width, this.height, {x: position.x - this.width / 2, y: position.y, z: position.z}, rotation);
        this.rightRail = new Rail(world, this.length, this.width, this.height, {x: position.x + this.width / 2, y: position.y, z: position.z}, rotation);
        this.bottomRail = new Rail(world, this.length, (this.width - 5), this.height, {x: position.x, y: position.y - this.height / 2, z: position.z}, rotation);

        this.rails = [this.leftRail, this.rightRail, this.bottomRail];
        this.meshes = [this.leftRail.mesh, this.rightRail.mesh, this.bottomRail.mesh];

        this.colliders = this.rails.map((rail) => rail.collider);
        this.rampDirection = this.computeRampDirection();
        
        this.pushedBodyHandles = new Set();
    }

    computeRampDirection() {
        const rx = this.rotation.x || 0;
        const ry = this.rotation.y || 0;
        const rz = this.rotation.z || 0;

        // Rails are cylinders aligned on local Y; rotate that axis to get launch direction.
        const direction = new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(rx, ry, rz, 'XYZ')).normalize();
        if (!Number.isFinite(direction.x) || !Number.isFinite(direction.y) || !Number.isFinite(direction.z)) {
            return { x: 0, y: 0, z: 1 };
        }

        return { x: direction.x, y: direction.y, z: direction.z };
    }

    hasCollider(handle) {
        return this.colliders.some((collider) => collider.handle === handle);
    }

    resetLaunchImpulse() {
        this.pushedBodyHandles.clear();
    }

    applyLaunchingRampForce(handle1, handle2, powerOverride = null) {
        for (const rail of this.rails) {
            if (rail.collider.handle !== handle1 && rail.collider.handle !== handle2) continue;

            const otherHandle = rail.collider.handle === handle1 ? handle2 : handle1;
            const otherCollider = this.world.colliders.get(otherHandle);
            if (!otherCollider) continue;

            const otherBody = otherCollider.parent();
            if (!otherBody || otherBody.isFixed()) continue;

            if (this.pushedBodyHandles.has(otherBody.handle)) return;

            const power = (powerOverride ?? Config.launchingRamp.power) * Config.forceMultiplier;
            otherBody.applyImpulse(
                {
                    x: this.rampDirection.x * power,
                    y: this.rampDirection.y * power,
                    z: this.rampDirection.z * power
                },
                true
            );
            this.pushedBodyHandles.add(otherBody.handle);
            this.playSound(); // Joue le son de lancement
            return;
        }
    }
}
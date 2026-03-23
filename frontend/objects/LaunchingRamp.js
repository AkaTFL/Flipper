import { Rail } from './Rail.js';
import Config from '../physics/Config.js';
import * as THREE from 'three';

export class LaunchingRamp {
    /**
     * @param {Object} world - The physics world
     * @param {Object} position - The position object with x, y, z properties
     */
    constructor(world, width, height, length, position = {x: 0, y: 0, z: 0}, rotation = {x: 0, y: 0, z: 0}) {
        this.world = world;
        this.width = width;
        this.height = height;
        this.length = length;
        this.position = position;
        this.rotation = rotation;

        this.leftRail = new Rail(world, this.length, this.width, this.height, {x: position.x - this.width / 2, y: position.y, z: position.z}, rotation);
        this.rightRail = new Rail(world, this.length, this.width, this.height, {x: position.x + this.width / 2, y: position.y, z: position.z}, rotation);
        this.bottomRail = new Rail(world, this.length, (this.width - 5), this.height, {x: position.x, y: position.y - this.height / 2, z: position.z}, rotation);

        this.rails = [this.leftRail, this.rightRail, this.bottomRail];
        this.meshes = [this.leftRail.mesh, this.rightRail.mesh, this.bottomRail.mesh];

        this.colliders = this.rails.map((rail) => rail.collider);
        this.pushedBodyHandles = new Set();
    }

    hasCollider(handle) {
        return this.colliders.some((collider) => collider.handle === handle);
    }

    resetLaunchImpulse() {
        this.pushedBodyHandles.clear();
    }

    applyLaunchingRampForce(handle1, handle2) {
        for (const rail of this.rails) {
            if (rail.collider.handle !== handle1 && rail.collider.handle !== handle2) continue;

            const otherHandle = rail.collider.handle === handle1 ? handle2 : handle1;
            const otherCollider = this.world.colliders.get(otherHandle);
            if (!otherCollider) continue;

            const otherBody = otherCollider.parent();
            if (!otherBody || otherBody.isFixed()) continue;

            if (this.pushedBodyHandles.has(otherBody.handle)) return;

            const power = Config.launchingRamp.power * Config.forceMultiplier;
            otherBody.applyImpulse(
                {
                    x: this.rampDirection.x * power,
                    y: this.rampDirection.y * power,
                    z: this.rampDirection.z * power
                },
                true
            );
            this.pushedBodyHandles.add(otherBody.handle);
            return;
        }
    }
}
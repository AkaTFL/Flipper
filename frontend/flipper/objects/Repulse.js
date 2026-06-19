import * as RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import Config from '../physics/Config.js';
import { Objects } from './Objects.js';
import { TremblingFromImpact } from '../effects/Trembling.js'

export class Repulse extends Objects {
    /**
     * @param {Object} world - The physics world
     * @param {number} length - The length of the bumper
     * @param {number} width - The width of the bumper
     * @param {number} height - The height of the bumper
     * @param {Object} position - The position object with x, y, z properties
     * @param {Object} rotation - The rotation object with x, y, z properties
     * @param {string} objectId - The bumper identifier
     */
    constructor(camera, world, length = 50, width = 50, height = 50, position = {x: 0, y: 300, z: 0}, rotation = {x: 0, y: 0, z: 0}, objectId = null) {
        super(world, null, null, null, position, rotation, width / 2, [], null);
        
        this.camera = camera;
        this.objectId = objectId ?? 'repulse-zone';
        this.objectType = 'repulse';
        this.length = length;
        this.width = width;
        this.height = height;
        this.power = Config.global.positioning.repulse.power;

        // Physics properties - Fixed (Static)
        this.createFixedRigidBody(position, rotation);

        const repulseConfig = Config.global.positioning.repulse.instances.find((entry) => entry.objectId === this.objectId) || null;

        // Keep group from Objects; add either GLB model or procedural sphere
        this.mesh.position.copy(position);
        this.mesh.rotation.x = rotation.x;
        this.mesh.rotation.y = rotation.y;
        this.mesh.rotation.z = rotation.z;

        const modelPath = new URL(repulseConfig.model, import.meta.url).href;
        this.addMesh(modelPath, (modelRoot) => {

            modelRoot.traverse((child) => {
                if (!child.isMesh) return;

                this.addTexture(
                    Config[Config.currentLevel].textures.repulse,
                    child
                );
            });

            const desc = this.buildTrimeshCollider(modelRoot)
                .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

            this.attachCollider(desc);
        });
    }

    
    applyRepulseForce(handle1, handle2) {
        const otherHandle = this.collider.handle === handle1
            ? handle2
            : handle1;

        const otherCollider = this.world.getCollider(otherHandle);

        if (!otherCollider) return;

        const otherBody = otherCollider.parent();

        if (!otherBody || otherBody.isFixed()) return;

        const velocity = otherBody.linvel();

        if (this.mesh.rotation.y == Math.PI / 2) {
            otherBody.setLinvel({
                x: velocity.x/2,
                y: velocity.y/2,
                z: 1000
            }, true);
        } else {
            otherBody.setLinvel({
                x: -300,
                y: velocity.y/2,
                z: -300
            }, true);
        }

        this.playSound(Config.global.sounds.bumper.collision) // Joue le son du bumper
    }

    handleCollision() {
        this.playSound(Config.global.sounds.bumper.collision); // Son de collision des palles
        TremblingFromImpact(this.camera, 5, 300);
        console.log(`Collision detected with ${this.objectType} (ID: ${this.objectId})`);
    }
}
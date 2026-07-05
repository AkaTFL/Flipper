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
    constructor(scene, world, width = 50, position = { x: 0, y: 300, z: 0 }, rotation = { x: 0, y: 0, z: 0 }, objectId = null) {
        super(world, null, null, null, position, rotation, width / 2, [], null);
        
        this.scene = scene;
        this.objectId = objectId ?? 'bumper';
        this.objectType = 'bumper';
        this.radius = width / 2;
        this.length = width;
        this.width = width;
        this.height = width;
        this.position = position;

        this.bumpCollider = null;

        // Physics properties - Fixed (Static)
        this.createFixedRigidBody(position, rotation);

        // Keep group from Objects; add either GLB model or procedural sphere
        this.mesh.position.copy(position);
        this.mesh.rotation.x = rotation.x;
        this.mesh.rotation.y = rotation.y;
        this.mesh.rotation.z = rotation.z;

        const bumperConfig = Config.global.positioning.bumper.instances.find((entry) => entry.objectId === this.objectId) || null;

        const modelPath = new URL(bumperConfig.model, import.meta.url).href;
        const textureSet = this.objectId?.includes('bumper-triangle')
            ? Config[Config.currentLevel].textures.bumper_triangle
            : Config[Config.currentLevel].textures.bumper;

        this.addMesh(modelPath, (modelRoot) => {

            this.addTexture(textureSet, modelRoot);

            modelRoot.traverse((child) => {

                if (!child.isMesh) {
                    return;
                }

                const collider = this.buildTrimeshCollider(child, {
                    activeEvents: RAPIER.ActiveEvents.COLLISION_EVENTS
                });

                if (child.name && child.name.toLowerCase().includes('bump')) {
                    this.bumpCollider = collider;
                }
            });

        });
    }

    applyBumperForce(handle1, handle2) {  
        const otherHandle =
            this.collider.handle === handle1
                ? handle2
                : handle1;

        const otherCollider =
            this.world.getCollider?.(otherHandle)
            ?? this.world.colliders?.get(otherHandle);

        if (!otherCollider) return;

        const otherBody = otherCollider.parent();

        if (!otherBody || otherBody.isFixed?.()) return;

        const power =
            Config.global.positioning.bumper.power *
            Config.forceMultiplier;

        // Bumper triangulaire
        if (this.objectId?.includes('bumper-triangle')) {
            const userData = this.collider.userData ?? this.collider.getUserData?.();
            if (!userData || userData.name !== 'bump') return;

            otherBody.applyImpulse({
                x: Config.global.positioning.bumper.instances.find(e => e.objectId === this.objectId)?.rotation.x * power,
                y: 0,
                z: Config.global.positioning.bumper.instances.find(e => e.objectId === this.objectId)?.rotation.z * power
            }, true);

            this.playSound(Config.global.sounds.bumper.move);

            return;
        }

        // Bumper classique
        const bumperPos = this.rigidBody.translation();
        const ballPos = otherBody.translation();

        const dx = ballPos.x - bumperPos.x;
        const dy = ballPos.y - bumperPos.y;
        const dz = ballPos.z - bumperPos.z;

        const length = Math.hypot(dx, dy, dz);

        if (!length) return;

        otherBody.applyImpulse({
            x: (dx / length) * power,
            y: (dy / length) * power,
            z: (dz / length) * power
        }, true);

        this.playSound(Config.global.sounds.bumper.move);
    }

    handleCollision() {
        this.playSound(Config.global.sounds.bumper.collision);

        this.scene.effectManager.impact(
            this.mesh.position,
            Config.global.positioning.bumper.power,
            this.objectType
        );
        
    }
}

import * as RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import Config from '../physics/Config.js';
import { Objects } from './Objects.js';
import { TremblingFromImpact } from '../effects/Trembling.js'

export class Bumper extends Objects {
    /**
     * @param {Object} world - The physics world
     * @param {number} width - The radius of the bumper
     * @param {number} height - The radius of the bumper
     * @param {Object} position - The position object with x, y, z properties
     * @param {number} rotation - The rotation of the bumper in radians
     */
    constructor(camera, world, width = 50, position = { x: 0, y: 300, z: 0 }, rotation = { x: 0, y: 0, z: 0 }, objectId = null) {
        super(world, null, null, null, position, rotation, width / 2, [], null);

        this.camera = camera;
        this.objectId = objectId ?? 'bumper';
        this.objectType = 'bumper';
        this.radius = width / 2;
        this.length = width;
        this.width = width;
        this.height = width;

        this.rampCollider = null;

        // Physics properties - Fixed (Static)
        this.createFixedRigidBody(position, rotation);

        // Keep group from Objects; add either GLB model or procedural sphere
        this.mesh.position.copy(position);
        this.mesh.rotation.x = rotation.x;
        this.mesh.rotation.y = rotation.y;
        this.mesh.rotation.z = rotation.z;

        const bumperConfig = Config.global.positioning.bumper.instances.find((entry) => entry.objectId === this.objectId) || null;

        const modelPath = new URL(bumperConfig.model, import.meta.url).href;

        this.addMesh(modelPath, (modelRoot) => {

            this.addTexture(Config[Config.currentLevel].textures.bumper, modelRoot);

            modelRoot.traverse((child) => {

                 console.log(
                    "name:",
                    child.name,
                    "isMesh:",
                    child.isMesh
                );

                if (!child.isMesh) {
                    return;
                }
                
                console.log(
                    "material:",
                    child.material?.type,
                    "uv:",
                    child.geometry?.attributes?.uv
                );

                const desc = this.buildTrimeshCollider(child)
                    .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

                const collider = this.attachCollider(desc);

                if (child.name && child.name.toLowerCase().includes('bump')) {
                    this.rampCollider = collider;

                    console.log('BUMPER COLLIDER FOUND', collider.handle);
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

        // Launching ramp
        if (this.objectId?.includes('launching-ramp')) {

            // N'appliquer la force que sur la partie "ramp"
            if (!this.colliderObject?.name?.includes('ramp')) {
                return;
            }

            otherBody.applyImpulse({
                x: 0,
                y: 0,
                z: power
            }, true);

            this.playSound(Config.global.sounds.bumper.move);
            return;
        }

        // Bumper triangulaire
        if (this.objectId?.includes('bumper-triangle')) {
            const normal = this.getTriangleBumperNormal();

            otherBody.applyImpulse({
                x: normal.x * power,
                y: 0,
                z: normal.z * power
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

    getTriangleBumperNormal() {
        if (this.modelRoot) {
            let normal = null;
            this.modelRoot.traverse((child) => {
                if (normal || !child.isMesh) return;
                if (child.name && child.name.toLowerCase().includes('ramp')) {
                    child.updateWorldMatrix(true, false);
                    const quaternion = child.getWorldQuaternion(new THREE.Quaternion());
                    normal = new THREE.Vector3(0, 0, 1)
                        .applyQuaternion(quaternion)
                        .setY(0);
                    if (normal.lengthSq() > 0.000001) {
                        normal.normalize();
                    } else {
                        normal = null;
                    }
                }
            });

            if (normal) {
                return normal;
            }
        }

        const fallback = new THREE.Vector3(0, 0, 1)
            .applyEuler(this.mesh.rotation)
            .setY(0);

        return fallback.lengthSq() > 0.000001
            ? fallback.normalize()
            : new THREE.Vector3(0, 0, 1);
    }

    handleCollision() {
        this.playSound(Config.global.sounds.bumper.collision);
        TremblingFromImpact(this.camera, 5, 300);
        console.log(`Collision detected with ${this.objectType} (ID: ${this.objectId})`);
    }
}
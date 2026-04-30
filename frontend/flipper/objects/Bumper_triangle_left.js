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
    constructor(world, width = 50, position = {x: 0, y: 300, z: 0}, rotation = {x: 0, y: 0, z: 0}, objectId = null) {
        super(world, null, null, null, position, rotation, width / 2, [], null);
        this.objectId = objectId ?? 'bumper';
        this.objectType = 'bumper';
        this.radius = width / 2;
        this.length = this.width = this.radius * 2;
        this.height = this.radius * 2 * 1.5; // bumper un peu plus haut

        console.log('Bumper créé', { objectId: this.objectId, position, radius: this.radius });

        const modelPath = new URL('../assets/mesh/bumper_triangle_left.glb', import.meta.url).href;
        this.addMesh(modelPath, (modelRoot) => {
            const { size, center } = this.getMeshMetrics(modelRoot);

            modelRoot.position.x = -center.x;
            modelRoot.position.y = -center.y;
            modelRoot.position.z = -center.z;

            console.log('Bumper chargé', { objectId: this.objectId, modelPath, size, center });

            modelRoot.traverse((node) => {
                if (!node.isMesh) return;

                node.castShadow = true;
                node.receiveShadow = true;

                const updateMaterial = (material) => {
                    if (!material) return;
                    if (Array.isArray(material)) {
                        material.forEach((mat) => mat.color?.set?.(0xff0000));
                        return;
                    }
                    material.color?.set?.(0xff0000);
                };

                updateMaterial(node.material);
            });
        });

        // Place le mesh comme la balle
        this.mesh.position.copy(position);
        this.mesh.rotation.set(rotation.x ?? 0, rotation.y ?? 0, rotation.z ?? 0);

        // Physics properties - Fixed (Static)
        this.createFixedRigidBody(position, rotation, false);

        const colliderDesc = RAPIER.ColliderDesc.ball(this.radius)
            .setRestitution(Config.bumper.restitution)
            .setFriction(Config.bumper.friction)
            .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

        this.attachCollider(colliderDesc);
    }

    applyBumperForce(handle1, handle2) {
        const otherHandle = this.collider.handle === handle1 ? handle2 : handle1
        const otherCollider = typeof this.world.getCollider === 'function'
            ? this.world.getCollider(otherHandle)
            : this.world.colliders?.get(otherHandle)

        if (!otherCollider) return

        const otherBody = otherCollider.parent()
        if (!otherBody || (otherBody.isFixed && otherBody.isFixed())) return

        const bumperPos = this.rigidBody.translation()
        const ballPos = otherBody.translation()

        const dirX = ballPos.x - bumperPos.x
        const dirY = ballPos.y - bumperPos.y
        const dirZ = ballPos.z - bumperPos.z

        // Normaliser
        const length = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ)
        if (length === 0) return

        const X = dirX / length
        const Y = dirY / length
        const Z = dirZ / length

        // Appliquer force
        const power = Config.bumper.power * Config.forceMultiplier
        otherBody.applyImpulse(
            { x: X * power, y: Y * power, z: Z * power },
            true
        )

        this.playSound(Config.sounds.bumper.move) 
    }

    handleCollision() {
        if (this.audio) {
            this.playSound(Config.sounds.bumper.collision);
        }
    }
}
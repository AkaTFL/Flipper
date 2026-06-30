import * as RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { Objects } from './Objects.js';
import Config from '../physics/Config.js';

const ENTRANCE_LAUNCH_FORCE = 12;

export class Ramp extends Objects {
    constructor(scene, world, length, width, height, position, rotation, modelFile, objectId) {
        super(world, length, width, height, position, rotation, null, null);
        this.objectId = objectId;
        this.objectType = 'ramp';
        this.scene = scene;

        this.entranceCollider = null;
        this.rampCollider = null;
        this._railCenter = null;

        // gamePhysics est injecté depuis Flipper.js juste après le new Ramp(...)
        // On s'en sert pour enregistrer les colliders après le chargement async du modèle
        this.gamePhysics = null;

        if (this.TreeMesh) {
            this.mesh.remove(this.TreeMesh);
            this.TreeMesh = null;
        }

        this.createFixedRigidBody(position, rotation);

        if (modelFile) {
            const modelPath = new URL(modelFile, import.meta.url).href;

            this.addMesh(modelPath, (modelRoot) => {

                // Centre world-space du rail — cible de l'impulsion
                modelRoot.traverse((child) => {
                    if (child.isMesh && child.name === 'rail') {
                        const box = new THREE.Box3().setFromObject(child);
                        this._railCenter = new THREE.Vector3();
                        box.getCenter(this._railCenter);
                    }
                });

                modelRoot.traverse((child) => {
                    if (!child.isMesh) return;

                    switch (child.name) {
                        case 'rail':
                            this.addTexture(Config[Config.currentLevel].textures.ramps.rail, child);
                            break;
                        case 'entrance':
                            this.addTexture(Config[Config.currentLevel].textures.ramps.entrance, child);
                            break;
                        default:
                            this.addTexture(Config[Config.currentLevel].textures[this.objectType], child);
                    }

                    const trimesh = this.buildTrimeshCollider(child);
                    const collider = this.attachCollider(
                        trimesh.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
                    );

                    if (child.name === 'entrance') {
                        this.entranceCollider = collider;
                    } else if (child.name.toLowerCase().includes('ramp')) {
                        this.rampCollider = collider;
                    }

                    // Enregistrement tardif : les colliders sont créés après registerObjects,
                    // donc on les ajoute manuellement dans colliderOwners/colliderResponders
                    if (this.gamePhysics) {
                        this.gamePhysics.colliderOwners.set(collider.handle, this);
                        this.gamePhysics.colliderResponders.set(collider.handle, this);
                    }
                });
            });
        } else {
            console.error('No model file provided for Ramp. Please provide a valid model file path.');
        }
    }

    handleCollision({ handle1, handle2 }) {
        console.log(`Collision detected with ${this.objectType} (ID: ${this.objectId})`);

        this.scene.effectManager.impact(this.mesh.position, 1, this.objectType);

        const entranceHandle = this.entranceCollider?.handle;
        const hitEntrance =
            entranceHandle !== undefined &&
            (handle1 === entranceHandle || handle2 === entranceHandle);

        if (!hitEntrance || !this._railCenter) return;

        const ballBody = this.gamePhysics?.ball?.rigidBody;
        if (!ballBody) {
            console.warn(`[Ramp ${this.objectId}] Pas de ballBody disponible.`);
            return;
        }

        this._launchBallTowardRail(ballBody);
    }

    _launchBallTowardRail(ballBody) {
        const ballPos = ballBody.translation();

        const direction = new THREE.Vector3(
            this._railCenter.x - ballPos.x,
            this._railCenter.y - ballPos.y,
            this._railCenter.z - ballPos.z
        ).normalize();

        const impulse = {
            x: direction.x * ENTRANCE_LAUNCH_FORCE,
            y: direction.y * ENTRANCE_LAUNCH_FORCE,
            z: direction.z * ENTRANCE_LAUNCH_FORCE,
        };

        ballBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
        ballBody.applyImpulse(impulse, true);

        console.log(`[Ramp ${this.objectId}] Impulsion vers le rail`, impulse);
    }
}
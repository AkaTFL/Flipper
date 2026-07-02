import * as RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { Objects } from './Objects.js';
import Config from '../physics/Config.js';

export class Ramp extends Objects {
    constructor(scene, world, length, width, height, position, rotation, modelFile, objectId) {
        super(world, length, width, height, position, rotation, null, null);
        this.objectId = objectId;
        this.objectType = 'ramp';
        this.scene = scene;

        this.entranceCollider = null;
        this.rampCollider = null;
        this._railCenter = null;
        this._entranceCenter = null;
        this._railExit = null;
        this._propulsionTimer = null;
        this._launching = false; // verrou anti-redéclenchement pendant le lancement

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
                    if (child.isMesh && child.name === 'entrance') {
                        const box = new THREE.Box3().setFromObject(child);
                        this._entranceCenter = new THREE.Vector3();
                        box.getCenter(this._entranceCenter);
                    }
                });

                if (this._entranceCenter && this._railCenter) {
                    const exitDirection = this._railCenter.clone()
                        .sub(this._entranceCenter)
                        .normalize();
                    this._railExit = this._railCenter.clone().add(
                        exitDirection.multiplyScalar(
                            Config.global.positioning.ramps.B.propulsionExitDistance
                        )
                    );
                }

                modelRoot.traverse((child) => {
                    if (!child.isMesh) return;

                    switch (child.name) {
                        case 'rail':
                            this.addTexture(Config[Config.currentLevel].textures.ramps.rail, child);
                            break;
                        case 'entrance':
                            this.addTexture(Config[Config.currentLevel].textures.ramps.entrance, child);
                            this._setEntranceBaseColor(child, 0x343b2a);
                            break;
                        default:
                            this.addTexture(Config[Config.currentLevel].textures[this.objectType], child);
                    }

                    const collider = this.buildLocalTrimeshCollider(child, {
                        // L'entrée détecte la balle sans la bloquer.
                        sensor: child.name === 'entrance',
                        activeEvents: RAPIER.ActiveEvents.COLLISION_EVENTS
                    });

                    if (!collider) return;

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

        // Évite de relancer plusieurs fois si l'event "started" se redéclenche
        // pendant que la balle est encore dans la zone d'entrée
        if (this._launching) return;

        const ballBody = this.gamePhysics?.ball?.rigidBody;
        if (!ballBody) {
            console.warn(`[Ramp ${this.objectId}] Pas de ballBody disponible.`);
            return;
        }

        this._activatePropulsion(ballBody);
    }

    _launchBallTowardRail(ballBody) {
        const ballPos = ballBody.translation();
        const currentVelocity = ballBody.linvel();

        // Vitesse (norme) à laquelle la balle arrive dans la zone d'entrée —
        // on la conserve telle quelle, on ne fait que rediriger sa direction.
        const incomingSpeed = Math.hypot(
            currentVelocity.x ?? 0,
            currentVelocity.y ?? 0,
            currentVelocity.z ?? 0
        );
        const speed = Math.max(
            incomingSpeed,
            Config.global.positioning.ramps.B.minimumLaunchSpeed ?? 0
        );

        const direction = new THREE.Vector3(
            this._railCenter.x - ballPos.x,
            this._railCenter.y - ballPos.y,
            this._railCenter.z - ballPos.z
        ).normalize();

        const launchVelocity = {
            x: direction.x * speed,
            y: direction.y * speed,
            z: direction.z * speed,
        };

        ballBody.setLinvel(launchVelocity, true);

        console.log(`[Ramp ${this.objectId}] Lancement vers le rail (entrée: ${incomingSpeed.toFixed(2)}, sortie: ${speed.toFixed(2)})`, launchVelocity);
    }

    _activatePropulsion(ballBody) {
        if (!ballBody || this._launching || !this._railCenter) return false;

        this._launching = true;
        this._launchBallTowardRail(ballBody);
        this._startGuidedPropulsion(ballBody);

        setTimeout(() => {
            this._launching = false;
        }, Config.global.positioning.ramps.B.propulsionDurationMs);

        return true;
    }

    _setEntranceBaseColor(mesh, color) {
        const materials = Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material];

        materials.filter(Boolean).forEach((material) => {
            material.color?.set(color);
            material.roughness = 0.9;
            material.metalness = 0;
            material.needsUpdate = true;
        });
    }

    _startGuidedPropulsion(ballBody) {
        if (!this._railCenter) return;

        if (this._propulsionTimer !== null) {
            clearInterval(this._propulsionTimer);
        }

        const config = Config.global.positioning.ramps.B;
        const startedAt = Date.now();
        let target = this._railCenter;
        let targetingExit = false;

        const propel = () => {
            if ((Date.now() - startedAt) >= config.propulsionDurationMs) {
                clearInterval(this._propulsionTimer);
                this._propulsionTimer = null;
                return;
            }

            const position = ballBody.translation();
            const ballPosition = new THREE.Vector3(position.x, position.y, position.z);

            if (
                !targetingExit &&
                this._railExit &&
                ballPosition.distanceTo(this._railCenter) <= config.propulsionSwitchDistance
            ) {
                target = this._railExit;
                targetingExit = true;
            }

            const direction = target.clone().sub(ballPosition);
            if (direction.lengthSq() < 1) return;

            direction.normalize().multiplyScalar(config.propulsionSpeed);
            ballBody.setLinvel({
                x: direction.x,
                y: direction.y,
                z: direction.z
            }, true);
        };

        propel();
        this._propulsionTimer = setInterval(propel, config.propulsionTickMs);
    }
}

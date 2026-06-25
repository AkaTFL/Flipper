import * as RAPIER from '@dimforge/rapier3d-compat';
import { Objects } from './Objects.js';
import Config from '../physics/Config.js';

export class Ramp extends Objects {
    constructor(scene, world, length, width, height, position, rotation, modelFile, objectId) {
        super(world, length, width, height, position, rotation, null, null);
        this.objectId = objectId;
        this.objectType = 'ramp';
        this.scene = scene;

        if (this.TreeMesh) {
            this.mesh.remove(this.TreeMesh);
            this.TreeMesh = null;
        }

        this.createFixedRigidBody(position, rotation);

        if (modelFile) {
            const modelPath = new URL(modelFile, import.meta.url).href;

            this.addMesh(modelPath, (modelRoot) => {

                this.rampCollider = null;

                modelRoot.traverse((child) => {

                    if (child.isMesh) {
                        switch (child.name) {
                            case 'rail':
                                this.addTexture(
                                    Config[Config.currentLevel].textures.ramps.rail,
                                    child
                                );
                                break;

                            case 'entrance':
                                this.addTexture(
                                    Config[Config.currentLevel].textures.ramps.entrance,
                                    child
                                );
                                break;
                        }
                    } else if (child.isMesh) {
                        this.addTexture(
                            Config[Config.currentLevel].textures[this.objectType],
                            child
                        );
                    }

                    const trimesh = this.buildTrimeshCollider(child);

                    const collider = this.attachCollider(
                        trimesh.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
                    );

                    if (child.name.toLowerCase().includes('ramp')) {
                        this.rampCollider = collider;
                    }
                });
            });
        } else {
            console.error('No model file provided for Ramp. Please provide a valid model file path.');
        }
    }

    handleCollision({ handle1, handle2 }) {
        console.log(`Collision detected with ${this.objectType} (ID: ${this.objectId})`);
        
        this.scene.effectManager.impact(
            this.mesh.position,
            1,
            this.objectType
        );
    }
}
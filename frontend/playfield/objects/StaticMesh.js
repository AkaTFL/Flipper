import * as RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { Objects } from './Objects.js';
import Config from '../physics/Config.js';

export class StaticMesh extends Objects {
    constructor(scene, world, model, options = {}) {
        const {
            length   = null,
            width    = null,
            height   = null,
            side     = null,
            position = { x: 0, y: 0, z: 0 },
            rotation = { x: 0, y: 0, z: 0 },
            objectId   = 'static-mesh',
            objectType = 'static'
        } = options;

        super(world, null, null, null, position, rotation, side);
        this.length = length;
        this.width  = width;
        this.height = height;
        this.objectId = objectId;
        this.objectType = objectType;
        this.scene = scene;

        this.createFixedRigidBody(position, rotation);

        const modelPath = new URL(model, import.meta.url).href;
        this.addMesh(modelPath, (modelRoot) => {
            modelRoot.traverse((child) => {
                if (child.isMesh) {
                    console.log(child.name, child.geometry.uuid);
                    console.log(child.name, child.material, child.material?.uuid);

                    if (this.objectType === 'etage') {
                        this.buildLocalTrimeshCollider(child, {
                            activeEvents: RAPIER.ActiveEvents.COLLISION_EVENTS
                        });
                    } else {
                        const trimesh = this.buildTrimeshCollider(child);

                        if (trimesh) {
                            this.attachCollider(
                                trimesh.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
                            );
                        }
                    }

                    switch (child.name) {
                        case 'table':
                            this.addTexture(
                                Config[Config.currentLevel].textures.body.table,
                                child
                            );
                            break;

                        case 'walls':
                            this.addTexture(
                                Config[Config.currentLevel].textures.body.walls,
                                child
                            );
                            break;

                        default:
                            this.addTexture(
                                Config[Config.currentLevel].textures[objectType],
                                child
                            );
                    }
                }
            });
        });
    }

    handleCollision() {
        console.log(`Collision with ${this.objectType} (ID: ${this.objectId})`);

        this.scene.effectManager.impact(
            this.mesh.position,
            1,
            this.objectType
        );
    }
}

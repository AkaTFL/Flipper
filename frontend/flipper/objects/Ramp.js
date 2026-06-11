import * as RAPIER from '@dimforge/rapier3d-compat';
import { Objects } from './Objects.js';
import Config from '../physics/Config.js';

export class Ramp extends Objects {
    constructor(world, modelFile, options = {}, fallbackObjectId = 'ramp') {
        const resolvedOptions = options ?? {};
        const {
            length = 160,
            width = 40,
            height = 80,
            position = { x: 0, y: 0, z: 0 },
            rotation = { x: 0, y: 0, z: 0 },
            objectId = fallbackObjectId
        } = resolvedOptions;

        super(world, length, width, height, position, rotation, null, null);
        this.objectId = objectId;
        this.objectType = 'ramp';

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

                    if (!child.isMesh) return;

                    const texture = Config[Config.currentLevel].textures.ramps?.[child.name];

                    if (texture) {
                        this.addTexture(texture, child);
                    }

                    const trimesh = this.buildTrimeshCollider(child);

                    if (!trimesh) return;

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
    }
}
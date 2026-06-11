import * as RAPIER from '@dimforge/rapier3d-compat';
import { Objects } from './Objects.js';
import Config from '../physics/Config.js';

export class StaticMesh extends Objects {
    constructor(world, model, options = {}) {
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

        this.createFixedRigidBody(position, rotation);

        const modelPath = new URL(model, import.meta.url).href;
        this.addMesh(modelPath, (modelRoot) => {
            modelRoot.traverse((child) => {

                if (!child.isMesh) return;

                if (child.name === 'table') {
                    this.addTexture(
                        Config[Config.currentLevel].textures.body.table,
                        child
                    );
                }

                if (child.name === 'walls') {
                    this.addTexture(
                        Config[Config.currentLevel].textures.body.walls,
                        child
                    );
                }
            });
        });
    }

    handleCollision() {
        console.log(`Collision with ${this.objectType} (ID: ${this.objectId})`);
    }
}

import * as RAPIER from '@dimforge/rapier3d-compat';
import { Objects } from './Objects.js';

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
            const trimesh = this.buildTrimeshCollider(modelRoot);
            if (trimesh) {
                this.attachCollider(
                    trimesh.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
                );
            }
        });
    }

    handleCollision() {
        console.log(`Collision with ${this.objectType} (ID: ${this.objectId})`);
    }
}

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

        // On passe null pour length/width/height afin d'éviter le BoxGeometry de debug
        // Les valeurs sont réassignées ensuite pour que addMesh() puisse s'en servir pour le scale
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
        this.playSound(Config.sounds.staticMesh.collision);
    }
}

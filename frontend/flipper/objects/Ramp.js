import * as RAPIER from '@dimforge/rapier3d-compat';
import Config from '../physics/Config.js';
import { Objects } from './Objects.js';

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

                    if (!child.isMesh) {
                        return;
                    }

                    const trimesh = this.buildTrimeshCollider(child);

                    if (!trimesh) {
                        return;
                    }

                    const collider = this.attachCollider(
                        trimesh.setActiveEvents(
                            RAPIER.ActiveEvents.COLLISION_EVENTS
                        )
                    );

                    console.log(
                        'Collider créé pour',
                        child.name,
                        collider.handle
                    );

                    if (
                        child.name &&
                        child.name.toLowerCase().includes('ramp')
                    ) {
                        this.rampCollider = collider;
                    }
                });
            });
            return;
        }

        const desc = RAPIER.ColliderDesc.cuboid(this.length / 2, this.width / 2, this.height / 2)
            .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
        this.attachCollider(desc);
    }

    handleCollision({ handle1, handle2 }) {
        this.playSound(Config.sounds.ramp.collision);
        console.log(`Collision detected with ${this.objectType} (ID: ${this.objectId})`);
    }
}
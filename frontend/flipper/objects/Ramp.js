import * as RAPIER from '@dimforge/rapier3d-compat';
import Config from '../physics/Config.js';
import { Objects } from './Objects.js';

class RampBase extends Objects {
    constructor(world, modelFile, options = {}, fallbackObjectId = 'ramp') {
        const {
            length = 160,
            width = 40,
            height = 80,
            position = { x: 0, y: 0, z: 0 },
            rotation = { x: 0, y: 0, z: 0 },
            objectId = fallbackObjectId
        } = options;

        super(world, length, width, height, position, rotation, null, null);
        this.objectId = objectId;
        this.objectType = 'ramp';

        if (this.TreeMesh) {
            this.mesh.remove(this.TreeMesh);
            this.TreeMesh = null;
        }

        this.createFixedRigidBody(position, rotation, true);

        const colliderDesc = RAPIER.ColliderDesc.cuboid(this.length / 2, this.width / 2, this.height / 2)
            .setRestitution(Config.wall.restitution)
            .setFriction(Config.wall.friction)
            .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

        this.attachCollider(colliderDesc);

        // Use `options.model` when provided (relative to Config.js), otherwise use the fallback modelFile
        const modelPath = new URL(options.model, import.meta.url).href
        this.addMesh(modelPath);
    }
}

export class RampA extends RampBase {
    constructor(world, options = Config.ramps?.A) {
        super(world, 'ramp_A.glb', options, 'ramp-a');
    }
}

export class RampB extends RampBase {
    constructor(world, options = Config.ramps?.B) {
        super(world, 'ramp_Bglb.glb', options, 'ramp-b');
    }
}

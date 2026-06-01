import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import Config from '../physics/Config.js';
import { Objects } from './Objects.js';

class BumperTriangleBase extends Objects {
    constructor(world, variant = 'right', length = 70, width = 70, height = 40, position = { x: 0, y: 0, z: 0 }, rotation = { x: 0, y: 0, z: 0 }, objectId = null) {
        super(world, length, width, height, position, rotation, null, null);
        this.objectId = objectId ?? `bumper-triangle-${variant}`;
        this.objectType = 'bumper_triangle';

        if (this.TreeMesh) {
            this.mesh.remove(this.TreeMesh);
            this.TreeMesh = null;
        }

        this.createFixedRigidBody(position, rotation);

        // Look for a per-instance model in Config.bumpers_triangle by objectId; fallback to default
        const triangleCfg = (Config.bumpers_triangle || []).find(t => t.objectId === this.objectId) || null;
        const modelRelative = triangleCfg?.model || '../assets/mesh/bumper_triangle_right.glb';
        if (modelRelative) {
            const modelPath = new URL(modelRelative, import.meta.url).href;
            // Only mirror when using a right-oriented model for a left variant.
            const shouldMirror = variant === 'left' && typeof modelRelative === 'string' && modelRelative.toLowerCase().includes('right');
            this.addMesh(modelPath, (modelRoot) => {
                if (shouldMirror) {
                    modelRoot.scale.x *= -1;
                }

                const desc = this.buildTrimeshCollider(modelRoot)
                             .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)

                this.attachCollider(desc);
            });
        }
    }

    handleCollision() {
        this.playSound(Config.sounds.bumper.collision); // Son de collision des palles    
        console.log(`Collision detected with ${this.objectType} (ID: ${this.objectId})`);
    }
}

export class BumperTriangleRight extends BumperTriangleBase {
    constructor(world, length, width, height, position, rotation, objectId) {
        super(world, 'right', length, width, height, position, rotation, objectId);
    }
}

export class BumperTriangleLeft extends BumperTriangleBase {
    constructor(world, length, width, height, position, rotation, objectId) {
        super(world, 'left', length, width, height, position, rotation, objectId);
    }
}

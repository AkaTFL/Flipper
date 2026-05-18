import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import Config from '../physics/Config.js';
import { Objects } from './Objects.js';

class BumperTriangleBase extends Objects {
    constructor(world, variant = 'right', width = 70, position = { x: 0, y: 0, z: 0 }, rotation = { x: 0, y: 0, z: 0 }, objectId = null) {
        super(world, width, width, width, position, rotation, null, null);
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
            this.addMesh(modelPath, (modelRoot) => {
            if (variant === 'left') {
                modelRoot.scale.x *= -1;
            }
            
            const desc = this.buildTrimeshCollider(modelRoot)
                             .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
            if (desc) {
                this.replaceCollider(desc, this.rigidBody);
            } else {
                this.attachCollider(RAPIER.ColliderDesc.cuboid(this.width / 2, this.width / 2, this.width / 2));
            }
        });
        }
    }

    handleCollision() {
            // Par défaut, joue le son s'il existe
            if (this.audio) {
                this.playSound(Config.sounds.bumperTriangle.collision); // Son de collision des palles
            }
    
            console.log(`Collision detected with ${this.objectType} (ID: ${this.objectId})`);
    }
}

export class BumperTriangleRight extends BumperTriangleBase {
    constructor(world, width, position, rotation, objectId) {
        super(world, 'right', width, position, rotation, objectId);
    }
}

export class BumperTriangleLeft extends BumperTriangleBase {
    constructor(world, width, position, rotation, objectId) {
        super(world, 'left', width, position, rotation, objectId);
    }
}

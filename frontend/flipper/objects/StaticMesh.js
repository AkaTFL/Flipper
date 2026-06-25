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
                    console.log(
                        child.name,
                        child.geometry.uuid
                    )};

                    console.log(
                        child.name,
                        child.material,
                        child.material?.uuid
                    )

                const trimesh = this.buildTrimeshCollider(child);

                if (trimesh) {
                    this.attachCollider(
                        trimesh.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
                    );
                }

                if (child.isMesh) {
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
            })

            if (this.objectId === 'body-flipper') {
                this.attachBottomWallDrainCollider(modelRoot);
            }
        });
    }

    attachBottomWallDrainCollider(modelRoot) {
        modelRoot.updateMatrixWorld(true);

        const wallPoints = [];
        let minZ = Infinity;
        let maxZ = -Infinity;

        modelRoot.traverse((child) => {
            if (!child.isMesh || child.name !== 'walls' || !child.geometry) {
                return;
            }

            const positionAttribute = child.geometry.getAttribute('position');
            if (!positionAttribute) {
                return;
            }

            const vertex = new THREE.Vector3();
            for (let i = 0; i < positionAttribute.count; i++) {
                vertex.fromBufferAttribute(positionAttribute, i).applyMatrix4(child.matrixWorld);
                wallPoints.push(vertex.clone());
                minZ = Math.min(minZ, vertex.z);
                maxZ = Math.max(maxZ, vertex.z);
            }
        });

        if (wallPoints.length === 0) {
            console.warn('[StaticMesh] Mur du bas introuvable dans Body_flipper.glb');
            return;
        }

        const zBand = Math.max(20, (maxZ - minZ) * 0.08);
        const bottomPoints = wallPoints.filter((point) => point.z <= minZ + zBand);
        const xs = bottomPoints.map((point) => point.x);
        const ys = bottomPoints.map((point) => point.y);
        const zs = bottomPoints.map((point) => point.z);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const bottomMinZ = Math.min(...zs);
        const bottomMaxZ = Math.max(...zs);
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const centerZ = (bottomMinZ + bottomMaxZ) / 2;
        const halfX = Math.max((maxX - minX) / 2, 10);
        const halfY = Math.max((maxY - minY) / 2, 10);
        const halfZ = Math.max((bottomMaxZ - bottomMinZ) / 2, 10);
        const drainMeta = {
            objectId: 'body-bottom-wall',
            objectType: 'drain'
        };

        const colliderDesc = RAPIER.ColliderDesc.cuboid(halfX, halfY, halfZ)
            .setTranslation(centerX, centerY, centerZ)
            .setRestitution(0)
            .setFriction(0)
            .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

        const collider = this.world.createCollider(colliderDesc, this.rigidBody);
        this.colliders = [...(this.colliders || []), collider];

        if (this.gamePhysics?.colliderOwners && collider?.handle !== undefined) {
            this.gamePhysics.colliderOwners.set(collider.handle, drainMeta);
            this.gamePhysics.colliderResponders.set(collider.handle, drainMeta);
        }

        console.info('[StaticMesh] Collider drain mur du bas', {
            center: { x: centerX, y: centerY, z: centerZ },
            halfExtents: { x: halfX, y: halfY, z: halfZ }
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

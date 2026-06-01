import * as RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import Config from '../physics/Config.js';
import { Objects } from './Objects.js';

export class Wall extends Objects {
    /**
     * @param {Object} world - The physics world
     * @param {number} width - The width of the wall
     * @param {number} height - The height of the wall
     * @param {Object} position - The position object with x, y, z properties
     * @param {number} rotation - The rotation of the wall in radians (default is 0, which means no rotation)
     */
    constructor(gamePhysics, width = 500, height = 500, position = {x: 250, y: 500, z: 0}, rotation = {x: 0, y: 0, z: 0}, objectId = undefined) {
        super(gamePhysics.world, null, width, height, position, rotation, null, [], null);
        this.objectType = 'wall';
        this.objectId = objectId;
        this.gamePhysics = gamePhysics;
        const restitution = Config.wall?.restitution ?? Config.scene?.restitution ?? 0;
        const friction = Config.wall?.friction ?? Config.scene?.friction ?? 0;

        this.mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(this.width, this.height),
            new THREE.MeshStandardMaterial({
                color: 0xa0a0a0,
                side: THREE.DoubleSide,
                metalness: 0.0,
                roughness: 1.0
            })
        );

        this.mesh.receiveShadow = true;
        // this.mesh.castShadow = true;

        this.mesh.position.copy(position);

        this.mesh.rotation.x = rotation.x;
        this.mesh.rotation.y = rotation.y;
        this.mesh.rotation.z = rotation.z;

        // Physics properties - Fixed (Static)
        this.createFixedRigidBody(position, rotation);
        
            this.setDebugColliderBuilder(() => {
                const scale = this.getDebugState().scale;
                const width = Math.max(0.01, this.width * scale.x);
                const height = Math.max(0.01, this.height * scale.y);
                const depth = Math.max(0.01, scale.z);

                return RAPIER.ColliderDesc.cuboid(width / 2, height / 2, depth)
                    .setRestitution(restitution)
                    .setFriction(friction)
                    .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
            });

        const wallColliderDesc = RAPIER.ColliderDesc.cuboid(this.width / 2, this.height / 2, 1)
            .setRestitution(restitution)
            .setFriction(friction)
            .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
            
        this.attachCollider(wallColliderDesc);
    }
    
    handleCollision() {
        this.playSound(Config.sounds.wall.collision);
        console.log(`Collision detected with ${this.objectType} (ID: ${this.objectId})`);
    }
}
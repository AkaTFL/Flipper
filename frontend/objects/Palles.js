import * as RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import Config from '../physics/Config.js';
import { Objects } from './Objects.js';

export class Palles extends Objects {
    /**
     * @param {Object} world - The physics world
     * @param {number} length - The length of the palles
     * @param {number} height - The height of the palles
     * @param {Object} position - The position object with x, y, z properties
     * @param {Object} rotation - The rotation object with x, y, z properties
     */
    constructor(world, length = 500, width = 10, height = 10, position = {x: 250, y: 500, z: 0}, rotation = {x: 0, y: 0, z: 0}, side) {
        super(world, length, width, height, position, rotation, null, [], null, Config.sounds.palles.file);
        this.side = side;
        this.isLeft = side === 'left';
        this.wasActive = false;

        this.angle = Math.abs(Config.palles.rotationAngle);
        this.initialAngle = Math.abs(Config.palles.initialAngle);
        this.restAngle = this.isLeft ? -this.initialAngle : this.initialAngle;
        this.rotationSpeed = Config.palles.rotationSpeed;

        this.mesh.rotation.z = rotation.z + this.restAngle;

        const modelPath = new URL(
            this.isLeft ? '../assets/mesh/Left_flipper.glb' : '../assets/mesh/Right_flipper.glb',
            import.meta.url
        ).href;
        
        this.addMesh(modelPath, (modelRoot) => {
            modelRoot.rotation.y = this.isLeft ? -Math.PI / 5 : Math.PI / 5;

            // Recalculate center AFTER scale and rotation
            const Box = new THREE.Box3().setFromObject(modelRoot);
            const Center = Box.getCenter(new THREE.Vector3());

            // Align on X (pivot point) and center on Y/Z
            const targetX = this.isLeft ? this.length / 2 : -this.length / 2;
            const currentX = this.isLeft ? Box.max.x : Box.min.x;

            modelRoot.position.x += targetX - currentX;
            modelRoot.position.y = -Center.y;
            modelRoot.position.z = -Center.z;
        });

        // Physics properties - hinge anchors differ for left/right flippers
        const isLeft = side === 'left';
        const anchorBody = isLeft ? { x: (length / 2), y: 0, z: 0 } : { x: (-length / 2), y: 0, z: 0 };
        const pivotWorldX = isLeft ? position.x + (length / 2) : position.x - (length / 2);


        const initialRotation = {
            x: rotation.x,
            y: rotation.y,
            z: rotation.z + this.restAngle
        };

        const pallesDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(position.x, position.y, position.z)
            .setCanSleep(false)
            .setRotation({ x: Math.sin(initialRotation.x / 2), y: Math.sin(initialRotation.y / 2), z: Math.sin(initialRotation.z / 2), w: Math.cos(initialRotation.x / 2) * Math.cos(initialRotation.y / 2) * Math.cos(initialRotation.z / 2) });

        this.rigidBody = this.world.createRigidBody(pallesDesc);

        const pivotDesc = RAPIER.RigidBodyDesc.fixed()
        .setTranslation(pivotWorldX, position.y, position.z);
        
        const pivotBody = this.world.createRigidBody(pivotDesc);

        // Ajout d'un point pivot pour permettre la rotation autour d'un point spécifique
        const pivot = RAPIER.JointData.revolute({ x: 0, y: 0, z: 0 }, anchorBody, { x: 0, y: 1, z: 0 });

        this.joint = this.world.createImpulseJoint(pivot, pivotBody, this.rigidBody, true);

        const colliderDesc = RAPIER.ColliderDesc.cuboid(this.length / 2, this.width / 2, this.height / 2)
            .setRestitution(Config.palles.restitution)
            .setFriction(Config.palles.friction);

        this.attachCollider(colliderDesc);

        //Movements of the palles
        if (this.isLeft) {
            this.joint.setLimits(-this.angle, 0);
        } else {
            this.joint.setLimits(0, this.angle);
        }
    }

    setActive(active) {
        const targetAngle = active
            ? (this.isLeft ? this.angle : -this.angle)
            : this.restAngle;
    
        this.joint.configureMotorPosition(targetAngle, this.rotationSpeed, 8.0);
        
        if (active && !this.wasActive) {
            this.playSound("move"); //Son de mouvement des palles
        }
        this.wasActive = active;
    }

    syncPalle() {
        this.syncObjects();
    }

    
    handleCollision() {
        // Par défaut, joue le son s'il existe
        if (this.audio) {
            this.playSound(); // Son de collision des palles
        }
    }
}
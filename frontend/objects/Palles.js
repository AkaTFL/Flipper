import * as RAPIER from '@dimforge/rapier3d-compat';
import Config from '../physics/Config.js';
import { Objects } from './Objects.js';

export class Palles extends Objects {
    /**
     * @param {Object} world - The physics world
     * @param {number} length - The length of the palles
     * @param {number} height - The height of the palles
     * @param {Object} position - The position object with x, y, z properties
     * @param {Object} rotation - The rotation object with x, y, z properties
     * @param {string} side - 'left' ou 'right'
     */
    constructor(world, length = 500, width = 10, height = 10, position = {x: 250, y: 500, z: 0}, rotation = {x: 0, y: 0, z: 0}, side) {
        super(world, length, width, height, position, rotation, null, [], null);
        this.objectId = side ? `palle-${side}` : 'palle';
        this.objectType = 'palle';
        
        if (this.TreeMesh) {
            this.mesh.remove(this.TreeMesh);
            this.TreeMesh = null;
        }
        
        this.side = side;
        this.isLeft = side === 'left';
        this.wasActive = false;

        this.angle = Math.abs(Config.palles.rotationAngle);
        this.initialAngle = Math.abs(Config.palles.initialAngle);
        this.restAngle = this.isLeft ? -this.initialAngle : this.initialAngle;
        this.rotationSpeed = Config.palles.rotationSpeed;

        this.mesh.rotation.z = rotation.z + this.restAngle;
        this.joint = null;

        const modelPath = new URL(
            this.isLeft ? '../assets/mesh/Left_flipper.glb' : '../assets/mesh/Right_flipper.glb',
            import.meta.url
        ).href;
        
        this.addMesh(modelPath, (modelRoot) => {
            modelRoot.rotation.y = this.isLeft ? -Math.PI / 5 : Math.PI / 5;

            const { box, center, halfLengthX } = this.getMeshMetrics(modelRoot);

            // Align on X (pivot point) and center on Y/Z
            const targetX = this.isLeft ? halfLengthX : -halfLengthX;
            const currentX = this.isLeft ? box.max.x : box.min.x;

            modelRoot.position.x += targetX - currentX;
            modelRoot.position.y = -center.y;
            modelRoot.position.z = -center.z;

            const anchorBody = this.isLeft
                ? { x: halfLengthX, y: 0, z: 0 }
                : { x: -halfLengthX, y: 0, z: 0 };
            const pivotWorldX = this.isLeft
                ? position.x + halfLengthX
                : position.x - halfLengthX;

            const pivotDesc = RAPIER.RigidBodyDesc.fixed()
                .setTranslation(pivotWorldX, position.y, position.z);
            const pivotBody = this.world.createRigidBody(pivotDesc);

            const pivot = RAPIER.JointData.revolute({ x: 0, y: 0, z: 0 }, anchorBody, { x: 0, y: 1, z: 0 });
            this.joint = this.world.createImpulseJoint(pivot, pivotBody, this.rigidBody, true);

            if (this.isLeft) {
                this.joint.setLimits(-this.angle, 0);
            } else {
                this.joint.setLimits(0, this.angle);
            }
        });


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

        const colliderDesc = RAPIER.ColliderDesc.cuboid(this.length / 2, this.width / 2, this.height / 2)
            .setRestitution(Config.palles.restitution)
            .setFriction(Config.palles.friction)
            .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

        this.attachCollider(colliderDesc);
    }

    setActive(active) {
        if (!this.joint) return;

        const targetAngle = active
            ? (this.isLeft ? this.angle : -this.angle)
            : this.restAngle;
    
        this.joint.configureMotorPosition(targetAngle, this.rotationSpeed, 8.0);
        
        if (active && !this.wasActive) {
            this.playSound(Config.sounds.palles.movement); //Son de mouvement des palles
        }
        this.wasActive = active;
    }

    syncPalle() {
        this.syncObjects();
    }

    
    handleCollision() {
        // Par défaut, joue le son s'il existe
        if (this.audio) {
            this.playSound(Config.sounds.palles.collision); // Son de collision des palles
        }
    }
}

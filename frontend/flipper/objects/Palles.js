import * as THREE from 'three';
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
    constructor(
        world, 
        length = 500, 
        width = 10, 
        height = 10,
        position = {x: 250, y: 500, z: 0}, 
        rotation = {x: 0, y: 0, z: 0}, side
    ){
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

        this.length = length;
        this.width = width;
        this.height = height;

        this.position = position;

        this.angle = Math.abs(Config.global.positioning.palles.rotationAngle);
        this.initialAngle = Math.abs(Config.global.positioning.palles.initialAngle);
        this.restAngle = this.isLeft ? -this.initialAngle : this.initialAngle;
        this.rotationSpeed = Config.global.positioning.palles.rotationSpeed;

        // Mesh rotation (Three.js)
        this.mesh.rotation.set(
            rotation.x,
            rotation.y,
            rotation.z + this.restAngle
        );

        // Quaternion propre (Rapier)
        const euler = new THREE.Euler(
            rotation.x,
            rotation.y,
            rotation.z + this.restAngle
        );

        const quat = new THREE.Quaternion().setFromEuler(euler);

        const pallesDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(position.x, position.y, position.z)
            .setRotation({
                x: quat.x,
                y: quat.y,
                z: quat.z,
                w: quat.w
        });

        this.rigidBody = this.world.createRigidBody(pallesDesc);

        const modelRelative = this.isLeft ? (Config.global.positioning.palles.modelLeft) : (Config.global.positioning.palles.modelRight);
        const modelPath = new URL(modelRelative, import.meta.url).href;

        this.addMesh(modelPath, (modelRoot) => {
            this.addTexture(Config[Config.currentLevel].textures.palles, modelRoot);
            modelRoot.rotation.y = this.isLeft ? -Math.PI / 5 : Math.PI / 5;

            const { halfLengthX, center } = this.getMeshMetrics(modelRoot, true);

            // ✅ Le RigidBody est centré à halfLengthX depuis le pivot
            // position = pointe de la palle (point de rotation)
            const rigidBodyX = this.isLeft
                ? position.x + halfLengthX   // palle gauche : pivot à gauche, corps vers la droite
                : position.x - halfLengthX;  // palle droite : pivot à droite, corps vers la gauche

            const quat = new THREE.Quaternion().setFromEuler(
                new THREE.Euler(rotation.x, rotation.y, rotation.z + this.restAngle)
            );

            const pallesDesc = RAPIER.RigidBodyDesc.dynamic()
                .setTranslation(rigidBodyX, position.y, position.z)
                .setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w });

            this.rigidBody = this.world.createRigidBody(pallesDesc);

            // Mesh centré sur le RigidBody
            modelRoot.position.x = rigidBodyX;
            modelRoot.position.y = position.y;
            modelRoot.position.z = -center.z;

            // ✅ Pivot fixe = position exacte définie dans le Config
            const pivotDesc = RAPIER.RigidBodyDesc.fixed()
                .setTranslation(position.x, position.y, position.z);
            const pivotBody = this.world.createRigidBody(pivotDesc);

            // ✅ Ancre locale = extrémité du RigidBody côté pivot
            const rightAnchorX = 0.75 * (this.length) + 5;

            const anchorBody = this.isLeft
                ? { x: this.length, y: 0, z: 5 }  // bout gauche du corps = pointe gauche
                : { x: rightAnchorX, y: 0, z: 0 }; // bout droit du corps = pointe droite
            const pivot = RAPIER.JointData.revolute(
                { x: 0, y: 0, z: 0 }, anchorBody, { x: 0, y: 1, z: 0 }
            );
            this.joint = this.world.createImpulseJoint(pivot, pivotBody, this.rigidBody, true);
            this.joint.setLimits(-this.angle, this.angle);

            this.buildConvexHullCollider(modelRoot, { x: 0, y: 0, z: -center.z });
        });
    }

    setActive(active) {qq
        if (!this.joint) return;

        const targetAngle = active
            ? (this.isLeft ? this.angle : -this.angle)
            : 0;
    
        this.joint.configureMotorPosition(targetAngle, this.rotationSpeed, 5.0);
        
        if (active && !this.wasActive) {
            this.playSound(Config.global.sounds.palles.movement); // Son de mouvement des palles
        }
        this.wasActive = active;
    }

    syncPalle() {
        this.syncObjects();
    }

    
    handleCollision() {
        this.playSound(Config.global.sounds.palles.collision); // Son de collision des palles
        console.log(`Collision detected with ${this.objectType} (ID: ${this.objectId})`);
    }
}
import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import Config from '../physics/Config.js';
import { Objects } from './Objects.js';

export class Palles extends Objects {
    /**
     * @param {Object} world - The physics world
     * @param {number} length - The length of the palles
     * @param {number} width  - The width of the palles
     * @param {number} height - The height of the palles
     * @param {Object} position - The position object with x, y, z properties (= point de rotation)
     * @param {Object} rotation - The rotation object with x, y, z properties
     * @param {string} side - 'left' ou 'right'
     */
    constructor(
        world,
        length   = 500,
        width    = 10,
        height   = 10,
        position = { x: 250, y: 500, z: 0 },
        rotation = { x: 0,   y: 0,   z: 0 },
        side
    ) {
        super(world, length, width, height, position, rotation, null, [], null);

        // ─── Identité ────────────────────────────────────────────────────────
        this.objectId   = side ? `palle-${side}` : 'palle';
        this.objectType = 'palle';

        if (this.TreeMesh) {
            this.mesh.remove(this.TreeMesh);
            this.TreeMesh = null;
        }

        this.side   = side;
        this.isLeft = side === 'left';
        this.wasActive = false;

        this.length   = length;
        this.width    = width;
        this.height   = height;
        this.position = position;

        // ─── Angles (Config) ─────────────────────────────────────────────────
        this.angle         = Math.abs(Config.global.positioning.palles.rotationAngle);
        this.initialAngle  = Math.abs(Config.global.positioning.palles.initialAngle);
        this.restAngle     = this.isLeft ? -this.initialAngle : this.initialAngle;
        this.rotationSpeed = Config.global.positioning.palles.rotationSpeed;

        // ─── Chemin du modèle (Config) ────────────────────────────────────────
        const modelRelative = this.isLeft
            ? Config.global.positioning.palles.modelLeft
            : Config.global.positioning.palles.modelRight;
        const modelPath = new URL(modelRelative, import.meta.url).href;

        // ═══════════════════════════════════════════════════════════════════════
        // ÉTAPE 1 — MESH
        //   Le modèle est chargé et positionné. Toute la suite est dans le
        //   callback afin d'utiliser les métriques réelles du mesh.
        // ═══════════════════════════════════════════════════════════════════════
        this.addMesh(modelPath, (modelRoot) => {
            // Texture
            this.addTexture(Config[Config.currentLevel].textures.palles, modelRoot);

            // Légère rotation en Y propre à chaque côté (esthétique)
            modelRoot.rotation.y = this.isLeft ? -Math.PI / 5 : Math.PI / 5;

            // Métriques issues du mesh réel
            const halfLengthX = this.length / 2;
            const center = this.width / 2;

            // Centre du RigidBody = centre géométrique de la palle
            // position (Config) = extrémité pivot ; on décale vers le centre
            const rigidBodyX = this.isLeft
                ? position.x + halfLengthX   // pivot à gauche  → corps vers la droite
                : position.x - halfLengthX;  // pivot à droite  → corps vers la gauche

            // Placement du mesh sur son centre géométrique
            modelRoot.position.set(rigidBodyX, position.y, -center);

            // ═══════════════════════════════════════════════════════════════════
            // ÉTAPE 2 — HITBOX (RigidBody dynamique + CollisionShape)
            //   Centré sur le mesh, orienté avec le restAngle initial.
            // ═══════════════════════════════════════════════════════════════════
            const quat = new THREE.Quaternion().setFromEuler(
                new THREE.Euler(rotation.x, rotation.y, rotation.z + this.restAngle)
            );

            const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
                .setTranslation(rigidBodyX, position.y, position.z)
                .setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w });

            this.rigidBody = this.world.createRigidBody(rigidBodyDesc);

            // Convex-hull collider calé sur le mesh (offset Z identique)
            this.buildConvexHullCollider(modelRoot, { x: 0, y: 0, z: -center });

            // ═══════════════════════════════════════════════════════════════════
            // ÉTAPE 3 — POINT DE ROTATION + MÉCANIQUE (Joint revolute)
            //   Le pivot fixe est positionné à l'extrémité du mesh (Config),
            //   l'ancre locale sur le RigidBody pointe vers ce même endroit.
            // ═══════════════════════════════════════════════════════════════════

            // Corps fixe au point de pivot (extrémité de la palle)
            const pivotDesc = RAPIER.RigidBodyDesc.fixed()
                .setTranslation(position.x, position.y, position.z);
            const pivotBody = this.world.createRigidBody(pivotDesc);

            // Ancre locale sur le RigidBody : extrémité côté pivot
            const anchorOnBody = this.isLeft
                ? {
                    x:  this.position.x + this.length / 2,                                                               // bout gauche du corps local
                    y:  1,                     // offset Y sinusoïdal ∈ ]0 ; 1]
                    z:  -15
                  }
                : {
                    x: this.position.x - this.length / 2,                                                               // bout droit du corps local
                    y:  1,
                    z:  -15
                  };

            // Joint revolute autour de l'axe Y
            const pivotJoint = RAPIER.JointData.revolute(
                { x: 0, y: 0, z: 0 },  // ancre sur le pivot fixe (origine locale)
                anchorOnBody,           // ancre sur le RigidBody
                { x: 0, y: 1, z: 0 }   // axe de rotation
            );

            this.joint = this.world.createImpulseJoint(pivotJoint, pivotBody, this.rigidBody, true);
            this.joint.setLimits(-this.angle, this.angle);
        });
    }

    // ─── API publique ─────────────────────────────────────────────────────────

    setActive(active) {
        if (!this.joint) return;

        const targetAngle = active
            ? (this.isLeft ? this.angle : -this.angle)
            : 0;

        this.joint.configureMotorPosition(targetAngle, this.rotationSpeed, 5.0);

        if (active && !this.wasActive) {
            this.playSound(Config.global.sounds.palles.movement);
        }
        this.wasActive = active;
    }

    syncPalle() {
        this.syncObjects();
    }

    handleCollision() {
        this.playSound(Config.global.sounds.palles.collision);

        this.scene.effectManager.impact(
            this.mesh.position,
            1,
            this.objectType
        );

        console.log(`Collision detected with ${this.objectType} (ID: ${this.objectId})`);
    }
}
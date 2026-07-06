import * as RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import Config from '../physics/Config.js';
import { Objects } from './Objects.js';

export class LaunchingRamp extends Objects {
    constructor(
        scene,
        world,
        length = Config.global.positioning.launchingRamp.length,
        width = Config.global.positioning.launchingRamp.width,
        height = Config.global.positioning.launchingRamp.height,
        position = Config.global.positioning.launchingRamp.position,
        rotation = Config.global.positioning.launchingRamp.rotation
    ) {
        super(world, length, width, height, position, rotation, null, null);
        
        this.scene = scene;
        
        if (this.TreeMesh) {
            this.mesh.remove(this.TreeMesh);
            this.TreeMesh = null;
        }

        this.rampDirection = this.computeRampDirection();
        this.objectType = 'launching-ramp';
        this.objectId = Config.global.positioning.launchingRamp.objectId;
        this.pushedBodyHandles = new Set();

        // Load the 3D model (use `model` from Config.global.positioning.launchingRamp when present)
        const modelPath = new URL(Config.global.positioning.launchingRamp.model, import.meta.url).href;

        this.addMesh(modelPath, (modelRoot) => {
            this.addTexture(Config[Config.currentLevel].textures.launching_ramp, modelRoot);

            if (!this.rigidBody) this.createFixedRigidBody(position, rotation);

            // Chaque pièce reçoit un collider dans le repère local du rigid
            // body. L'ancien buildTrimeshCollider appliquait la transformation
            // mondiale puis la position de la rampe une seconde fois, ce qui
            // pouvait décaler les parois physiques et laisser la bille sortir
            // du rail au milieu du lancement.
            modelRoot.traverse((child) => {
                if (!child.isMesh || !child.geometry) return;
                this.buildLocalTrimeshCollider(child);
            });

            // this.createInvisibleLaunchGuides();

            this.mesh.position.copy(position);
        });
    }

    // createInvisibleLaunchGuides() {
    //     if (!this.rigidBody || this.guideColliders?.length) return;

    //     const ballConfig = Config.global.positioning.ball;
    //     const rampConfig = Config.global.positioning.launchingRamp;
    //     const guideThickness = 6;
    //     const guideHalfWidth = ballConfig.radius * 3;
    //     const guideStartZ = ballConfig.position.z - 30;
    //     const guideEndZ = 70;
    //     const guideHalfLength = (guideEndZ - guideStartZ) / 2;
    //     const guideCenterZ = guideStartZ + guideHalfLength;
    //     const guideHalfHeight = rampConfig.width / 2 + ballConfig.radius * 2;

    //     const bodyRotation = this.toRotationQuaternion(rampConfig.rotation);
    //     const inverseBodyRotation = new THREE.Quaternion(
    //         bodyRotation.x,
    //         bodyRotation.y,
    //         bodyRotation.z,
    //         bodyRotation.w
    //     ).invert();

    //     const toLocalPosition = (worldX) => new THREE.Vector3(
    //         worldX,
    //         rampConfig.position.y,
    //         guideCenterZ
    //     )
    //         .sub(new THREE.Vector3(
    //             rampConfig.position.x,
    //             rampConfig.position.y,
    //             rampConfig.position.z
    //         ))
    //         .applyQuaternion(inverseBodyRotation);

    //     this.guideColliders = [-1, 1].map((side) => {
    //         const worldX = ballConfig.position.x
    //             + side * (guideHalfWidth + guideThickness);
    //         const localPosition = toLocalPosition(worldX);
    //         const guideDesc = RAPIER.ColliderDesc
    //             .cuboid(guideThickness, guideHalfHeight, guideHalfLength)
    //             .setTranslation(localPosition.x, localPosition.y, localPosition.z)
    //             // Annule la rotation du body : les guides restent verticales
    //             // et alignées sur le couloir visible dans le monde.
    //             .setRotation({
    //                 x: inverseBodyRotation.x,
    //                 y: inverseBodyRotation.y,
    //                 z: inverseBodyRotation.z,
    //                 w: inverseBodyRotation.w
    //             })
    //             .setFriction(0)
    //             .setRestitution(0);

    //         return this.attachCollider(guideDesc, this.rigidBody);
    //     });
    // }

    computeRampDirection() {
        const rx = this.rotation.x || 0;
        const ry = this.rotation.y || 0;
        const rz = this.rotation.z || 0;

        // Compute the launch direction by rotating the Y-axis according to the ramp's rotation
        const direction = new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(rx, ry, rz, 'XYZ')).normalize();
        return { x: direction.x, y: direction.y, z: direction.z };
    }

    /**
     * Application de la force avec bride de sécurité absolue
     */
    applyLaunchingRampForce(handle1, handle2, powerOverride = null) {
        if (!this.collider) return;
        if (this.collider.handle !== handle1 && this.collider.handle !== handle2) return;

        const otherHandle = this.collider.handle === handle1 ? handle2 : handle1;
        const otherCollider = this.world.colliders.get(otherHandle);
        if (!otherCollider) return;

        const otherBody = otherCollider.parent();
        if (!otherBody || otherBody.isFixed()) return;

        // Anti-répétition
        if (this.pushedBodyHandles.has(otherBody.handle)) return;

        // --- LE PLAFOND VIRTUEL ---
        const launchConfig = Config.global.positioning.launchingRamp;
        const absoluteMax = launchConfig.maximalSpeed;
        let targetSpeed = powerOverride ?? launchConfig.minimalSpeed;

        if (targetSpeed > absoluteMax) targetSpeed = absoluteMax;

        otherBody.setLinvel(
            {
                x: this.rampDirection.x * targetSpeed,
                y: this.rampDirection.y * targetSpeed,
                z: this.rampDirection.z * targetSpeed
            },
            true
        );

        this.pushedBodyHandles.add(otherBody.handle);
    }

    resetLaunchImpulse() {
        this.pushedBodyHandles.clear();
    }
}

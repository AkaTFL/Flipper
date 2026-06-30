import * as RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import Config from '../physics/Config.js';
import { Objects } from './Objects.js';

export class Ball extends Objects {
    /**
     * @param {Object} world - The physics world
     * @param {Object} position - The position object with x, y, z properties
     */
    constructor(scene, world, position = {x: 0, y: 500, z: 0}, gamePhysics = null) {
        super(world, null, null, null, position, { x: 0, y: 0, z: 0 }, Config.global.positioning.ball.radius, [], null);
        
        this.scene = scene;
        this.gamePhysics = gamePhysics;
        this.scene = scene;
        this.objectId = 'ball';
        this.objectType = 'ball';

        this.radius = Config.global.positioning.ball.radius;
        
        this.mesh = new THREE.Mesh(
            new THREE.SphereGeometry(this.radius, 32, 32),
            new THREE.MeshStandardMaterial({
                color: 0xffffff,
                metalness: 0.8,
                roughness: 0.3,
            })
        );

        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        this.mesh.position.copy(position);

        // Physics properties - Dynamic rigid body with mass
        const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(position.x, position.y, position.z)
            .setCanSleep(false)   // Empêcher la balle de s'endormir
            .setCcdEnabled(true); // Continuous Collision Detection (essentiel pour balles rapides)

        this.rigidBody = this.world.createRigidBody(rigidBodyDesc);

        this.addTexture(
            Config[Config.currentLevel].textures.ball
        );
        
        // Physique précise : friction, restitution, densité
        const colliderDesc = RAPIER.ColliderDesc.ball(this.radius)
            .setDensity(Config.global.positioning.ball.density)               // Densité élevée (acier)
            .setMass(Config.global.positioning.ball.mass)                     // Masse explicite pour un launch cohérent
            .setRestitution(Config.global.positioning.ball.restitution)       // Rebond
            .setFriction(Config.global.positioning.ball.friction);            // Glissement

        this.attachCollider(colliderDesc);
    }

    syncBall() {
        super.syncObjects();
    }

    handleCollision() {
        const velocity = this.rigidBody.linvel();

        const impactForce = Math.hypot(
            velocity.x,
            velocity.y,
            velocity.z
        );

        this.scene.effectManager.impact(
            this.mesh.position,
            impactForce,
            this.objectType
        );
    }
}
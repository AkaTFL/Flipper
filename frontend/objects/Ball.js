import * as RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import Config from '../physics/Config.js';
import { Objects } from './Objects.js';

export class Ball extends Objects {
    /**
     * @param {Object} world - The physics world
     * @param {Object} position - The position object with x, y, z properties
     */
    constructor(world, position = {x: 0, y: 500, z: 0}) {
        super(world, null, null, null, position, { x: 0, y: 0, z: 0 }, Config.ball.radius, [], null);

        this.radius = Config.ball.radius;
        
        this.mesh = new THREE.Mesh(
            new THREE.SphereGeometry(this.radius, 32, 32),
            new THREE.MeshStandardMaterial({ 
                color: 0xff0000,
                roughness: 0.7,
                metalness: 0.2 
            })
        );

        this.mesh.position.copy(position);

        // Physics properties - Dynamic rigid body with mass
        const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(position.x, position.y, position.z)
            .setCanSleep(false)   // Empêcher la balle de s'endormir
            .setCcdEnabled(true); // Continuous Collision Detection (essentiel pour balles rapides)

        this.rigidBody = this.world.createRigidBody(rigidBodyDesc);
        
        // Physique précise : friction, restitution, densité
        const colliderDesc = RAPIER.ColliderDesc.ball(this.radius)
            .setDensity(Config.ball.density)               // Densité élevée (acier)
            .setMass(Config.ball.mass)                     // Masse explicite pour un launch cohérent
            .setRestitution(Config.ball.restitution)       // Rebond
            .setFriction(Config.ball.friction);            // Glissement

        this.attachCollider(colliderDesc);
    }

    syncBall() {
        super.syncObjects();
    }

    handleCollision() {
        // Par défaut, joue le son s'il existe
        if (this.audio) {
            this.playSound();
        }
    }
}
    
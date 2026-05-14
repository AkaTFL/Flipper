import * as RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import Config from '../physics/Config.js';
import { Objects } from './Objects.js';

export class LaunchingRamp extends Objects {
    constructor(
        world,
        length = Config.launchingRamp.length,
        width = Config.launchingRamp.width,
        height = Config.launchingRamp.height,
        position = Config.launchingRamp.position,
        rotation = Config.launchingRamp.rotation
    ) {
        super(world, length, width, height, position, rotation, null, null);

        if (this.TreeMesh) {
            this.mesh.remove(this.TreeMesh);
            this.TreeMesh = null;
        }

        this.rampDirection = this.computeRampDirection();
        this.pushedBodyHandles = new Set();

        const modelPath = new URL(Config.launchingRamp.model, import.meta.url).href;

        this.addMesh(modelPath, (modelRoot) => {
            if (!this.rigidBody) this.createFixedRigidBody(position, rotation);
            
            // 1. PROTECTION CRITIQUE : Active la CCD sur le corps de la rampe
            this.rigidBody.enableCcd(true);

            modelRoot.updateMatrixWorld(true);
            const desc = this.buildTrimeshCollider(modelRoot);
            
            if (desc) {
                // 2. PRÉCISION MAXIMALE : On configure le collider pour coller au mesh
                desc.setFriction(0.1)
                    .setRestitution(0.2)
                    .setCcdEnabled(true) // Active la détection continue sur la surface
                    .setSolverGroups(0x00010001); // Assure que les calculs de collision sont prioritaires

                this.replaceCollider(desc, this.rigidBody);
            }
            this.mesh.add(modelRoot);
        });
    }

    /**
     * BuildTrimeshCollider : Copie exacte de la géométrie 3D
     */
    buildTrimeshCollider(modelRoot) {
        let vertices = [];
        let indices = [];
        modelRoot.traverse((child) => {
            if (child.isMesh) {
                const geometry = child.geometry;
                const pos = geometry.attributes.position;
                const idx = geometry.index;
                const offset = vertices.length / 3;

                for (let i = 0; i < pos.count; i++) {
                    const v = new THREE.Vector3().fromBufferAttribute(pos, i);
                    v.applyMatrix4(child.matrixWorld);
                    const localV = this.mesh.worldToLocal(v);
                    vertices.push(localV.x, localV.y, localV.z);
                }

                if (idx) {
                    for (let i = 0; i < idx.count; i++) {
                        indices.push(idx.getX(i) + offset);
                    }
                }
            }
        });
        return vertices.length > 0 ? RAPIER.ColliderDesc.trimesh(new Float32Array(vertices), new Uint32Array(indices)) : null;
    }

    computeRampDirection() {
        const rx = this.rotation.x || 0;
        const ry = this.rotation.y || 0;
        const rz = this.rotation.z || 0;
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
        const absoluteMax = Config.launchingRamp.maximalPower; // 50
        let targetSpeed = powerOverride ?? Config.launchingRamp.power;

        // On écrête la valeur avant même qu'elle ne touche au moteur physique
        if (targetSpeed > absoluteMax) targetSpeed = absoluteMax;

        // On définit la vitesse directement : c'est 100% plus stable que l'impulsion
        // pour éviter de traverser le modèle 3D.
        otherBody.setLinvel(
            {
                x: this.rampDirection.x * targetSpeed,
                y: this.rampDirection.y * targetSpeed,
                z: this.rampDirection.z * targetSpeed
            },
            true
        );

        this.pushedBodyHandles.add(otherBody.handle);
        this.playSound(Config.sounds.launchingRamp.launch);
    }

    resetLaunchImpulse() {
        this.pushedBodyHandles.clear();
    }
}
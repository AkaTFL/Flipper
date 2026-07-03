import { Objects } from './Objects.js';
import Config from '../physics/Config.js';

/**
 * Rampe originale en mode passif.
 *
 * Aucun capteur, aucune aspiration et aucune modification de la vitesse de la
 * bille ne sont appliqués ici. La logique de propulsion sera redéfinie après
 * avoir validé que les blocages au centre du plateau ont disparu.
 */
export class Ramp extends Objects {
    constructor(scene, world, length, width, height, position, rotation, modelFile, objectId) {
        super(world, length, width, height, position, rotation, null, null);
        this.objectId = objectId;
        this.objectType = 'ramp';
        this.scene = scene;
        this.rampCollider = null;
        this.gamePhysics = null;

        if (this.TreeMesh) {
            this.mesh.remove(this.TreeMesh);
            this.TreeMesh = null;
        }

        this.createFixedRigidBody(position, rotation);

        if (!modelFile) {
            console.error('No model file provided for Ramp. Please provide a valid model file path.');
            return;
        }

        const modelPath = new URL(modelFile, import.meta.url).href;
        this.addMesh(modelPath, (modelRoot) => {
            modelRoot.traverse((child) => {
                if (!child.isMesh) return;

                if (child.name === 'rail') {
                    this.addTexture(Config[Config.currentLevel].textures.ramps.rail, child);
                } else if (child.name === 'entrance') {
                    this.addTexture(Config[Config.currentLevel].textures.ramps.entrance, child);
                    this._setEntranceBaseColor(child, 0x343b2a);
                    // L'entrée reste visuelle pendant le diagnostic : aucun
                    // collider ou capteur ne peut ralentir/aspirer la bille.
                    return;
                } else {
                    this.addTexture(Config[Config.currentLevel].textures[this.objectType], child);
                }

                const collider = this.buildLocalTrimeshCollider(child);
                if (!collider) return;

                if (child.name.toLowerCase().includes('ramp')) {
                    this.rampCollider = collider;
                }
            });
        });
    }

    _setEntranceBaseColor(mesh, color) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.filter(Boolean).forEach((material) => {
            material.color?.set(color);
            material.roughness = 0.9;
            material.metalness = 0;
            material.needsUpdate = true;
        });
    }
}

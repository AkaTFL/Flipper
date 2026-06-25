import { Shockwave } from '../pools/Shockwave.js';
import { Sparks } from '../pools/Sparks.js';
import { Trembling } from '../camera/Trembling.js';

export class EffectManager {

    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;

        this._shockwaves = new Shockwave(scene, 8);
        this._sparks = new Sparks(scene, 5);
        this._trembling = new Trembling(camera);

        // Effets autorisés par type d'objet
        this.effectTable = {
            ball: ['shockwave'],
            bumper: ['shockwave', 'sparks', 'shake'],
        };
    }

    /**
     * Déclenche les effets liés à un type d'objet
     *
     * @param {THREE.Vector3} position
     * @param {number} force
     * @param {string} objectType
     */
    impact(position, force, objectType = 'ball') {

        const effects = this.effectTable[objectType];

        if (!effects) {
            return;
        }

        if (effects.includes('shockwave')) {
            this._shockwaves.spawn(position, force);
        }

        if (effects.includes('sparks')) {
            this._sparks.spawn(position);
        }

        if (effects.includes('shake')) {
            this._trembling.add(force * 0.01);
        }
    }

    /**
     * Mise à jour de tous les effets
     */
    update(delta) {
        this._shockwaves.update(delta);
        this._sparks.update(delta);
        this._trembling.update(delta);
    }

    /**
     * Nettoyage
     */
    dispose() {
        this._shockwaves.dispose();
        this._sparks.dispose();
        this._trembling.dispose();
    }

    /**
     * Ajout dynamique d'un type d'objet
     */
    registerObjectType(type, effects = []) {
        this.effectTable[type] = effects;
    }

    /**
     * Ajout dynamique d'un effet
     */
    addEffect(type, effect) {

        if (!this.effectTable[type]) {
            this.effectTable[type] = [];
        }

        if (!this.effectTable[type].includes(effect)) {
            this.effectTable[type].push(effect);
        }
    }

    /**
     * Suppression dynamique d'un effet
     */
    removeEffect(type, effect) {

        if (!this.effectTable[type]) {
            return;
        }

        this.effectTable[type] =
            this.effectTable[type].filter(
                current => current !== effect
            );
    }
}
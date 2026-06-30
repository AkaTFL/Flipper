import { Shockwave } from '../pools/Shockwave.js';
import { Sparks } from '../pools/Sparks.js';
import { Trembling } from '../camera/Trembling.js';
import Config from '../../physics/Config.js';

export class EffectManager {

    /**
     * @param {THREE.Scene}         scene
     * @param {THREE.Camera}        camera
     * @param {THREE.WebGLRenderer} renderer
     */
    constructor(scene, camera, renderer) {
        this.scene    = scene;
        this.camera   = camera;
        this.renderer = renderer;

        this._shockwaves    = new Shockwave(scene, 8);
        this._sparks        = new Sparks(scene, Config[Config.currentLevel].sparks, 5);
        this._trembling     = new Trembling(camera)

        this.effectTable = {
            ball:    ['shockwave'],
            bumper:  ['shockwave', 'shake'],
            repulse: ['shockwave', 'shake'],
        };
    }

    /**
     * Déclenche les effets liés à un type d'objet
     *
     * @param {THREE.Vector3}   position
     * @param {number}          force
     * @param {string}          objectType
     */
    impact(position, force, objectType = 'ball', mesh = null) {
        const effects = this.effectTable[objectType];
        if (!effects) return;

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
     * Appeler AVANT postProcessing.render() dans la boucle principale
     * @param {number} delta
     */
    update(delta) {
        this._shockwaves.update(delta);
        this._sparks.update(delta);
        this._trembling.update(delta);
    }

    dispose() {
        this._shockwaves.dispose();
        this._sparks.dispose();
        this._trembling.dispose();
    }

    registerObjectType(type, effects = []) {
        this.effectTable[type] = effects;
    }

    addEffect(type, effect) {
        if (!this.effectTable[type]) {
            this.effectTable[type] = [];
        }
        if (!this.effectTable[type].includes(effect)) {
            this.effectTable[type].push(effect);
        }
    }

    removeEffect(type, effect) {
        if (!this.effectTable[type]) return;
        this.effectTable[type] = this.effectTable[type].filter(
            current => current !== effect
        );
    }
}
import { Shockwave } from '../pools/Shockwave.js';
import { Sparks } from '../pools/Sparks.js';
import { Trembling } from '../camera/Trembling.js';
import { ImpactOutline } from '../pools/ImpactOutline.js';
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
        this._trembling     = new Trembling(camera);
        this._impactOutline = new ImpactOutline(
            renderer,
            Config[Config.currentLevel].outlineImpactColor
        );

        this.effectTable = {
            ball:    ['shockwave'],
            bumper:  ['shockwave', 'shake', 'outline'],
            repulse: ['shockwave', 'shake', 'outline'],
        };
    }

    /**
     * Déclenche les effets liés à un type d'objet
     *
     * @param {THREE.Vector3}   position
     * @param {number}          force
     * @param {string}          objectType
     * @param {THREE.Object3D}  mesh       - requis pour l'effet 'outline'
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

        if (effects.includes('outline') && mesh) {
            this._impactOutline.flash(mesh);
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
        this._impactOutline.update(delta);
    }

    /**
     * Rend l'outline par-dessus la scène déjà rendue
     * Appeler APRÈS renderer.render(scene, camera) ou postProcessing.render()
     */
    renderEffects() {
        this._impactOutline.render(this.camera, this.scene);
    }

    resize(width, height) {
        this._impactOutline.resize(width, height);
    }

    dispose() {
        this._shockwaves.dispose();
        this._sparks.dispose();
        this._trembling.dispose();
        this._impactOutline.dispose();
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
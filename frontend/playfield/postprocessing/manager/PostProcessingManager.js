import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }     from 'three/examples/jsm/postprocessing/RenderPass.js';

import { createBloom } from '../BloomEffect.js';
import { createFXAA }  from '../FXAAEffect.js';
import { createSSAO }  from '../SSAOEffect.js';
import { createOutline } from '../OutlineEffect.js';

/**
 * PostProcessingManager
 *
 * Orchestre le pipeline de post-traitement en déléguant entièrement
 * la création de chaque effet à son module dédié.
 *
 * Ordre des passes :
 *   RenderPass → Effets un à un
 *
 * @example
 * const pp = new PostProcessingManager(renderer, scene, camera);
 * pp.setSize(width, height);
 * // dans la boucle de rendu :
 * pp.render(delta);
 */
export class PostProcessingManager {
    /**
     * @param {THREE.WebGLRenderer} renderer
     * @param {THREE.Scene}         scene
     * @param {THREE.Camera}        camera
     * @param {Object}              [options]
     * @param {Object}              [options.bloom]  - Options forwarded to createBloom()
     * @param {Object}              [options.ssao]   - Options forwarded to createSSAO()
     * @param {boolean}             [options.fxaa]   - Set false to skip FXAA (default true)
     * @param {Object}              [options.outline] - Options for the outline effect
     */
    constructor(renderer, scene, camera, options = {}) {
        this.renderer = renderer;
        this.scene    = scene;
        this.camera   = camera;

        const {
            bloom = {},
            ssao  = {},
            fxaa  = true,
            outline = {}

        } = options;

        // -------------------------------------------------------
        // EffectComposer
        // -------------------------------------------------------
        this.composer = new EffectComposer(renderer);

        // -------------------------------------------------------
        // Passe 0 – Effets globaux (RenderPass, SSAO, Bloom, FXAA)
        // -------------------------------------------------------
        this._renderPass = new RenderPass(scene, camera);
        this.composer.addPass(this._renderPass);

        this._ssaoPass = createSSAO(scene, camera, ssao);
        this.composer.addPass(this._ssaoPass);

        this._bloomPass = createBloom(scene, bloom);
        this.composer.addPass(this._bloomPass);

        this._fxaaPass = null;
        if (fxaa) {
            this._fxaaPass = createFXAA();
            this.composer.addPass(this._fxaaPass);
        }

        // -------------------------------------------------------
        // Passe 4 – Effets spécifiques
        // -------------------------------------------------------
        this._outlinePass = createOutline(
            scene,
            camera,
            renderer,
            outline
        );

        this.composer.addPass(this._outlinePass);

        this.outlineEnabledTypes = [
            'palle',
            'bumper',
            'repulse'
        ];

        this.updateOutlineObjects();
    }

    // -----------------------------------------------------------
    // Activation / désactivation à chaud de chaque effet
    // -----------------------------------------------------------

    /** Active ou désactive le SSAO. */
    setSSAO(enabled) {
        this._ssaoPass.enabled = enabled;
    }

    /** Active ou désactive le Bloom. */
    setBloom(enabled) {
        this._bloomPass.enabled = enabled;
    }

    /** Active ou désactive le FXAA (sans effet si la passe n'a pas été créée). */
    setFXAA(enabled) {
        if (this._fxaaPass) this._fxaaPass.enabled = enabled;
    }

    setOutlineObject(object) {
        if (!this._outlinePass) return;

        this._outlinePass.selectedObjects = [object];
    }

    /**
     * Déclenche un flash one-shot sur l'outline.
     * Safe à appeler à haute fréquence : aucun setTimeout, simple reset de timer.
     */
    triggerImpactPulse() {
        this._outlinePass.triggerImpactPulse();
    }

    updateOutlineObjects() {
        if (!this._outlinePass) return;

        const selectedObjects = [];

        this.scene.traverse((object) => {
            const objectType = object.userData?.objectType;

            if (
                objectType &&
                this.outlineEnabledTypes.includes(objectType) &&
                !object.isGroup  // ← uniquement le Group racine, pas les enfants
            ) {
                selectedObjects.push(object);
            }
        });

        this._outlinePass.selectedObjects = selectedObjects;
    }

    enableOutlineFor(type) {
        if (!this.outlineEnabledTypes.includes(type)) {
            this.outlineEnabledTypes.push(type);
        }

        this.updateOutlineObjects();
    }

    disableOutlineFor(type) {
        this.outlineEnabledTypes =
            this.outlineEnabledTypes.filter(
                current => current !== type
            );

        this.updateOutlineObjects();
    }

    // -----------------------------------------------------------
    // Redimensionnement
    // -----------------------------------------------------------

    /**
     * À appeler lors d'un resize fenêtre.
     * Propage les nouvelles dimensions au composer et met à jour
     * la résolution du shader FXAA.
     *
     * @param {number} width
     * @param {number} height
     */
    setSize(width, height) {
        this.composer.setSize(width, height);

        // FXAA dépend du pixel ratio : re-calcul de l'uniforme resolution
        if (this._fxaaPass) {
            const pixelRatio = this.renderer.getPixelRatio();
            this._fxaaPass.material.uniforms.resolution.value.set(
                1 / (width  * pixelRatio),
                1 / (height * pixelRatio)
            );
        }
    }

    // -----------------------------------------------------------
    // Rendu
    // -----------------------------------------------------------

    /**
     * @param {number} delta - Temps écoulé depuis la dernière frame (en secondes)
     */
    render(delta = 0) {
        // Mise à jour de la décroissance du flash outline (basée sur le temps, pas sur setTimeout)
        this._outlinePass?.updateImpactPulse?.(delta);
        this.composer.render();
    }
}
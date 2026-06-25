import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }     from 'three/examples/jsm/postprocessing/RenderPass.js';

import { createBloom } from '../BloomEffect.js';
import { createFXAA }  from '../FXAAEffect.js';
import { createSSAO }  from '../SSAOEffects.js';

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
 * pp.render();
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
     */
    constructor(renderer, scene, camera, options = {}) {
        this.renderer = renderer;
        this.scene    = scene;
        this.camera   = camera;

        const {
            bloom = {},
            ssao  = {},
            fxaa  = true,

        } = options;

        // -------------------------------------------------------
        // EffectComposer
        // -------------------------------------------------------
        this.composer = new EffectComposer(renderer);

        // -------------------------------------------------------
        // Passe 0 – rendu de la scène (obligatoire, toujours active)
        // -------------------------------------------------------
        this._renderPass = new RenderPass(scene, camera);
        this.composer.addPass(this._renderPass);

        // -------------------------------------------------------
        // Passe 1 – SSAO (délégué à SSAOEffects.js)
        // -------------------------------------------------------
        this._ssaoPass = createSSAO(scene, camera, ssao);
        this.composer.addPass(this._ssaoPass);

        // -------------------------------------------------------
        // Passe 2 – Bloom (délégué à BloomEffect.js)
        // -------------------------------------------------------
        this._bloomPass = createBloom(scene, bloom);
        this.composer.addPass(this._bloomPass);

        // -------------------------------------------------------
        // Passe 3 – FXAA (délégué à FXAAEffect.js)
        // -------------------------------------------------------
        this._fxaaPass = null;
        if (fxaa) {
            this._fxaaPass = createFXAA();
            this.composer.addPass(this._fxaaPass);
        }
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
    render() {
        this.composer.render();
    }
}
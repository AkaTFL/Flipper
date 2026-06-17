import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.132.2/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.132.2/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.132.2/examples/jsm/postprocessing/UnrealBloomPass.js';

/**
 * Three.js Bloom Effect using EffectComposer and UnrealBloomPass
 */
export class GreenBloomEffect {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.composer = null;
        this.bloomPass = null;

    this.params = {
        threshold: 0.95, // On ne prend que les pixels extrêmement lumineux
        strength: 0.15,  // Force très faible pour une lueur discrète
        radius: 0.1,     // Rayon court pour ne pas étaler la lumière
        exposure: 1.0
    };
        this.init();
    }

    init() {
        const width = this.renderer.domElement.clientWidth || this.renderer.domElement.width;
        const height = this.renderer.domElement.clientHeight || this.renderer.domElement.height;

        // Create composer
        this.composer = new EffectComposer(this.renderer);
        this.composer.setSize(width, height);

        // Add render pass
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // Add bloom pass
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(width, height),
            this.params.strength,
            this.params.radius,
            this.params.threshold
        );
        this.composer.addPass(this.bloomPass);
    }

    render() {
        this.composer.render();
    }

    updateParams(params) {
        if (params.threshold !== undefined) {
            this.params.threshold = params.threshold;
            this.bloomPass.threshold = params.threshold;
        }
        if (params.strength !== undefined) {
            this.params.strength = params.strength;
            this.bloomPass.strength = params.strength;
        }
        if (params.radius !== undefined) {
            this.params.radius = params.radius;
            this.bloomPass.radius = params.radius;
        }
        if (params.exposure !== undefined) {
            this.params.exposure = params.exposure;
        }
    }

    handleResize() {
        const width = this.renderer.domElement.clientWidth || this.renderer.domElement.width;
        const height = this.renderer.domElement.clientHeight || this.renderer.domElement.height;
        this.composer.setSize(width, height);
    }

    getParams() {
        return { ...this.params };
    }
}
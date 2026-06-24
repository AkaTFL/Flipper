import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';

import Config from '../physics/Config.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';

import { createBloom } from '../postprocessing/BloomEffect.js';
import { createFXAA } from '../postprocessing/FXAAEffect.js';
import { createSSAO } from '../postprocessing/SSAOEffects.js';

import { EffectManager } from '../effects/manager/EffectManager.js';

import { createCamera, createCameraHelper, setupCameraResize } from '../helpers/CameraHelper.js';
import { createRapierDebug, setupLightHelperToggle } from '../helpers/DebugHelper.js';
import { createLightGUI } from '../helpers/GuiHelper.js';
import { createLights, startLightIntro } from '../core/Lights.js';

export class Scene {
    /**
     * @param {number} height
     * @param {number} width
     * @param {Object} position
     * @param {number} rotation
     */

    constructor(world, height = 500, width = 500, position = {x: 0, y: 500, z: 0}, rotation = {x: 0, y: 0, z: 0}) {
        this.world = world;

        this.WIDTH = window.innerWidth;
        this.HEIGHT = window.innerHeight;

        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.controls = null;
        this.composer = null;
        this.introLights = [];
        this.lightHelpers = [];
        this.spotLights = [];
        this.gui = null;

        this.debugRenderer = null;
        this.cameraHelper = null;
        this.frustumHeight = 0;
        this.effectManager = null;

        // Debug Rapier
        this.debugEnabled = false;

        this.init(height, width, position, rotation);
    }

    /**
     * Initialise la scène, le renderer et la caméra
     * @returns {Object} {renderer, scene, camera}
     */
    init(height, width, position, rotation) {
        // Renderer with anti-aliasing for smoother edges
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.shadowMap.enabled = true;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.WIDTH, this.HEIGHT);
        this.renderer.outputEncoding = THREE.sRGBEncoding;

        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        // Main scene container
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0);

       this.debugRenderer = createRapierDebug(
            this.scene,
            this.world,
            this
        );

        const cameraData = createCamera(position);

        this.camera = cameraData.camera;
        this.frustumHeight = cameraData.frustumHeight;

        this.effectManager = new EffectManager(
            this.scene,
            this.camera
        );

        this.cameraHelper = createCameraHelper(
            this.scene,
            this.camera
        );

        setupCameraResize(
            this.camera,
            this.renderer,
            this.composer,
            this.frustumHeight
        );

        // ==========================================
        // PARTIE VISUELLE (THREE.JS)
        // ==========================================

        const lightData = createLights(this.scene);

        this.introLights =
            lightData.introLights;

        this.lightHelpers =
            lightData.lightHelpers;

        this.spotLights =
            lightData.spotLights;

        setupLightHelperToggle(
            this.lightHelpers
        );

        // ==========================================
        // LIL-GUI (F4)
        // ==========================================
        this.gui = createLightGUI(
            this.spotLights
        );

        window.addEventListener('keydown', (e) => {
            if (e.key === 'F4') {
                e.preventDefault();

                const visible = this.gui._hidden;

                if (visible) {
                    this.gui.show();
                } else {
                    this.gui.hide();
                }
            }
        });
        
        // Intro : lumières s'allument une à une avec un délai croissant
        startLightIntro(
            this.introLights,
            this.playSound
        );

        // ==========================================
        // PARTIE PHYSIQUE (RAPIER)
        // ==========================================
        // Création du sol physique.
    
        let groundBodyDesc = RAPIER.RigidBodyDesc.fixed()
            .setRotation({ x: Math.sin(rotation.x / 2), y: Math.sin(rotation.y / 2), z: Math.sin(rotation.z / 2), w: Math.cos(rotation.x / 2) * Math.cos(rotation.y / 2) * Math.cos(rotation.z / 2) });
        let groundBody = this.world.createRigidBody(groundBodyDesc);

        // Attach renderer to the page
        var container = document.getElementById('three');
        container.appendChild(this.renderer.domElement);

        // ==========================================
        // POST-PROCESSING (EffectComposer)
        // ==========================================
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        this.composer.addPass(createSSAO(this.scene, this.camera));
        
        this.composer.addPass(createBloom(this.scene, {
            strength: 2,
            radius: 2,
            threshold: 0.2,
            color: Config[Config.currentLevel].bloom,
            tolerance: 0.4
        }));
        this.composer.addPass(createFXAA());

        return { renderer: this.renderer, scene: this.scene, camera: this.camera };
    }

    getCamera() {
        return this.camera;
    }

    getCameraController() {
        return this.cameraController;
    }

    /**
     * Lance la boucle de rendu
     */
    startRender(physics, onUpdate) {
        this.fixedTimeStep = 1 / 120;
        this.accumulator = 0;
        this.lastTime = performance.now();

        requestAnimationFrame(() => this.render(physics, onUpdate));
    }

    render(physics, onUpdate) {
        const now = performance.now();
        let delta = (now - this.lastTime) / 1000;
        this.lastTime = now;

        // Évite un énorme rattrapage après un changement d'onglet
        delta = Math.min(delta, 0.1);

        this.accumulator += delta;

        while (this.accumulator >= this.fixedTimeStep) {
            physics.step();
            this.accumulator -= this.fixedTimeStep;
        }

        if (this.controls) {
            this.controls.update();
        }

        if (onUpdate) {
            onUpdate();
        }

        if (this.cameraHelper?.visible) {
            this.cameraHelper.update();
        }

        this.lightHelpers?.forEach(helper => {
            if (helper.visible) {
                helper.update();
            }
        });

        // Mise à jour du debug renderer Rapier
        if (this.debugEnabled) {
            this.debugRenderer.update();
        }

        this.effectManager?.update(delta);
        this.composer.render();
        
        requestAnimationFrame(() => this.render(physics, onUpdate));
    }
}
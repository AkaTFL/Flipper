import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';

import Config from '../physics/Config.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';

import { createBloom } from '../effects/postprocessing/BloomEffect.js';
import { createFXAA } from '../effects/postprocessing/FXAAEffect.js';
import { createSSAO } from '../effects/postprocessing/SSAOEffects.js';

import { RapierDebugRenderer } from '../helpers/RapierDebugRenderer.js';
import { CameraController } from '../helpers/CameraController.js';

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

        // ==========================================
        // DEBUG RAPIER (toggle avec F1)
        // ==========================================
        this.debugRenderer = new RapierDebugRenderer(this.scene, this.world);
        this.debugRenderer.setVisible(false);

        window.addEventListener('keydown', (e) => {
            if (e.key === 'F1') {
                e.preventDefault();
                this.debugEnabled = !this.debugEnabled;
                this.debugRenderer.setVisible(this.debugEnabled);
                console.log(`[Rapier Debug] ${this.debugEnabled ? '✅ ON' : '❌ OFF'}`);
            }
        });

                // Camera (Orthographic) conservant le même cadrage que l'ancienne PerspectiveCamera
        const aspect = window.innerWidth / window.innerHeight;

        const cameraPosition = new THREE.Vector3(
            position.x,
            position.y + 630,
            position.z - 280
        );

        const cameraTarget = new THREE.Vector3(-10, 0, -130);

        const distance = cameraPosition.distanceTo(cameraTarget);
        this.frustumHeight =
            2 * Math.tan(THREE.MathUtils.degToRad(55 / 2)) * distance;
        const frustumWidth = this.frustumHeight * aspect;

        this.camera = new THREE.OrthographicCamera(
            -frustumWidth / 2,
             frustumWidth / 2,
             this.frustumHeight / 2,
            -this.frustumHeight / 2,
             0.1,
             3000
        );

        this.camera.position.copy(cameraPosition);

        // Zoom sur la rampe de lancement
        await cam.animateTo({ x: 0, y: 700, z: -500 }, 800);
        await cam.animateFrustumTo(800, 400);

        // Debug rapide
        cam.snapshot();

        // Reset
        cam.resetToDefault({ x: 0, y: 500, z: 0 });

        // Keep a strict top-down camera and flip table orientation to match gameplay view.
        this.camera.up.set(0, 0, 1);
        this.camera.lookAt(cameraTarget);

        window.addEventListener('resize', () => {
            const aspect = window.innerWidth / window.innerHeight;
            const frustumWidth = this.frustumHeight * aspect;

            this.camera.left = -frustumWidth / 2;
            this.camera.right = frustumWidth / 2;
            this.camera.top = this.frustumHeight / 2;
            this.camera.bottom = -this.frustumHeight / 2;
            this.camera.updateProjectionMatrix();

            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.composer?.setSize(window.innerWidth, window.innerHeight);
        });

        // ==========================================
        // PARTIE VISUELLE (THREE.JS)
        // ==========================================

        // Ambient très faible — juste pour éviter le noir total
        const ambientLight = new THREE.AmbientLight(0x111122, 0);
        this.scene.add(ambientLight);
        this.introLights.push({ light: ambientLight, targetIntensity: 0.15 });

        const createSpotLight = (x, y, z, targetX, targetZ, intensity, angle, penumbra, shadowSize = 1024) => {
            const light = new THREE.SpotLight(0xffffff, 0);

            light.position.set(x, y, z);
            light.castShadow = true;
            light.angle = angle;
            light.penumbra = penumbra;
            light.decay = 2;
            light.distance = 3000;

            light.shadow.mapSize.width = shadowSize;
            light.shadow.mapSize.height = shadowSize;
            light.shadow.camera.near = 10;
            light.shadow.camera.far = 3000;
            light.shadow.bias = -0.0001;
            light.shadow.normalBias = 0.02;

            light.target.position.set(targetX, 0, targetZ);
            this.scene.add(light.target);
            this.scene.add(light);

            this.introLights.push({ light, targetIntensity: intensity });

            return light;
        };

        // Spot principal central — baisser l'intensité et élargir légèrement (1-+ vers gauche, 2-+ vers moins de hauteur, 3-+vers le haut)
            // ── LUMIÈRES NATURELLES CENTRALES ──
            const pointLight1 = new THREE.PointLight(0xffffff, 0.1, 1200);
            pointLight1.position.set(0, 400, 100);
            this.scene.add(pointLight1);

            const pointLight2 = new THREE.PointLight(0xffeedd, 0.1, 1200);
            pointLight2.position.set(0, 300, -100);
            this.scene.add(pointLight2);

            // ── POINT LIGHT BAS (zone palles + rampe) ──
            const pointLightBottom = new THREE.PointLight(0xffffff, 5.0, 1000);
            pointLightBottom.position.set(0, 300, -600);
            this.scene.add(pointLightBottom);

            // ── SPOTS AUX 4 COINS ──

            // Coin haut-gauche
            createSpotLight(-350, 500, -200,   0, 0,  1.5, Math.PI / 9, 0.1, 1024);

            // Coin haut-droit
            createSpotLight( 350, 500, -200,   0, 0,  1.5, Math.PI / 9, 0.1, 1024);

            // Coin bas-gauche — boosté
            createSpotLight(-350, 400,  -700,   0, 400,  3.5, Math.PI / 7, 0.1, 1024);

            // Coin bas-droit — boosté
            createSpotLight( 350, 400,  -700,   0, 400,  3.5, Math.PI / 7, 0.1, 1024);
        
        // Intro : lumières s'allument une à une avec un délai croissant
        setTimeout(() => {
            if (typeof this.playSound === 'function') {
                this.playSound();
            }

            this.introLights.forEach((entry, index) => {
                setTimeout(() => {
                    const target = entry.targetIntensity;
                    const duration = 600;
                    const steps = 30;
                    const increment = target / steps;
                    let current = 0;

                    const fade = setInterval(() => {
                        current += increment;
                        entry.light.intensity = Math.min(current, target);
                        if (current >= target) clearInterval(fade);
                    }, duration / steps);

                }, index * 500); // ✅ chaque lumière s'allume 500ms après la précédente
            });
        }, 3000);

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

        // Mise à jour du debug renderer Rapier
        if (this.debugEnabled) {
            this.debugRenderer.update();
        }
        this.composer.render();
        
        requestAnimationFrame(() => this.render(physics, onUpdate));
    }
}
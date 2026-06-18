import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GreenBloomEffect } from '../effects/GreenBloomEffect.js';

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
        this.greenBloomEffect = null;

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

        // Camera with a wide view and far clipping plane
        this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 3000);
        this.camera.position.z = position.z;
        this.camera.position.y = position.y + 1000;
        this.camera.position.x = position.x;
        
        // Keep a strict top-down camera and flip table orientation to match gameplay view.
        this.camera.up.set(0, 0, 1);
        this.camera.lookAt(0, 0, 0);

        // Orbit controls - commentez cette section pour désactiver facilement
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);

        // ==========================================
        // PARTIE VISUELLE (THREE.JS)
        // ==========================================

        // Soft ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
        this.scene.add(ambientLight);

        const createShadowLight = (x, y, z, intensity = 0.5, shadowSize = 1024) => {

            const light = new THREE.DirectionalLight(0xffffff, intensity);

            light.position.set(x, y, z);
            light.castShadow = true;

            light.shadow.mapSize.width = shadowSize;
            light.shadow.mapSize.height = shadowSize;

            light.shadow.camera.left = -700;
            light.shadow.camera.right = 700;
            light.shadow.camera.top = 700;
            light.shadow.camera.bottom = -700;

            light.shadow.camera.near = 1;
            light.shadow.camera.far = 3000;

            light.shadow.bias = -0.0001;
            light.shadow.normalBias = 0.02;

            light.target.position.set(0, 0, 0);

            this.scene.add(light.target);
            this.scene.add(light);

            return light;
        };

        // Lumière principale
        createShadowLight(
            0,
            1200,
            1000,
            1.2,
            2048
        );

        // Haut gauche
        createShadowLight(
            -800,
            800,
            -800,
            0.5,
            1024
        );

        // Haut droit
        createShadowLight(
            800,
            800,
            -800,
            0.5,
            1024
        );

        // Bas centre
        createShadowLight(
            0,
            800,
            1200,
            0.4,
            1024
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

        // Initialize Green Bloom Effect
        this.greenBloomEffect = new GreenBloomEffect(this.renderer, this.scene, this.camera);

        // Handle window resize for bloom effect
        window.addEventListener('resize', () => {
            if (this.greenBloomEffect) {
                this.greenBloomEffect.handleResize();
            }
        });

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

        // Render with Green Bloom Effect
        if (this.greenBloomEffect) {
            this.greenBloomEffect.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
        
        requestAnimationFrame(() => this.render(physics, onUpdate));
    }
}
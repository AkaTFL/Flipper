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
        this.introLights = [];

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

        // Soft ambient light (starts off)
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

        // Spot principal central — baisser l'intensité et élargir légèrement
            // createSpotLight(   0,  900,    0,    0,    0,  2.0, Math.PI / 8, 0.35, 2048);

            // // Spot arrière-centre — augmenter pour éclairer les bumpers
            // createSpotLight(   0,  700, -500,    0, -250,  2.8, Math.PI / 10, 0.40, 1024);

            // // Spot gauche haut — augmenter légèrement
            // createSpotLight(-400,  600, -300, -150, -150,  2.0, Math.PI / 12, 0.35, 1024);

            // // Spot droit haut — augmenter légèrement
            // createSpotLight( 400,  600, -300,  150, -150,  2.0, Math.PI / 12, 0.35, 1024);

            // // Spot avant-centre — descendre Y et réduire encore l'intensité
            // createSpotLight(   0,  500,  600,    0,  500,  0.7, Math.PI / 10, 0.50, 1024);

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
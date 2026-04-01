import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Config from '../physics/Config.js';

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

        this.init(height, width, position, rotation);
    }

    /**
     * Initialise la scène, le renderer et la caméra
     * @returns {Object} {renderer, scene, camera}
     */
    init(height, width, position, rotation) {
        // Renderer with anti-aliasing for smoother edges
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.WIDTH, this.HEIGHT);
        this.renderer.outputEncoding = THREE.sRGBEncoding;

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

        // Simple ground plane
        let plane = new THREE.PlaneGeometry(width, height);

        let planeMesh = new THREE.Mesh(plane, new THREE.MeshStandardMaterial({
            color: 0xaaaaaa,
            side: THREE.DoubleSide,
            metalness: 0.0,
            roughness: 1.0
        }));

        planeMesh.rotation.x = rotation.x;
        planeMesh.rotation.y = rotation.y;
        planeMesh.rotation.z = rotation.z;
        this.scene.add(planeMesh);

        // Soft ambient light
        const light = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(light);


        // ==========================================
        // PARTIE PHYSIQUE (RAPIER)
        // ==========================================
        // Création du sol physique.
    
        let groundBodyDesc = RAPIER.RigidBodyDesc.fixed()
            .setRotation({ x: Math.sin(rotation.x / 2), y: Math.sin(rotation.y / 2), z: Math.sin(rotation.z / 2), w: Math.cos(rotation.x / 2) * Math.cos(rotation.y / 2) * Math.cos(rotation.z / 2) });
        let groundBody = this.world.createRigidBody(groundBodyDesc);

        let groundColliderDesc = RAPIER.ColliderDesc.cuboid(width / 2, height / 2, 0.1)
            .setRestitution(Config.scene.restitution)
            .setFriction(Config.scene.friction)

            
        this.world.createCollider(groundColliderDesc, groundBody);

        // Attach renderer to the page
        var container = document.getElementById('three');
        container.appendChild(this.renderer.domElement);

        return { renderer: this.renderer, scene: this.scene, camera: this.camera };
    }

    /**
     * Lance la boucle de rendu
     */
    startRender(physics, onUpdate) {
        requestAnimationFrame(() => this.render(physics, onUpdate));
    }

    render(physics, onUpdate) {
        physics.step();

        if (this.controls) {
            this.controls.update();
        }
        if (onUpdate) {
            onUpdate();
        }
        
        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(() => this.render(physics, onUpdate));
    }
}
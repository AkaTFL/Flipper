import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';

import Config from '../physics/Config.js';

import { PostProcessingManager } from '../postprocessing/manager/PostProcessingManager.js';

import { EffectManager } from '../effects/manager/EffectManager.js';

import { createCamera, createCameraHelper, createCameraOrbitControls, setupCameraResize } from '../helpers/CameraHelper.js';
import { createRapierDebug, setupLightHelperToggle } from '../helpers/DebugHelper.js';
import { createLightGUI } from '../helpers/GuiHelper.js';
import { createLights, startLightIntro, cutLightsForReload } from '../core/Lights.js';

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
        this.postProcessing = null;  // remplace this.composer
        this.introLights = [];
        this.lightHelpers = [];
        this.spotLights = [];
        this.gui = null;

        this.debugRenderer = null;
        this.cameraHelper = null;
        this.frustumHeight = 0;
        this.effectManager = null;

        this.debugEnabled = false;
        this.performanceMode = 'quality';
        this.performanceSampleStart = performance.now();
        this.performanceFrameCount = 0;
        this.performanceRecoverySamples = 0;
        this.performanceFrameCostTotal = 0;
        this.performanceFrameCostMax = 0;
        this.performancePhysicsCostTotal = 0;

        this.init(height, width, position, rotation);
    }

    init(height, width, position, rotation) {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.shadowMap.enabled = true;
        // Un canvas Retina plein écran à 2x dépasse 8 millions de pixels.
        // 1,5x conserve une image nette tout en réduisant de 44 % le nombre de
        // pixels traités par chaque passe GPU.
        const isLargeViewport = this.WIDTH * this.HEIGHT >= 1_500_000;
        this.pixelRatio = Math.min(window.devicePixelRatio, isLargeViewport ? 1.5 : 2);
        this.renderer.setPixelRatio(this.pixelRatio);
        this.renderer.setSize(this.WIDTH, this.HEIGHT);
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0);

        this.debugRenderer = createRapierDebug(this.scene, this.world, this);

        const cameraData = createCamera(position);
        this.camera = cameraData.camera;
        this.frustumHeight = cameraData.frustumHeight;

        // Controls de déplacement caméra (orbit), activés uniquement
        // quand le camera helper (F2) est affiché — cf. createCameraHelper.
        this.controls = createCameraOrbitControls(this.camera, this.renderer, cameraData.target);

        this.effectManager = new EffectManager(this.scene, this.camera, this.renderer);

        this.cameraHelper = createCameraHelper(this.scene, this.camera, this.controls);

        // ==========================================
        // POST-PROCESSING
        // Toute la logique est déléguée à PostProcessingManager
        // ==========================================
        this.postProcessing = new PostProcessingManager(
            this.renderer,
            this.scene,
            this.camera,
            {
                ssao: {
                    kernelRadius: 16,
                    minDistance: 0.005,
                    maxDistance: 0.1,
                },
                bloom: {
                    strength:   2,
                    radius:     2,
                    threshold:  0.2,
                    color:      Config[Config.currentLevel].bloom,
                    tolerance:  0.4,
                },
                // Le renderer utilise déjà MSAA. Une seconde passe FXAA est
                // redondante et coûteuse sur les écrans Retina.
                fxaa: false,

                outline: {
                    edgeStrength: 2,
                    edgeGlow: 1,
                    edgeThickness: 2,
                    visibleEdgeColor: Config[Config.currentLevel].outline,
                    hiddenEdgeColor: 0x22090a,
                }
            }
        );

        // setupCameraResize reçoit le composer interne du manager
        setupCameraResize(
            this.camera,
            this.renderer,
            this.postProcessing.composer,
            this.frustumHeight
        );

        // ==========================================
        // LUMIÈRES
        // ==========================================
        const lightData = createLights(this.scene);
        this.introLights  = lightData.introLights;
        this.lightHelpers = lightData.lightHelpers;
        this.spotLights   = lightData.spotLights;

        setupLightHelperToggle(this.lightHelpers);

        // ==========================================
        // LIL-GUI (F4)
        // ==========================================
        this.gui = createLightGUI(this.spotLights);

        window.addEventListener('keydown', (e) => {
            if (e.key === 'F4') {
                e.preventDefault();
                this.gui._hidden ? this.gui.show() : this.gui.hide();
            }
        });

        startLightIntro(this.introLights, this.playSound);

        // ==========================================
        // PHYSIQUE (RAPIER)
        // ==========================================
        let groundBodyDesc = RAPIER.RigidBodyDesc.fixed()
            .setRotation({
                x: Math.sin(rotation.x / 2),
                y: Math.sin(rotation.y / 2),
                z: Math.sin(rotation.z / 2),
                w: Math.cos(rotation.x / 2) * Math.cos(rotation.y / 2) * Math.cos(rotation.z / 2)
            });
        this.world.createRigidBody(groundBodyDesc);

        const container = document.getElementById('three');
        container.appendChild(this.renderer.domElement);

        return { renderer: this.renderer, scene: this.scene, camera: this.camera };
    }

    getCamera() {
        return this.camera;
    }

    // Coupe les lumières une à une (effet caméras qu'on éteint en rafale)
    // puis force un reload complet de la page. Utilisé quand un boss est
    // vaincu : le prochain chargement doit repartir avec les modèles du
    // nouveau niveau (cf. GamePhysics.persistSessionForReload()).
    triggerBossDefeatReload() {
        cutLightsForReload(this.introLights, () => {
            window.location.reload();
        });
    }

    startRender(physics, onUpdate) {
        this.targetFrameInterval = 1000 / 60;
        this.fixedTimeStep = 1 / 120;
        this.maxPhysicsStepsPerFrame = 4;
        this.accumulator = 0;
        this.lastTime = performance.now();
        this.lastRenderTime = this.lastTime - this.targetFrameInterval;
        this.performanceSampleStart = this.lastTime;
        this.performanceFrameCount = 0;

        requestAnimationFrame(() => this.render(physics, onUpdate));
    }

    render(physics, onUpdate) {
        const now = performance.now();
        const sinceLastRender = now - this.lastRenderTime;
        // Safari ne livre pas toujours requestAnimationFrame à exactement
        // 16,67 ms. Une tolérance de 2 ms évite qu'un frame à 15–16 ms soit
        // rejeté puis affiché seulement au raf suivant (saccades à ~30 FPS).
        if (sinceLastRender < this.targetFrameInterval - 2) {
            requestAnimationFrame(() => this.render(physics, onUpdate));
            return;
        }
        this.lastRenderTime = sinceLastRender >= this.targetFrameInterval * 2
            ? now
            : this.lastRenderTime + this.targetFrameInterval;
        const frameStartedAt = performance.now();

        let delta = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;

        this.accumulator += delta;
        let physicsSteps = 0;
        while (
            this.accumulator >= this.fixedTimeStep &&
            physicsSteps < this.maxPhysicsStepsPerFrame
        ) {
            const physicsStartedAt = performance.now();
            physics.step();
            this.performancePhysicsCostTotal += performance.now() - physicsStartedAt;
            this.accumulator -= this.fixedTimeStep;
            physicsSteps += 1;
        }
        if (physicsSteps === this.maxPhysicsStepsPerFrame) {
            // Evita a espiral de recuperação: um frame lento não deve gerar
            // uma longa rajada de passos físicos no frame seguinte.
            this.accumulator %= this.fixedTimeStep;
        }

        if (this.controls) this.controls.update();
        if (onUpdate) onUpdate();
        if (this.cameraHelper?.visible) this.cameraHelper.update();

        this.lightHelpers?.forEach(h => { if (h.visible) h.update(); });

        if (this.debugEnabled) this.debugRenderer.update();

        this.effectManager?.update(delta);

        // Pipeline postprocessing principal — delta transmis pour la décroissance du flash outline
        this.postProcessing.render(delta);

        const frameCost = performance.now() - frameStartedAt;
        this.performanceFrameCostTotal += frameCost;
        this.performanceFrameCostMax = Math.max(this.performanceFrameCostMax, frameCost);

        this.updateAdaptiveQuality(performance.now());

        requestAnimationFrame(() => this.render(physics, onUpdate));
    }

    updateAdaptiveQuality(now) {
        this.performanceFrameCount += 1;
        const elapsed = now - this.performanceSampleStart;
        if (elapsed < 2000) return;

        const fps = this.performanceFrameCount * 1000 / elapsed;
        const renderedFrames = Math.max(1, this.performanceFrameCount);
        globalThis.__flipperPerformance = {
            fps: Number(fps.toFixed(1)),
            averageFrameMs: Number((this.performanceFrameCostTotal / renderedFrames).toFixed(2)),
            maxFrameMs: Number(this.performanceFrameCostMax.toFixed(2)),
            averagePhysicsMs: Number((this.performancePhysicsCostTotal / renderedFrames).toFixed(3)),
            pixelRatio: this.renderer.getPixelRatio(),
            drawCalls: this.renderer.info.render.calls,
            triangles: this.renderer.info.render.triangles,
            textures: this.renderer.info.memory.textures,
            performanceMode: this.performanceMode,
        };
        // Expose la dernière mesure dans le DOM pour pouvoir diagnostiquer les
        // performances sans ouvrir les outils de développement du navigateur.
        document.body.dataset.flipperPerformance = JSON.stringify(globalThis.__flipperPerformance);
        this.performanceFrameCount = 0;
        this.performanceSampleStart = now;
        this.performanceFrameCostTotal = 0;
        this.performanceFrameCostMax = 0;
        this.performancePhysicsCostTotal = 0;

        if (this.performanceMode === 'quality' && fps < 48) {
            this.performanceMode = 'performance';
            this.performanceRecoverySamples = 0;
            this.postProcessing?.setPerformanceMode?.(true);
            return;
        }

        if (this.performanceMode === 'performance') {
            this.performanceRecoverySamples = fps > 56
                ? this.performanceRecoverySamples + 1
                : 0;

            // Attend plusieurs mesures stables pour éviter les changements
            // incessants de qualité autour du seuil.
            if (this.performanceRecoverySamples >= 3) {
                this.performanceMode = 'quality';
                this.performanceRecoverySamples = 0;
                this.postProcessing?.setPerformanceMode?.(false);
            }
        }
    }
}
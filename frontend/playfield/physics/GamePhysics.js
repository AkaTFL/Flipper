import * as RAPIER from '@dimforge/rapier3d-compat';
import Config from '../physics/Config.js';
import { AudioManager } from './Audio.js';

// Importation des sous-modules SOLID
import { BackendManager } from './BackendManager.js';
import { ObjectRegistry } from './ObjectRegistry.js';
import { TriggerDetector } from './TriggerDetector.js';
import { CollisionHandler } from './CollisionHandler.js';
import { LaunchRampManager } from './LaunchRampManager.js';

export class GamePhysics {
    constructor() {
        this.world = null;
        this.audioManager = AudioManager.getShared();
        this.controls = null;
        this.scene = null;
        this.sceneManager = null;
        this.gameOver = false;
        this._ballLostReported = false;

        this.backendManager = new BackendManager(this);
        this.registry = new ObjectRegistry(this);
        this.triggerDetector = new TriggerDetector(this);
        this.collisionHandler = new CollisionHandler(this);
        this.rampManager = new LaunchRampManager(this);
    }

    get objects() { return this.registry.objects; }
    set objects(value) { this.registry.objects = value; }

    get ball() { return this.registry.ball; }
    set ball(value) { this.registry.ball = value; }

    get launchingRamp() { return this.registry.launchingRamp; }
    set launchingRamp(value) { this.registry.launchingRamp = value; }

    get rampB() { return this.registry.rampB; }
    set rampB(value) { this.registry.rampB = value; }

    get colliderOwners() { return this.registry.colliderOwners; }
    set colliderOwners(value) { this.registry.colliderOwners = value; }

    get colliderResponders() { return this.registry.colliderResponders; }
    set colliderResponders(value) { this.registry.colliderResponders = value; }

    get backendSocket() { return this.backendManager.backendSocket; }
    set backendSocket(value) { this.backendManager.backendSocket = value; }

    get lastBackendMessage() { return this.backendManager.lastBackendMessage; }
    set lastBackendMessage(value) { this.backendManager.lastBackendMessage = value; }

    get lastScoreUpdate() { return this.backendManager.lastScoreUpdate; }
    set lastScoreUpdate(value) { this.backendManager.lastScoreUpdate = value; }

    get activeSaveSlot() { return this.backendManager.activeSaveSlot; }
    set activeSaveSlot(value) { this.backendManager.activeSaveSlot = value; }

    get activeScoreZones() { return this.triggerDetector.activeScoreZones; }
    set activeScoreZones(value) { this.triggerDetector.activeScoreZones = value; }

    get activeRampZones() { return this.triggerDetector.activeRampZones; }
    set activeRampZones(value) { this.triggerDetector.activeRampZones = value; }

    get rampTraversal() { return this.triggerDetector.rampTraversal; }
    set rampTraversal(value) { this.triggerDetector.rampTraversal = value; }

    get launchingRampVisible() { return this.rampManager.launchingRampVisible; }
    set launchingRampVisible(value) { this.rampManager.launchingRampVisible = value; }

    get holdLaunchingRampVisibleAfterBallLost() { return this.rampManager.holdLaunchingRampVisibleAfterBallLost; }
    set holdLaunchingRampVisibleAfterBallLost(value) { this.rampManager.holdLaunchingRampVisibleAfterBallLost = value; }

    get ballRespawnedAfterBallLost() { return this.rampManager.ballRespawnedAfterBallLost; }
    set ballRespawnedAfterBallLost(value) { this.rampManager.ballRespawnedAfterBallLost = value; }

    get ballPassedAboveTriggerAfterRespawn() { return this.rampManager.ballPassedAboveTriggerAfterRespawn; }
    set ballPassedAboveTriggerAfterRespawn(value) { this.rampManager.ballPassedAboveTriggerAfterRespawn = value; }

    get launchingRampHideTimeout() { return this.rampManager.launchingRampHideTimeout; }
    set launchingRampHideTimeout(value) { this.rampManager.launchingRampHideTimeout = value; }

    get lastImpactByObject() { return this.collisionHandler.lastImpactByObject; }
    set lastImpactByObject(value) { this.collisionHandler.lastImpactByObject = value; }

    async init() {
        await RAPIER.init();

        this.eventQueue = new RAPIER.EventQueue(true);
        const multiplier = Config.forceMultiplier;
        const gravity = {
            x: Config[Config.currentLevel].gravity.x * multiplier,
            y: Config[Config.currentLevel].gravity.y * multiplier,
            z: Config[Config.currentLevel].gravity.z * multiplier
        };

        this.world = new RAPIER.World(gravity);
        this.connectBackend();

        this.ball = this.objects.find(
            (obj) => obj.objectType === 'ball' && obj.rigidBody
        );

        this.applyLevelConfig();
    }

    step() {
        this.world.step(this.eventQueue);
        this.updateRollingBallSound();
        this.handleCollisionEvents();
        this.detectScoreZoneEntries();
        this.checkLaunchingRampHeight();
        this.checkBallOutOfBounds();
    }

    updateRollingBallSound() {
        const ball = this.ball;
        if (!ball?.rigidBody || typeof ball.rigidBody.linvel !== 'function') {
            return;
        }

        const velocity = ball.rigidBody.linvel();
        const speed = Math.hypot(
            velocity.x ?? 0,
            velocity.y ?? 0,
            velocity.z ?? 0
        );
        this.audioManager.updateRollingBall(speed, Config.global.sounds.ball.metal);
    }

    // --- Délégation des responsabilités ---

    registerObjects(objects) {
        this.registry.registerObjects(objects);
    }

    registerObjectColliders(obj) {
        this.registry.registerObjectColliders(obj);
    }

    connectBackend() {
        this.backendManager.connectBackend();
    }

    handleBackendMessage(rawData) {
        return this.backendManager.handleBackendMessage(rawData);
    }

    sendMessage(type, payload = {}) {
        return this.backendManager.sendMessage(type, payload);
    }

    currentLevelNumber() {
        return this.backendManager.currentLevelNumber();
    }

    autoSaveActiveSlot() {
        return this.backendManager.autoSaveActiveSlot();
    }

    whenBackendReady(timeoutMs = 5000) {
        return this.backendManager.whenBackendReady(timeoutMs);
    }

    sendImpact(object, combo) {
        if (!object) return false;
        return this.sendMessage('impact', {
            objectId: object.objectId || null,
            objectType: object.objectType || object.constructor?.name?.toLowerCase() || 'object',
        });
    }

    detectScoreZoneEntries() {
        this.triggerDetector.detectScoreZoneEntries();
    }

    detectRampTraversal() {
        this.triggerDetector.detectRampTraversal();
    }

    isPositionInsideZone(position, zone) {
        return this.triggerDetector.isPositionInsideZone(position, zone);
    }

    handleCollisionEvents(comboS) {
        this.collisionHandler.handleCollisionEvents(comboS);
    }

    setLaunchingRampVisible(visible) {
        this.rampManager.setLaunchingRampVisible(visible);
    }

    setPhysicsObjectEnabled(object, enabled) {
        this.rampManager.setPhysicsObjectEnabled(object, enabled);
    }

    checkLaunchingRampHeight() {
        this.rampManager.checkLaunchingRampHeight();
    }

    checkBallOutOfBounds() {
        this.triggerDetector.checkBallOutOfBounds();
    }

    // --- Logique Métier Restante (Cycle de vie & Configuration Globale) ---

    triggerBallLost() {
        if (!this.ball?.rigidBody || this._ballLostReported || this.gameOver) {
            return false;
        }

        this._ballLostReported = true;
        this.holdLaunchingRampVisibleAfterBallLost = true;
        this.setLaunchingRampVisible(true);
        this.sendMessage('ball_lost');
        console.info(`[backend] ball_lost envoyé`);

        setTimeout(() => {
            if (this.gameOver) return;

            const spawnPos = {
                x: Config.global.positioning.ball.position.x,
                y: Config.global.positioning.ball.position.y,
                z: Config.global.positioning.ball.position.z
            };

            this.ball.rigidBody.setTranslation(spawnPos, true);
            this.ball.rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);

            if (typeof this.ball.rigidBody.setAngvel === 'function') {
                this.ball.rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
            }

            this.ball.mesh.position.set(spawnPos.x, spawnPos.y, spawnPos.z);

            this._ballLostReported = false;
            this.ballRespawnedAfterBallLost = true;
            this.ballPassedAboveTriggerAfterRespawn = false;

            try {
                this.controls.setImpulseUsed(false);
            } catch (error) {
                console.warn('Unable to reset controls impulse flag after respawn', error);
            }
        }, 1500);

        return true;
    }

    resetState() {
        this.gameOver = false;
        this._ballLostReported = false;
        this.holdLaunchingRampVisibleAfterBallLost = false;
        this.ballRespawnedAfterBallLost = false;
        this.ballPassedAboveTriggerAfterRespawn = false;
        if (this.launchingRampHideTimeout) {
            clearTimeout(this.launchingRampHideTimeout);
            this.launchingRampHideTimeout = null;
        }
        this.activeScoreZones = new Set();
        this.activeRampZones = new Set();
        this.rampTraversal = null;
        this.launchingRampVisible = true;
    }

    applyLevelConfig() {
        const levelConfig = Config[Config.currentLevel];
        if (!levelConfig) return;

        const multiplier = Config.forceMultiplier;
        this.world.gravity = {
            x: levelConfig.gravity.x * multiplier,
            y: levelConfig.gravity.y * multiplier,
            z: levelConfig.gravity.z * multiplier
        };

        this.audioManager.stopMusic?.();
        this.audioManager.playMusic(levelConfig.soundtrack, 0.2);
        console.info(`Niveau actif : ${Config.currentLevel}`);
    }
}
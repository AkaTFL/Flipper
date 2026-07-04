import * as RAPIER from '@dimforge/rapier3d-compat';
import Config from '../physics/Config.js';
import { AudioManager } from './Audio.js';
import { BackendConnection } from './BackendConnection.js';
import { Colliders } from './Colliders.js';
import { ScoreTracker } from './ScoreTracker.js';

export class GamePhysics {
    constructor() {
        this.world = null;
        this.eventQueue = null;
        this.ball = null;
        this.launchingRamp = null;
        this.rampB = null;
        this.controls = null;
        this.scene = null;         // THREE.Scene — pour traverse(), add(), etc.
        this.sceneManager = null;  // instance Scene.js — pour postProcessing, effectManager, etc.
        this.gameOver = false;
        this.activeSaveSlot = null;
        this.audioManager = AudioManager.getShared();

        this.backend = new BackendConnection(this);
        this.colliderRegistry = new Colliders();
        this.scoreTracker = new ScoreTracker(this);

        // Ball state
        this._ballLostReported = false;
        this.holdLaunchingRampVisibleAfterBallLost = false;
        this.ballRespawnedAfterBallLost = false;
        this.ballPassedAboveTriggerAfterRespawn = false;

        // Launching ramp state
        this.launchingRampVisible = true;
        this.launchingRampHideTimeout = null;
    }

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
        this.backend.connect();

        this.ball = this.colliderRegistry.objects.find(
            (obj) =>
                obj.objectType === 'ball' &&
                obj.rigidBody
        );

        this.scoreTracker.applyLevelConfig();
    }

    step() {
        this.world.step(this.eventQueue);
        this.updateRollingBallSound();
        this.handleCollisionEvents();
        this.scoreTracker.detectScoreZoneEntries();
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

    // Register des objets

    registerObjects(objects) {
        this.colliderRegistry.registerObjects(objects, this);
    }

    // Collisions

    handleCollisionEvents(comboS) {
        this.eventQueue.drainCollisionEvents((handle1, handle2, started) => {
            if (!started) {
                return;
            }

            const combo = comboS || null;
            const collidingObjects = this.colliderRegistry.findCollidingObjects(handle1, handle2);
            const collisionResponders = this.colliderRegistry.findCollisionResponders(handle1, handle2);

            console.log({ handle1, handle2, started });

            // Détection drain : balle + mesh nommé 'drain'
            const hasBall = collidingObjects.some((obj) => obj?.objectType === 'ball');
            const hitDrain = collidingObjects.some(
                (obj) => obj?.objectType === 'drain' || obj?.objectId === 'drain' || obj?.name === 'drain'
            );

            if (hasBall && hitDrain) {
                this.triggerBallLost();
                return;
            }

            for (const obj of collisionResponders) {
                if (typeof obj.handleCollision === 'function') {
                    obj.handleCollision({ handle1, handle2 });
                }
            }

            // Flash outline uniquement sur les collisions bumper/repulse
            const hasBumperOrRepulse = collidingObjects.some(
                (obj) => obj?.objectType === 'bumper' || obj?.objectType === 'repulse'
            );
            if (hasBumperOrRepulse) {
                // sceneManager (instance Scene.js) — pas this.scene (THREE.Scene)
                this.sceneManager?.postProcessing?.triggerImpactPulse?.();
            }

            for (const obj of collisionResponders) {
                if (obj.objectType === 'bumper' && typeof obj.applyBumperForce === 'function') {
                    obj.applyBumperForce(handle1, handle2);
                }

                if (obj.objectType === 'repulse' && typeof obj.applyRepulseForce === 'function') {
                    obj.applyRepulseForce(handle1, handle2);
                }

                if (obj.objectType === 'ramp') {
                    this.scoreTracker.detectRampTraversal();
                }
            }

            this.reportContactImpacts(collidingObjects, combo);
        });
    }

    reportContactImpacts(collidingObjects, combo = null) {
        for (const obj of collidingObjects) {
            if (obj?.objectType === 'ball' || obj?.objectType === 'drain') {
                continue;
            }

            this.backend.sendImpact(obj, combo);
        }
    }

    // Rampe de lancement

    setLaunchingRampVisible(visible) {
        if (!this.launchingRamp?.mesh) {
            return;
        }

        if (visible && this.launchingRampHideTimeout) {
            clearTimeout(this.launchingRampHideTimeout);
            this.launchingRampHideTimeout = null;
        }

        this.launchingRampVisible = visible;

        const rampBPosition = Config.global.positioning.ramps.B.position;
        const launchingPosition = Config.global.positioning.launchingRamp.position;

        if (visible) {
            if (this.launchingRamp?.rigidBody?.setTranslation) {
                this.launchingRamp.rigidBody.setTranslation(launchingPosition, true);
            }
            if (this.launchingRamp?.mesh?.position) {
                this.launchingRamp.mesh.position.set(launchingPosition.x, launchingPosition.y, launchingPosition.z);
            }

            if (this.rampB?.rigidBody?.setTranslation) {
                this.rampB.rigidBody.setTranslation({ x: rampBPosition.x, y: -800, z: rampBPosition.z }, true);
            }
            if (this.rampB?.mesh?.position) {
                this.rampB.mesh.position.set(rampBPosition.x, -800, rampBPosition.z);
            }
        } else {
            if (this.launchingRamp?.rigidBody?.setTranslation) {
                this.launchingRamp.rigidBody.setTranslation({ x: launchingPosition.x, y: -800, z: launchingPosition.z }, true);
            }
            if (this.launchingRamp?.mesh?.position) {
                this.launchingRamp.mesh.position.set(launchingPosition.x, -800, launchingPosition.z);
            }

            if (this.rampB?.rigidBody?.setTranslation) {
                this.rampB.rigidBody.setTranslation(rampBPosition, true);
            }
            if (this.rampB?.mesh?.position) {
                this.rampB.mesh.position.set(rampBPosition.x, rampBPosition.y, rampBPosition.z);
            }
        }
    }

    checkLaunchingRampHeight() {
        if (!this.ball?.rigidBody) {
            return;
        }

        const position = this.ball.rigidBody.translation();
        const triggerY = 15;

        if (this.holdLaunchingRampVisibleAfterBallLost) {
            if (!this.ballRespawnedAfterBallLost || !this.controls?.impulseUsed) {
                return;
            }

            if (!this.ballPassedAboveTriggerAfterRespawn && position.y > triggerY) {
                this.ballPassedAboveTriggerAfterRespawn = true;
                return;
            }

            if (this.ballPassedAboveTriggerAfterRespawn && position.y <= triggerY) {
                this.holdLaunchingRampVisibleAfterBallLost = false;
                this.ballPassedAboveTriggerAfterRespawn = false;
                this.setLaunchingRampVisible(false);
            }
            return;
        }

        if (this.controls?.impulseUsed && this.launchingRampVisible) {
            if (!this.launchingRampHideTimeout) {
                this.launchingRampHideTimeout = setTimeout(() => {
                    this.setLaunchingRampVisible(false);
                    this.launchingRampHideTimeout = null;
                }, 3000);
            }
            return;
        }

        if (this.controls?.impulseUsed && position.y <= triggerY) {
            if (this.launchingRampHideTimeout) {
                clearTimeout(this.launchingRampHideTimeout);
            }

            this.launchingRampHideTimeout = setTimeout(() => {
                this.setLaunchingRampVisible(false);
                this.launchingRampHideTimeout = null;
            }, 500);
        }
    }

    // Cycle de vie de la balle

    checkBallOutOfBounds() {
        if (!this.ball?.rigidBody || this._ballLostReported || this.gameOver) return;

        const pos = this.ball.rigidBody.translation();

        if (pos.z < Config.global.positioning.drainZThreshold && pos.y < Config.global.positioning.drainYThreshold) {
            console.warn('[GamePhysics] checkBallOutOfBounds : balle hors limites (fallback), drain collider non déclenché ?');
            this.triggerBallLost();
        }
    }

    triggerBallLost() {
        if (!this.ball?.rigidBody || this._ballLostReported || this.gameOver) {
            return false;
        }

        this._ballLostReported = true;
        this.holdLaunchingRampVisibleAfterBallLost = true;
        this.setLaunchingRampVisible(true);
        this.backend.sendMessage('ball_lost');
        console.info(`[backend] ball_lost envoyé`);

        setTimeout(() => {
            if (this.gameOver) {
                return;
            }

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
        this.launchingRampVisible = true;
        this.scoreTracker.reset();
    }

    // --- Compat : anciens appels directs conservés (Controls.js, objets de scène, etc.)
    get objects() { return this.colliderRegistry.objects; }
    get colliderOwners() { return this.colliderRegistry.colliderOwners; }
    get colliderResponders() { return this.colliderRegistry.colliderResponders; }
    get lastBackendMessage() { return this.backend.lastMessage; }
    get lastScoreUpdate() { return this.backend.lastScoreUpdate; }

    sendMessage(type, payload) { return this.backend.sendMessage(type, payload); }
    sendImpact(object, combo) { return this.backend.sendImpact(object, combo); }
    whenBackendReady(timeoutMs) { return this.backend.whenReady(timeoutMs); }
    applyLevelConfig() { return this.scoreTracker.applyLevelConfig(); }
}
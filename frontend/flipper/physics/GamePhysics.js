import * as RAPIER from '@dimforge/rapier3d-compat';
import Config from '../physics/Config.js';
import { AudioManager } from './Audio.js';
import currentLevel from '../physics/Config.js';

export class GamePhysics {
    constructor() {
        this.world = null;
        this.bumpers = [];
        this.launchingRamp = null;
        this.rampB = null;
        this.backendSocket = null;
        this.objects = [];
        this.ball = null;
        this.colliderOwners = new Map();
        this.colliderResponders = new Map();
        this.lastBackendMessage = null;
        this.lastScoreUpdate = null;
        this.activeScoreZones = new Set();
        this.activeRampZones = new Set();
        this.rampTraversal = null;
        this.audioManager = new AudioManager();
        this.controls = null;
        this.scene = null;
        this.gameOver = false;
        this._ballLostReported = false;
        this.launchingRampVisible = true;
        this.holdLaunchingRampVisibleAfterBallLost = false;
        this.ballRespawnedAfterBallLost = false;
        this.ballPassedAboveTriggerAfterRespawn = false;
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
        this.connectBackend();

        this.ball = this.objects.find(
            (obj) =>
                obj.objectType === 'ball' &&
                obj.rigidBody
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

    //Register des objets

    registerObjects(objects) {
        for (const obj of objects) {
            if (!obj) continue;

            this.objects.push(obj);
            if (obj.objectType === 'ball') {
                this.ball = obj;
            } else if (obj.objectType === 'launching-ramp') {
                this.launchingRamp = obj;
            } else if (obj.objectType === 'ramp' && obj.objectId === 'ramp-b') {
                this.rampB = obj;
            }
            this.registerObjectColliders(obj);
        }
    }

    registerObjectColliders(obj) {
        const entries = Array.isArray(obj.collisionEntries) && obj.collisionEntries.length > 0
            ? obj.collisionEntries
            : [
                ...(obj.collider ? [{ collider: obj.collider, owner: obj, responder: obj }] : []),
                ...(Array.isArray(obj.colliders)
                    ? obj.colliders.filter(Boolean).map((collider) => ({ collider, owner: obj, responder: obj }))
                    : [])
            ];

        for (const entry of entries) {
            if (!entry?.collider) continue;

            this.colliderOwners.set(entry.collider.handle, entry.owner || obj);
            this.colliderResponders.set(entry.collider.handle, entry.responder || entry.owner || obj);
        }
    }
    //
    //
    //

    // Communication avec le backend
    connectBackend() {
        const socketUrl = 'http://localhost:8080/ws';

        try {
            this.backendSocket = new globalThis.WebSocket(socketUrl);

            this.backendSocket.addEventListener('open', () => {
                console.info(`Backend connecté sur ${socketUrl}`);
            });

            this.backendSocket.addEventListener('message', (event) => {
                this.handleBackendMessage(event.data);
            });

            this.backendSocket.addEventListener('close', () => {
                console.warn('Connexion backend fermée');
            });

            this.backendSocket.addEventListener('error', (error) => {
                console.warn('Erreur WebSocket backend:', error);
            });
        } catch (error) {
            this.backendSocket = null;
            console.warn('Backend non connecté:', error);
        }
    }

    handleBackendMessage(rawData) {
        try {
            const message = JSON.parse(rawData);
            this.lastBackendMessage = message;
            if (message?.type === 'score_update') {
                this.lastScoreUpdate = message.payload ?? null;
            } 
            
            else if (message?.type === 'player_state_update') {
                this.gameOver = Boolean(message.payload?.gameOver);
            }

            else if (message?.type === 'boss_state_update') {
                if ((message.payload?.hp ?? 1) <= 0) {
                    const previousLevel = Config.currentLevel;

                    const current = Number(Config.currentLevel.split('_')[1]);

                    if (current < 4) {
                        Config.currentLevel = `lvl_${current + 1}`;
                        currentLevel += 1;
                    } else {
                        Config.currentLevel = 'post_lvl';
                        currentLevel = currentLevel;
                    }

                    if (previousLevel !== Config.currentLevel) {
                        this.applyLevelConfig();
                    }
                }
            }

            if (typeof globalThis.dispatchEvent === 'function' && typeof globalThis.CustomEvent === 'function') {
                globalThis.dispatchEvent(new globalThis.CustomEvent('flipper:backend-message', {
                    detail: message
                }));
            }

            return message;
        } catch (error) {
            console.warn('Message backend invalide:', rawData, error);
            return null;
        }
    }


    sendMessage(type, payload = {}) {
        const message = { type, payload };

        console.log('[backend] envoi', message);

        if (!this.backendSocket || this.backendSocket.readyState !== globalThis.WebSocket?.OPEN) {
            console.warn('[backend] socket indisponible, envoi ignoré', message);
            return false;
        }

        this.backendSocket.send(JSON.stringify(message));
        return true;
    }
    //
    //
    //

    // Retour nécessaire : score mis à jour par rapport aux différents objets/multiplicateurs
    sendImpact(object, combo) {
        if (!object) {
            return false;
        }

        return this.sendMessage('impact', {
            objectId: object.objectId || null,
            objectType: object.objectType || object.constructor?.name?.toLowerCase() || 'object',
        });
    }

    detectScoreZoneEntries() {
        const scoreZones = Config.global.positioning.scoreZones?.instances;
        if (!Array.isArray(scoreZones) || scoreZones.length === 0) {
            return;
        }

        const position = this.ball.rigidBody.translation();
        const nextActiveZones = new Set();

        for (const zone of scoreZones) {
            if (!zone?.id || !zone?.center || !zone?.size) {
                continue;
            }

            if (!this.isPositionInsideZone(position, zone)) {
                continue;
            }

            nextActiveZones.add(zone.id);
            if (this.activeScoreZones.has(zone.id)) {
                continue;
            }

            this.sendImpact({
                objectId: zone.id,
                objectType: zone.type || 'target'
            });
        }

        this.activeScoreZones = nextActiveZones;
    }

    detectRampTraversal() {
        const rampScoring = Config.global.positioning.ramps;
        const position = this.ball.rigidBody.translation();
        const nextActiveRampZones = new Set();
        const now = Date.now();

        if (this.rampTraversal?.startedAt && (now - this.rampTraversal.startedAt) > (rampScoring.timeoutMs)) {
            this.rampTraversal = null;
        }

        rampScoring.instances.forEach((ramp) => {
            const entryZone = ramp.entryZone;
            if (this.isPositionInsideZone(position, entryZone)) {
                nextActiveRampZones.add(entryZone.id);
            }
            if (!this.activeRampZones.has(entryZone.id)) {
                this.rampTraversal = {
                    startedAt: now,
                    hasWallBounce: false
                };
            }

            const exitZone = rampScoring.exitZone;
            
            if (this.isPositionInsideZone(position, exitZone)) {
                nextActiveRampZones.add(exitZone.id);
                if (!this.activeRampZones.has(exitZone.id) && this.rampTraversal) {
                    const objectId = this.rampTraversal.hasWallBounce
                        ? 'ramp-main-simple'
                        : 'ramp-main-perfect';

                    this.sendImpact({
                        objectId,
                        objectType: 'launching-ramp'
                    });
                    this.rampTraversal = null;
                }
            }
        });

        this.activeRampZones = nextActiveRampZones;
    }

    isPositionInsideZone(position, zone) {
        const halfX = (zone.size.x || 0) / 2;
        const halfY = (zone.size.y || 0) / 2;
        const halfZ = (zone.size.z || 0) / 2;

        return Math.abs((position.x ?? 0) - zone.center.x) <= halfX
            && Math.abs((position.y ?? 0) - zone.center.y) <= halfY
            && Math.abs((position.z ?? 0) - zone.center.z) <= halfZ;
    }

    triggerBallLost(source = 'collision') {
        if (!this.ball?.rigidBody || this._ballLostReported || this.gameOver) {
            return false;
        }

        this._ballLostReported = true;
        this.holdLaunchingRampVisibleAfterBallLost = true;
        this.setLaunchingRampVisible(true);
        this.sendMessage('ball_lost');
        console.info(`[backend] ball_lost envoyé (${source})`);

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

    findCollidingObjects(handle1, handle2) {
        return [...new Set([
            this.colliderOwners.get(handle1),
            this.colliderOwners.get(handle2)
        ].filter(Boolean))];
    }

    findCollisionResponders(handle1, handle2) {
        return [...new Set([
            this.colliderResponders.get(handle1),
            this.colliderResponders.get(handle2),
            this.colliderOwners.get(handle1),
            this.colliderOwners.get(handle2)
        ].filter(Boolean))];
    }

    reportContactImpacts(collidingObjects, combo = null) {
        for (const obj of collidingObjects) {
            if (obj?.objectType === 'ball' || obj?.objectType === 'drain') {
                continue;
            }

            this.sendImpact(obj, combo);
        }
    }

    isBallDrainCollision(collidingObjects) {
        const hasBall = collidingObjects.some((obj) => obj?.objectType === 'ball');
        const hitDrain = collidingObjects.some((obj) => obj?.objectType === 'drain');

        return hasBall && hitDrain;
    }

    handleCollisionEvents(comboS) {
        this.eventQueue.drainCollisionEvents((handle1, handle2, started) => {
            const responders = this.findCollisionResponders(handle1, handle2);

            if (!started) {
                return;
            }

            const combo = comboS || null;
            const collidingObjects = this.findCollidingObjects(handle1, handle2);
            const collisionResponders = this.findCollisionResponders(handle1, handle2);

            if (this.isBallDrainCollision(collidingObjects)) {
                this.triggerBallLost('body-bottom-wall');
            }

            for (const obj of collisionResponders) {
                if (typeof obj.handleCollision === 'function') {
                    obj.handleCollision({ handle1, handle2 });
                }
            }

            for (const obj of collisionResponders) {
                if (obj.objectType === 'bumper'  && typeof obj.applyBumperForce === 'function')
                {
                    obj.applyBumperForce(handle1, handle2);
                }

                if (obj.objectType === 'repulse'  && typeof obj.applyRepulseForce === 'function') {
                    obj.applyRepulseForce(handle1, handle2);
                }

                // if (obj.objectType === 'launching-ramp' && typeof obj.applyLaunchingRampForce === 'function') {
                //     obj.applyLaunchingRampForce(handle1, handle2);
                // }

                if (obj.objectType === 'ramp') {
                    this.detectRampTraversal();
                }
            }

            this.reportContactImpacts(collidingObjects);
        });
    }

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

        if (position.y <= triggerY) {
            if (this.launchingRampHideTimeout) {
                clearTimeout(this.launchingRampHideTimeout);
            }

            this.launchingRampHideTimeout = setTimeout(() => {
                this.setLaunchingRampVisible(false);
                this.launchingRampHideTimeout = null;
            }, 500);
        }
    }

    checkBallOutOfBounds() {
        console.log('position y:', this.ball?.rigidBody?.translation()?.y, 'position z:', this.ball?.rigidBody?.translation()?.z);
        if (!this.ball?.rigidBody || this._ballLostReported || this.gameOver) return;

        const pos = this.ball.rigidBody.translation();

        if (pos.z > Config.global.positioning.drainZThreshold || pos.y < Config.global.positioning.drainYThreshold) {
            this.triggerBallLost('back_wall');
        }
    }

    applyLevelConfig() {
        const levelConfig = Config[Config.currentLevel];

        if (!levelConfig) {
            return;
        }

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
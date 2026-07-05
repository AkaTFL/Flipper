import * as RAPIER from '@dimforge/rapier3d-compat';
import Config, {NiveauActuel} from '../physics/Config.js';
import { AudioManager } from './Audio.js';

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
        this.audioManager = AudioManager.getShared();
        this.controls = null;
        this.scene = null;         // THREE.Scene — pour traverse(), add(), etc.
        this.sceneManager = null;  // instance Scene.js — pour postProcessing, effectManager, etc.
        this.gameOver = false;
        this._ballLostReported = false;
        this.launchingRampVisible = true;
        this.holdLaunchingRampVisibleAfterBallLost = false;
        this.ballRespawnedAfterBallLost = false;
        this.ballPassedAboveTriggerAfterRespawn = false;
        this.launchingRampHideTimeout = null;
        this.activeSaveSlot = null;
        this.lastImpactByObject = new WeakMap();
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
        const protocol = globalThis.location?.protocol === 'https:' ? 'wss:' : 'ws:';
        const socketUrl = globalThis.location?.host
            ? `${protocol}//${globalThis.location.host}/ws`
            : 'ws://localhost:8080/ws';

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
                const wasGameOver = this.gameOver;
                this.gameOver = Boolean(message.payload?.gameOver);
                // Sauvegarde sur game over (transition uniquement)
                if (this.gameOver && !wasGameOver) {
                    this.autoSaveActiveSlot();
                }
            }

            else if (message?.type === 'boss_state_update') {
                if ((message.payload?.hp ?? 1) <= 0) {
                    const previousLevel = Config.currentLevel;

                    const current = Number(Config.currentLevel.split('_')[1]);

                    if (current < 4) {
                        Config.currentLevel = `lvl_${current + 1}`;
                        NiveauActuel += current + 1;
                    } else {
                        Config.currentLevel = 'post_lvl';
                        NiveauActuel = NiveauActuel;
                    }

                    if (previousLevel !== Config.currentLevel) {
                        this.applyLevelConfig();
                        // Sauvegarde de checkpoint à chaque montée de niveau
                        this.autoSaveActiveSlot();
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

        if (!this.backendSocket || this.backendSocket.readyState !== globalThis.WebSocket?.OPEN) {
            console.warn('[backend] socket indisponible, envoi ignoré', message);
            return false;
        }

        this.backendSocket.send(JSON.stringify(message));
        return true;
    }

    // Numéro de niveau courant (1-4) dérivé de Config.currentLevel ('lvl_1'..'lvl_4', 'post_lvl')
    currentLevelNumber() {
        const parsed = Number(Config.currentLevel?.split('_')[1]);
        if (!Number.isFinite(parsed) || parsed < 1) {
            return 1;
        }
        return Math.min(4, parsed);
    }

    // Sauvegarde la partie courante dans le slot actif (avec son niveau)
    autoSaveActiveSlot() {
        if (!this.activeSaveSlot) {
            return false;
        }
        return this.sendMessage('save_game', {
            slot: this.activeSaveSlot,
            level: this.currentLevelNumber()
        });
    }

    // Résout quand la WebSocket backend est ouverte (ou au bout du timeout)
    whenBackendReady(timeoutMs = 5000) {
        return new Promise((resolve) => {
            const socket = this.backendSocket;
            const OPEN = globalThis.WebSocket?.OPEN ?? 1;

            if (!socket) {
                resolve(false);
                return;
            }
            if (socket.readyState === OPEN) {
                resolve(true);
                return;
            }

            let settled = false;
            const finish = (value) => {
                if (!settled) {
                    settled = true;
                    resolve(value);
                }
            };

            socket.addEventListener('open', () => finish(true), { once: true });
            setTimeout(() => finish(socket.readyState === OPEN), timeoutMs);
        });
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
        this.activeScoreZones = new Set();
        this.activeRampZones = new Set();
        this.rampTraversal = null;
        this.launchingRampVisible = true;
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
        const now = performance.now();
        for (const obj of collidingObjects) {
            if (obj?.objectType === 'ball' || obj?.objectType === 'drain') {
                continue;
            }

            const lastImpact = this.lastImpactByObject.get(obj) ?? -Infinity;
            if (now - lastImpact < 80) continue;
            this.lastImpactByObject.set(obj, now);

            this.sendImpact(obj, combo);
        }
    }

    handleCollisionEvents(comboS) {
        this.eventQueue.drainCollisionEvents((handle1, handle2, started) => {
            if (!started) {
                return;
            }

            const combo = comboS || null;
            const collidingObjects = this.findCollidingObjects(handle1, handle2);
            const collisionResponders = this.findCollisionResponders(handle1, handle2);

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

        if (this.launchingRampHideTimeout) {
            clearTimeout(this.launchingRampHideTimeout);
            this.launchingRampHideTimeout = null;
        }

        // Les deux rampes sont déjà chargées et préparées par Flipper.js.
        // Ici on ne charge aucun modèle et on ne déplace aucun rigid body : on
        // inverse simplement leur visibilité et leur activation physique.
        this.launchingRampVisible = visible;
        this.setPhysicsObjectEnabled(this.launchingRamp, visible);
        this.setPhysicsObjectEnabled(this.rampB, !visible);

        if (visible) {
            this.ballPassedAboveTriggerAfterRespawn = false;
        }

        if (globalThis.document?.body) {
            globalThis.document.body.dataset.launchingRamp = visible ? 'visible' : 'hidden';
            globalThis.document.body.dataset.rightRamp = visible ? 'hidden' : 'visible';
        }
    }

    setPhysicsObjectEnabled(object, enabled) {
        if (!object) return;
        if (object.mesh) object.mesh.visible = enabled;
        if (object._physicsEnabled === enabled) return;
        object._physicsEnabled = enabled;

        const colliders = new Set([
            object.collider,
            ...(Array.isArray(object.colliders) ? object.colliders : []),
            ...(Array.isArray(object.collisionEntries)
                ? object.collisionEntries.map((entry) => entry?.collider)
                : [])
        ].filter(Boolean));

        // Retirer puis réinsérer un rigid body trimesh dans Rapier provoquait
        // un pic de plusieurs centaines de millisecondes. Les bodies restent
        // donc chargés ; seul leur filtre de collision est basculé.
        object._collisionGroupsByCollider ??= new WeakMap();
        for (const collider of colliders) {
            if (!object._collisionGroupsByCollider.has(collider)) {
                object._collisionGroupsByCollider.set(
                    collider,
                    typeof collider.collisionGroups === 'function'
                        ? collider.collisionGroups()
                        : 0xffffffff
                );
            }
            collider.setCollisionGroups?.(
                enabled ? object._collisionGroupsByCollider.get(collider) : 0
            );
        }
    }

    checkLaunchingRampHeight() {
        if (!this.launchingRampVisible || !this.controls?.impulseUsed || !this.ball?.rigidBody) {
            return;
        }

        const position = this.ball.rigidBody.translation();
        const launchConfig = Config.global.positioning.launchingRamp;

        if (position.z >= launchConfig.curveStartZ) {
            const velocity = this.ball.rigidBody.linvel();
            const horizontalSpeed = Math.hypot(velocity.x ?? 0, velocity.z ?? 0);
            const currentAngle = Math.atan2(velocity.x ?? 0, velocity.z ?? 0);
            const targetAngle = Math.atan2(
                launchConfig.exitX - position.x,
                launchConfig.exitZ - position.z
            );
            const rawDelta = Math.atan2(
                Math.sin(targetAngle - currentAngle),
                Math.cos(targetAngle - currentAngle)
            );
            const turn = Math.max(
                -launchConfig.curveTurnRate,
                Math.min(launchConfig.curveTurnRate, rawDelta)
            );
            const steeredAngle = currentAngle + turn;

            // Le vecteur tourne progressivement vers la sortie, mais sa norme
            // reste identique : l'appui bref/long garde donc toute son influence.
            this.ball.rigidBody.setLinvel({
                x: Math.sin(steeredAngle) * horizontalSpeed,
                y: velocity.y ?? 0,
                z: Math.cos(steeredAngle) * horizontalSpeed
            }, true);
        }

        const distanceToExit = Math.hypot(
            launchConfig.exitX - position.x,
            launchConfig.exitZ - position.z
        );
        if (distanceToExit > launchConfig.exitRadius) {
            return;
        }

        // La vraie sortie est franchie : la rampe initiale disparaît et la
        // rampe droite, déjà préchargée, devient visible dans le même frame.
        this.holdLaunchingRampVisibleAfterBallLost = false;
        this.ballPassedAboveTriggerAfterRespawn = true;
        this.setLaunchingRampVisible(false);
    }

    checkBallOutOfBounds() {
        if (!this.ball?.rigidBody || this._ballLostReported || this.gameOver) return;

        const pos = this.ball.rigidBody.translation();

        if (pos.z < Config.global.positioning.drainZThreshold && pos.y < Config.global.positioning.drainYThreshold) {
            console.warn('[GamePhysics] checkBallOutOfBounds : balle hors limites (fallback), drain collider non déclenché ?');
            this.triggerBallLost();
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

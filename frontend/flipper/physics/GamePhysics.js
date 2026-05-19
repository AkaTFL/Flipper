import * as RAPIER from '@dimforge/rapier3d-compat';
import Config from '../physics/Config.js';

export class GamePhysics {
    constructor() {
        this.world = null;
        this.bumpers = [];
        this.launchingRamp = null;
        this.backendSocket = null;
        this.objects = [];
        this.colliderOwners = new Map();
        this.colliderResponders = new Map();
        this.lastBackendMessage = null;
        this.lastScoreUpdate = null;
        this.activeScoreZones = new Set();
        this.activeRampZones = new Set();
        this.rampTraversal = null;
    }

    async init() {
        await RAPIER.init({});

        this.eventQueue = new RAPIER.EventQueue(true);
        const multiplier = Config.forceMultiplier;
        const gravity = {
            x: Config.gravity.x * multiplier,
            y: Config.gravity.y * multiplier,
            z: Config.gravity.z * multiplier
        };

        this.world = new RAPIER.World(gravity);
        this.connectBackend();
    }

    step() {
        this.world.step(this.eventQueue);
        this.handleCollisionEvents();
        this.detectScoreZoneEntries();
    }

    //Register des objets

    registerObjects(objects) {
        for (const obj of objects) {
            if (!obj) continue;

            this.objects.push(obj);
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
        const scoreZones = Config.scoreZones?.instances;
        if (!Array.isArray(scoreZones) || scoreZones.length === 0) {
            return;
        }

        const ball = this.objects.find((obj) => obj?.objectType === 'ball' && obj?.rigidBody);
        if (!ball?.rigidBody || typeof ball.rigidBody.translation !== 'function') {
            return;
        }

        const position = ball.rigidBody.translation();
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
        const rampScoring = Config.ramps;
        const ball = this.objects.find((obj) => obj?.objectType === 'ball' && obj?.rigidBody);

        const position = ball.rigidBody.translation();
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
                        objectType: 'launching_ramp'
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
            if (obj?.objectType === 'ball') {}
            else this.sendImpact(obj, combo);
        }
    }

    handleCollisionEvents(comboS) {
        this.eventQueue.drainCollisionEvents((handle1, handle2, started) => {
            if (!started) return;

            const combo = comboS || null;
            const collidingObjects = this.findCollidingObjects(handle1, handle2);
            const collisionResponders = this.findCollisionResponders(handle1, handle2);

            for (const obj of collisionResponders) {
                if (typeof obj.handleCollision === 'function') {
                    obj.handleCollision({ handle1, handle2 });
                }
            }

            for (const obj of collisionResponders) {
                if (obj.objectType === 'bumper' && typeof obj.applyBumperForce === 'function') {
                    obj.applyBumperForce(handle1, handle2);
                }

                if (obj.objectType === 'launching_ramp' && typeof obj.applyLaunchingRampForce === 'function') {
                    obj.applyLaunchingRampForce(handle1, handle2);
                }

                if (obj.objectType === 'ramp') {
                    this.detectRampTraversal();
                    this.markRampBounce(collidingObjects);
                }
            }

            this.reportContactImpacts(collidingObjects);
        });
    }

    markRampBounce(collidingObjects) {
        const hitWall = collidingObjects.some((obj) => obj?.objectType === 'wall');
        if (hitWall) {
            this.rampTraversal.hasWallBounce = true;
        }
    }
}
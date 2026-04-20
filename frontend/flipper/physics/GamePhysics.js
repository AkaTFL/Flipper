import * as RAPIER from '@dimforge/rapier3d-compat';

export class GamePhysics {
    constructor(config) {
        this.config = config;
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
        const multiplier = this.config.forceMultiplier || 1.0;
        const gravity = {
            x: this.config.gravity.x * multiplier,
            y: this.config.gravity.y * multiplier,
            z: this.config.gravity.z * multiplier
        };

        this.world = new RAPIER.World(gravity);
        this.connectBackend();
    }

    step() {
        this.world.step(this.eventQueue);
        this.handleCollisionEvents();
        this.detectScoreZoneEntries();
        this.detectRampTraversal();
    }

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

    resolveBackendUrl() {
        const explicitUrl = this.config.backend?.url
            || globalThis.document?.body?.dataset?.backendUrl
            || globalThis.FLIPPER_BACKEND_URL;

        if (explicitUrl) {
            return explicitUrl;
        }

        const location = globalThis.window?.location || globalThis.location || null;
        const protocol = location?.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = this.config.backend?.host || location?.hostname || 'localhost';
        const port = this.config.backend?.port || location?.port || '8080';
        const path = this.config.backend?.path || '/ws';

        return `${protocol}//${host}:${port}${path}`;
    }

    connectBackend() {
        if (typeof globalThis.WebSocket !== 'function') {
            return;
        }

        const socketUrl = this.resolveBackendUrl();

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

    isBackendReady() {
        const openState = typeof globalThis.WebSocket?.OPEN === 'number'
            ? globalThis.WebSocket.OPEN
            : 1;

        return Boolean(this.backendSocket) && this.backendSocket.readyState === openState;
    }

    sendMessage(type, payload = {}) {
        if (!this.isBackendReady()) {
            return false;
        }

        this.backendSocket.send(JSON.stringify({ type, payload }));
        return true;
    }

    // Retour nécessaire : score mis à jour par rapport aux différents objets/multiplicateurs
    sendImpact(object, combo) {
        if (!object) {
            return false;
        }

        return this.sendMessage('impact', {
            objectId: object.objectId || null,
            objectType: object.objectType || object.constructor?.name?.toLowerCase() || 'object',
            combo: combo || null,
            timestamp: Date.now()
        });
    }

    detectScoreZoneEntries() {
        const scoreZones = this.config.scoreZones?.instances;
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
        const rampScoring = this.config.rampScoring;
        if (!rampScoring?.entryZone || !rampScoring?.exitZone) {
            return;
        }

        const ball = this.objects.find((obj) => obj?.objectType === 'ball' && obj?.rigidBody);
        if (!ball?.rigidBody || typeof ball.rigidBody.translation !== 'function') {
            return;
        }

        const position = ball.rigidBody.translation();
        const nextActiveRampZones = new Set();
        const now = Date.now();

        if (this.rampTraversal?.startedAt && (now - this.rampTraversal.startedAt) > (rampScoring.timeoutMs || 4000)) {
            this.rampTraversal = null;
        }

        const entryZone = rampScoring.entryZone;
        if (this.isPositionInsideZone(position, entryZone)) {
            nextActiveRampZones.add(entryZone.id);
            if (!this.activeRampZones.has(entryZone.id)) {
                this.rampTraversal = {
                    startedAt: now,
                    hasWallBounce: false
                };
            }
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
        const ball = collidingObjects.find((obj) => obj.objectType === 'ball');
        const reportableObjects = ball
            ? collidingObjects.filter((obj) => obj !== ball)
            : collidingObjects;

        for (const obj of reportableObjects) {
            if (!obj.objectId || obj.objectType === 'ball') {
                continue;
            }

            this.sendImpact(obj, combo);
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
                if (typeof obj.applyBumperForce === 'function') {
                    obj.applyBumperForce(handle1, handle2);
                }

                if (typeof obj.applyLaunchingRampForce === 'function') {
                    obj.applyLaunchingRampForce(handle1, handle2);
                }
            }

            this.reportContactImpacts(collidingObjects);
            this.markRampBounce(collidingObjects);
        });
    }

    markRampBounce(collidingObjects) {
        if (!this.rampTraversal) {
            return;
        }

        const hitWall = collidingObjects.some((obj) => obj?.objectType === 'wall');
        if (hitWall) {
            this.rampTraversal.hasWallBounce = true;
        }
    }
}

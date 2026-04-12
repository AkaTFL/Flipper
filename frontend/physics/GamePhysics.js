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
        this.lastBackendMessage = null;
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
    }

    registerObjects(objects) {
        for (const obj of objects) {
            if (!obj) continue;

            this.objects.push(obj);
            this.registerObjectColliders(obj);
        }
    }

    registerObjectColliders(obj) {
        const colliders = [];

        if (obj.collider) {
            colliders.push(obj.collider);
        }

        if (Array.isArray(obj.colliders)) {
            colliders.push(...obj.colliders.filter(Boolean));
        }

        for (const collider of colliders) {
            this.colliderOwners.set(collider.handle, obj);
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

    sendImpact(object) {
        if (!object) {
            return false;
        }

        return this.sendMessage('impact', {
            objectId: object.objectId || null,
            objectType: object.objectType || object.constructor?.name?.toLowerCase() || 'object',
            timestamp: Date.now()
        });
    }

    findCollidingObjects(handle1, handle2) {
        return [...new Set([
            this.colliderOwners.get(handle1),
            this.colliderOwners.get(handle2)
        ].filter(Boolean))];
    }

    reportContactImpacts(collidingObjects) {
        const ball = collidingObjects.find((obj) => obj.objectType === 'ball');
        const reportableObjects = ball
            ? collidingObjects.filter((obj) => obj !== ball)
            : collidingObjects;

        for (const obj of reportableObjects) {
            if (!obj.objectId || obj.objectType === 'ball') {
                continue;
            }

            this.sendImpact(obj);
        }
    }

    handleCollisionEvents() {
        this.eventQueue.drainCollisionEvents((handle1, handle2, started) => {
            if (!started) return;

            const collidingObjects = this.findCollidingObjects(handle1, handle2);

            for (const obj of collidingObjects) {
                if (typeof obj.handleCollision === 'function') {
                    obj.handleCollision({ handle1, handle2 });
                }
            }

            for (const obj of collidingObjects) {
                if (typeof obj.applyBumperForce === 'function') {
                    obj.applyBumperForce(handle1, handle2);
                }

                if (typeof obj.applyLaunchingRampForce === 'function') {
                    obj.applyLaunchingRampForce(handle1, handle2);
                }
            }

            this.reportContactImpacts(collidingObjects);
        });
    }
}

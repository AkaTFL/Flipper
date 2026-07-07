export class ObjectRegistry {
    constructor(physics) {
        this.physics = physics;
        this.objects = [];
        this.ball = null;
        this.launchingRamp = null;
        this.rampB = null;
        this.colliderOwners = new Map();
        this.colliderResponders = new Map();
    }

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
}
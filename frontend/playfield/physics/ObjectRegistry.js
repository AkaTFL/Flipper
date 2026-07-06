export class ObjectRegistry {
    constructor(physics) {
        this.physics = physics;
    }

    registerObjects(objects) {
        for (const obj of objects) {
            if (!obj) continue;

            this.physics.objects.push(obj);
            if (obj.objectType === 'ball') {
                this.physics.ball = obj;
            } else if (obj.objectType === 'launching-ramp') {
                this.physics.launchingRamp = obj;
            } else if (obj.objectType === 'ramp' && obj.objectId === 'ramp-b') {
                this.physics.rampB = obj;
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

            this.physics.colliderOwners.set(entry.collider.handle, entry.owner || obj);
            this.physics.colliderResponders.set(entry.collider.handle, entry.responder || entry.owner || obj);
        }
    }

    findCollidingObjects(handle1, handle2) {
        return [...new Set([
            this.physics.colliderOwners.get(handle1),
            this.physics.colliderOwners.get(handle2)
        ].filter(Boolean))];
    }

    findCollisionResponders(handle1, handle2) {
        return [...new Set([
            this.physics.colliderResponders.get(handle1),
            this.physics.colliderResponders.get(handle2),
            this.physics.colliderOwners.get(handle1),
            this.physics.colliderOwners.get(handle2)
        ].filter(Boolean))];
    }
}
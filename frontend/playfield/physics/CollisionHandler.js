export class CollisionHandler {
    constructor(physics) {
        this.physics = physics;
    }

    reportContactImpacts(collidingObjects, combo = null) {
        const now = performance.now();
        for (const obj of collidingObjects) {
            if (obj?.objectType === 'ball' || obj?.objectType === 'drain') {
                continue;
            }

            const lastImpact = this.physics.lastImpactByObject.get(obj) ?? -Infinity;
            if (now - lastImpact < 80) continue;
            this.physics.lastImpactByObject.set(obj, now);

            this.physics.sendImpact(obj, combo);
        }
    }

    handleCollisionEvents(comboS) {
        this.physics.eventQueue.drainCollisionEvents((handle1, handle2, started) => {
            if (!started) {
                return;
            }

            const combo = comboS || null;
            const collidingObjects = this.physics.registry.findCollidingObjects(handle1, handle2);
            const collisionResponders = this.physics.registry.findCollisionResponders(handle1, handle2);

            const hasBall = collidingObjects.some((obj) => obj?.objectType === 'ball');
            const hitDrain = collidingObjects.some(
                (obj) => obj?.objectType === 'drain' || obj?.objectId === 'drain' || obj?.name === 'drain'
            );

            if (hasBall && hitDrain) {
                this.physics.triggerBallLost();
                return;
            }

            for (const obj of collisionResponders) {
                if (typeof obj.handleCollision === 'function') {
                    obj.handleCollision({ handle1, handle2 });
                }
            }

            const hasBumperOrRepulse = collidingObjects.some(
                (obj) => obj?.objectType === 'bumper' || obj?.objectType === 'repulse'
            );
            if (hasBumperOrRepulse) {
                this.physics.sceneManager?.postProcessing?.triggerImpactPulse?.();
            }

            for (const obj of collisionResponders) {
                if (obj.objectType === 'bumper' && typeof obj.applyBumperForce === 'function') {
                    obj.applyBumperForce(handle1, handle2);
                }

                if (obj.objectType === 'repulse' && typeof obj.applyRepulseForce === 'function') {
                    obj.applyRepulseForce(handle1, handle2);
                }

                if (obj.objectType === 'ramp') {
                    this.physics.detectRampTraversal();
                }
            }

            this.reportContactImpacts(collidingObjects, combo);
        });
    }
}
import Config from '../physics/Config.js';

export class TriggerDetector {
    constructor(physics) {
        this.physics = physics;
        this.activeScoreZones = new Set();
        this.activeRampZones = new Set();
        this.rampTraversal = null;
    }

    detectScoreZoneEntries() {
        const scoreZones = Config.global.positioning.scoreZones?.instances;
        if (!Array.isArray(scoreZones) || scoreZones.length === 0) {
            return;
        }

        const position = this.physics.ball.rigidBody.translation();
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

            this.physics.sendImpact({
                objectId: zone.id,
                objectType: zone.type || 'target'
            });
        }

        this.activeScoreZones = nextActiveZones;
    }

    detectRampTraversal() {
        const rampScoring = Config.global.positioning.ramps;
        const position = this.physics.ball.rigidBody.translation();
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

                    this.physics.sendImpact({
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

    checkBallOutOfBounds() {
        if (!this.physics.ball?.rigidBody || this.physics._ballLostReported || this.physics.gameOver) return;

        const pos = this.physics.ball.rigidBody.translation();

        if (pos.z < Config.global.positioning.drainZThreshold && pos.y < Config.global.positioning.drainYThreshold) {
            console.warn('[GamePhysics] checkBallOutOfBounds : balle hors limites (fallback), drain collider non déclenché ?');
            this.physics.triggerBallLost();
        }
    }
}
import Config from '../../physics/Config.js';

export class ScoreTracker {
    constructor(engine) {
        this.engine = engine;
        this.activeScoreZones = new Set();
        this.activeRampZones = new Set();
        this.rampTraversal = null;
    }

    detectScoreZoneEntries() {
        const engine = this.engine;
        const scoreZones = Config.global.positioning.scoreZones?.instances;
        if (!Array.isArray(scoreZones) || scoreZones.length === 0) {
            return;
        }

        const position = engine.ball.rigidBody.translation();
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

            engine.backend.sendImpact({
                objectId: zone.id,
                objectType: zone.type || 'target'
            });
        }

        this.activeScoreZones = nextActiveZones;
    }

    detectRampTraversal() {
        const engine = this.engine;
        const rampScoring = Config.global.positioning.ramps;
        const position = engine.ball.rigidBody.translation();
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

                    engine.backend.sendImpact({
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

    reset() {
        this.activeScoreZones = new Set();
        this.activeRampZones = new Set();
        this.rampTraversal = null;
    }

    // Niveau

    applyLevelConfig() {
        const engine = this.engine;
        const levelConfig = Config[Config.currentLevel];

        if (!levelConfig) {
            return;
        }

        const multiplier = Config.forceMultiplier;

        engine.world.gravity = {
            x: levelConfig.gravity.x * multiplier,
            y: levelConfig.gravity.y * multiplier,
            z: levelConfig.gravity.z * multiplier
        };

        engine.audioManager.stopMusic?.();
        engine.audioManager.playMusic(levelConfig.soundtrack, 0.2);

        console.info(`Niveau actif : ${Config.currentLevel}`);
    }
}
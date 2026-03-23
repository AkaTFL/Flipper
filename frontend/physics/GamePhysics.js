import * as RAPIER from "@dimforge/rapier3d-compat"

export class GamePhysics {
    constructor(config) {
        this.config = config
        this.world = null
        this.bumpers = []
        this.launchingRamp = null
    }

    async init() {
        await RAPIER.init({})
        
        this.eventQueue = new RAPIER.EventQueue(true)
        const multiplier = this.config.forceMultiplier || 1.0;
        const gravity = {
            x: this.config.gravity.x * multiplier,
            y: this.config.gravity.y * multiplier,
            z: this.config.gravity.z * multiplier
        };

        this.world = new RAPIER.World(gravity)
    }

    step() {
        this.world.step(this.eventQueue)
        this.handleCollisionEvents()
    }


    // GESTION DES BUMPERS
    registerBumper(bumper) {
        this.bumpers.push(bumper)
    }

    registerLaunchingRamp(launchingRamp) {
        this.launchingRamp = launchingRamp;
    }

    handleCollisionEvents() {
        this.eventQueue.drainCollisionEvents((handle1, handle2, started) => {
            if (!started) return

            for (let bumper of this.bumpers) {
                if (bumper.collider.handle === handle1 || bumper.collider.handle === handle2) {
                    bumper.applyBumperForce(handle1, handle2)
                }
            }

            if (this.launchingRamp && (this.launchingRamp.hasCollider(handle1) || this.launchingRamp.hasCollider(handle2))) {
                this.launchingRamp.applyLaunchingRampForce(handle1, handle2)
            }
        })
    }
}
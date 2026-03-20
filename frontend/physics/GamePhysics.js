import * as RAPIER from "@dimforge/rapier3d-compat"
import Config from './Config.js';

export class GamePhysics {
    constructor(config) {
        this.config = config
        this.world = null
        this.bumpers = []
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
        this.world.step()
        this.handleBumperCollisions()
    }


    // GESTION DES BUMPERS
    registerBumper(bumper) {
        this.bumpers.push(bumper)
    }

    handleBumperCollisions() {
        this.eventQueue.drainCollisionEvents((handle1, handle2, started) => {
            if (!started) return

            for (let bumper of this.bumpers) {
                if (bumper.collider.handle === handle1 || bumper.collider.handle === handle2) {
                    this.applyBumperForce(bumper, handle1, handle2)
                }
            }
        })
    }

    applyBumperForce(bumper, handle1, handle2) {
        const otherHandle = bumper.collider.handle === handle1 ? handle2 : handle1
        const otherCollider = this.world.colliders.get(otherHandle)
        if (!otherCollider) return

        const otherBody = otherCollider.parent()
        if (!otherBody) return

        const bumperPos = bumper.rigidBody.translation()
        const ballPos = otherBody.translation()

        const dirX = ballPos.x - bumperPos.x
        const dirY = ballPos.y - bumperPos.y
        const dirZ = ballPos.z - bumperPos.z

        // Normaliser
        const length = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ)
        if (length === 0) return

        const X = dirX / length
        const Y = dirY / length
        const Z = dirZ / length

        // Appliquer force
        const power = Config.bumper.power * Config.forceMultiplier
        otherBody.applyImpulse(
            { x: X * power, y: Y * power, z: Z * power },
            true
        )
    }
}
import * as RAPIER from "@dimforge/rapier3d-compat"

require('dotenv').config()

export class GamePhysics {
    constructor(config) {
        this.config = config
        this.world = null
        this.bumpers = []
        this.launchingRamp = null
        this.backendSocket = null
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
        this.connectBackend()
    }

    step() {
        this.world.step(this.eventQueue)
        this.handleCollisionEvents()
    }


    //REGISTRATION
    registerBumper(bumper) {
        this.bumpers.push(bumper)
    }

    registerLaunchingRamp(launchingRamp) {
        this.launchingRamp = launchingRamp;
    }


    //BACKEND
    connectBackend() {
        try {
            this.backendSocket = new WebSocket(process.env.BACKEND_ADDRESS + ':' + process.env.BACKEND_PORT)
        } catch (error) {
            this.backendSocket = null
            console.warn('Backend non connecté:', error)
        }
    }

    sendImpact(objectId) {
        this.backendSocket.send(JSON.stringify({
            type: 'impact',
            payload: { objectId }
        }))
    }

    //COLLISION HANDLING
    handleCollisionEvents() {
        this.eventQueue.drainCollisionEvents((handle1, handle2, started) => {
            if (!started) return

            for (let bumper of this.bumpers) {
                if (bumper.collider.handle === handle1 || bumper.collider.handle === handle2) {
                    bumper.applyBumperForce(handle1, handle2)
                    this.sendImpact(String(bumper.collider.objectId))
                }
            }
        })
    }
}
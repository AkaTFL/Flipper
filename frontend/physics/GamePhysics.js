import * as RAPIER from "@dimforge/rapier3d-compat"

export class GamePhysics {
    constructor(config) {
        this.config = config
        this.world = null
        this.bumpers = []
        this.launchingRamp = null
        this.backendSocket = null
        this.objects = []
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
    registerObjects(objects) {
        for (const obj of objects) {
            this.objects.push(obj);
        }
    }


    //BACKEND
    connectBackend() {
        try {
            this.backendSocket = new WebSocket("aa" + ':' + "bb") // Remplacez par l'adresse de votre backend
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
            if (!started) return;

            // Gestion générique pour tous les objets
            for (let obj of this.objects) {
                if (!obj.collider) continue;

                if (obj.collider.handle === handle1 || obj.collider.handle === handle2) {
                    if (typeof obj.handleCollision === 'function') {
                        obj.handleCollision();

                        if (bumper.collider.handle === handle1 || bumper.collider.handle === handle2) {
                            if (bumper.collider.handle === handle1 || bumper.collider.handle === handle2) {
                                bumper.applyBumperForce(handle1, handle2);
                                this.sendImpact(String(bumper.collider.objectId));
                            }
                        }
                    }
                }

            }
        })
    }
}
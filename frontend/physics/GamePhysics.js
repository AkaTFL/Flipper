import * as RAPIER from "@dimforge/rapier3d-compat"

export default class GamePhysics {
    constructor(config) {
        this.config = config
        this.world = null
    }

    async init() {
        await RAPIER.init()

        this.world = new RAPIER.World(this.config.gravity)
    }

    step() {
        this.world.step()
    }
}

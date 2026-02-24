import * as RAPIER from "@dimforge/rapier3d-compat"

export class GamePhysics {
    constructor(config) {
        this.config = config
        this.world = null
    }

    async init() {
        await RAPIER.init({})

        // Appliquer le multiplicateur de force à la gravité
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
    }
}

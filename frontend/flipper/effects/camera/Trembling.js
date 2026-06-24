export class Trembling {

    /**
     * @param {THREE.Camera} camera
     */
    constructor(camera) {
        this.camera = camera;

        this.baseX = camera.position.x;
        this.baseY = camera.position.y;
        this.baseZ = camera.position.z;

        this.force = 0;
        this.time  = 0;
    }

    // ─── API publique ─────────────────────────────────────────────────────────

    /**
     * Ajoute de la force (prend le max pour ne pas cumuler des impacts simultanés).
     * @param {number} force
     */
    add(force) {
        this.force = Math.max(this.force, force);

        // Capture la position au moment de l'impact pour que la base
        // suive les déplacements de caméra entre deux tremblements.
        if (this.force <= 0.0001) {
            this.baseX = this.camera.position.x;
            this.baseY = this.camera.position.y;
            this.baseZ = this.camera.position.z;
        }
    }

    // ─── Update ───────────────────────────────────────────────────────────────

    /**
     * @param {number} delta  Secondes écoulées depuis la dernière frame
     */
    update(delta) {
        if (this.force <= 0.0001) {
            // Recentre la caméra sans à-coup
            this.camera.position.x = this.baseX;
            this.camera.position.y = this.baseY;
            this.camera.position.z = this.baseZ;
            return;
        }

        this.time += delta * 60;

        const sinFast = Math.sin(this.time * 20) * this.force;
        const sinSlow = Math.sin(this.time * 13) * this.force * 0.5; // axe Y plus doux

        this.camera.position.x = this.baseX + sinFast;
        this.camera.position.y = this.baseY + sinSlow;
        this.camera.position.z = this.baseZ + sinFast;

        // Amortissement exponentiel
        this.force *= 0.9;

        // Évite une valeur qui ne converge jamais vers 0
        if (this.force < 0.0001) {
            this.force = 0;
        }
    }
}
import * as THREE from 'three';

// ─── Fabrique d'une instance réutilisable ─────────────────────────────────────
function createInstance(scene) {
    const mesh = new THREE.Mesh(
        new THREE.RingGeometry(10, 15, 64),
        new THREE.MeshBasicMaterial({
            color:       new THREE.Color(0.5, 1.0, 0.7),
            transparent: true,
            opacity:     0,
            side:        THREE.DoubleSide,
            depthWrite:  false,
        })
    );

    mesh.rotation.x = -Math.PI / 2;
    mesh.visible    = false;
    scene.add(mesh);

    return {
        mesh,
        scale:          0,
        expansionSpeed: 0,
        fadeSpeed:      0,
    };
}

// ─── Pool ─────────────────────────────────────────────────────────────────────
export class Shockwave {

    /**
     * @param {THREE.Scene} scene
     * @param {number}      poolSize  Nombre d'instances pré-allouées
     */
    constructor(scene, poolSize = 8) {
        this.scene   = scene;
        this._pool   = [];   // instances disponibles
        this._active = [];   // instances en cours d'animation

        for (let i = 0; i < poolSize; i++) {
            this._pool.push(createInstance(scene));
        }
    }

    // ─── Spawn ────────────────────────────────────────────────────────────────

    /**
     * Récupère une instance libre du pool et la configure.
     * @param {THREE.Vector3} position
     * @param {number}        force
     */
    spawn(position, force = 10) {
        const f    = THREE.MathUtils.clamp(force, 1, 50);
        const item = this._pool.length > 0
            ? this._pool.pop()
            : createInstance(this.scene); // débordement de pool

        item.scale          = 0.2 + f * 0.03;
        item.expansionSpeed = 0.02 + f * 0.003;
        item.fadeSpeed      = 0.003 + f * 0.0005;

        item.mesh.position.copy(position);
        item.mesh.scale.setScalar(item.scale);
        item.mesh.material.opacity = 0.25;
        item.mesh.visible = true;

        this._active.push(item);
    }

    // ─── Update ───────────────────────────────────────────────────────────────

    /**
     * Appelé par la boucle principale — aucun requestAnimationFrame interne.
     * @param {number} delta  Secondes écoulées depuis la dernière frame
     */
    update(delta) {
        const dt = delta * 60; // normalise à 60 FPS

        for (let i = this._active.length - 1; i >= 0; i--) {
            const item = this._active[i];

            item.scale += item.expansionSpeed * dt;
            item.mesh.scale.setScalar(item.scale);
            item.mesh.material.opacity -= item.fadeSpeed * dt;

            if (item.mesh.material.opacity <= 0) {
                item.mesh.visible = false;
                this._active.splice(i, 1); // itération à l'envers → pas de décalage
                this._pool.push(item);     // retour au pool
            }
        }
    }

    // ─── Cleanup ──────────────────────────────────────────────────────────────

    dispose() {
        for (const item of [...this._pool, ...this._active]) {
            this.scene.remove(item.mesh);
            item.mesh.geometry.dispose();
            item.mesh.material.dispose();
        }
        this._pool   = [];
        this._active = [];
    }
}
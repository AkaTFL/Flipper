import * as THREE from 'three';

function createInstance(scene) { const mesh = new THREE.Mesh( new
THREE.RingGeometry(12, 13.5, 64), new THREE.MeshBasicMaterial({ color:
new THREE.Color(0.5, 1.0, 0.7), transparent: true, opacity: 0, side:
THREE.DoubleSide, depthWrite: false, }) );

    mesh.rotation.x = -Math.PI / 2;
    mesh.visible = false;
    scene.add(mesh);

    return {
        mesh,
        scale: 0,
        expansionSpeed: 0,
        fadeSpeed: 0,
    };

}

export class Shockwave {

    constructor(scene, poolSize = 8) {
        this.scene = scene;
        this._pool = [];
        this._active = [];

        this._lastSpawn = new THREE.Vector3();
        this._lastTime = 0;

        for (let i = 0; i < poolSize; i++) {
            this._pool.push(createInstance(scene));
        }
    }

    spawn(position, force = 10) {

        if (force < 5) return;

        const now = performance.now();

        if (
            now - this._lastTime < 80 &&
            position.distanceToSquared(this._lastSpawn) < 1
        ) return;

        this._lastTime = now;
        this._lastSpawn.copy(position);

        const f = THREE.MathUtils.clamp(force, 1, 50);
        const item = this._pool.length ? this._pool.pop() : createInstance(this.scene);

        item.scale = 0.3 + f * 0.015;
        item.expansionSpeed = 0.012 + f * 0.0015;
        item.fadeSpeed = 0.007 + f * 0.0003;

        item.mesh.position.copy(position);
        item.mesh.scale.setScalar(item.scale);
        item.mesh.material.opacity = 0.12;
        item.mesh.visible = true;

        this._active.push(item);
    }

    update(delta) {
        const dt = delta * 60;

        for (let i = this._active.length - 1; i >= 0; i--) {
            const item = this._active[i];

            item.scale += item.expansionSpeed * dt;
            item.mesh.scale.setScalar(item.scale);
            item.mesh.material.opacity -= item.fadeSpeed * dt;

            if (item.mesh.material.opacity <= 0) {
                item.mesh.visible = false;
                this._active.splice(i, 1);
                this._pool.push(item);
            }
        }
    }

    dispose() {
        for (const item of [...this._pool, ...this._active]) {
            this.scene.remove(item.mesh);
            item.mesh.geometry.dispose();
            item.mesh.material.dispose();
        }

        this._pool = [];
        this._active = [];
    }

}
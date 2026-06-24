import * as THREE from 'three';

// ─── Shaders (partagés entre toutes les instances) ────────────────────────────
const VERTEX_SHADER = /* glsl */`
    attribute float size;
    attribute vec3  color;
    varying   vec3  vColor;

    void main() {
        vColor = color;

        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position  = projectionMatrix * mvPosition;
    }
`;

const FRAGMENT_SHADER = /* glsl */`
    varying vec3 vColor;

    void main() {
        vec2  uv   = gl_PointCoord - vec2(0.5);
        float dist = length(uv);
        float alpha = smoothstep(0.5, 0.0, dist);

        gl_FragColor = vec4(vColor, alpha);
    }
`;

const COUNT = 20; // particules par effet

// ─── Fabrique d'une instance réutilisable ─────────────────────────────────────
function createInstance(scene) {
    const positions  = new Float32Array(COUNT * 3);
    const sizes      = new Float32Array(COUNT);
    const colors     = new Float32Array(COUNT * 3);

    for (let i = 0; i < COUNT; i++) {
        sizes[i]          = 6 + Math.random() * 10;
        colors[i * 3]     = 0.7; // R
        colors[i * 3 + 1] = 0.9; // G
        colors[i * 3 + 2] = 2.0; // B  (HDR bleu / violet)
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

    const material = new THREE.ShaderMaterial({
        transparent:    true,
        depthWrite:     false,
        blending:       THREE.AdditiveBlending,
        vertexShader:   VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
    });

    const points = new THREE.Points(geometry, material);
    points.visible = false;
    scene.add(points);

    // Vélocités allouées une seule fois, réinitialisées à chaque spawn
    const velocities = Array.from(
        { length: COUNT },
        () => new THREE.Vector3()
    );

    return { points, geometry, material, velocities, life: 0 };
}

// ─── Pool ─────────────────────────────────────────────────────────────────────
export class Sparks {

    /**
     * @param {THREE.Scene} scene
     * @param {number}      poolSize  Nombre d'instances pré-allouées
     */
    constructor(scene, poolSize = 5) {
        this.scene   = scene;
        this._pool   = [];
        this._active = [];

        for (let i = 0; i < poolSize; i++) {
            this._pool.push(createInstance(scene));
        }
    }

    // ─── Spawn ────────────────────────────────────────────────────────────────

    /**
     * @param {THREE.Vector3} position
     */
    spawn(position) {
        const item = this._pool.length > 0
            ? this._pool.pop()
            : createInstance(this.scene);

        const pos = item.geometry.attributes.position.array;

        for (let i = 0; i < COUNT; i++) {
            pos[i * 3]     = position.x;
            pos[i * 3 + 1] = position.y;
            pos[i * 3 + 2] = position.z;

            item.velocities[i].set(
                (Math.random() - 0.5) * 0.4,
                Math.random() * 0.3,
                (Math.random() - 0.5) * 0.4
            );
        }

        item.geometry.attributes.position.needsUpdate = true;

        item.life             = 1.0;
        item.material.opacity = 1.0;
        item.points.visible   = true;

        this._active.push(item);
    }

    // ─── Update ───────────────────────────────────────────────────────────────

    /**
     * Appelé par la boucle principale — aucun requestAnimationFrame interne.
     * @param {number} delta  Secondes écoulées depuis la dernière frame
     */
    update(delta) {
        const dt      = delta * 60;           // normalise à 60 FPS
        const fade    = 0.04  * dt;
        const gravity = 0.002 * dt;

        for (let i = this._active.length - 1; i >= 0; i--) {
            const item = this._active[i];
            item.life -= fade;

            const pos = item.geometry.attributes.position.array;

            for (let j = 0; j < COUNT; j++) {
                pos[j * 3]     += item.velocities[j].x * dt;
                pos[j * 3 + 1] += item.velocities[j].y * dt;
                pos[j * 3 + 2] += item.velocities[j].z * dt;
                item.velocities[j].y -= gravity;
            }

            item.geometry.attributes.position.needsUpdate = true;
            item.material.opacity = Math.max(0, item.life);

            if (item.life <= 0) {
                item.points.visible = false;
                this._active.splice(i, 1); // itération à l'envers → pas de décalage
                this._pool.push(item);     // retour au pool
            }
        }
    }

    // ─── Cleanup ──────────────────────────────────────────────────────────────

    dispose() {
        for (const item of [...this._pool, ...this._active]) {
            this.scene.remove(item.points);
            item.geometry.dispose();
            item.material.dispose();
        }
        this._pool   = [];
        this._active = [];
    }
}
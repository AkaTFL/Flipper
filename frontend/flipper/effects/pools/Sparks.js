import * as THREE from 'three';

export class Sparks {

    constructor(scene, color, size = 5) {
        this.scene = scene;
        this.pool = Array.from({ length: size }, () => create(scene, color));
        this.color = color;
        this.active = [];
    }

    spawn(p) {

        const s = this.pool.pop() || create(this.scene, this.color);
        const pos = s.geometry.attributes.position.array;

        for (let i = 0; i < COUNT; i++) {

            pos.set([p.x, p.y, p.z], i * 3);

            s.velocities[i].set(
                (Math.random() - .5) * .4,
                Math.random() * .3,
                (Math.random() - .5) * .4
            );
        }

        s.geometry.attributes.position.needsUpdate = true;
        s.life = 1;
        s.points.visible = true;

        this.active.push(s);
    }

    update(delta) {

        const dt = delta * 60;

        for (let i = this.active.length - 1; i >= 0; i--) {

            const s = this.active[i];
            const pos = s.geometry.attributes.position.array;

            s.life -= .04 * dt;

            for (let j = 0; j < COUNT; j++) {

                pos[j * 3] += s.velocities[j].x * dt;
                pos[j * 3 + 1] += s.velocities[j].y * dt;
                pos[j * 3 + 2] += s.velocities[j].z * dt;

                s.velocities[j].y -= .002 * dt;
            }

            s.geometry.attributes.position.needsUpdate = true;
            s.points.material.opacity = Math.max(0, s.life);

            if (s.life <= 0) {
                s.points.visible = false;
                this.active.splice(i, 1);
                this.pool.push(s);
            }
        }
    }

    dispose() {
        [...this.pool, ...this.active].forEach(s => {
            this.scene.remove(s.points);
            s.geometry.dispose();
        });
    }
}


const COUNT = 20;

const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;

        void main() {
            vColor = color;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (300.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
        }
    `,
    fragmentShader: `
        varying vec3 vColor;

        void main() {
            float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5));
            gl_FragColor = vec4(vColor, a);
        }
    `
});

function create(scene, color) {

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(Float32Array.from({ length: COUNT }, () => 6 + Math.random() * 10), 1));

    const c = new THREE.Color(color);
    for (let i = 0; i < COUNT; i++) c.set([c.r, c.g, c.b], i * 3);
    geometry.setAttribute("color", new THREE.BufferAttribute(c, 3));

    const points = new THREE.Points(geometry, material);
    points.visible = false;
    scene.add(points);

    return {
        points,
        geometry,
        velocities: Array.from({ length: COUNT }, () => new THREE.Vector3()),
        life: 0
    };
}

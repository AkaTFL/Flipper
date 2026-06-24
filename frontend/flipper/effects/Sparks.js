import * as THREE from 'three';

export function Sparks(scene, position) {

    const count = 20;

    const geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const velocities = [];

    for (let i = 0; i < count; i++) {

        positions[i * 3 + 0] = position.x;
        positions[i * 3 + 1] = position.y;
        positions[i * 3 + 2] = position.z;

        velocities.push(
            new THREE.Vector3(
                (Math.random() - 0.5) * 0.4,
                Math.random() * 0.3,
                (Math.random() - 0.5) * 0.4
            )
        );

        sizes[i] = 6 + Math.random() * 10;

        // Bleu / violet magique
        colors[i * 3 + 0] = 0.7;
        colors[i * 3 + 1] = 0.9;
        colors[i * 3 + 2] = 2.0;
    }

    geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(positions, 3)
    );

    geometry.setAttribute(
        'size',
        new THREE.BufferAttribute(sizes, 1)
    );

    geometry.setAttribute(
        'color',
        new THREE.BufferAttribute(colors, 3)
    );

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

                vec4 mvPosition =
                    modelViewMatrix *
                    vec4(position, 1.0);

                gl_PointSize =
                    size *
                    (300.0 / -mvPosition.z);

                gl_Position =
                    projectionMatrix *
                    mvPosition;
            }
        `,

        fragmentShader: `
            varying vec3 vColor;

            void main() {

                vec2 uv =
                    gl_PointCoord -
                    vec2(0.5);

                float dist =
                    length(uv);

                float alpha =
                    smoothstep(
                        0.5,
                        0.0,
                        dist
                    );

                gl_FragColor =
                    vec4(
                        vColor,
                        alpha
                    );
            }
        `
    });

    const particles = new THREE.Points(
        geometry,
        material
    );

    scene.add(particles);

    let life = 1;

    function animate() {

        life -= 0.04;

        const pos =
            geometry.attributes.position.array;

        for (let i = 0; i < count; i++) {

            pos[i * 3 + 0] += velocities[i].x;
            pos[i * 3 + 1] += velocities[i].y;
            pos[i * 3 + 2] += velocities[i].z;

            velocities[i].y -= 0.002;
        }

        geometry.attributes.position.needsUpdate = true;

        material.opacity = life;

        if (life <= 0) {

            scene.remove(particles);

            geometry.dispose();
            material.dispose();

            return;
        }

        requestAnimationFrame(animate);
    }

    animate();
}
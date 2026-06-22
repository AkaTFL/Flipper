import * as THREE from 'three';

export function Shockwave(impactForce, scene, position) {
    // Évite des valeurs trop faibles ou trop grandes
    const force = THREE.MathUtils.clamp(impactForce, 1, 50);

    const wave = new THREE.Mesh(
        new THREE.RingGeometry(10, 15, 64),
        new THREE.MeshBasicMaterial({
            color: new THREE.Color(0.5, 1.0, 0.7), // vert léger
            transparent: true,
            opacity: 0.25,
            side: THREE.DoubleSide,
            depthWrite: false
        })
    );

    wave.rotation.x = -Math.PI / 2;
    wave.position.copy(position);

    // Paramètres dérivés de la force
    let scale = 0.2 + force * 0.03;
    const expansionSpeed = 0.02 + force * 0.003;
    const fadeSpeed = 0.003 + force * 0.0005;

    wave.scale.setScalar(scale);
    scene.add(wave);

    function animate() {
        scale += expansionSpeed;

        wave.scale.setScalar(scale);
        wave.material.opacity -= fadeSpeed;

        if (wave.material.opacity <= 0) {
            scene.remove(wave);
            wave.geometry.dispose();
            wave.material.dispose();
            return;
        }

        requestAnimationFrame(animate);
    }

    animate();
}
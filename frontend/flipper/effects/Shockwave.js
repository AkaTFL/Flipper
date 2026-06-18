import * as THREE from 'three';

export function Shockwave(scale, speed, speedDisappearence, scene, position) {
    const wave = new THREE.Mesh(
        new THREE.RingGeometry(10, 15, 32),
        new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        })
    );

    wave.rotation.x = -Math.PI / 2;
    wave.position.copy(position);

    scene.add(wave);

    const interval = setInterval(() => {
        scale += speed;

        wave.scale.set(scale, scale, scale);
        wave.material.opacity -= speedDisappearence;

        if (wave.material.opacity <= 0) {
            clearInterval(interval);
            scene.remove(wave);
            wave.geometry.dispose();
            wave.material.dispose();
        }
    }, 16);
}
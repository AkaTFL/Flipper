// src/debug/RapierDebugRenderer.js
import * as THREE from 'three';

export class RapierDebugRenderer {
    constructor(scene, world) {
        this.world = world;
        this.mesh = new THREE.LineSegments(
            new THREE.BufferGeometry(),
            new THREE.LineBasicMaterial({ color: 0x00ff00, vertexColors: true })
        );
        this.mesh.frustumCulled = false;
        scene.add(this.mesh);
    }

    update() {
        const { vertices, colors } = this.world.debugRender();

        this.mesh.geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(vertices, 3)
        );
        this.mesh.geometry.setAttribute(
            'color',
            new THREE.BufferAttribute(colors, 4)
        );
    }

    setVisible(visible) {
        this.mesh.visible = visible;
    }

    dispose() {
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}
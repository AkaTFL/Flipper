import * as THREE from 'three';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';

export function createOutline(
    scene,
    camera,
    renderer,
    {
        edgeStrength     = 8,
        edgeGlow         = 1.5,
        edgeThickness    = 3,
        visibleEdgeColor = 0x00ffff,
        hiddenEdgeColor  = 0x003344,
        pulsSpeed        = 1.0,
    } = {}
) {
    const size = new THREE.Vector2();
    renderer.getSize(size);

    const pass = new OutlinePass(size, scene, camera);

    pass.edgeStrength = edgeStrength;
    pass.edgeGlow     = edgeGlow;
    pass.edgeThickness = edgeThickness;
    pass.visibleEdgeColor.set(visibleEdgeColor);
    pass.hiddenEdgeColor.set(hiddenEdgeColor);
    pass.selectedObjects = [];

    // Pulsation de l'aura
    const clock = new THREE.Clock();
    const baseStrength = edgeStrength;
    const baseGlow     = edgeGlow;

    pass.onBeforeRender = () => {
        const t = clock.getElapsedTime() * pulsSpeed;
        const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
        pass.edgeStrength = baseStrength + pulse * 4;
        pass.edgeGlow     = baseGlow     + pulse * 1.5;
    };

    return pass;
}
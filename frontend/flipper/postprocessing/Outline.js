import * as THREE from 'three';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';

export function createOutline(
    scene,
    camera,
    renderer,
    {
        edgeStrength     = 3,
        edgeGlow         = 0,
        edgeThickness    = 1,
        visibleEdgeColor = 0xffffff,
        hiddenEdgeColor  = 0x22090a,
    } = {}
) {
    const size = new THREE.Vector2();
    renderer.getSize(size);

    const pass = new OutlinePass(size, scene, camera);

    pass.edgeStrength = edgeStrength;
    pass.edgeGlow = edgeGlow;
    pass.edgeThickness = edgeThickness;
    pass.visibleEdgeColor.set(visibleEdgeColor);
    pass.hiddenEdgeColor.set(hiddenEdgeColor);
    pass.selectedObjects = [];

    return pass;
}
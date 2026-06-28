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
        pulsSpeed        = false,
    } = {}
) {
    const size = new THREE.Vector2();
    renderer.getSize(size);

    const pass = new OutlinePass(size, scene, camera);

    pass.edgeStrength  = edgeStrength;
    pass.edgeGlow      = edgeGlow;
    pass.edgeThickness = edgeThickness;
    pass.visibleEdgeColor.set(visibleEdgeColor);
    pass.hiddenEdgeColor.set(hiddenEdgeColor);
    pass.selectedObjects = [];

    if (pulsSpeed) {
        const clock = new THREE.Clock();
        const baseStrength = edgeStrength;
        const baseGlow     = edgeGlow;

        pass.onBeforeRender = () => {
            const t = clock.getElapsedTime() * pulsSpeed;
            const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
            pass.edgeStrength = baseStrength + pulse * 4;
            pass.edgeGlow     = baseGlow     + pulse * 1.5;
        };
    }

    // Décroissance basée sur delta — aucun setTimeout, aucune accumulation
    const BASE     = { strength: edgeStrength, glow: edgeGlow, thickness: edgeThickness };
    const PEAK = { strength: 50, glow: 10, thickness: 12 };
    const DURATION = 1; // secondes
    let _impactTimer = 0;

    // Déclenche un flash : reset le timer (idempotent, safe à appeler à haute fréquence)
    pass.triggerImpactPulse = () => {
        _impactTimer = DURATION;
    };

    pass.updateImpactPulse = (delta) => {
        if (_impactTimer <= 0) return;
        _impactTimer = Math.max(0, _impactTimer - delta);
        const t = _impactTimer / DURATION;
        // Courbe ease-out pour que le pic soit bien visible au début
        const eased = t * t;
        pass.edgeStrength  = BASE.strength  + eased * (PEAK.strength  - BASE.strength);
        pass.edgeGlow      = BASE.glow      + eased * (PEAK.glow      - BASE.glow);
        pass.edgeThickness = BASE.thickness + eased * (PEAK.thickness - BASE.thickness);
    };

    return pass;
}
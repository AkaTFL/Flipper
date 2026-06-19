import { SSAOPass }
from 'three/examples/jsm/postprocessing/SSAOPass.js';

export function createSSAO(
    scene,
    camera,
    {
        kernelRadius = 16,
        minDistance = 0.005,
        maxDistance = 0.1
    } = {}
) {
    const pass = new SSAOPass(
        scene,
        camera,
        window.innerWidth,
        window.innerHeight
    );

    window.addEventListener('resize', () => {
        pass.setSize(
            window.innerWidth,
            window.innerHeight
        );
    });

    pass.kernelRadius = kernelRadius;
    pass.minDistance = minDistance;
    pass.maxDistance = maxDistance;

    return pass;
}
import { Scene } from '../core/Scene.js';

export function TremblingFromImpact(camera, impactForce, duration = 0.3) {
    const x = camera.position.x;
    const z = camera.position.z;

    let t = 0;

    const interval = setInterval(() => {
        t += 1;

        const offset = Math.sin(t * 20) * impactForce;

        camera.position.x = x + offset;
        camera.position.z = z + offset;
    }, 16);

    setTimeout(() => {
        clearInterval(interval);
        camera.position.x = x;
        camera.position.z = z;
    }, duration);
}

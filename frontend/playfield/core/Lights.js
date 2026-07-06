import * as THREE from 'three';

export function createLights(scene) {

    const introLights = [];
    const lightHelpers = [];
    const spotLights = [];

    const ambientLight =
        new THREE.AmbientLight(
            0x111122,
            0
        );

    scene.add(ambientLight);

    introLights.push({
        light: ambientLight,
        targetIntensity: 0.15
    });

    const createSpotLight = (
        x,
        y,
        z,
        targetX,
        targetZ,
        intensity,
        angle,
        penumbra,
        shadowSize = 1024,
        castsShadow = true
    ) => {

        const light =
            new THREE.SpotLight(
                0xffffff,
                0
            );

        light.position.set(x, y, z);

        light.castShadow = castsShadow;
        light.angle = angle;
        light.penumbra = penumbra;
        light.decay = 2;
        light.distance = 3000;

        light.shadow.mapSize.width =
            shadowSize;

        light.shadow.mapSize.height =
            shadowSize;

        light.shadow.camera.near = 10;
        light.shadow.camera.far = 3000;
        light.shadow.bias = -0.0001;
        light.shadow.normalBias = 0.02;

        light.target.position.set(
            targetX,
            0,
            targetZ
        );

        scene.add(light.target);
        scene.add(light);

        const helper =
            new THREE.SpotLightHelper(light);

        helper.visible = false;

        scene.add(helper);

        lightHelpers.push(helper);
        spotLights.push(light);

        introLights.push({
            light,
            targetIntensity: intensity
        });

        return light;
    };

    const pointLight1 =
        new THREE.AmbientLight(
            0xffffff,
            1.5
        );

    pointLight1.position.set(
        0,
        200,
        0
    );

    scene.add(pointLight1);

    createSpotLight(
        -330,
        630,
        510,
        0,
        0,
        1.0,
        0.99,
        1,
        1024,
        true
    );

    createSpotLight(
        330,
        630,
        510,
        0,
        0,
        1.0,
        0.99,
        1,
        1024,
        false
    );

    createSpotLight(
        -330,
        630,
        -770,
        0,
        0,
        1.0,
        0.99,
        1,
        1024,
        false
    );

    createSpotLight(
        330,
        630,
        -770,
        0,
        0,
        1.0,
        0.99,
        1,
        1024,
        true
    );

    return {
        introLights,
        lightHelpers,
        spotLights
    };
}

export function startLightIntro(
    introLights,
    playSound
) {

    setTimeout(() => {

        if (typeof playSound === 'function') {
            playSound();
        }

        introLights.forEach(
            (entry, index) => {

            setTimeout(() => {

                const target =
                    entry.targetIntensity;

                const duration = 600;
                const steps = 30;

                const increment =
                    target / steps;

                let current = 0;

                const fade =
                    setInterval(() => {

                    current += increment;

                    entry.light.intensity =
                        Math.min(
                            current,
                            target
                        );

                    if (current >= target) {
                        clearInterval(fade);
                    }

                }, duration / steps);

            }, index * 500);
        });

    }, 3000);
}

// Effet "coupure caméra" : chaque lumière est coupée brutalement (pas de
// fade), l'une après l'autre, pour simuler des caméras qu'on éteint en
// rafale avant un reload complet du jeu (ex: victoire sur un boss).
export function cutLightsForReload(introLights, onComplete) {
    const cutDelayMs = 70;

    introLights.forEach((entry, index) => {
        setTimeout(() => {
            entry.light.intensity = 0;
        }, index * cutDelayMs);
    });

    const totalDuration = introLights.length * cutDelayMs + 50;
    setTimeout(() => {
        onComplete?.();
    }, totalDuration);
}
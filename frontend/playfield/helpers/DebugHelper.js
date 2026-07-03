import { RapierDebugRenderer } from './RapierDebugRenderer.js';

export function createRapierDebug(scene, world, context) {

    const debugRenderer =
        new RapierDebugRenderer(scene, world);

    debugRenderer.setVisible(false);

    window.addEventListener('keydown', (e) => {

        if (e.key === 'F1') {

            e.preventDefault();

            context.debugEnabled =
                !context.debugEnabled;

            debugRenderer.setVisible(
                context.debugEnabled
            );

            console.log(
                `[Rapier Debug] ${context.debugEnabled ? '✅ ON' : '❌ OFF'}`
            );
        }
    });

    return debugRenderer;
}

export function setupLightHelperToggle(lightHelpers) {

    window.addEventListener('keydown', (e) => {

        if (e.key === 'F3') {

            e.preventDefault();

            const visible =
                !lightHelpers[0]?.visible;

            lightHelpers.forEach(helper => {
                helper.visible = visible;
            });

            console.log(
                `[Light Helpers] ${visible ? '✅ ON' : '❌ OFF'}`
            );
        }
    });
}
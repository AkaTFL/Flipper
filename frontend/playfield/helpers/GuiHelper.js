import GUI from 'lil-gui';

export function createLightGUI(spotLights) {

    const gui = new GUI();

    gui.hide();

    spotLights.forEach((light, index) => {

        const folder =
            gui.addFolder(`Spot ${index + 1}`);

        folder.add(
            light.position,
            'x',
            -1000,
            1000,
            1
        );

        folder.add(
            light.position,
            'y',
            -1000,
            1000,
            1
        );

        folder.add(
            light.position,
            'z',
            -1000,
            1000,
            1
        );

        folder.add(
            light,
            'intensity',
            0,
            10,
            0.01
        );

        folder.add(
            light,
            'angle',
            0,
            Math.PI / 2,
            0.01
        );

        folder.add(
            light,
            'penumbra',
            0,
            1,
            0.01
        );

        folder.add(
            light,
            'distance',
            0,
            5000,
            1
        );

        folder.open();
    });

    window.addEventListener('keydown', (e) => {

        if (e.key === 'F4') {

            e.preventDefault();

            const visible = gui._hidden;

            if (visible) {
                gui.show();
            }
            else {
                gui.hide();
            }
        }
    });

    return gui;
}
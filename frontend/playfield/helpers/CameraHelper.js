import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function createCamera(position) {
    const aspect = window.innerWidth / window.innerHeight;

    const cameraPosition = new THREE.Vector3(
        position.x,
        position.y + 630,
        position.z - 280
    );

    const cameraTarget = new THREE.Vector3(-10, 0, -130);

    const distance = cameraPosition.distanceTo(cameraTarget);

    const frustumHeight =
        2 * Math.tan(THREE.MathUtils.degToRad(55 / 2)) * distance;

    // Utiliser dès l'initialisation la même projection que lors d'un resize.
    // Avec seulement `aspect`, le frustum horizontal était presque nul par
    // rapport à sa hauteur et la scène apparaissait sous forme de lignes
    // étirées jusqu'au premier redimensionnement de la fenêtre.
    const frustumWidth = frustumHeight * aspect;

    const camera = new THREE.OrthographicCamera(
        -frustumWidth / 2,
        frustumWidth / 2,
        frustumHeight / 2,
        -frustumHeight / 2,
        0.1,
        3000
    );

    camera.position.copy(cameraPosition);
    camera.up.set(0, 0, 1);
    camera.lookAt(cameraTarget);

    return {
        camera,
        frustumHeight,
        target: cameraTarget
    };
}

// Crée des OrbitControls permettant de déplacer/orbiter la caméra.
// Désactivés par défaut : on ne veut pas que le joueur puisse bouger
// la caméra pendant la partie, seulement en mode debug (cf. createCameraHelper).
export function createCameraOrbitControls(camera, renderer, target) {
    const controls = new OrbitControls(camera, renderer.domElement);

    controls.enabled = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    if (target) {
        controls.target.copy(target);
    }
    controls.update();

    return controls;
}

export function createCameraHelper(scene, camera, controls) {
    const helper = new THREE.CameraHelper(camera);

    helper.visible = false;

    scene.add(helper);

    window.addEventListener('keydown', (e) => {
        if (e.key === 'F2') {
            e.preventDefault();

            helper.visible = !helper.visible;

            // La caméra ne devient déplaçable que lorsque le helper est affiché
            if (controls) {
                controls.enabled = helper.visible;
            }

            console.log(
                `[Camera Helper] ${helper.visible ? '✅ ON' : '❌ OFF'}`
            );
        }
    });

    return helper;
}

export function setupCameraResize(
    camera,
    renderer,
    composer,
    frustumHeight
) {
    window.addEventListener('resize', () => {

        const aspect = window.innerWidth / window.innerHeight;
        const frustumWidth = frustumHeight * aspect;

        camera.left = -frustumWidth / 2;
        camera.right = frustumWidth / 2;
        camera.top = frustumHeight / 2;
        camera.bottom = -frustumHeight / 2;

        camera.updateProjectionMatrix();

        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );

        composer?.setSize(
            window.innerWidth,
            window.innerHeight
        );
    });
}

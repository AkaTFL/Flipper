import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

// Cache viewport size at init
var WIDTH = window.innerWidth;
var HEIGHT = window.innerHeight;

var renderer, scene, camera;

/**
 * @returns {Object} {renderer, scene, camera}
 */
function initScene() {
    // Renderer with anti-aliasing for smoother edges
    renderer = new THREE.WebGLRenderer({antialias :true});
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( WIDTH, HEIGHT );
    renderer.outputEncoding = THREE.sRGBEncoding;

    // Main scene container
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x0 ); 

    // Camera with a wide view and far clipping plane
    camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 1550 );

    camera.position.z = -100;
    camera.position.y = 10;
    camera.position.x = 50;;

    // Simple ground plane
    let plane = new THREE.PlaneGeometry(500,500);
    
    let planeMesh = new THREE.Mesh(plane, new THREE.MeshStandardMaterial({
        color: 0xaaaaaa,
        side: THREE.DoubleSide,
        metalness: 0.0,
        roughness: 1.0
    }));

    // Lay the plane flat
    planeMesh.rotation.x = - Math.PI / 2;
    scene.add(planeMesh);

    // Soft ambient light
    const light = new THREE.AmbientLight(0x0ffffff, 0.5);
    scene.add(light);

    // Attach renderer to the page
    var container = document.getElementById( 'three' );
    container.appendChild( renderer.domElement );

    return { renderer, scene, camera };
}

/**
 * Lance la boucle de rendu
 */
function startRender(physics, ball) {
    requestAnimationFrame(() => render(physics, ball));
}

function render(physics, ball) 
{
    physics.step();
    ball.syncFromPhysics();
    renderer.render(scene, camera);
    requestAnimationFrame(() => render(physics, ball));
}

export { initScene, startRender };
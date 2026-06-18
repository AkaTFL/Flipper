import * as THREE from 'three';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

export function createBloom(scene, {
    strength = 1.5,
    radius = 0.4,
    threshold = 0,
    color = 0xffffff,
    tolerance = 0.1,
    tableStrength = 0.2,
    tableRadius = 0.2,
} = {}) {
    const targetColor = new THREE.Color(color);

    const isColorInRange = (c) => {
        const col = c instanceof THREE.Color ? c : new THREE.Color(c);
        return (
            Math.abs(col.r - targetColor.r) <= tolerance &&
            Math.abs(col.g - targetColor.g) <= tolerance &&
            Math.abs(col.b - targetColor.b) <= tolerance
        );
    };

    // Layer 1 = éléments scène (bloom fort), Layer 2 = plateau (bloom faible)
    scene.traverse((obj) => {
        if (!obj.isMesh || !obj.material) return;

        if (obj.parent?.name === 'table') {
            obj.layers.enable(2);
            return;
        }

        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const mat of materials) {
            if (mat.color && isColorInRange(mat.color)) {
                obj.layers.enable(1);
                break;
            }
        }
    });

    // Boost shader : multiplie x3 les pixels dans la fourchette de couleur
    const boostPass = new ShaderPass({
        uniforms: {
            tDiffuse:    { value: null },
            targetColor: { value: new THREE.Vector3(targetColor.r, targetColor.g, targetColor.b) },
            tolerance:   { value: tolerance },
            boost:       { value: 3.0 },
        },
        vertexShader: /* glsl */`
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: /* glsl */`
            uniform sampler2D tDiffuse;
            uniform vec3      targetColor;
            uniform float     tolerance;
            uniform float     boost;
            varying vec2      vUv;
            void main() {
                vec4 texel = texture2D(tDiffuse, vUv);
                vec3 diff = abs(texel.rgb - targetColor);
                bool inRange = diff.r <= tolerance &&
                               diff.g <= tolerance &&
                               diff.b <= tolerance;
                gl_FragColor = inRange ? vec4(texel.rgb * boost, texel.a) : texel;
            }
        `,
    });

    const strongBloom = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        strength, radius, threshold
    );

    const weakBloom = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        tableStrength, tableRadius, threshold
    );

    // Masquage temporaire par layer
    const darkMats = {};

    // Three.js r132 : Layers.test() prend un autre objet Layers
    const layer1 = new THREE.Layers(); layer1.set(1);
    const layer2 = new THREE.Layers(); layer2.set(2);
    const layerMasks = { 1: layer1, 2: layer2 };

    const maskExcept = (enabledLayer) => {
        const mask = layerMasks[enabledLayer];
        scene.traverse((obj) => {
            if (!obj.isMesh && obj.children.name === 'table') return;
            if (!obj.layers.test(mask)) {
                darkMats[obj.uuid] = obj.material;
                obj.material = new THREE.MeshBasicMaterial({ color: 0x000000 });
            }
        });
    };

    const restoreMats = () => {
        scene.traverse((obj) => {
            if (darkMats[obj.uuid]) {
                obj.material = darkMats[obj.uuid];
                delete darkMats[obj.uuid];
            }
        });
    };

    // Proxy qui se comporte comme un Pass unique pour EffectComposer
    const pass = {
        // Propriétés attendues par EffectComposer
        enabled:     true,
        needsSwap:   true,
        clear:       false,
        renderToScreen: false,

        // EffectComposer appelle setSize sur chaque pass
        setSize(width, height) {
            boostPass.setSize(width, height);
            strongBloom.setSize(width, height);
            weakBloom.setSize(width, height);
        },

        // EffectComposer appelle render() sur chaque pass
        render(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
            // 1. Boost des couleurs cibles
            boostPass.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);

            // 2. Bloom fort sur les éléments (layer 1)
            maskExcept(1);
            strongBloom.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
            restoreMats();

            // 3. Bloom faible sur le plateau (layer 2)
            maskExcept(2);
            weakBloom.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
            restoreMats();
        },
    };

    return pass;
}
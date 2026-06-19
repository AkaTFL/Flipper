import { ShaderPass }
from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader }
from 'three/examples/jsm/shaders/FXAAShader.js';

export function createFXAA() {
    const pass = new ShaderPass(
        FXAAShader
    );

    const pixelRatio =
        window.devicePixelRatio;

    pass.material.uniforms.resolution.value.set(
        1 / (window.innerWidth * pixelRatio),
        1 / (window.innerHeight * pixelRatio)
    );

    return pass;
}
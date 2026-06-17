import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.132.2/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.132.2/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'https://cdn.jsdelivr.net/npm/three@0.132.2/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'https://cdn.jsdelivr.net/npm/three@0.132.2/examples/jsm/shaders/FXAAShader.js';

/**
 * Green Bloom Effect - Isolates and applies bloom to green colors
 * Post-processing effect using custom shader
 */
export class GreenBloomEffect {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        
        this.composer = null;
        this.bloomPass = null;
        
        this.params = {
            greenThreshold: 0.3,      // Threshold for detecting green
            greenRange: 0.3,          // Range tolerance for green detection
            bloomIntensity: 1.5       // Intensity of bloom effect
        };
        
        this.init();
    }

    init() {
        // Create effect composer
        this.composer = new EffectComposer(this.renderer);
        this.composer.setPixelRatio(window.devicePixelRatio);
        this.composer.setSize(this.renderer.domElement.clientWidth, this.renderer.domElement.clientHeight);

        // Add render pass
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // Create custom green bloom shader
        const greenBloomShader = {
            uniforms: {
                tDiffuse: { value: null },
                greenThreshold: { value: this.params.greenThreshold },
                greenRange: { value: this.params.greenRange },
                bloomIntensity: { value: this.params.bloomIntensity }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float greenThreshold;
                uniform float greenRange;
                uniform float bloomIntensity;
                
                varying vec2 vUv;
                
                void main() {
                    vec4 texel = texture2D(tDiffuse, vUv);
                    
                    // Extract color components
                    float greenChannel = texel.g;
                    float redChannel = texel.r;
                    float blueChannel = texel.b;
                    
                    // Detect green colors: high G, low R and B
                    float isGreen = 0.0;
                    if (greenChannel > greenThreshold) {
                        float rDiff = greenChannel - redChannel;
                        float bDiff = greenChannel - blueChannel;
                        
                        // Strong green detection
                        if (rDiff > greenRange && bDiff > greenRange) {
                            isGreen = smoothstep(0.0, 1.0, (rDiff + bDiff) * 0.5);
                        }
                    }
                    
                    // Apply bloom to green areas
                    vec3 bloomColor = vec3(0.0, 1.0, 0.0);
                    vec3 bloom = bloomColor * isGreen * bloomIntensity;
                    
                    // Combine original with bloom
                    vec3 finalColor = texel.rgb + bloom;
                    
                    // Add additional glow
                    float glow = isGreen * bloomIntensity * 0.3;
                    finalColor = mix(finalColor, bloomColor, glow);
                    
                    gl_FragColor = vec4(finalColor, texel.a);
                }
            `
        };

        // Add bloom pass
        this.bloomPass = new ShaderPass(greenBloomShader);
        this.bloomPass.renderToScreen = true;
        this.composer.addPass(this.bloomPass);
    }

    /**
     * Render the effect
     */
    render() {
        this.composer.render();
    }

    /**
     * Update effect parameters
     * @param {Object} params - Parameters to update
     */
    updateParams(params) {
        if (params.greenThreshold !== undefined) {
            this.params.greenThreshold = params.greenThreshold;
            this.bloomPass.uniforms.greenThreshold.value = params.greenThreshold;
        }
        if (params.greenRange !== undefined) {
            this.params.greenRange = params.greenRange;
            this.bloomPass.uniforms.greenRange.value = params.greenRange;
        }
        if (params.bloomIntensity !== undefined) {
            this.params.bloomIntensity = params.bloomIntensity;
            this.bloomPass.uniforms.bloomIntensity.value = params.bloomIntensity;
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        const width = this.renderer.domElement.clientWidth;
        const height = this.renderer.domElement.clientHeight;
        this.composer.setSize(width, height);
    }

    /**
     * Get current parameters
     */
    getParams() {
        return { ...this.params };
    }
}

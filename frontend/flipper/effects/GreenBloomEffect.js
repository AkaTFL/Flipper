import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';

/**
 * Aggressive Green Bloom Effect - Real separable Gaussian blur with multi-scale bloom
 */
export class GreenBloomEffect {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.fsCamera = null;
        this.fsScene = null;
        this.quad = null;

        this.params = {
            threshold: 0.15,
            intensity: 4.5,
            levels: 4,
            greenBias: 0.9,
            blurIterations: 3,
            downsample: 2
        };

        this._targets = null;
        this._brightMaterial = null;
        this._blurMaterial = null;
        this._compositeMaterial = null;

        this.init();
    }

    init() {
        this.fsCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.fsScene = new THREE.Scene();
        const geom = new THREE.PlaneGeometry(2, 2);
        this.quad = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color: 0x000000 }));
        this.fsScene.add(this.quad);

        // Bright Pass: Détecte les zones lumineuses ET les zones vertes
        this._brightMaterial = new THREE.ShaderMaterial({
            uniforms: {
                u_texture: { value: null },
                u_threshold: { value: this.params.threshold },
                u_greenBias: { value: this.params.greenBias }
            },
            vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position,1.0); }`,
            fragmentShader: `precision highp float;
                varying vec2 vUv;
                uniform sampler2D u_texture;
                uniform float u_threshold;
                uniform float u_greenBias;

                float luminance(vec3 color) {
                    return dot(color, vec3(0.2126, 0.7152, 0.0722));
                }

                void main() {
                    vec3 color = texture2D(u_texture, vUv).rgb;
                    float lum = luminance(color);
                    
                    // Aggressive threshold
                    float bright = max(lum - u_threshold, 0.0) / (1.0 - u_threshold + 1e-6);
                    
                    // Green detection
                    float greenScore = smoothstep(0.0, 1.0, color.g - 0.5 * (color.r + color.b));
                    
                    // Combine brightness and green bias
                    float weight = bright * mix(1.0, greenScore * 1.5, u_greenBias);
                    
                    gl_FragColor = vec4(color * weight * weight, 1.0);
                }`
        });

        // Separable Gaussian Blur (horizontal/vertical)
        this._blurMaterial = new THREE.ShaderMaterial({
            uniforms: {
                u_texture: { value: null },
                u_texelSize: { value: new THREE.Vector2(1 / 256, 1 / 256) },
                u_horizontal: { value: 1 }
            },
            vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position,1.0); }`,
            fragmentShader: `precision highp float;
                varying vec2 vUv;
                uniform sampler2D u_texture;
                uniform vec2 u_texelSize;
                uniform int u_horizontal;

                // Gaussian weights - wider kernel for stronger bloom
                float w0 = 0.2270270270;
                float w1 = 0.3162162162;
                float w2 = 0.0702702703;

                void main() {
                    vec2 dir = u_horizontal == 1 ? vec2(u_texelSize.x, 0.0) : vec2(0.0, u_texelSize.y);
                    
                    vec3 sum = texture2D(u_texture, vUv).rgb * w0;
                    sum += texture2D(u_texture, vUv + dir * 1.3846).rgb * w1;
                    sum += texture2D(u_texture, vUv - dir * 1.3846).rgb * w1;
                    sum += texture2D(u_texture, vUv + dir * 3.2308).rgb * w2;
                    sum += texture2D(u_texture, vUv - dir * 3.2308).rgb * w2;
                    
                    gl_FragColor = vec4(sum, 1.0);
                }`
        });

        // Aggressive Composite
        this._compositeMaterial = new THREE.ShaderMaterial({
            uniforms: {
                u_scene: { value: null },
                u_bloom0: { value: null },
                u_bloom1: { value: null },
                u_bloom2: { value: null },
                u_bloom3: { value: null },
                u_intensity: { value: this.params.intensity },
                u_levelCount: { value: this.params.levels }
            },
            vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position,1.0); }`,
            fragmentShader: `precision highp float;
                varying vec2 vUv;
                uniform sampler2D u_scene;
                uniform sampler2D u_bloom0;
                uniform sampler2D u_bloom1;
                uniform sampler2D u_bloom2;
                uniform sampler2D u_bloom3;
                uniform float u_intensity;
                uniform int u_levelCount;

                vec3 sampleBloom(int idx) {
                    if (idx == 0) return texture2D(u_bloom0, vUv).rgb;
                    if (idx == 1) return texture2D(u_bloom1, vUv).rgb;
                    if (idx == 2) return texture2D(u_bloom2, vUv).rgb;
                    return texture2D(u_bloom3, vUv).rgb;
                }

                void main() {
                    vec3 scene = texture2D(u_scene, vUv).rgb;
                    
                    // Cumulative bloom with boosted weights
                    vec3 bloom = vec3(0.0);
                    bloom += sampleBloom(0) * 0.5;
                    if (u_levelCount > 1) bloom += sampleBloom(1) * 0.4;
                    if (u_levelCount > 2) bloom += sampleBloom(2) * 0.3;
                    if (u_levelCount > 3) bloom += sampleBloom(3) * 0.2;
                    
                    // Aggressive bloom mixing
                    vec3 result = scene + bloom * u_intensity;
                    
                    // Soft clamp to prevent oversaturation
                    result = result / (1.0 + result);
                    
                    gl_FragColor = vec4(result, 1.0);
                }`
        });

        this._createTargets();
    }

    _createTargets() {
        const width = Math.max(1, this.renderer.domElement.clientWidth || this.renderer.domElement.width);
        const height = Math.max(1, this.renderer.domElement.clientHeight || this.renderer.domElement.height);
        const type = THREE.HalfFloatType;
        const rtParams = {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type,
            depthBuffer: false
        };

        if (this._targets) {
            this._disposeTargets(this._targets);
        }

        this._targets = {
            scene: new THREE.WebGLRenderTarget(width, height, rtParams),
            bright: new THREE.WebGLRenderTarget(
                Math.max(1, Math.floor(width / this.params.downsample)),
                Math.max(1, Math.floor(height / this.params.downsample)),
                rtParams
            ),
            levels: []
        };

        let w = Math.max(1, Math.floor(width / (this.params.downsample * 2)));
        let h = Math.max(1, Math.floor(height / (this.params.downsample * 2)));
        const levelCount = Math.max(1, Math.min(4, this.params.levels));
        
        for (let i = 0; i < levelCount; i++) {
            this._targets.levels.push({
                source: new THREE.WebGLRenderTarget(w, h, rtParams),
                ping: new THREE.WebGLRenderTarget(w, h, rtParams),
                pong: new THREE.WebGLRenderTarget(w, h, rtParams)
            });
            w = Math.max(1, Math.floor(w / 2));
            h = Math.max(1, Math.floor(h / 2));
        }
    }

    _disposeTargets(targets) {
        const dispose = (target) => {
            if (target && typeof target.dispose === 'function') {
                target.dispose();
            }
        };

        dispose(targets.scene);
        dispose(targets.bright);
        if (Array.isArray(targets.levels)) {
            targets.levels.forEach(level => {
                dispose(level.source);
                dispose(level.ping);
                dispose(level.pong);
            });
        }
    }

    render() {
        // 1. Render scene
        this.renderer.setRenderTarget(this._targets.scene);
        this.renderer.render(this.scene, this.camera);

        // 2. Bright pass
        this._brightMaterial.uniforms.u_texture.value = this._targets.scene.texture;
        this.quad.material = this._brightMaterial;
        this.renderer.setRenderTarget(this._targets.bright);
        this.renderer.render(this.fsScene, this.fsCamera);

        let prevTexture = this._targets.bright.texture;

        // 3. Multi-level blur with proper separable convolution
        for (let levelIndex = 0; levelIndex < this.params.levels; levelIndex++) {
            const level = this._targets.levels[levelIndex];

            // Downsample to level
            this._brightMaterial.uniforms.u_texture.value = prevTexture;
            this.quad.material = this._brightMaterial;
            this.renderer.setRenderTarget(level.source);
            this.renderer.render(this.fsScene, this.fsCamera);

            // Apply separable blur iterations
            for (let blurIter = 0; blurIter < this.params.blurIterations; blurIter++) {
                // Horizontal blur
                this._blurMaterial.uniforms.u_texture.value = level.source.texture;
                this._blurMaterial.uniforms.u_texelSize.value.set(1 / level.source.width, 1 / level.source.height);
                this._blurMaterial.uniforms.u_horizontal.value = 1;
                this.quad.material = this._blurMaterial;
                this.renderer.setRenderTarget(level.ping);
                this.renderer.render(this.fsScene, this.fsCamera);

                // Vertical blur
                this._blurMaterial.uniforms.u_texture.value = level.ping.texture;
                this._blurMaterial.uniforms.u_horizontal.value = 0;
                this.quad.material = this._blurMaterial;
                this.renderer.setRenderTarget(level.pong);
                this.renderer.render(this.fsScene, this.fsCamera);

                // Swap for next iteration
                level.source = level.pong;
                level.pong = level.ping;
                level.ping = level.source;
            }

            prevTexture = level.source.texture;
        }

        // 4. Final composite with bloom
        this._compositeMaterial.uniforms.u_scene.value = this._targets.scene.texture;
        this._compositeMaterial.uniforms.u_bloom0.value = this._targets.levels[0]?.source.texture || this._targets.bright.texture;
        this._compositeMaterial.uniforms.u_bloom1.value = this._targets.levels[1]?.source.texture || this._targets.bright.texture;
        this._compositeMaterial.uniforms.u_bloom2.value = this._targets.levels[2]?.source.texture || this._targets.bright.texture;
        this._compositeMaterial.uniforms.u_bloom3.value = this._targets.levels[3]?.source.texture || this._targets.bright.texture;
        this._compositeMaterial.uniforms.u_levelCount.value = this.params.levels;

        this.quad.material = this._compositeMaterial;
        this.renderer.setRenderTarget(null);
        this.renderer.render(this.fsScene, this.fsCamera);
    }

    updateParams(params) {
        if (params.threshold !== undefined) {
            this.params.threshold = params.threshold;
            this._brightMaterial.uniforms.u_threshold.value = params.threshold;
        }
        if (params.intensity !== undefined) {
            this.params.intensity = params.intensity;
            this._compositeMaterial.uniforms.u_intensity.value = params.intensity;
        }
        if (params.levels !== undefined) {
            this.params.levels = Math.max(1, Math.min(4, params.levels));
            this._compositeMaterial.uniforms.u_levelCount.value = this.params.levels;
            this._createTargets();
        }
        if (params.greenBias !== undefined) {
            this.params.greenBias = params.greenBias;
            this._brightMaterial.uniforms.u_greenBias.value = params.greenBias;
        }
        if (params.blurIterations !== undefined) {
            this.params.blurIterations = Math.max(1, params.blurIterations);
        }
        if (params.downsample !== undefined) {
            this.params.downsample = Math.max(1, params.downsample);
            this._createTargets();
        }
    }

    handleResize() {
        this._createTargets();
    }

    getParams() {
        return { ...this.params };
    }
}
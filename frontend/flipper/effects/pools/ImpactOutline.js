import * as THREE from 'three';

/**
 * ImpactOutline — shader custom, zéro dépendance postprocessing
 *
 * Stratégie : pour chaque mesh impacté, on rend son silhouette dans un
 * RenderTarget dédié (fond noir, mesh blanc), puis on applique un fullscreen
 * quad avec un shader Sobel qui détecte les bords et les dessine en couleur
 * pulsée par-dessus la scène déjà rendue.
 *
 * Usage :
 *   const outline = new ImpactOutline(renderer, color);
 *   outline.flash(mesh);
 *   // dans la boucle, APRÈS renderer.render(scene, camera) :
 *   outline.render(camera);
 *   outline.update(delta);
 */
export class ImpactOutline {

    /**
     * @param {THREE.WebGLRenderer} renderer
     * @param {number|string}       color    - couleur hex (défaut 0x00ff88)
     * @param {object}              options
     * @param {number} options.duration      - durée du flash en secondes (défaut 0.6)
     * @param {number} options.pulseSpeed    - fréquence Hz (défaut 5)
     * @param {number} options.thickness     - épaisseur du contour en px (défaut 2)
     * @param {number} options.intensity     - intensité max (défaut 1.0)
     */
    constructor(renderer, color = 0x00ff88, options = {}) {
        this._renderer  = renderer;
        this._color     = new THREE.Color(color);

        this._duration   = options.duration   ?? 0.6;
        this._pulseSpeed = options.pulseSpeed ?? 5;
        this._thickness  = options.thickness  ?? 2;
        this._intensity  = options.intensity  ?? 1.0;

        // Map mesh → { temps restant, material original }
        this._active = new Map();

        this._clock = new THREE.Clock();

        this._initTarget();
        this._initMaterials();
        this._initQuad();
    }

    // ─── Init ────────────────────────────────────────────────────────────────

    _initTarget() {
        const w = this._renderer.domElement.width;
        const h = this._renderer.domElement.height;

        this._maskTarget = new THREE.WebGLRenderTarget(w, h, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            depthBuffer: true,
        });
    }

    _initMaterials() {
        // Material blanc plat pour rendre le silhouette du mesh
        this._maskMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.FrontSide,
        });
    }

    _initQuad() {
        const w = this._renderer.domElement.width;
        const h = this._renderer.domElement.height;

        this._quadScene  = new THREE.Scene();
        this._quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        this._quadMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uMask:      { value: this._maskTarget.texture },
                uColor:     { value: this._color },
                uIntensity: { value: 0.0 },
                uThickness: { value: this._thickness },
                uTexelSize: { value: new THREE.Vector2(1 / w, 1 / h) },
            },
            vertexShader: /* glsl */`
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = vec4(position, 1.0);
                }
            `,
            fragmentShader: /* glsl */`
                uniform sampler2D uMask;
                uniform vec3      uColor;
                uniform float     uIntensity;
                uniform float     uThickness;
                uniform vec2      uTexelSize;
                varying vec2      vUv;

                float sampleMask(vec2 uv) {
                    return texture2D(uMask, uv).r;
                }

                void main() {
                    float t = uThickness;

                    // Sobel 3×3 sur le canal rouge du masque
                    float tl = sampleMask(vUv + vec2(-t, -t) * uTexelSize);
                    float tc = sampleMask(vUv + vec2( 0, -t) * uTexelSize);
                    float tr = sampleMask(vUv + vec2( t, -t) * uTexelSize);
                    float ml = sampleMask(vUv + vec2(-t,  0) * uTexelSize);
                    float mr = sampleMask(vUv + vec2( t,  0) * uTexelSize);
                    float bl = sampleMask(vUv + vec2(-t,  t) * uTexelSize);
                    float bc = sampleMask(vUv + vec2( 0,  t) * uTexelSize);
                    float br = sampleMask(vUv + vec2( t,  t) * uTexelSize);

                    float gx = -tl - 2.0*ml - bl + tr + 2.0*mr + br;
                    float gy = -tl - 2.0*tc - tr + bl + 2.0*bc + br;
                    float edge = sqrt(gx*gx + gy*gy);

                    edge = clamp(edge, 0.0, 1.0);

                    gl_FragColor = vec4(uColor, edge * uIntensity);
                }
            `,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        const geo  = new THREE.PlaneGeometry(2, 2);
        const mesh = new THREE.Mesh(geo, this._quadMaterial);
        this._quadScene.add(mesh);
    }

    // ─── API publique ─────────────────────────────────────────────────────────

    /**
     * Déclenche le flash outline sur un mesh ou groupe
     * @param {THREE.Object3D} object
     */
    flash(object) {
        if (!object) return;
        this._active.set(object, this._duration);
    }

    /**
     * Met à jour les timers et l'intensité pulsée
     * @param {number} delta
     */
    update(delta) {
        if (this._active.size === 0) {
            this._quadMaterial.uniforms.uIntensity.value = 0;
            return;
        }

        let maxRatio = 0;

        for (const [mesh, remaining] of this._active) {
            const next = remaining - delta;
            if (next <= 0) {
                this._active.delete(mesh);
            } else {
                this._active.set(mesh, next);
                const ratio = next / this._duration;
                if (ratio > maxRatio) maxRatio = ratio;
            }
        }

        if (this._active.size === 0) {
            this._quadMaterial.uniforms.uIntensity.value = 0;
            return;
        }

        const t     = performance.now() / 1000;
        const pulse = 0.5 + 0.5 * Math.sin(t * this._pulseSpeed * Math.PI * 2);

        this._quadMaterial.uniforms.uIntensity.value =
            this._intensity * maxRatio * (0.3 + 0.7 * pulse);
    }

    /**
     * À appeler APRÈS postProcessing.render() dans la boucle principale
     * @param {THREE.Camera} camera
     * @param {THREE.Scene}  scene
     */
    render(camera, scene) {
        if (this._active.size === 0) return;

        const renderer = this._renderer;
        const meshes   = [...this._active.keys()];

        // 1. Sauvegarder l'état courant
        const prevTarget    = renderer.getRenderTarget();
        const prevAutoClear = renderer.autoClear;

        // 2. Rendre le masque (meshes en blanc sur fond noir)
        renderer.setRenderTarget(this._maskTarget);
        renderer.setClearColor(0x000000, 1);
        renderer.clear();

        // Remplacer temporairement les materials
        const saved = new Map();
        meshes.forEach(obj => {
            obj.traverse(child => {
                if (child.isMesh) {
                    saved.set(child, child.material);
                    child.material = this._maskMaterial;
                }
            });
        });

        renderer.render(scene, camera);

        // Restaurer les materials
        saved.forEach((mat, child) => { child.material = mat; });

        // 3. Rendre le quad Sobel par-dessus le framebuffer principal
        renderer.setRenderTarget(prevTarget);
        renderer.autoClear = false;
        renderer.render(this._quadScene, this._quadCamera);
        renderer.autoClear = prevAutoClear;
    }

    resize(width, height) {
        this._maskTarget.setSize(width, height);
        this._quadMaterial.uniforms.uTexelSize.value.set(1 / width, 1 / height);
    }

    dispose() {
        this._active.clear();
        this._maskTarget.dispose();
        this._maskMaterial.dispose();
        this._quadMaterial.dispose();
    }

}
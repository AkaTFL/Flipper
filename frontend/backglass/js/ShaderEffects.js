/**
 * ShaderEffects.js — Elemental Legends
 *
 * Level 1 NATURE : forêt mystique, vrilles, spores, lueurs émeraude profondes
 * Level 2 EAU    : océan abyssal, caustiques, bulles, reflets de surface
 * Level 3 FEU    : volcan, lave en fusion, flammes, cendres, distorsion thermique
 *
 * Alpha max relevé à ~0.75 pour un rendu bien visible sur fond noir.
 */

export class ShaderEffects {
    constructor(canvasId = 'shader-canvas') {
        this.canvas = document.getElementById(canvasId);
        this.gl = null;
        this.program = null;
        this.time = 0;
        this.animationFrameId = null;
        this.currentLevel = 1;
        this.init();
    }

    init() {
        try {
            // alpha:true + premultipliedAlpha:false = compositing correct sans modifier les shaders
            this.gl = this.canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: false })
                    || this.canvas.getContext('webgl',  { alpha: true, antialias: true, premultipliedAlpha: false });
            if (!this.gl) { console.warn('[SHADER] WebGL non supporté'); return; }
            // CRITIQUE : clearColor transparent, sinon gl.clear() = noir opaque
            this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
            this.gl.enable(this.gl.BLEND);
            this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
            this.buildProgram(this.currentLevel);
            this.setupBuffers();
            this.resizeCanvas();
            window.addEventListener('resize', () => this.resizeCanvas());
            this.animate();
            console.log('[SHADER] ✅ Level', this.currentLevel);
        } catch (err) { console.error('[SHADER] init:', err); }
    }

    resizeCanvas() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2); // cap à 2x pour perf
        const w = Math.floor(window.innerWidth  * dpr);
        const h = Math.floor(window.innerHeight * dpr);
        if (this.canvas.width === w && this.canvas.height === h) return;
        this.canvas.width  = w;
        this.canvas.height = h;
        if (this.gl) {
            this.gl.viewport(0, 0, w, h);
            // Réappliquer clearColor car certains drivers la perdent au resize
            this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
        }
    }

    setLevel(level) {
        if (this.currentLevel === level) return;
        this.currentLevel = level;
        this.buildProgram(level);
        this.setupBuffers();
        this.applyTheme(level);
    }

    applyTheme(level) {
        const body = document.body;
        body.classList.remove('theme-nature', 'theme-water', 'theme-fire');
        if (level === 1) body.classList.add('theme-nature');
        else if (level === 2) body.classList.add('theme-water');
        else if (level === 3) body.classList.add('theme-fire');
    }

    get vertSource() {
        return `#version 300 es
            in vec4 aPosition;
            void main() { gl_Position = aPosition; }
        `;
    }

    // ═══════════════════════════════════════════════════════════════
    // LEVEL 1 — NATURE
    // Forêt mystique : brume émeraude, racines lumineuses, spores,
    // lueurs de canopée, veines de rosée, vrilles spiralées
    // ═══════════════════════════════════════════════════════════════
    get fragNature() {
        return `#version 300 es
        precision highp float;
        uniform vec2  uResolution;
        uniform float uTime;
        out vec4 FragColor;

        float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
        float noise(vec2 p) {
            vec2 i=floor(p), f=fract(p), u=f*f*(3.0-2.0*f);
            return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
        }
        float fbm(vec2 p){
            return noise(p)*0.5+noise(p*2.1)*0.25+noise(p*4.3)*0.13+noise(p*8.9)*0.07+noise(p*17.0)*0.05;
        }

        // Brume volumétrique qui monte
        float mistLayer(vec2 uv, float speed, float yOff, float t) {
            float x = uv.x + sin(uv.y*3.0+t*speed)*0.08;
            float n = fbm(vec2(x*2.5, uv.y*1.2 + t*speed*0.4 + yOff));
            float mask = smoothstep(1.0, 0.3, uv.y) * smoothstep(0.0, 0.2, uv.y);
            return n * mask;
        }

        // Vrille spiralée qui pousse depuis le bas
        float tendril(vec2 uv, float seed, float t) {
            float age = mod(t*0.15 + seed*0.6, 2.2);
            float reach = smoothstep(0.0, 1.0, age/1.2);
            vec2 origin = vec2(hash(vec2(seed,0.3))*0.9+0.05, 1.0);
            float minD = 9999.0;
            for(float i=0.0; i<40.0; i++){
                float tt = i/40.0;
                if(tt > reach) break;
                float angle = tt*16.0 + sin(tt*9.0+seed)*2.0 + seed*6.28;
                float r = tt*0.08 + sin(tt*5.0+seed)*0.02;
                vec2 pt = origin + vec2(
                    sin(angle)*r*0.5 + sin(tt*4.0+seed*2.0)*0.06,
                    -tt*reach*0.85 + noise(vec2(tt*4.0,seed))*0.04
                );
                float thick = 0.007*(1.0-tt*0.6)*(0.6+0.4*sin(t*2.5+seed));
                minD = min(minD, length(uv-pt)-thick);
            }
            return clamp(1.0-minD*100.0, 0.0, 1.0);
        }

        // Spore lumineuse flottante
        float spore(vec2 uv, float idx) {
            vec2 s = vec2(idx*5.3, idx*2.7+3.1);
            vec2 pos = vec2(hash(s), hash(s+vec2(1.1)));
            float speed = hash(s+vec2(7.0))*0.025+0.008;
            float phase = hash(s+vec2(11.0))*6.28;
            pos.y -= mod(uTime*speed+phase, 1.5)-0.25;
            pos.x += sin(uTime*0.4+phase)*0.06+cos(uTime*0.23+phase)*0.03;
            float sz = hash(s+vec2(5.0))*0.006+0.002;
            float bright = 0.5+0.5*(sin(uTime*2.5+phase)*0.5+0.5);
            return clamp(sz/(length(uv-pos)+sz*0.3)*bright, 0.0, 1.0);
        }

        // Racine lumineuse (grosse veine au sol)
        float root(vec2 uv, float seed, float t) {
            float ox = hash(vec2(seed,9.1))*0.8+0.1;
            float minD = 9999.0;
            vec2 prev = vec2(ox, 1.0);
            for(float i=0.0; i<20.0; i++){
                float tt = i/20.0;
                vec2 cur = vec2(ox + sin(tt*8.0+seed)*0.18 + fbm(vec2(tt*3.0,seed))*0.12,
                                1.0 - tt*0.55);
                // Segment distance
                vec2 ab = cur-prev, ap = uv-prev;
                float t2 = clamp(dot(ap,ab)/dot(ab,ab),0.0,1.0);
                minD = min(minD, length(ap-t2*ab)-0.007*(1.0+sin(t*1.5+seed+tt*3.0)*0.3));
                prev = cur;
            }
            return clamp(1.0-minD*90.0, 0.0, 1.0);
        }

        void main() {
            vec2 uv = gl_FragCoord.xy / uResolution.xy;
            vec2 uvF = vec2(uv.x, 1.0-uv.y);

            vec3 col = vec3(0.0);
            float alpha = 0.0;

            // ── Fond de brume émeraude profonde
            float deepFog = fbm(uvF*2.0 + vec2(uTime*0.03, 0.0));
            float fogMask = smoothstep(0.0, 0.6, uvF.y);
            col += vec3(0.0, 0.12, 0.03) * deepFog * fogMask * 1.4;
            alpha += deepFog * fogMask * 0.55;

            // ── Brume multicouche
            float mist1 = mistLayer(uvF, 0.08, 0.0, uTime);
            float mist2 = mistLayer(uvF*vec2(1.3,0.8)+vec2(0.2,0.0), 0.05, 1.7, uTime);
            float mist3 = mistLayer(uvF*vec2(0.7,1.2)+vec2(0.5,0.0), 0.11, 3.3, uTime);
            float mist = mist1*0.6 + mist2*0.4 + mist3*0.3;
            col += vec3(0.02, 0.38, 0.08) * mist * 0.9;
            alpha += mist * 0.45;

            // ── Lueur de canopée (haut — lumière qui filtre)
            float canopy = 1.0-smoothstep(0.0, 0.65, length(uvF-vec2(0.5,-0.15)));
            canopy *= 0.5+0.4*sin(uTime*0.35+1.2);
            canopy *= fbm(uvF*3.0+uTime*0.02);
            col += vec3(0.05, 0.7, 0.1) * canopy * 0.6;
            alpha += canopy * 0.25;

            // ── Lueur racines (bas — sol vivant)
            float rootGlow = 1.0-smoothstep(0.0, 0.7, length(uvF-vec2(0.5,1.25)));
            rootGlow *= 0.7+0.3*sin(uTime*0.6);
            rootGlow *= fbm(uvF*4.0+vec2(uTime*0.04,0.0))*1.3;
            col += vec3(0.06, 0.65, 0.15) * rootGlow * 0.7;
            alpha += rootGlow * 0.3;

            // ── 5 grosses racines lumineuses
            for(float i=0.0; i<5.0; i++){
                float r = root(uvF, i*2.7+0.5, uTime);
                if(r>0.01){
                    vec3 rc = mix(vec3(0.08,0.5,0.1), vec3(0.3,1.0,0.2), sin(uTime*0.6+i)*0.5+0.5);
                    col += rc * r * 0.95;
                    alpha += r * 0.45;
                }
            }

            // ── 14 vrilles végétales
            for(float i=0.0; i<14.0; i++){
                float t = tendril(uvF, i*1.73+0.3, uTime);
                if(t>0.01){
                    vec3 lc = mix(vec3(0.1,0.8,0.18), vec3(0.4,1.0,0.25),
                                  sin(uTime*0.9+i*0.7)*0.5+0.5);
                    col += lc * t * 0.72;
                    alpha += t * 0.36;
                }
            }

            // ── Spores lumineuses (24) — réduit pour laisser les racines dominer
            float allSpores = 0.0;
            for(float i=0.0; i<24.0; i++) allSpores += spore(uvF, i);
            allSpores = clamp(allSpores, 0.0, 1.0);
            col += mix(vec3(0.2,1.0,0.3), vec3(0.8,1.0,0.2), sin(uTime*0.7)*0.5+0.5)*allSpores*0.35;
            alpha += allSpores * 0.12;

            // ── Veines de racines diagonales
            float vein = abs(sin((uvF.x+uvF.y*0.6+uTime*0.02)*9.0));
            vein = pow(max(0.0,1.0-vein*4.2), 2.8)*fbm(uvF*4.2+uTime*0.012)*0.75;
            col += vec3(0.08, 0.72, 0.2)*vein*0.7;
            alpha += vein * 0.24;

            // ── Pulsation basse UI
            if(uvF.y < 0.32){
                float p = sin(uTime*2.2)*0.5+0.5;
                float g = (1.0-smoothstep(0.0,0.22,length(uvF-vec2(0.5,0.16))))*p*0.6;
                col += vec3(0.1,0.8,0.2)*g;
                alpha += g*0.18;
            }

            // ── Vignette bords verts
            float vig = length((uvF-0.5)*vec2(1.4,1.7));
            vig = pow(clamp(vig,0.0,1.0), 1.8)*0.65;
            col += vec3(0.0,0.08,0.02)*vig;
            alpha += vig*0.35;

            alpha = clamp(alpha, 0.0, 0.78);
            col   = clamp(col,   0.0, 1.0);
            FragColor = vec4(col, alpha);
        }`;
    }

    // ═══════════════════════════════════════════════════════════════
    // LEVEL 2 — EAU
    // Océan abyssal : profondeur azur, caustiques, vagues, bulles,
    // colonnes de lumière, bioluminescence
    // ═══════════════════════════════════════════════════════════════
    get fragWater() {
        return `#version 300 es
        precision highp float;
        uniform vec2  uResolution;
        uniform float uTime;
        out vec4 FragColor;

        float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
        float noise(vec2 p){
            vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);
            return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
        }
        float fbm(vec2 p){
            return noise(p)*0.5+noise(p*2.0)*0.25+noise(p*4.1)*0.13+noise(p*8.3)*0.07+noise(p*16.0)*0.05;
        }

        // Vague de surface (Gerstner multi)
        float wave(vec2 uv, float t){
            float w  = sin(uv.x*7.0 +t*1.2)*0.014;
            w += sin(uv.x*13.0-t*0.8+1.3)*0.009;
            w += sin(uv.x*4.5+uv.y*2.5+t)*0.011;
            w += sin(uv.x*21.0-t*1.6+2.7)*0.005;
            w += sin((uv.x+uv.y)*9.0+t*0.7)*0.007;
            return w;
        }

        // Caustiques (lumière réfractée sous eau)
        float caustic(vec2 uv, float t){
            vec2 p = uv*5.0;
            float f = 1.0;
            for(int i=0;i<4;i++){
                p += vec2(sin(p.y*f+t*0.55),cos(p.x*f-t*0.45))*0.35;
                f *= 1.65;
            }
            return pow(abs(sin(p.x+t)*sin(p.y-t*0.8))*0.5+0.5, 2.5);
        }

        // Colonne de lumière descendante (rayon solaire sous eau)
        float lightBeam(vec2 uv, float cx, float seed, float t){
            float x = uv.x - cx + sin(uv.y*3.0+t*0.4+seed)*0.04;
            float w = 0.025+0.015*sin(t*0.3+seed);
            float beam = max(0.0, 1.0-abs(x)/w);
            beam = pow(beam, 2.0);
            float fade = smoothstep(1.0, 0.0, uv.y*1.1); // plus fort en haut
            float flicker = 0.7+0.3*sin(t*2.0+seed*7.0)*sin(t*3.7+seed*2.3);
            return beam * fade * flicker;
        }

        // Bulle (anneau fin)
        float bubble(vec2 uv, float idx){
            vec2 s=vec2(idx*4.1,idx*3.3+2.0);
            vec2 pos=vec2(hash(s)*0.8+0.1,0.0);
            float speed=hash(s+vec2(7.0))*0.025+0.008;
            float phase=hash(s+vec2(11.0))*6.28;
            pos.y -= mod(uTime*speed+phase*0.15,1.4)-0.2;
            pos.x += sin(uTime*0.6+phase)*0.03+cos(uTime*0.37+phase)*0.015;
            float r=hash(s+vec2(5.0))*0.014+0.004;
            float ring=abs(length(uv-pos)-r);
            float bright=0.5+0.5*sin(uTime*1.8+phase);
            return clamp(1.0-ring*160.0,0.0,1.0)*bright;
        }

        // Particule bioluminescente
        float bio(vec2 uv, float idx){
            vec2 s=vec2(idx*7.3+1.0,idx*4.1+5.0);
            vec2 pos=vec2(hash(s),hash(s+vec2(3.0)));
            float speed=hash(s+vec2(9.0))*0.015+0.004;
            float phase=hash(s+vec2(13.0))*6.28;
            pos.y -= mod(uTime*speed+phase*0.1,1.2)-0.1;
            pos.x += sin(uTime*0.25+phase)*0.07;
            float sz=hash(s+vec2(6.0))*0.007+0.002;
            float bright=(sin(uTime*3.0+phase)*0.5+0.5)*0.8+0.2;
            return clamp(sz/(length(uv-pos)+sz*0.25)*bright,0.0,1.0);
        }

        void main(){
            vec2 uv=gl_FragCoord.xy/uResolution.xy;
            vec2 uvF=vec2(uv.x,1.0-uv.y);

            float wOff=wave(uvF,uTime);
            vec2 distUv=uvF+vec2(wOff,wOff*0.5);

            vec3 col=vec3(0.0);
            float alpha=0.0;

            // ── Fond océan profond
            float depth=fbm(distUv*2.5+vec2(0.0,uTime*0.04));
            float depthMask=smoothstep(0.0,0.8,uvF.y);
            col+=vec3(0.0,0.04,0.18)*depth*depthMask*2.0;
            alpha+=depth*depthMask*0.65;

            // ── Brume de surface (haut)
            float surfFog=fbm(vec2(uvF.x*3.0+uTime*0.05,uvF.y*2.0));
            float surfMask=smoothstep(0.55,0.0,uvF.y);
            col+=vec3(0.1,0.55,0.95)*surfFog*surfMask*0.7;
            alpha+=surfFog*surfMask*0.35;

            // ── 4 colonnes de lumière
            float beams=0.0;
            for(float i=0.0;i<4.0;i++){
                float cx=0.15+i*0.24;
                beams+=lightBeam(distUv,cx,i*1.7,uTime);
            }
            beams=clamp(beams,0.0,1.0);
            col+=vec3(0.4,0.8,1.0)*beams*0.9;
            alpha+=beams*0.45;

            // ── Caustiques (fond)
            float caust=caustic(distUv,uTime);
            float caustMask=smoothstep(0.4,1.0,uvF.y);
            col+=vec3(0.15,0.65,1.0)*caust*caustMask*0.55;
            alpha+=caust*caustMask*0.22;

            // ── Lignes de vague horizontales
            float waveLine=sin(distUv.y*25.0+uTime*0.9+distUv.x*5.0);
            waveLine=pow(max(0.0,waveLine),8.0)*(1.0-abs(uvF.y-0.35)*3.5);
            waveLine=clamp(waveLine,0.0,0.4);
            col+=vec3(0.5,0.9,1.0)*waveLine*0.6;
            alpha+=waveLine*0.2;

            // ── Bulles (50)
            float allBubbles=0.0;
            for(float i=0.0;i<50.0;i++) allBubbles+=bubble(distUv,i);
            allBubbles=clamp(allBubbles,0.0,1.0);
            col+=vec3(0.6,0.95,1.0)*allBubbles*0.7;
            alpha+=allBubbles*0.28;

            // ── Bioluminescence (80 particules)
            float allBio=0.0;
            for(float i=0.0;i<80.0;i++) allBio+=bio(uvF,i);
            allBio=clamp(allBio,0.0,1.0);
            col+=mix(vec3(0.1,0.9,1.0),vec3(0.3,0.4,1.0),sin(uTime*0.5)*0.5+0.5)*allBio*0.8;
            alpha+=allBio*0.3;

            // ── Reflets scintillants de surface
            float sparkle=fbm(distUv*9.0-uTime*0.12)*fbm(distUv*14.0+uTime*0.08);
            float sparkleMask=smoothstep(0.5,0.0,uvF.y);
            col+=vec3(0.8,0.97,1.0)*sparkle*sparkleMask*0.8;
            alpha+=sparkle*sparkleMask*0.25;

            // ── Pulsation UI basse
            if(uvF.y<0.32){
                float p=sin(uTime*1.8+0.5)*0.5+0.5;
                float g=(1.0-smoothstep(0.0,0.2,length(uvF-vec2(0.5,0.15))))*p*0.65;
                col+=vec3(0.1,0.5,1.0)*g;
                alpha+=g*0.2;
            }

            // ── Vignette bleue
            float vig=length((uvF-0.5)*vec2(1.4,1.7));
            vig=pow(clamp(vig,0.0,1.0),1.8)*0.65;
            col+=vec3(0.0,0.02,0.1)*vig;
            alpha+=vig*0.4;

            alpha=clamp(alpha,0.0,0.80);
            col=clamp(col,0.0,1.0);
            FragColor=vec4(col,alpha);
        }`;
    }

    // ═══════════════════════════════════════════════════════════════
    // LEVEL 3 — FEU
    // Volcan : lave en fusion, flammes, distorsion thermique,
    // cendres incandescentes, fissures, panache de chaleur
    // ═══════════════════════════════════════════════════════════════
    get fragFire() {
        return `#version 300 es
        precision highp float;
        uniform vec2  uResolution;
        uniform float uTime;
        out vec4 FragColor;

        float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
        float noise(vec2 p){
            vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);
            return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
        }
        float fbm(vec2 p){
            return noise(p)*0.5+noise(p*2.1)*0.25+noise(p*4.3)*0.13+noise(p*8.7)*0.07+noise(p*17.0)*0.05;
        }

        // Distorsion thermique (air chaud)
        vec2 heatWarp(vec2 uv, float t){
            float dx=sin(uv.y*16.0+t*1.3)*0.012
                    +sin(uv.y*8.0-t*0.9+1.4)*0.008
                    +sin((uv.x+uv.y)*13.0+t)*0.006;
            float dy=cos(uv.x*11.0+t*0.8)*0.005+sin(uv.y*5.0-t)*0.004;
            float intensity=smoothstep(0.6,0.0,uv.y)*1.5+0.3;
            return vec2(dx,dy)*intensity;
        }

        // Colonne de flamme
        float flame(vec2 uv, float cx, float seed, float t){
            float age=mod(t*0.2+seed*0.5,1.8);
            float reach=smoothstep(0.0,0.8,age/0.9);
            float x=uv.x-cx;
            float width=0.028*(1.0-uv.y*0.5)*(0.5+0.5*sin(t*3.5+seed));
            float sway=sin(uv.y*9.0+t*2.5+seed)*0.018+sin(uv.y*4.0-t*1.2+seed)*0.01;
            float dist=abs(x-sway)-width;
            float f=clamp(1.0-dist*55.0,0.0,1.0);
            float hMask=smoothstep(0.9,0.0,uv.y-age*0.2+0.05);
            // Double couche : cœur brillant + halo
            float core=clamp(1.0-(dist+0.01)*120.0,0.0,1.0);
            return (f*0.7+core*0.3)*hMask;
        }

        // Sol de lave (écoulement)
        float lava(vec2 uv, float t){
            vec2 flow=uv*3.5+vec2(sin(uv.y*2.0+t*0.1)*0.3, t*0.06);
            float n=fbm(flow);
            float mask=smoothstep(0.45,1.0,uv.y);
            return n*mask;
        }

        // Fissure lumineuse (craquelures de lave)
        float crack(vec2 uv, float seed, float t){
            float f=abs(sin((uv.x*(7.0+seed)+uv.y*(3.0+seed*0.5)+t*0.03+seed)*5.5));
            f=pow(max(0.0,1.0-f*7.0),3.0);
            f*=fbm(uv*3.5+seed+t*0.015)*0.8;
            f*=smoothstep(0.0,0.7,uv.y); // seulement en bas
            return f;
        }

        // Ember (cendre incandescente qui tombe)
        float ember(vec2 uv, float idx){
            vec2 s=vec2(idx*3.7,idx*2.9+4.1);
            vec2 pos=vec2(hash(s),hash(s+vec2(3.1)));
            float speed=hash(s+vec2(7.0))*0.022+0.006;
            float phase=hash(s+vec2(11.0))*6.28;
            pos.y+=mod(uTime*speed+phase*0.1,1.3)-0.15;
            pos.y-=0.5;
            pos.x+=sin(uTime*0.7+phase)*0.04+cos(uTime*0.41+phase)*0.02;
            float sz=hash(s+vec2(5.0))*0.006+0.002;
            float bright=0.3+0.7*(sin(uTime*3.5+phase)*0.5+0.5);
            return clamp(sz/(length(uv-pos)+sz*0.3)*bright,0.0,1.0);
        }

        vec3 lavaColor(float v){
            if(v<0.3) return mix(vec3(0.6,0.0,0.0),vec3(1.0,0.2,0.0),v/0.3);
            if(v<0.6) return mix(vec3(1.0,0.2,0.0),vec3(1.0,0.55,0.0),(v-0.3)/0.3);
            return mix(vec3(1.0,0.55,0.0),vec3(1.0,0.9,0.3),(v-0.6)/0.4);
        }

        void main(){
            vec2 uv=gl_FragCoord.xy/uResolution.xy;
            vec2 uvF=vec2(uv.x,1.0-uv.y);
            vec2 wUv=uvF+heatWarp(uvF,uTime);

            vec3 col=vec3(0.0);
            float alpha=0.0;

            // ── Sol de lave + glow
            float lv=lava(wUv,uTime);
            col+=lavaColor(lv)*lv*0.85;
            alpha+=lv*0.55;

            // ── Fissures lumineuses (4)
            for(float i=0.0;i<4.0;i++){
                float cr=crack(wUv,i*1.9+0.3,uTime);
                col+=mix(vec3(1.0,0.4,0.0),vec3(1.0,0.85,0.1),cr)*cr*0.8;
                alpha+=cr*0.28;
            }

            // ── Bouche de volcan (bas-centre)
            float volcGlow=1.0-smoothstep(0.0,0.6,length(uvF-vec2(0.5,1.15)));
            volcGlow*=0.65+0.35*sin(uTime*1.1+0.5);
            volcGlow*=fbm(wUv*2.5+uTime*0.04)*1.6;
            col+=vec3(1.0,0.38,0.0)*volcGlow*0.9;
            alpha+=volcGlow*0.45;

            // ── 7 colonnes de flammes
            float positions[7];
            positions[0]=0.08; positions[1]=0.22; positions[2]=0.38;
            positions[3]=0.5;
            positions[4]=0.62; positions[5]=0.78; positions[6]=0.92;
            for(int i=0;i<7;i++){
                float f=flame(wUv,positions[i],float(i)*1.57,uTime);
                if(f>0.01){
                    vec3 fc=mix(
                        vec3(1.0,0.9,0.15),
                        vec3(1.0,0.25,0.0),
                        wUv.y*1.8
                    );
                    col+=fc*f*0.75;
                    alpha+=f*0.35;
                }
            }

            // ── Panache de chaleur haut (smoke glow)
            float plume=fbm(wUv*2.0-vec2(0.0,uTime*0.08))*0.6;
            float plumeMask=smoothstep(0.5,0.0,uvF.y)*(0.5+0.4*sin(uTime*0.6+1.5));
            col+=vec3(0.7,0.12,0.0)*plume*plumeMask*0.8;
            alpha+=plume*plumeMask*0.35;

            // ── Embers incandescents (70)
            float allEmbers=0.0;
            for(float i=0.0;i<70.0;i++) allEmbers+=ember(wUv,i);
            allEmbers=clamp(allEmbers,0.0,1.0);
            col+=mix(vec3(1.0,0.55,0.0),vec3(1.0,0.9,0.2),sin(uTime*2.5)*0.5+0.5)*allEmbers*0.9;
            alpha+=allEmbers*0.35;

            // ── Lueur globale rouge (ambiance)
            float ambR=fbm(uvF*3.5+vec2(uTime*0.05,0.0));
            col+=vec3(0.55,0.05,0.0)*ambR*0.5;
            alpha+=ambR*0.2;

            // ── Pulsation UI basse
            if(uvF.y<0.32){
                float p=sin(uTime*2.5)*0.5+0.5;
                float g=(1.0-smoothstep(0.0,0.18,length(uvF-vec2(0.5,0.15))))*p*0.7;
                col+=vec3(1.0,0.35,0.0)*g;
                alpha+=g*0.22;
            }

            // ── Vignette rouge sombre
            float vig=length((uvF-0.5)*vec2(1.4,1.7));
            vig=pow(clamp(vig,0.0,1.0),1.8)*0.65;
            col+=vec3(0.12,0.01,0.0)*vig;
            alpha+=vig*0.4;

            alpha=clamp(alpha,0.0,0.82);
            col=clamp(col,0.0,1.0);
            FragColor=vec4(col,alpha);
        }`;
    }

    buildProgram(level) {
        const gl = this.gl;
        if (!gl) return;
        if (this.program) { gl.deleteProgram(this.program); this.program = null; }

        const fragSrc = level === 1 ? this.fragNature : level === 2 ? this.fragWater : this.fragFire;
        const vs = this.compileShader(this.vertSource, gl.VERTEX_SHADER);
        const fs = this.compileShader(fragSrc, gl.FRAGMENT_SHADER);
        if (!vs || !fs) return;

        this.program = gl.createProgram();
        gl.attachShader(this.program, vs);
        gl.attachShader(this.program, fs);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('[SHADER] Link:', gl.getProgramInfoLog(this.program));
            return;
        }
        gl.useProgram(this.program);
        console.log('[SHADER] ✅ Level', level, 'compilé');
    }

    compileShader(source, type) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('[SHADER] Compile:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    setupBuffers() {
        const gl = this.gl;
        if (!gl || !this.program) return;
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(this.program, 'aPosition');
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 8, 0);
    }

    animate = () => {
        const gl = this.gl;
        if (!gl || !this.program) { this.animationFrameId = requestAnimationFrame(this.animate); return; }
        this.time += 0.016;
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.program);
        gl.uniform2f(gl.getUniformLocation(this.program, 'uResolution'), this.canvas.width, this.canvas.height);
        gl.uniform1f(gl.getUniformLocation(this.program, 'uTime'), this.time);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        this.animationFrameId = requestAnimationFrame(this.animate);
    }

    destroy() {
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        if (this.gl && this.program) this.gl.deleteProgram(this.program);
    }
}
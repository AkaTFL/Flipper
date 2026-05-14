import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';

export class DMD {
    constructor() {
        this.width = 1024;
        this.height = 256;
        this.score = 0;

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.width, this.height, false);
        (document.getElementById('dmd') || document.body).appendChild(this.renderer.domElement);

        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-this.width / 2, this.width / 2, this.height / 2, -this.height / 2, 0.1, 10);
        this.camera.position.z = 1;

        this.txCanvas = document.createElement('canvas');
        this.txCanvas.width = this.width;
        this.txCanvas.height = this.height;
        this.ctx = this.txCanvas.getContext('2d');

        this.texture = new THREE.CanvasTexture(this.txCanvas);
        this.texture.minFilter = THREE.LinearFilter;
        this.texture.generateMipmaps = false;

        this.scene.add(new THREE.Mesh(
            new THREE.PlaneGeometry(this.width, this.height),
            new THREE.MeshBasicMaterial({ map: this.texture, transparent: true })
        ));

        window.addEventListener('message', e => {
            const d = e.data;
            if ((d?.type === 'score' || typeof d === 'number') && d) this.updateScore(d.score || d);
        });
        window.addEventListener('resize', () => this.onWindowResize());
        this.onWindowResize();
        this.renderer.setAnimationLoop(() => this.renderer.render(this.scene, this.camera));
        this.draw();
    }

    onWindowResize() {
        const w = window.innerWidth;
        const h = Math.max(120, Math.round(window.innerHeight));
        this.renderer.domElement.style.width = w + 'px';
        this.renderer.domElement.style.height = h + 'px';
    }

    draw() {
        const { ctx, txCanvas, score } = this;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, txCanvas.width, txCanvas.height);

        ctx.save();
        ctx.font = 'bold 160px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ff9900';
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 30;
        ctx.fillText(String(score).padStart(7, '0'), txCanvas.width / 2, txCanvas.height / 2);
        ctx.restore();

        ctx.fillStyle = 'rgba(255,153,0,0.08)';
        for (let y = 0; y < txCanvas.height; y += 8) {
            ctx.fillRect(0, y, txCanvas.width, 2);
        }

        this.texture.needsUpdate = true;
    }

    updateScore(newScore) {
        this.score = Number(newScore) || 0;
        this.draw();
    }
}

window.DMD = new DMD();

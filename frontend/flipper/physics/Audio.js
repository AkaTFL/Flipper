import Config from "./Config.js";

export class AudioManager {
    constructor() {
        this.audio = null;

        this.surfaces = Config.global.sounds.ball;

        this.rollingAudio = null;
        this.rollingInitialized = false;
    }

    // =====================================================
    // BASE AUDIO
    // =====================================================

    initSound(sound) {
        if (!sound) return null;

        const cfg = typeof sound === 'string'
            ? { file: sound, volume: 1 }
            : { file: sound.file, volume: sound.volume ?? 1 };

        let source;

        try {
            source = new URL(cfg.file, import.meta.url).href;
        } catch {
            console.warn('Chemin audio invalide:', cfg.file);
            return null;
        }

        const audio = new Audio(source);

        audio.preload = 'auto';
        audio.volume = cfg.volume ?? 1;

        audio.onerror = () => {
            console.warn(`Fichier manquant : ${cfg.file}`);
        };

        this.audio = audio;

        return audio;
    }

    playSound(sound = this.sound, volume) {
        this.audio = this.initSound(sound);

        if (!this.audio) return;

        this.audio.currentTime = 0;

        this.audio.play().catch(console.error);
        this.audio.volume = volume ?? 0.2;
    }

    stopSound(sound = this.sound) {
        if (sound && typeof sound.pause === 'function') {
            try {
                sound.pause();
                sound.currentTime = 0;
            } catch {}

            return;
        }

        if (!this.audio) return;

        try {
            this.audio.pause();
            this.audio.currentTime = 0;
        } catch {}
    }

    // =====================================================
    // ROLLING BALL
    // =====================================================
    updateRollingBall(speed = 0, ground) {
        if (!this.rollingInitialized) {
            if (this.initSound(ground) === null) {
                console.warn(`Impossible d'initialiser le son de roulement pour : ${ground}`);
                return;
            }
            this.rollingInitialized = true;
            
            this.audio.play().catch(console.error);
            this.audio.loop = true;
        }
        
        const { minSpeed, maxSpeed, minSound, maxSound, minPitch, maxPitch } = this.surfaces.param;

        if (!Number.isFinite(speed)) {
            this.audio.volume = 0;
            return;
        }
        // Si la vitesse est en-dessous du seuil, couper le son
        if (speed < minSpeed) {
            this.audio.volume = 0;
        } else {
            this.audio.volume = Math.min(maxSound, ((speed / maxSpeed) + minSound));
            this.audio.playbackRate = Math.min(maxPitch, Math.max(minPitch, (speed / maxSpeed)));
        }
    }

    // =====================================================
    // MUSIC
    // =====================================================

    playMusic(folderName, volume) {
        const files = Config[Config.currentLevel].soundtrack[folderName];

        if (!files?.length) {
            console.warn(`Aucun son dans : ${folderName}`);
            return;
        }

        const file = files[
            Math.floor(Math.random() * files.length)
        ];

        this.playSound(file, volume);
    }
}
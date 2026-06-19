import Config from "./Config.js";

let sharedAudioManager = null;

export function getSharedAudioManager() {
    if (!sharedAudioManager) {
        sharedAudioManager = new AudioManager();
    }
    return sharedAudioManager;
}

export class AudioManager {
    static getShared() {
        return getSharedAudioManager();
    }

    constructor() {
        this.surfaces = Config.global.sounds.ball;
        this.unlocked = false;
        this.rollingAudio = null;
        this.rollingInitialized = false;
        this.musicAudio = null;
        this.activeLoops = new Map();
    }

    normalizeSoundConfig(sound) {
        if (!sound) {
            return null;
        }

        if (typeof sound === 'string') {
            return { file: sound, volume: 1, loop: false };
        }

        return {
            file: sound.file,
            volume: sound.volume ?? 1,
            loop: sound.loop ?? false
        };
    }

    resolveSource(sound) {
        const cfg = this.normalizeSoundConfig(sound);
        if (!cfg?.file) {
            return null;
        }

        try {
            return {
                cfg,
                source: new URL(cfg.file, import.meta.url).href
            };
        } catch {
            console.warn('Chemin audio invalide:', cfg.file);
            return null;
        }
    }

    createAudio(sound) {
        const resolved = this.resolveSource(sound);
        if (!resolved) {
            return null;
        }

        const { cfg, source } = resolved;
        const audio = new Audio(source);

        audio.preload = 'auto';
        audio.volume = cfg.volume;
        audio.loop = cfg.loop;
        audio.onerror = () => {
            console.warn(`Fichier manquant : ${cfg.file}`);
        };

        return { audio, cfg };
    }

    unlock() {
        if (this.unlocked) {
            return;
        }

        this.unlocked = true;

        if (this.rollingAudio?.paused) {
            this.rollingAudio.play().catch(() => {});
        }

        if (this.musicAudio?.paused) {
            this.musicAudio.play().catch(() => {});
        }

        for (const audio of this.activeLoops.values()) {
            if (audio.paused) {
                audio.play().catch(() => {});
            }
        }
    }

    playSound(sound, volumeOverride) {
        const created = this.createAudio(sound);
        if (!created) {
            return null;
        }

        const { audio, cfg } = created;

        if (volumeOverride !== undefined) {
            audio.volume = volumeOverride;
        }

        audio.currentTime = 0;

        if (cfg.loop) {
            this.activeLoops.set(cfg.file, audio);
        }

        audio.play().catch((error) => {
            if (!this.unlocked) {
                console.warn('Audio bloque — interaction utilisateur requise:', cfg.file);
            } else {
                console.warn('Impossible de jouer le son:', cfg.file, error);
            }
        });

        return audio;
    }

    stopSound(sound) {
        const cfg = this.normalizeSoundConfig(sound);

        if (cfg?.file && this.activeLoops.has(cfg.file)) {
            const audio = this.activeLoops.get(cfg.file);
            audio.pause();
            audio.currentTime = 0;
            this.activeLoops.delete(cfg.file);
            return;
        }

        if (sound && typeof sound.pause === 'function') {
            sound.pause();
            sound.currentTime = 0;
        }
    }

    stopMusic() {
        if (!this.musicAudio) {
            return;
        }

        this.musicAudio.pause();
        this.musicAudio.currentTime = 0;
        this.musicAudio = null;
    }

    updateRollingBall(speed = 0, ground) {
        if (!this.rollingInitialized) {
            const created = this.createAudio(ground);
            if (!created) {
                console.warn('Impossible d\'initialiser le son de roulement');
                return;
            }

            this.rollingAudio = created.audio;
            this.rollingAudio.loop = true;
            this.rollingInitialized = true;

            if (this.unlocked) {
                this.rollingAudio.play().catch(() => {});
            }
        }

        const { minSpeed, maxSpeed, minSound, maxSound, minPitch, maxPitch } = this.surfaces.param;

        if (!Number.isFinite(speed) || speed < minSpeed) {
            this.rollingAudio.volume = 0;
            return;
        }

        if (this.rollingAudio.paused && this.unlocked) {
            this.rollingAudio.play().catch(() => {});
        }

        this.rollingAudio.volume = Math.min(maxSound, (speed / maxSpeed) + minSound);
        this.rollingAudio.playbackRate = Math.min(maxPitch, Math.max(minPitch, speed / maxSpeed));
    }

    playMusic(soundtrackOrFolder, volume = 0.2) {
        let files;

        if (typeof soundtrackOrFolder === 'string') {
            files = Config[Config.currentLevel].soundtrack?.[soundtrackOrFolder];
        } else if (soundtrackOrFolder && typeof soundtrackOrFolder === 'object') {
            const folderName = Object.keys(soundtrackOrFolder)[0];
            files = soundtrackOrFolder[folderName];
        }

        if (!files?.length) {
            console.warn('Aucune musique disponible pour le niveau courant');
            return;
        }

        const file = files[Math.floor(Math.random() * files.length)];

        this.stopMusic();

        const created = this.createAudio({ file, volume, loop: true });
        if (!created) {
            return;
        }

        this.musicAudio = created.audio;
        this.musicAudio.loop = true;

        if (this.unlocked) {
            this.musicAudio.play().catch(() => {});
        }
    }
}

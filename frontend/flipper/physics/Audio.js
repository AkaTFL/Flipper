import Config from "./Config.js";

export class AudioManager {
    constructor() {
        this.audio = null;

        // Réglages des surfaces
        this.surfaces = Config.sounds.ball
    }

    initSound(sound) {
        if (!sound) return null;
        
        const soundConfig = typeof sound === 'string' ? { file: sound, volume: 1 } : sound;

        let source;
        try {
            source = new URL(soundConfig.file, import.meta.url).href;
        } catch (e) {
            console.warn('Le chemin du fichier son est invalide:', soundConfig.file);
            return null;
        }
        this.audio = new Audio(source);
        this.audio.preload = 'auto';
        this.audio.volume = soundConfig.volume ?? 1;
        this.audio.onerror = () => {
            console.warn(`Le fichier son est manquant : ${soundConfig.file}`);
        };
        return this.audio;
    }

    playSound(sound = this.sound) {
        this.audio = this.initSound(sound);
        if (this.audio === null) return;

        this.audio.currentTime = 0;
        this.audio.play().catch((error) => {
            console.error('Impossible de lire le son:', error);
        });
    }
    
    playBallSound(surface = 'wood', speed = 1) {

        const data = this.surfaces[surface];
        if (!data) return;

        this.audio = this.initSound(data.sound);

        // Sécurité vitesse
        const clampedSpeed = Math.max(0.5, Math.min(speed, 5));

        // Fréquence / hauteur du son
        this.audio.playbackRate = data.pitch * clampedSpeed;

        // Volume dynamique
        this.audio.volume = Math.min(
            1,
            data.volume * (clampedSpeed / 2)
        );

        this.audio.currentTime = 0;

        this.audio.play().catch((error) => {
            console.error('Erreur audio :', error);
        });
    }
    
    playMusic(folderName) {
        // Récupère une liste de fichiers audio aléatoires du dossier
        const files = Config.sounds.soundtrack[folderName];
        
        if (!files || files.length === 0) {
            console.warn(`Aucun fichier audio trouvé pour le dossier: ${folderName}`);
            return;
        }
        
        // Choisir un fichier aléatoire
        const randomIndex = Math.floor(Math.random() * files.length);
        const randomFile = files[randomIndex];
        
        this.playSound(randomFile);
    }

    stopSound(sound = this.sound) {
        if (!this.audio) return;

        this.audio.pause();
    }
}
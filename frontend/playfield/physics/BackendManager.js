import Config, { NiveauActuel } from '../physics/Config.js';
import { AudioManager } from './Audio.js'

export class BackendManager {
    constructor(physics) {
        this.physics = physics;
        this.backendSocket = null;
        this.lastBackendMessage = null;
        this.lastScoreUpdate = null;
        this.activeSaveSlot = null;
        this.AudioManager = AudioManager.getShared();
    }

    connectBackend() {
        const protocol = globalThis.location?.protocol === 'https:' ? 'wss:' : 'ws:';
        const socketUrl = globalThis.location?.host
            ? `${protocol}//${globalThis.location.host}/ws`
            : 'ws://localhost:8080/ws';

        try {
            this.backendSocket = new globalThis.WebSocket(socketUrl);

            this.backendSocket.addEventListener('open', () => {
                console.info(`Backend connecté sur ${socketUrl}`);
            });

            this.backendSocket.addEventListener('message', (event) => {
                this.handleBackendMessage(event.data);
            });

            this.backendSocket.addEventListener('close', () => {
                console.warn('Connexion backend fermée');
            });

            this.backendSocket.addEventListener('error', (error) => {
                console.warn('Erreur WebSocket backend:', error);
            });
        } catch (error) {
            this.backendSocket = null;
            console.warn('Backend non connecté:', error);
        }
    }

    handleBackendMessage(rawData) {
        try {
            const message = JSON.parse(rawData);
            this.lastBackendMessage = message;
            
            if (message?.type === 'score_update') {
                this.lastScoreUpdate = message.payload ?? null;
            } else if (message?.type === 'player_state_update') {
                const wasGameOver = this.physics.gameOver;
                this.physics.gameOver = Boolean(message.payload?.gameOver);
                if (this.physics.gameOver && !wasGameOver) {
                    this.autoSaveActiveSlot();
                }
            } else if (message?.type === 'boss_state_update') {
                if ((message.payload?.hp ?? 1) <= 0) {
                    const previousLevel = Config.currentLevel;
                    const current = Number(Config.currentLevel.split('_')[1]);

                    if (current < 4) {
                        Config.currentLevel = `lvl_${current + 1}`;
                        // /!\ Note : Attention à l'import de NiveauActuel s'il est réassignable
                    } else {
                        Config.currentLevel = 'post_lvl';
                    }

                    if (previousLevel !== Config.currentLevel) {
                        this.autoSaveActiveSlot();
                        this.triggerLevelTransitionReload();
                    }
                }
            }

            if (typeof globalThis.dispatchEvent === 'function' && typeof globalThis.CustomEvent === 'function') {
                globalThis.dispatchEvent(new globalThis.CustomEvent('flipper:backend-message', {
                    detail: message
                }));
            }

            return message;
        } catch (error) {
            console.warn('Message backend invalide:', rawData, error);
            return null;
        }
    }

    triggerLevelTransitionReload() {
        this.freezeBallForReload();
        this.persistSessionForReload();
        this.physics.sceneManager?.triggerBossDefeatReload();
    }

    
    applyLevelConfig() {
        const levelConfig = Config[Config.currentLevel];
        if (!levelConfig) return;
    
        const multiplier = Config.forceMultiplier;
        this.physics.world.gravity = {
            x: levelConfig.gravity.x * multiplier,
            y: levelConfig.gravity.y * multiplier,
            z: levelConfig.gravity.z * multiplier
        };
    
        this.AudioManager.stopMusic?.();
        this.AudioManager.playMusic(levelConfig.soundtrack, 0.2);
        console.info(`Niveau actif : ${Config.currentLevel}`);
    }

    freezeBallForReload() {
        if (!this.physics.ball?.rigidBody) return;
        this.physics.ball.rigidBody.setEnabled(false);
        this.physics.ball.rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
        if (typeof this.physics.ball.rigidBody.setAngvel === 'function') {
            this.physics.ball.rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
        }
        if (this.physics.controls) {
            this.physics.controls.input.left = false;
            this.physics.controls.input.right = false;
        }
    }

    persistSessionForReload() {
        try {
            globalThis.sessionStorage?.setItem('flipperReloadSession', JSON.stringify({
                slot: this.physics.activeSaveSlot,
                level: this.currentLevelNumber()
            }));
        } catch (error) {
            console.warn('Impossible de persister la session avant reload', error);
        }
    }

    sendMessage(type, payload = {}) {
        const message = { type, payload };

        if (!this.backendSocket || this.backendSocket.readyState !== globalThis.WebSocket?.OPEN) {
            console.warn('[backend] socket indisponible, envoi ignoré', message);
            return false;
        }

        this.backendSocket.send(JSON.stringify(message));
        return true;
    }

    currentLevelNumber() {
        const parsed = Number(Config.currentLevel?.split('_')[1]);
        if (!Number.isFinite(parsed) || parsed < 1) {
            return 1;
        }
        return Math.min(4, parsed);
    }

    autoSaveActiveSlot() {
        if (!this.physics.activeSaveSlot) {
            return false;
        }
        return this.sendMessage('save_game', {
            slot: this.physics.activeSaveSlot,
            level: this.currentLevelNumber()
        });
    }

    whenBackendReady(timeoutMs = 5000) {
        return new Promise((resolve) => {
            const socket = this.backendSocket;
            const OPEN = globalThis.WebSocket?.OPEN ?? 1;

            if (!socket) {
                resolve(false);
                return;
            }
            if (socket.readyState === OPEN) {
                resolve(true);
                return;
            }

            let settled = false;
            const finish = (value) => {
                if (!settled) {
                    settled = true;
                    resolve(value);
                }
            };

            socket.addEventListener('open', () => finish(true), { once: true });
            setTimeout(() => finish(socket.readyState === OPEN), timeoutMs);
        });
    }
}
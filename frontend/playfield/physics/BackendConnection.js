import Config, { NiveauActuel } from '../../physics/Config.js';

export class BackendConnection {
    constructor(engine) {
        this.engine = engine;
        this.socket = null;
        this.lastMessage = null;
        this.lastScoreUpdate = null;
    }

    connect() {
        const protocol = globalThis.location?.protocol === 'https:' ? 'wss:' : 'ws:';
        const socketUrl = globalThis.location?.host
            ? `${protocol}//${globalThis.location.host}/ws`
            : 'ws://localhost:8080/ws';

        try {
            this.socket = new globalThis.WebSocket(socketUrl);

            this.socket.addEventListener('open', () => {
                console.info(`Backend connecté sur ${socketUrl}`);
            });

            this.socket.addEventListener('message', (event) => {
                this.handleMessage(event.data);
            });

            this.socket.addEventListener('close', () => {
                console.warn('Connexion backend fermée');
            });

            this.socket.addEventListener('error', (error) => {
                console.warn('Erreur WebSocket backend:', error);
            });
        } catch (error) {
            this.socket = null;
            console.warn('Backend non connecté:', error);
        }
    }

    handleMessage(rawData) {
        try {
            const message = JSON.parse(rawData);
            this.lastMessage = message;

            if (message?.type === 'score_update') {
                this.lastScoreUpdate = message.payload ?? null;
            } else if (message?.type === 'player_state_update') {
                const wasGameOver = this.engine.gameOver;
                this.engine.gameOver = Boolean(message.payload?.gameOver);
                // Sauvegarde sur game over (transition uniquement)
                if (this.engine.gameOver && !wasGameOver) {
                    this.autoSaveActiveSlot();
                }
            } else if (message?.type === 'boss_state_update') {
                if ((message.payload?.hp ?? 1) <= 0) {
                    const previousLevel = Config.currentLevel;
                    const current = Number(Config.currentLevel.split('_')[1]);

                    if (current < 4) {
                        Config.currentLevel = `lvl_${current + 1}`;
                        NiveauActuel += current + 1;
                    } else {
                        Config.currentLevel = 'post_lvl';
                        NiveauActuel = NiveauActuel;
                    }

                    if (previousLevel !== Config.currentLevel) {
                        this.engine.applyLevelConfig();
                        // Sauvegarde de checkpoint à chaque montée de niveau
                        this.autoSaveActiveSlot();
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

    sendMessage(type, payload = {}) {
        const message = { type, payload };

        console.log('[backend] envoi', message);

        if (!this.socket || this.socket.readyState !== globalThis.WebSocket?.OPEN) {
            console.warn('[backend] socket indisponible, envoi ignoré', message);
            return false;
        }

        this.socket.send(JSON.stringify(message));
        return true;
    }

    // Retour nécessaire : score mis à jour par rapport aux différents objets/multiplicateurs
    sendImpact(object, combo) {
        if (!object) {
            return false;
        }

        return this.sendMessage('impact', {
            objectId: object.objectId || null,
            objectType: object.objectType || object.constructor?.name?.toLowerCase() || 'object',
        });
    }

    // Numéro de niveau courant (1-4) dérivé de Config.currentLevel ('lvl_1'..'lvl_4', 'post_lvl')
    currentLevelNumber() {
        const parsed = Number(Config.currentLevel?.split('_')[1]);
        if (!Number.isFinite(parsed) || parsed < 1) {
            return 1;
        }
        return Math.min(4, parsed);
    }

    // Sauvegarde la partie courante dans le slot actif (avec son niveau)
    autoSaveActiveSlot() {
        if (!this.engine.activeSaveSlot) {
            return false;
        }
        return this.sendMessage('save_game', {
            slot: this.engine.activeSaveSlot,
            level: this.currentLevelNumber()
        });
    }

    // Résout quand la WebSocket backend est ouverte (ou au bout du timeout)
    whenReady(timeoutMs = 5000) {
        return new Promise((resolve) => {
            const socket = this.socket;
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
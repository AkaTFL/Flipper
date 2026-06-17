const DEFAULT_TEXT = 'En attente du backend...';

export class BackglassDisplay {
    constructor({
        documentRef = globalThis.document,
        backendUrl = 'ws://localhost:8080/ws'
    } = {}) {
        this.documentRef = documentRef;
        this.backendUrl = backendUrl;
        this.container = null;
        this.socket = null;
        this.lastMessage = null;

        // État des joueurs (1-4)
        this.players = {
            1: { score: 0, active: false },
            2: { score: 0, active: false },
            3: { score: 0, active: false },
            4: { score: 0, active: false }
        };

        // Crédits
        this.credits = 0;

        // État du jeu
        this.gameState = {
            status: 'waiting', // 'waiting' | 'playing' | 'gameover' | 'match'
            currentPlayer: null,
            gameOverPlayer: null,
            matchWinner: null
        };

        // Infos du combo et quêtes
        this.comboState = {
            score: 0,
            multiplier: 1,
            comboCount: 0
        };

        this.questState = {
            activeQuests: [],
            completedCount: 0,
            requiredCount: 0
        };

        // État du boss
        this.bossState = {
            active: false,
            hp: 0,
            maxHp: 0,
            damageTaken: 0,
            arrivalMessageUntil: 0
        };

        // Animations
        this.wheelEmojis = ['🎯', '💎', '⭐', '🔥', '🎲', '🎪', '🌟', '💫'];
        this.wheelEmojiIndex = 0;
        this.wheelRotationInterval = null;

        this.mount();
        this.connectBackend();
        this.startWheelAnimation();
    }

    mount(container = this.documentRef.getElementById('backglass')) {
        if (!container || this.container) {
            return this.container;
        }

        this.container = container;

        // Récupère les éléments du DOM
        this.playerIndicators = {};
        for (let i = 1; i <= 4; i++) {
            this.playerIndicators[i] = this.documentRef.querySelector(`[data-player="${i}"]`);
        }

        this.creditsValueEl = this.documentRef.querySelector('.credits-value');
        this.gameStatusEl = this.documentRef.querySelector('.game-status');
        this.comboEl = this.documentRef.getElementById('combo');
        this.questsEl = this.documentRef.getElementById('quests');
        this.wheelInnerEl = this.documentRef.querySelector('.wheel-inner');

        this.render();
        return this.container;
    }

    connectBackend() {
        if (typeof globalThis.WebSocket !== 'function') {
            console.log('[BACKGLASS] WebSocket non disponible');
            return;
        }

        try {
            this.socket = new globalThis.WebSocket(this.backendUrl);

            this.socket.addEventListener('open', () => {
                console.log('[BACKGLASS] connecté au backend:', this.backendUrl);
            });

            this.socket.addEventListener('message', (event) => {
                this.handleBackendMessage(event.data);
            });

            this.socket.addEventListener('close', () => {
                console.log('[BACKGLASS] connexion backend fermée');
            });

            this.socket.addEventListener('error', (error) => {
                console.warn('[BACKGLASS] erreur WebSocket backend:', error);
            });
        } catch (error) {
            console.warn('[BACKGLASS] impossible de se connecter au backend:', error);
        }
    }

    handleBackendMessage(rawData) {
        try {
            const message = JSON.parse(rawData);
            this.lastMessage = message;

            console.log('[BACKGLASS] message reçu:', message.type);

            // Route vers les bons handlers
            if (message?.type === 'game_state_update') {
                this.updateGameState(message);
            } else if (message?.type === 'score_update') {
                this.updateComboState(message);
            } else if (message?.type === 'quest_update') {
                this.updateQuestState(message);
            } else if (message?.type === 'boss_state_update') {
                this.updateBossState(message);
            } else if (message?.type === 'player_update') {
                this.updatePlayerState(message);
            } else if (message?.type === 'credits_update') {
                this.updateCredits(message);
            }

            this.render();
            return message;
        } catch (error) {
            console.warn('[BACKGLASS] message backend invalide:', rawData, error);
            return null;
        }
    }

    updateGameState(message) {
        const payload = message?.payload ?? {};
        
        if (payload.currentPlayer) {
            this.gameState.currentPlayer = Number(payload.currentPlayer);
        }

        if (payload.status) {
            this.gameState.status = String(payload.status).toLowerCase();
        }

        if (payload.gameOverPlayer) {
            this.gameState.gameOverPlayer = Number(payload.gameOverPlayer);
        }

        if (payload.matchWinner) {
            this.gameState.matchWinner = Number(payload.matchWinner);
        }
    }

    updatePlayerState(message) {
        const payload = message?.payload ?? {};

        if (Array.isArray(payload.players)) {
            payload.players.forEach(p => {
                const playerId = Number(p.id);
                if (playerId >= 1 && playerId <= 4) {
                    this.players[playerId] = {
                        score: Number(p.score ?? 0),
                        active: Boolean(p.active ?? false)
                    };
                }
            });
        }
    }

    updateCredits(message) {
        const payload = message?.payload ?? {};
        this.credits = Number(payload.credits ?? 0);
    }

    updateComboState(message) {
        if (message?.type !== 'score_update') {
            return;
        }

        const payload = message.payload ?? {};
        this.comboState = {
            score: Number(payload.score ?? 0),
            multiplier: Number(payload.comboMultiplier ?? 1),
            comboCount: Number(payload.comboCount ?? 0)
        };
    }

    updateQuestState(message) {
        if (message?.type !== 'quest_update') {
            return;
        }

        const payload = message.payload ?? {};
        this.questState = {
            activeQuests: Array.isArray(payload.activeQuests) ? payload.activeQuests : [],
            completedCount: Number(payload.completedCount ?? 0),
            requiredCount: Number(payload.requiredCount ?? 0)
        };
    }

    updateBossState(message) {
        if (message?.type !== 'boss_state_update') {
            return;
        }

        const payload = message.payload ?? {};
        const wasActive = this.bossState.active;
        const isActive = Boolean(payload.active);
        const mode = String(payload.mode ?? '');
        const bossJustArrived = isActive && (!wasActive || mode === 'boss_fight_started' || mode === 'boss_fight_activated');

        this.bossState = {
            active: isActive,
            hp: Number(payload.hp ?? 0),
            maxHp: Number(payload.maxHp ?? 0),
            damageTaken: Number(payload.damageTaken ?? 0),
            arrivalMessageUntil: bossJustArrived ? Date.now() + 3500 : this.bossState.arrivalMessageUntil
        };
    }

    startWheelAnimation() {
        // Change l'emoji de la roulette toutes les 200ms
        this.wheelRotationInterval = setInterval(() => {
            this.wheelEmojiIndex = (this.wheelEmojiIndex + 1) % this.wheelEmojis.length;
            if (this.wheelInnerEl) {
                this.wheelInnerEl.textContent = this.wheelEmojis[this.wheelEmojiIndex];
            }
        }, 200);
    }

    displayCombo() {
        const { score, multiplier, comboCount } = this.comboState;

        return [
            `MULTIPLICATEUR x${multiplier}`,
            `COMBOS ${comboCount}`
        ].join('\n');
    }

    displayQuests() {
        if (this.bossState.active) {
            return this.displayBossDamage();
        }

        const { activeQuests, completedCount, requiredCount } = this.questState;
        const questLines = activeQuests.length > 0
            ? activeQuests.map((quest) => {
                const prefix = quest.completed ? '✓' : '-';
                const label = String(quest.label ?? quest.id ?? 'QUÊTE').toUpperCase();
                const current = Number(quest.progress ?? 0);
                const target = Number(quest.target ?? 0);
                const progress = target > 0 ? `${current}/${target}` : `${current}`;
                return `${prefix} ${label} ${progress}`;
            })
            : ['AUCUNE QUÊTE ACTIVE'];

        return [
            `QUÊTES ${completedCount}/${requiredCount}`,
            ...questLines
        ].join('\n');
    }

    displayBossDamage() {
        const showArrivalMessage = Date.now() <= this.bossState.arrivalMessageUntil;
        const title = showArrivalMessage ? 'LE BOSS ARRIVE !' : 'MODE BOSS';
        const damageLine = this.bossState.damageTaken > 0
            ? `DÉGÂTS INFLIGÉS +${this.bossState.damageTaken}`
            : 'DÉGÂTS INFLIGÉS +0';
        const hpLine = this.bossState.maxHp > 0
            ? `PV BOSS ${Math.max(0, this.bossState.hp)}/${this.bossState.maxHp}`
            : 'PV BOSS --';

        return [title, damageLine, hpLine].join('\n');
    }

    updatePlayerIndicators() {
        for (let i = 1; i <= 4; i++) {
            const indicator = this.playerIndicators[i];
            if (!indicator) continue;

            const playerData = this.players[i];
            const isActive = this.gameState.currentPlayer === i;

            // Met à jour la classe active
            if (isActive) {
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
            }

            // Met à jour le score affiché
            const scoreEl = indicator.querySelector('.score-display');
            if (scoreEl) {
                scoreEl.textContent = playerData.score.toString();
            }
        }
    }

    updateGameStatus() {
        let statusText = '';
        let statusClass = 'normal';

        if (this.gameState.matchWinner !== null) {
            statusText = `🎉 MATCH! PLAYER ${this.gameState.matchWinner} GAGNE! 🎉`;
            statusClass = 'match';
        } else if (this.gameState.gameOverPlayer !== null) {
            statusText = `⚠️ GAME OVER - PLAYER ${this.gameState.gameOverPlayer}`;
            statusClass = 'gameover';
        } else if (this.gameState.currentPlayer !== null) {
            statusText = `▶ PLAYER ${this.gameState.currentPlayer} EN JEU`;
            statusClass = 'normal';
        } else {
            statusText = '-- EN ATTENTE --';
            statusClass = 'normal';
        }

        if (this.gameStatusEl) {
            this.gameStatusEl.textContent = statusText;
            this.gameStatusEl.className = `game-status ${statusClass}`;
        }
    }

    updateCreditsDisplay() {
        if (this.creditsValueEl) {
            this.creditsValueEl.textContent = this.credits.toString();
        }
    }

    render() {
        try {
            this.updatePlayerIndicators();
            this.updateCreditsDisplay();
            this.updateGameStatus();

            if (this.comboEl) {
                this.comboEl.textContent = this.displayCombo();
            }

            if (this.questsEl) {
                this.questsEl.textContent = this.displayQuests();
            }
        } catch (err) {
            console.error('[BACKGLASS] erreur lors du rendu:', err);
        }
    }

    destroy() {
        if (this.socket) {
            this.socket.close();
        }
        if (this.wheelRotationInterval) {
            clearInterval(this.wheelRotationInterval);
        }
    }
}
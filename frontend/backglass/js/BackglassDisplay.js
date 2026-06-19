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
            1: { score: 0, active: false, balls: 0 },
            2: { score: 0, active: false, balls: 0 },
            3: { score: 0, active: false, balls: 0 },
            4: { score: 0, active: false, balls: 0 }
        };

        // Crédits
        this.credits = 0;

        // État du jeu
        this.gameState = {
            status: 'waiting',
            currentPlayer: 1,
            gameOverPlayer: null,
            matchWinner: null
        };

        // Level actuel (1=Nature, 2=Eau, 3=Feu)
        this.currentLevel = 1;
        this.lastLevel = null;

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

        // Référence vers ShaderEffects (injectée après construction)
        this.shaderEffects = null;

        this.mount();
        this.connectBackend();
    }

    // ─────────────────────────────────────────────
    // INJECTION DU SHADER (appelé depuis index.html)
    // ─────────────────────────────────────────────
    setShaderEffects(shaderEffects) {
        this.shaderEffects = shaderEffects;
        // Applique le thème initial
        this.applyLevelTheme(this.currentLevel);
    }

    // ─────────────────────────────────────────────
    // GESTION DU LEVEL
    // ─────────────────────────────────────────────
    setLevel(level) {
        if (this.currentLevel === level) return;
        console.log(`[BACKGLASS] 🌍 Level changé: ${this.currentLevel} → ${level}`);
        this.currentLevel = level;
        this.applyLevelTheme(level);

        // Notifie le shader
        if (this.shaderEffects) {
            this.shaderEffects.setLevel(level);
        }
    }

    applyLevelTheme(level) {
        const body = this.documentRef.body;
        body.classList.remove('theme-nature', 'theme-water', 'theme-fire');
        if (level === 1) body.classList.add('theme-nature');
        else if (level === 2) body.classList.add('theme-water');
        else if (level === 3) body.classList.add('theme-fire');

        // Met à jour le titre animé
        const titleEl = this.documentRef.getElementById('elemental-title');
        if (titleEl) {
            titleEl.dataset.level = level;
        }

        console.log(`[BACKGLASS] 🎨 Thème level ${level} appliqué`);
    }

    mount(container = this.documentRef.getElementById('backglass')) {
        if (!container) {
            console.warn('[BACKGLASS] ⚠️ Conteneur #backglass non trouvé!');
            return null;
        }
        if (this.container) {
            console.log('[BACKGLASS] Déjà monté');
            return this.container;
        }

        this.container = container;
        console.log('[BACKGLASS] 📌 DOM monté');

        this.currentPlayerNameEl  = this.documentRef.getElementById('current-player-name');
        this.currentPlayerScoreEl = this.documentRef.getElementById('current-player-score');

        this.savedPlayerScoreEls = {};
        this.savedPlayerBallsEls = {};
        for (let i = 1; i <= 4; i++) {
            this.savedPlayerScoreEls[i] = this.documentRef.getElementById(`saved-score-${i}`);
            this.savedPlayerBallsEls[i] = this.documentRef.getElementById(`saved-balls-${i}`);
        }

        this.scoreToBeatEl    = this.documentRef.getElementById('score-to-beat');
        this.comboScoreEl     = this.documentRef.getElementById('combo-score');
        this.comboBallEls     = this.documentRef.querySelectorAll('.cball');
        this.bonusPillsRow    = this.documentRef.getElementById('bonus-pills-row');
        this.bonusSlotEls     = this.documentRef.querySelectorAll('.bonus-slot');

        // Boss video elements
        this.bossVideoOverlayEl = this.documentRef.getElementById('boss-video-overlay');
        this.bossVideoEl        = this.documentRef.getElementById('boss-video');
        this.bossHpBarEl        = this.documentRef.getElementById('boss-hp-bar');
        this.bossHpTextEl       = this.documentRef.getElementById('boss-hp-text');
        this.bossHpContainerEl  = this.documentRef.getElementById('boss-hp-container');

        this.render();
        console.log('[BACKGLASS] ✅ Rendu initial complété');
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
                console.log('[BACKGLASS] ✅ CONNECTÉ:', this.backendUrl);
                this.socket.send(JSON.stringify({ type: 'request_state', timestamp: Date.now() }));
            });
            this.socket.addEventListener('message', (event) => {
                this.handleBackendMessage(event.data);
            });
            this.socket.addEventListener('close', () => console.log('[BACKGLASS] ❌ Connexion fermée'));
            this.socket.addEventListener('error', (e) => console.warn('[BACKGLASS] ⚠️ WS Error:', e));
        } catch (error) {
            console.warn('[BACKGLASS] ⚠️ Connexion impossible:', error);
        }
    }

    handleBackendMessage(rawData) {
        try {
            const message = JSON.parse(rawData);
            this.lastMessage = message;

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
            } else if (message?.type === 'player_state_update') {
                this.updatePlayerStateDetailed(message);
            } else if (message?.type === 'credits_update') {
                this.updateCredits(message);
            } else if (message?.type === 'level_update') {
                this.updateLevel(message);
            }

            this.render();
            return message;
        } catch (error) {
            console.warn('[BACKGLASS] message invalide:', rawData, error);
            return null;
        }
    }

    // ─────────────────────────────────────────────
    // HANDLERS D'ÉTAT
    // ─────────────────────────────────────────────
    updateLevel(message) {
        const payload = message?.payload ?? {};
        const level = Number(payload.level ?? 1);
        if (level >= 1 && level <= 3) {
            this.setLevel(level);
        }
    }

    updateGameState(message) {
        const payload = message?.payload ?? {};
        if (payload.currentPlayer) this.gameState.currentPlayer = Number(payload.currentPlayer);
        if (payload.status)        this.gameState.status = String(payload.status).toLowerCase();
        if (payload.gameOverPlayer) this.gameState.gameOverPlayer = Number(payload.gameOverPlayer);
        if (payload.matchWinner)   this.gameState.matchWinner = Number(payload.matchWinner);
        // Le level peut aussi arriver via game_state_update
        if (payload.level) this.setLevel(Number(payload.level));
    }

    updatePlayerState(message) {
        const payload = message?.payload ?? {};
        if (Array.isArray(payload.players)) {
            payload.players.forEach(p => {
                const playerId = Number(p.id);
                if (playerId >= 1 && playerId <= 4) {
                    this.players[playerId] = {
                        score:  Number(p.score  ?? 0),
                        active: Boolean(p.active ?? false),
                        balls:  this.players[playerId]?.balls ?? 0
                    };
                }
            });
        }
    }

    updatePlayerStateDetailed(message) {
        const payload = message?.payload ?? {};
        const playerId = this.gameState.currentPlayer;
        if (playerId && playerId >= 1 && playerId <= 4) {
            if (!this.players[playerId]) this.players[playerId] = { score: 0, active: false, balls: 0 };
            if (typeof payload.balls === 'number') this.players[playerId].balls = payload.balls;
        }
    }

    updateCredits(message) {
        const payload = message?.payload ?? {};
        this.credits = Number(payload.credits ?? 0);
    }

    updateComboState(message) {
        if (message?.type !== 'score_update') return;
        const payload = message.payload ?? {};
        this.comboState = {
            score:      Number(payload.score           ?? 0),
            multiplier: Number(payload.comboMultiplier ?? 1),
            comboCount: Number(payload.comboCount      ?? 0)
        };
    }

    updateQuestState(message) {
        if (message?.type !== 'quest_update') return;
        const payload = message.payload ?? {};
        this.questState = {
            activeQuests:   Array.isArray(payload.activeQuests) ? payload.activeQuests : [],
            completedCount: Number(payload.completedCount ?? 0),
            requiredCount:  Number(payload.requiredCount  ?? 0)
        };
    }

    updateBossState(message) {
        if (message?.type !== 'boss_state_update') return;
        const payload = message.payload ?? {};
        const wasActive = this.bossState.active;
        const isActive  = Boolean(payload.active);
        const mode      = String(payload.mode ?? '');
        const bossJustArrived = isActive && (!wasActive || mode === 'boss_fight_started' || mode === 'boss_fight_activated');

        this.bossState = {
            active:              isActive,
            hp:                  Number(payload.hp         ?? 0),
            maxHp:               Number(payload.maxHp      ?? 0),
            damageTaken:         Number(payload.damageTaken ?? 0),
            arrivalMessageUntil: bossJustArrived ? Date.now() + 4000 : this.bossState.arrivalMessageUntil
        };

        if (bossJustArrived) {
            this.triggerBossVideoArrival();
        }
        if (!isActive && wasActive) {
            this.hideBossVideo();
        }
    }

    // ─────────────────────────────────────────────
    // BOSS VIDEO PAR LEVEL
    // ─────────────────────────────────────────────
    getBossVideoPath(level) {
        // Chaque level a sa vidéo de boss dans ./assets/
        if (level === 1) return './assets/video_boss1.mkv';
        if (level === 2) return './assets/video_boss2.mkv';
        if (level === 3) return './assets/video_boss3.mkv';
        return './assets/video_bossfinal.mkv';
    }

    triggerBossVideoArrival() {
        if (!this.bossVideoEl || !this.bossVideoOverlayEl) return;

        const videoPath = this.getBossVideoPath(this.currentLevel);
        console.log(`[BACKGLASS] 🎬 Boss arrive! Vidéo level ${this.currentLevel}: ${videoPath}`);

        this.bossVideoEl.src = videoPath;
        this.bossVideoEl.load();
        this.bossVideoEl.play().catch(e => console.warn('[BACKGLASS] Autoplay bloqué:', e));

        // Affiche l'overlay boss
        this.bossVideoOverlayEl.classList.add('active');

        // Affiche la barre de HP
        if (this.bossHpContainerEl) {
            this.bossHpContainerEl.classList.add('active');
        }
    }

    hideBossVideo() {
        if (!this.bossVideoOverlayEl) return;
        this.bossVideoOverlayEl.classList.remove('active');
        if (this.bossVideoEl) {
            this.bossVideoEl.pause();
            this.bossVideoEl.src = '';
        }
        if (this.bossHpContainerEl) {
            this.bossHpContainerEl.classList.remove('active');
        }
    }

    updateBossVideoDisplay() {
        if (!this.bossState.active) return;

        // Barre de HP
        const pct = this.bossState.maxHp > 0
            ? Math.max(0, (this.bossState.hp / this.bossState.maxHp) * 100)
            : 0;

        if (this.bossHpBarEl) {
            this.bossHpBarEl.style.width = `${pct}%`;
            // Danger si < 20%
            this.bossHpBarEl.classList.toggle('critical', pct < 20);
        }
        if (this.bossHpTextEl) {
            this.bossHpTextEl.textContent = `${Math.max(0, this.bossState.hp)} / ${this.bossState.maxHp}`;
        }
    }

    // ─────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────
    formatScore(score) {
        return score.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }

    // ─────────────────────────────────────────────
    // RENDU
    // ─────────────────────────────────────────────
    render() {
        try {
            if (!this.currentPlayerScoreEl) {
                this.currentPlayerScoreEl = this.documentRef.getElementById('current-player-score');
            }
            this.updateCurrentPlayerScore();
            this.updateSavedPlayers();
            this.updateComboDisplay();
            this.updateScoreToBeat();
            this.updateBossVideoDisplay();
        } catch (err) {
            console.error('[BACKGLASS] Erreur rendu:', err);
        }
    }

    updateCurrentPlayerScore() {
        const playerId = this.gameState.currentPlayer || 1;
        const score = this.comboState.score > 0
            ? this.comboState.score
            : (this.players[playerId]?.score ?? 0);

        if (this.currentPlayerNameEl) {
            this.currentPlayerNameEl.textContent = `Joueur ${playerId}`;
        }
        if (this.currentPlayerScoreEl) {
            this.currentPlayerScoreEl.textContent = this.formatScore(score);
        }
    }

    updateSavedPlayers() {
        for (let i = 1; i <= 4; i++) {
            if (this.savedPlayerScoreEls[i]) {
                this.savedPlayerScoreEls[i].textContent = this.formatScore(this.players[i]?.score ?? 0);
            }
            if (this.savedPlayerBallsEls[i]) {
                this.savedPlayerBallsEls[i].textContent = String(this.players[i]?.balls ?? 0);
            }
        }
    }

    updateComboDisplay() {
        if (this.comboScoreEl) {
            this.comboScoreEl.textContent = this.formatScore(this.comboState.score);
        }
        if (this.comboBallEls && this.comboBallEls.length > 0) {
            const comboCount = Math.min(this.comboState.comboCount, 5);
            this.comboBallEls.forEach((ball, index) => {
                ball.classList.toggle('empty', index >= comboCount);
            });
        }
        // Always update bonus slots (even on 0 to reset)
        this.triggerBonusGlow();
    }

    triggerBonusGlow() {
        if (!this.bonusSlotEls || this.bonusSlotEls.length === 0) return;
        const count = Math.min(this.comboState.comboCount, 5);

        this.bonusSlotEls.forEach(slot => {
            slot.classList.remove('lit', 'jackpot');
        });

        if (count <= 0) return;

        if (count >= 5) {
            // JACKPOT — tout clignote
            this.bonusSlotEls.forEach(slot => slot.classList.add('jackpot'));
        } else {
            // 1–4 combos : allume les N premiers slots
            let i = 0;
            for (const slot of this.bonusSlotEls) {
                if (i >= count) break;
                slot.classList.add('lit');
                i++;
            }
        }
    }

    updateScoreToBeat() {
        if (this.scoreToBeatEl) {
            this.scoreToBeatEl.textContent = this.formatScore(2500000);
        }
    }

    // ─────────────────────────────────────────────
    // DESTROY
    // ─────────────────────────────────────────────
    destroy() {
        if (this.socket) this.socket.close();
    }
}
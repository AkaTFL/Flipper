const DEFAULT_STATE = {
    score: 0,
    comboMultiplier: 1,
    comboScore: 0,
    comboCount: 0,
    bossActive: false,
    bossHp: 0,
    bossMaxHp: 0,
    playerHp: 0,
    playerMaxHp: 0,
    playerBalls: 0,
    playerMaxBalls: 0,
    gameOver: false,
    quests: [],
    questsCompleted: 0,
    questsRequired: 0
};

const QUEST_SHORT_LABELS = {
    score_2000: 'Points',
    score_3500: 'Points',
    combo_x3: 'COMBO X3',
    target_center_2: 'Centre cible',
    ramp_perfect_1: 'Rampe parfaite',
    ramp_simple_2: '2 rampes',
    loop_left_right: '2 loops',
    bumpers_5: '5 bumpers',
    survive_20s: 'Survivre 20s'
};

export class DmdDisplay {
    constructor({
        documentRef = globalThis.document,
        eventTarget = globalThis,
        rotationIntervalMs = 4000,
        comboResetMs = 2200
    } = {}) {
        this.documentRef = documentRef;
        this.eventTarget = eventTarget;
        this.rotationIntervalMs = rotationIntervalMs;
        this.comboResetMs = comboResetMs;
        this.state = { ...DEFAULT_STATE };
        this.container = null;
        this.lines = [];
        this.currentScreen = 0;
        this.rotationTimer = null;
        this.comboResetTimer = null;
        this.survivalTimer = null;
        this.survivalBaseProgress = 0;
        this.survivalStartedAt = 0;
        this.lastComboCount = 0;
        this.boundHandler = (event) => this.handleBackendEvent(event?.detail);
    }

    mount(container = this.documentRef?.body) {
        if (!this.documentRef || !container || this.container) {
            return this.container;
        }

        this.container = this.documentRef.createElement('aside');
        this.container.setAttribute('aria-label', 'Écran DMD');
        Object.assign(this.container.style, {
            position: 'fixed',
            top: '26px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: '25',
            width: '360px',
            minHeight: '96px',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '3px solid #1b1f2a',
            background: 'radial-gradient(circle at center, #142238 0%, #070a10 78%)',
            boxShadow: '0 0 0 4px rgba(0, 0, 0, 0.8), 0 12px 28px rgba(0, 0, 0, 0.5)',
            color: '#ffd15c',
            fontFamily: 'monospace',
            pointerEvents: 'none',
            textTransform: 'uppercase'
        });

        for (let i = 0; i < 4; i += 1) {
            const line = this.documentRef.createElement('div');
            Object.assign(line.style, {
                display: 'flex',
                justifyContent: 'space-between',
                gap: '12px',
                minHeight: '20px',
                fontSize: i === 0 ? '20px' : '15px',
                fontWeight: i === 0 ? '700' : '600',
                lineHeight: '1.25',
                letterSpacing: '0.04em',
                whiteSpace: 'pre',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textShadow: '0 0 10px rgba(255, 209, 92, 0.35)'
            });
            this.container.appendChild(line);
            this.lines.push(line);
        }

        container.appendChild(this.container);

        if (typeof this.eventTarget?.addEventListener === 'function') {
            this.eventTarget.addEventListener('flipper:backend-message', this.boundHandler);
        }

        this.startRotation();
        this.render();
        return this.container;
    }

    startRotation() {
        if (this.rotationTimer || typeof globalThis.setInterval !== 'function') {
            return;
        }

        this.rotationTimer = globalThis.setInterval(() => {
            if (this.isBossScreen()) {
                return;
            }

            this.currentScreen = this.currentScreen === 0 ? 1 : 0;
            this.render();
        }, this.rotationIntervalMs);
        if (typeof this.rotationTimer?.unref === 'function') {
            this.rotationTimer.unref();
        }
    }

    handleBackendEvent(message) {
        if (!message?.payload) {
            return false;
        }

        if (message.type === 'score_update') {
            const delta = Number(message.payload.delta ?? 0);
            const comboCount = Number(message.payload.comboCount ?? 0);
            this.state = {
                ...this.state,
                score: Number(message.payload.score ?? 0),
                comboMultiplier: Number(message.payload.comboMultiplier ?? 1),
                comboScore: this.nextComboSequenceScore(delta, comboCount),
                comboCount
            };
            this.lastComboCount = comboCount;
            this.scheduleComboReset();
        } else if (message.type === 'quest_update') {
            const incomingQuests = Array.isArray(message.payload.activeQuests) ? message.payload.activeQuests : [];
            const mode = message.payload.mode || '';
            this.state = {
                ...this.state,
                quests: this.mergeQuestUpdates(incomingQuests, mode),
                questsCompleted: Number(message.payload.completedCount ?? 0),
                questsRequired: Number(message.payload.requiredCount ?? 0)
            };
            this.state.questsCompleted = this.countCompletedQuests(this.state.quests);
            this.syncSurvivalTimer();
        } else if (message.type === 'boss_state_update') {
            this.state = {
                ...this.state,
                bossActive: Boolean(message.payload.active),
                bossHp: Number(message.payload.hp ?? 0),
                bossMaxHp: Number(message.payload.maxHp ?? 0)
            };
            if (this.state.bossActive) {
                this.stopSurvivalTimer();
            }
        } else if (message.type === 'player_state_update') {
            this.state = {
                ...this.state,
                playerHp: Number(message.payload.hp ?? 0),
                playerMaxHp: Number(message.payload.maxHp ?? 0),
                playerBalls: Number(message.payload.balls ?? 0),
                playerMaxBalls: Number(message.payload.maxBalls ?? 0),
                gameOver: Boolean(message.payload.gameOver)
            };
            if (Boolean(message.payload.lastBallLost)) {
                this.resetLocalSurvivalQuest();
            }
            if (this.state.gameOver) {
                this.stopSurvivalTimer();
            }
        } else {
            return false;
        }

        if (this.isBossScreen()) {
            this.currentScreen = 0;
        }

        this.render();
        return true;
    }

    render() {
        if (!this.container) {
            return;
        }

        const content = this.isBossScreen()
            ? this.buildBossScreen()
            : this.buildQuestPreparationScreen();

        for (let i = 0; i < this.lines.length; i += 1) {
            this.lines[i].textContent = content[i] || '';
        }
    }

    isBossScreen() {
        return this.state.bossActive || this.state.gameOver;
    }

    buildQuestPreparationScreen() {
        if (this.currentScreen === 1) {
            return this.buildQuestListScreen();
        }

        return [
            `SCORE ${this.formatScore(this.state.score)}`,
            this.formatSerieLine(),
            `BALLES ${this.formatBalls()}`,
            ''
        ];
    }

    buildQuestListScreen() {
        const lines = [`QUÊTES ${this.formatQuestProgress()}`];
        const quests = this.state.quests.slice(0, 3);

        if (quests.length === 0) {
            lines.push('EN ATTENTE');
        } else {
            for (const quest of quests) {
                const prefix = quest.completed ? '✓' : '-';
                lines.push(`${prefix} ${this.formatQuestLine(quest)}`);
            }
        }

        return lines;
    }

    buildBossScreen() {
        if (this.state.gameOver) {
            return [
                'GAME OVER',
                `SCORE ${this.formatScore(this.state.score)}`,
                `BALLES ${this.formatBalls()}`,
                ''
            ];
        }

        return [
            `SCORE ${this.formatScore(this.state.score)}`,
            `BOSS ${this.formatBossHp()}`,
            `JOUEUR ${this.formatPlayerHp()}`,
            `BALLES ${this.formatBalls()}`
        ];
    }

    formatScore(value) {
        return new Intl.NumberFormat('fr-FR').format(Math.max(0, Number(value) || 0));
    }

    formatCombo() {
        return Math.max(1, Number(this.state.comboMultiplier) || 1);
    }

    formatSerieLine() {
        const serie = `SÉRIE +${this.formatScore(this.state.comboScore)}`;
        return `${serie.padEnd(22, ' ')}MULT x${this.formatCombo()}`;
    }

    scheduleComboReset() {
        if (typeof globalThis.clearTimeout === 'function' && this.comboResetTimer) {
            globalThis.clearTimeout(this.comboResetTimer);
        }

        if (typeof globalThis.setTimeout !== 'function') {
            return;
        }

        this.comboResetTimer = globalThis.setTimeout(() => {
            this.state = {
                ...this.state,
                comboMultiplier: 1,
                comboScore: 0,
                comboCount: 0
            };
            this.lastComboCount = 0;
            this.render();
        }, this.comboResetMs);

        if (typeof this.comboResetTimer?.unref === 'function') {
            this.comboResetTimer.unref();
        }
    }

    nextComboSequenceScore(delta, comboCount) {
        if (comboCount <= 0 || delta <= 0) {
            return 0;
        }

        if (comboCount <= 1 || comboCount <= this.lastComboCount) {
            return delta;
        }

        return this.state.comboScore + delta;
    }

    mergeQuestUpdates(incomingQuests, mode) {
        if (mode === 'quest_ball_reset') {
            return incomingQuests;
        }

        return incomingQuests.map((incomingQuest) => {
            if (incomingQuest.id !== 'survive_20s') {
                return incomingQuest;
            }

            const currentQuest = this.state.quests.find((quest) => quest.id === incomingQuest.id);
            if (!currentQuest) {
                return incomingQuest;
            }

            const currentProgress = Number(currentQuest.progress ?? 0);
            const incomingProgress = Number(incomingQuest.progress ?? 0);
            if (currentQuest.completed || currentProgress > incomingProgress) {
                return {
                    ...incomingQuest,
                    progress: currentProgress,
                    completed: currentQuest.completed
                };
            }

            return incomingQuest;
        });
    }

    formatQuestProgress() {
        if (this.state.questsRequired <= 0) {
            return '0/3';
        }

        return `${this.state.questsCompleted}/${this.state.questsRequired}`;
    }

    formatBalls() {
        if (this.state.playerMaxBalls <= 0) {
            return '--';
        }

        return `${this.state.playerBalls}/${this.state.playerMaxBalls}`;
    }

    formatBossHp() {
        if (this.state.bossMaxHp <= 0) {
            return '--';
        }

        return `${Math.max(0, this.state.bossHp)}/${this.state.bossMaxHp}`;
    }

    formatPlayerHp() {
        if (this.state.playerMaxHp <= 0) {
            return '--';
        }

        return `${Math.max(0, this.state.playerHp)}/${this.state.playerMaxHp}`;
    }

    shortenText(text, maxLength) {
        const value = String(text || '');
        if (value.length <= maxLength) {
            return value;
        }

        return `${value.slice(0, maxLength - 1)}…`;
    }

    formatQuestLine(quest) {
        const progress = Number(quest.progress ?? 0);
        const target = Number(quest.target ?? 0);
        const hasProgress = target > 0;
        const label = this.getQuestShortLabel(quest);

        if (!hasProgress) {
            return this.shortenText(label, 24);
        }

        const suffix = quest.id === 'survive_20s' ? 's' : '';
        return `${label} ${progress}/${target}${suffix}`;
    }

    getQuestShortLabel(quest) {
        return QUEST_SHORT_LABELS[quest.id] || this.shortenText(quest.label, 14);
    }

    syncSurvivalTimer() {
        const quest = this.state.quests.find((item) => item.id === 'survive_20s');
        if (!quest || quest.completed || this.isBossScreen()) {
            this.stopSurvivalTimer();
            return;
        }

        const progress = Number(quest.progress ?? 0);
        if (this.survivalTimer) {
            if (progress < this.survivalBaseProgress) {
                this.survivalBaseProgress = progress;
                this.survivalStartedAt = Date.now();
            }
            return;
        }

        this.survivalBaseProgress = progress;
        this.survivalStartedAt = Date.now();

        if (this.survivalTimer || typeof globalThis.setInterval !== 'function') {
            return;
        }

        this.survivalTimer = globalThis.setInterval(() => {
            this.updateLocalSurvivalQuest();
        }, 1000);

        if (typeof this.survivalTimer?.unref === 'function') {
            this.survivalTimer.unref();
        }
    }

    updateLocalSurvivalQuest() {
        const elapsedSeconds = Math.floor((Date.now() - this.survivalStartedAt) / 1000);
        let changed = false;

        this.state = {
            ...this.state,
            quests: this.state.quests.map((quest) => {
                if (quest.id !== 'survive_20s' || quest.completed) {
                    return quest;
                }

                const target = Number(quest.target ?? 0);
                const progress = Math.min(target, this.survivalBaseProgress + elapsedSeconds);
                if (progress === quest.progress) {
                    return quest;
                }

                changed = true;
                return {
                    ...quest,
                    progress,
                    completed: target > 0 && progress >= target
                };
            })
        };

        this.state = {
            ...this.state,
            questsCompleted: this.countCompletedQuests(this.state.quests)
        };

        if (changed) {
            this.render();
        }

        const survivalQuest = this.state.quests.find((quest) => quest.id === 'survive_20s');
        if (!survivalQuest || survivalQuest.completed) {
            this.stopSurvivalTimer();
        }
    }

    stopSurvivalTimer() {
        if (typeof globalThis.clearInterval === 'function' && this.survivalTimer) {
            globalThis.clearInterval(this.survivalTimer);
        }

        this.survivalTimer = null;
        this.survivalBaseProgress = 0;
        this.survivalStartedAt = 0;
    }

    resetLocalSurvivalQuest() {
        this.stopSurvivalTimer();

        this.state = {
            ...this.state,
            quests: this.state.quests.map((quest) => {
                if (quest.id !== 'survive_20s' || quest.completed) {
                    return quest;
                }

                return {
                    ...quest,
                    progress: 0
                };
            })
        };

        this.state.questsCompleted = this.countCompletedQuests(this.state.quests);
        this.syncSurvivalTimer();
    }

    countCompletedQuests(quests) {
        return quests.filter((quest) => quest.completed).length;
    }
}

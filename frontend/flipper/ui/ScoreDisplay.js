const DEFAULT_STATE = {
    score: 0,
    comboMultiplier: 1,
    comboCount: 0,
    delta: 0,
    objectType: '',
    bossActive: false,
    bossHp: 0,
    bossMaxHp: 0,
    bossDamageTaken: 0,
    bossDefeated: false,
    playerHp: 0,
    playerMaxHp: 0,
    playerBalls: 0,
    playerMaxBalls: 0,
    playerLastDamageTaken: 0,
    playerLastBallLost: false,
    gameOver: false,
    quests: [],
    questsCompleted: 0,
    questsRequired: 0,
    questsDone: false
};

export class ScoreDisplay {
    constructor({ documentRef = globalThis.document, eventTarget = globalThis } = {}) {
        this.documentRef = documentRef;
        this.eventTarget = eventTarget;
        this.state = { ...DEFAULT_STATE };
        this.container = null;
        this.scoreValue = null;
        this.comboValue = null;
        this.deltaValue = null;
        this.detailValue = null;
        this.bossValue = null;
        this.bossDetailValue = null;
        this.playerValue = null;
        this.playerBallsValue = null;
        this.playerDetailValue = null;
        this.questValue = null;
        this.controlsContainer = null;
        this.saveContainer = null;
        this.saveStatusValue = null;
        this.saveSlotSelect = null;
        this.onSaveSlot = null;
        this.onLoadSlot = null;
        this.boundHandler = (event) => this.handleBackendEvent(event?.detail);
    }

    mount(container = this.documentRef?.body) {
        if (!this.documentRef || !container || this.container) {
            return this.container;
        }

        this.container = this.documentRef.createElement('aside');
        this.container.setAttribute('aria-label', 'Flipper score display');
        Object.assign(this.container.style, {
            position: 'fixed',
            top: '24px',
            left: '24px',
            zIndex: '20',
            width: '260px',
            maxHeight: '86vh',
            overflow: 'hidden',
            padding: '16px 18px',
            borderRadius: '14px',
            border: '1px solid rgba(98, 255, 168, 0.22)',
            background: 'linear-gradient(180deg, rgba(9, 12, 20, 0.92) 0%, rgba(5, 7, 14, 0.88) 100%)',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35)',
            color: '#dfffe9',
            fontFamily: 'monospace',
            pointerEvents: 'none'
        });

        const title = this.documentRef.createElement('div');
        title.textContent = 'SCORE';
        Object.assign(title.style, {
            fontSize: '13px',
            letterSpacing: '0.28em',
            opacity: '0.78',
            marginBottom: '8px'
        });

        this.scoreValue = this.documentRef.createElement('div');
        Object.assign(this.scoreValue.style, {
            fontSize: '36px',
            fontWeight: '700',
            lineHeight: '1',
            color: '#7effb3',
            textShadow: '0 0 18px rgba(126, 255, 179, 0.28)',
            marginBottom: '14px'
        });

        this.comboValue = this.documentRef.createElement('div');
        Object.assign(this.comboValue.style, {
            fontSize: '14px',
            marginBottom: '8px',
            color: '#d4f8ff'
        });

        this.deltaValue = this.documentRef.createElement('div');
        Object.assign(this.deltaValue.style, {
            fontSize: '16px',
            fontWeight: '700',
            marginBottom: '8px',
            color: '#ffd37a'
        });

        this.detailValue = this.documentRef.createElement('div');
        Object.assign(this.detailValue.style, {
            fontSize: '12px',
            opacity: '0.84',
            color: '#c8d6ea'
        });

        this.bossValue = this.documentRef.createElement('div');
        Object.assign(this.bossValue.style, {
            fontSize: '12px',
            marginTop: '10px',
            paddingTop: '10px',
            borderTop: '1px solid rgba(126, 255, 179, 0.14)',
            color: '#ffb3ce'
        });

        this.bossDetailValue = this.documentRef.createElement('div');
        Object.assign(this.bossDetailValue.style, {
            fontSize: '11px',
            marginTop: '6px',
            color: '#ffd1a6',
            opacity: '0.92'
        });

        this.playerValue = this.documentRef.createElement('div');
        Object.assign(this.playerValue.style, {
            fontSize: '12px',
            marginTop: '10px',
            paddingTop: '10px',
            borderTop: '1px solid rgba(126, 255, 179, 0.14)',
            color: '#b8d7ff'
        });

        this.playerDetailValue = this.documentRef.createElement('div');
        Object.assign(this.playerDetailValue.style, {
            fontSize: '11px',
            marginTop: '6px',
            color: '#c7ffbd',
            opacity: '0.92'
        });

        this.playerBallsValue = this.documentRef.createElement('div');
        Object.assign(this.playerBallsValue.style, {
            fontSize: '11px',
            marginTop: '6px',
            color: '#b8d7ff',
            opacity: '0.94'
        });

        this.questValue = this.documentRef.createElement('div');
        Object.assign(this.questValue.style, {
            fontSize: '11px',
            marginTop: '10px',
            paddingTop: '10px',
            borderTop: '1px solid rgba(126, 255, 179, 0.14)',
            color: '#e7ffd0',
            whiteSpace: 'pre-line',
            overflowWrap: 'break-word',
            maxHeight: '180px',
            overflowY: 'auto'
        });

        this.container.appendChild(title);
        this.container.appendChild(this.scoreValue);
        this.container.appendChild(this.comboValue);
        this.container.appendChild(this.deltaValue);
        this.container.appendChild(this.detailValue);
        this.container.appendChild(this.bossValue);
        this.container.appendChild(this.bossDetailValue);
        this.container.appendChild(this.playerValue);
        this.container.appendChild(this.playerBallsValue);
        this.container.appendChild(this.playerDetailValue);
        this.container.appendChild(this.questValue);
        container.appendChild(this.container);
        this.mountControlsHelp(container);
        this.mountSaveControls(container);

        if (typeof this.eventTarget?.addEventListener === 'function') {
            this.eventTarget.addEventListener('flipper:backend-message', this.boundHandler);
        }

        this.render();
        return this.container;
    }

    mountControlsHelp(container) {
        this.controlsContainer = this.documentRef.createElement('aside');
        this.controlsContainer.setAttribute('aria-label', 'Flipper controls help');
        Object.assign(this.controlsContainer.style, {
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: '20',
            minWidth: '240px',
            padding: '16px 18px',
            borderRadius: '14px',
            border: '1px solid rgba(126, 215, 255, 0.22)',
            background: 'linear-gradient(180deg, rgba(9, 12, 20, 0.92) 0%, rgba(5, 7, 14, 0.88) 100%)',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35)',
            color: '#dff5ff',
            fontFamily: 'monospace',
            pointerEvents: 'none'
        });

        const title = this.documentRef.createElement('div');
        title.textContent = 'CONTRÔLES';
        Object.assign(title.style, {
            fontSize: '13px',
            letterSpacing: '0.22em',
            opacity: '0.78',
            marginBottom: '10px'
        });

        this.controlsContainer.appendChild(title);

        const controls = [
            ['Q', 'Flipper gauche'],
            ['D', 'Flipper droit'],
            ['Espace', 'Lancer la bille / démarrer'],
            ['B', 'Activer / désactiver le boss'],
            ['H', 'Test attaque boss: -20 HP'],
            ['L', 'Test perte de balle']
        ];

        for (const [key, label] of controls) {
            this.controlsContainer.appendChild(this.createControlLine(key, label));
        }

        container.appendChild(this.controlsContainer);
    }

    mountSaveControls(container) {
        this.saveContainer = this.documentRef.createElement('aside');
        this.saveContainer.setAttribute('aria-label', 'Flipper save slots');
        Object.assign(this.saveContainer.style, {
            position: 'fixed',
            right: '24px',
            top: '272px',
            zIndex: '20',
            width: '280px',
            padding: '16px 18px',
            borderRadius: '14px',
            border: '1px solid rgba(255, 211, 122, 0.22)',
            background: 'linear-gradient(180deg, rgba(11, 10, 18, 0.94) 0%, rgba(5, 7, 14, 0.9) 100%)',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35)',
            color: '#fff2d1',
            fontFamily: 'monospace',
            pointerEvents: 'auto'
        });

        const title = this.documentRef.createElement('div');
        title.textContent = 'SAUVEGARDES';
        Object.assign(title.style, {
            fontSize: '13px',
            letterSpacing: '0.22em',
            opacity: '0.8',
            marginBottom: '10px'
        });

        this.saveStatusValue = this.documentRef.createElement('div');
        Object.assign(this.saveStatusValue.style, {
            fontSize: '11px',
            marginBottom: '12px',
            minHeight: '1.4em',
            color: '#ffd37a',
            opacity: '0.95'
        });

        this.saveHelpValue = this.documentRef.createElement('div');
        Object.assign(this.saveHelpValue.style, {
            fontSize: '11px',
            marginBottom: '12px',
            color: '#c8d6ea',
            opacity: '0.9',
            lineHeight: '1.35'
        });
        this.saveHelpValue.textContent = 'Choisis un emplacement mémoire parmi 1 à 4 pour enregistrer ou reprendre la partie.';

        this.saveContainer.appendChild(title);
        this.saveContainer.appendChild(this.saveStatusValue);
        this.saveContainer.appendChild(this.saveHelpValue);

        this.saveContainer.appendChild(this.createSaveSlotSelector());
        this.saveContainer.appendChild(this.createSaveActionsRow());

        container.appendChild(this.saveContainer);
        this.updateSaveStatus('Choisis un slot pour sauvegarder ou charger');
    }

    createSaveSlotSelector() {
        const row = this.documentRef.createElement('div');
        Object.assign(row.style, {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px'
        });

        const label = this.documentRef.createElement('span');
        label.textContent = 'Emplacement';
        Object.assign(label.style, {
            minWidth: '72px',
            fontSize: '12px',
            color: '#fff2d1'
        });

        this.saveSlotSelect = this.documentRef.createElement('select');
        this.saveSlotSelect.setAttribute('aria-label', 'Slot de sauvegarde');
        Object.assign(this.saveSlotSelect.style, {
            flex: '1',
            padding: '6px 10px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 211, 122, 0.28)',
            background: '#0e0d14',
            color: '#fff2d1',
            fontFamily: 'inherit',
            fontSize: '12px'
        });

        for (let slot = 1; slot <= 4; slot += 1) {
            const option = this.documentRef.createElement('option');
            option.value = String(slot);
            option.textContent = `Emplacement ${slot}`;
            this.saveSlotSelect.appendChild(option);
        }

        row.appendChild(label);
        row.appendChild(this.saveSlotSelect);
        return row;
    }

    createSaveActionsRow() {
        const row = this.documentRef.createElement('div');
        Object.assign(row.style, {
            display: 'flex',
            gap: '8px'
        });

        const saveButton = this.documentRef.createElement('button');
        saveButton.type = 'button';
        saveButton.textContent = 'Sauvegarder';
        Object.assign(saveButton.style, this.createSlotButtonStyle('#7effb3', '#132116'));
        this.bindButtonAction(saveButton, () => this.triggerSlotAction('save'));

        const loadButton = this.documentRef.createElement('button');
        loadButton.type = 'button';
        loadButton.textContent = 'Charger';
        Object.assign(loadButton.style, this.createSlotButtonStyle('#7ed7ff', '#10202a'));
        this.bindButtonAction(loadButton, () => this.triggerSlotAction('load'));

        row.appendChild(saveButton);
        row.appendChild(loadButton);
        return row;
    }

    createSlotButtonStyle(accentColor, backgroundColor) {
        return {
            flex: '1',
            padding: '6px 10px',
            borderRadius: '8px',
            border: `1px solid ${accentColor}44`,
            background: backgroundColor,
            color: accentColor,
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '12px'
        };
    }

    bindButtonAction(button, handler) {
        if (typeof button?.addEventListener === 'function') {
            button.addEventListener('click', handler);
            return;
        }

        button.onclick = handler;
    }

    updateSaveStatus(message) {
        if (this.saveStatusValue) {
            this.saveStatusValue.textContent = message;
        }
    }

    getSelectedSaveSlot() {
        const slot = Number(this.saveSlotSelect?.value ?? 1);
        if (Number.isInteger(slot) && slot >= 1 && slot <= 4) {
            return slot;
        }

        return 1;
    }

    triggerSlotAction(action) {
        const slot = this.getSelectedSaveSlot();

        if (action === 'save' && typeof this.onSaveSlot === 'function') {
            this.onSaveSlot(slot);
            this.updateSaveStatus(`Sauvegarde de l'emplacement ${slot} en cours...`);
        }

        if (action === 'load' && typeof this.onLoadSlot === 'function') {
            this.onLoadSlot(slot);
            this.updateSaveStatus(`Chargement de l'emplacement ${slot} en cours...`);
        }
    }

    createControlLine(key, label) {
        const line = this.documentRef.createElement('div');
        Object.assign(line.style, {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '8px',
            fontSize: '12px',
            color: '#c8d6ea'
        });

        const keyElement = this.documentRef.createElement('span');
        keyElement.textContent = key;
        Object.assign(keyElement.style, {
            minWidth: '52px',
            padding: '3px 6px',
            borderRadius: '6px',
            border: '1px solid rgba(126, 215, 255, 0.24)',
            color: '#7ed7ff',
            textAlign: 'center'
        });

        const labelElement = this.documentRef.createElement('span');
        labelElement.textContent = label;

        line.appendChild(keyElement);
        line.appendChild(labelElement);
        return line;
    }

    handleBackendEvent(message) {
        if (!message?.payload) {
            return false;
        }

        if (message.type === 'score_update') {
            this.state = {
                ...this.state,
                score: Number(message.payload.score ?? 0),
                comboMultiplier: Number(message.payload.comboMultiplier ?? 1),
                comboCount: Number(message.payload.comboCount ?? 0),
                delta: Number(message.payload.delta ?? 0),
                objectType: message.payload.objectType ?? ''
            };
        } else if (message.type === 'boss_state_update') {
            this.state = {
                ...this.state,
                bossActive: Boolean(message.payload.active),
                bossHp: Number(message.payload.hp ?? 0),
                bossMaxHp: Number(message.payload.maxHp ?? 0),
                bossDamageTaken: Number(message.payload.damageTaken ?? 0),
                bossDefeated: Boolean(message.payload.defeated)
            };
        } else if (message.type === 'player_state_update') {
            this.state = {
                ...this.state,
                playerHp: Number(message.payload.hp ?? 0),
                playerMaxHp: Number(message.payload.maxHp ?? 0),
                playerBalls: Number(message.payload.balls ?? 0),
                playerMaxBalls: Number(message.payload.maxBalls ?? 0),
                playerLastDamageTaken: Number(message.payload.lastDamageTaken ?? 0),
                playerLastBallLost: Boolean(message.payload.lastBallLost),
                gameOver: Boolean(message.payload.gameOver)
            };
        } else if (message.type === 'quest_update') {
            this.state = {
                ...this.state,
                quests: Array.isArray(message.payload.activeQuests) ? message.payload.activeQuests : [],
                questsCompleted: Number(message.payload.completedCount ?? 0),
                questsRequired: Number(message.payload.requiredCount ?? 0),
                questsDone: Boolean(message.payload.allCompleted)
            };
        } else if (message.type === 'game_save_status') {
            const slot = Number(message.payload.slot ?? 0);
            const action = String(message.payload.action ?? '');
            const note = String(message.payload.message ?? '');
            const label = action === 'saved'
                ? `Emplacement ${slot}: sauvegardé`
                : action === 'loaded'
                    ? `Emplacement ${slot}: chargé`
                    : note || 'Sauvegarde indisponible';

            this.updateSaveStatus(label);
        } else if (message.type === 'game_started') {
            this.updateSaveStatus('Partie lancée');
        } else {
            return false;
        }

        this.render();
        return true;
    }

    render() {
        if (!this.container) {
            return;
        }

        this.scoreValue.textContent = this.formatScore(this.state.score);
        this.comboValue.textContent = `Combo x${Math.max(1, this.state.comboMultiplier)}`;
        this.deltaValue.textContent = this.state.delta > 0 ? `+${this.state.delta}` : '+0';
        this.detailValue.textContent = this.state.objectType
            ? `Dernier impact: ${this.state.objectType}`
            : 'En attente des impacts';
        this.bossValue.textContent = this.formatBossLabel();
        this.bossDetailValue.textContent = this.formatBossDetail();
        this.playerValue.textContent = this.formatPlayerLabel();
        this.playerBallsValue.textContent = this.formatPlayerBalls();
        this.playerDetailValue.textContent = this.formatPlayerDetail();
        this.questValue.textContent = this.formatQuests();
    }

    formatScore(value) {
        return new Intl.NumberFormat('fr-FR').format(Math.max(0, Number(value) || 0));
    }

    formatBossLabel() {
        if (this.state.bossMaxHp <= 0) {
            return 'Boss: en attente';
        }

        if (this.state.bossDefeated) {
            return `Boss: vaincu (${this.state.bossHp}/${this.state.bossMaxHp})`;
        }

        return `Boss: ${Math.max(0, this.state.bossHp)}/${this.state.bossMaxHp}${this.state.bossActive ? ' (actif)' : ' (inactif)'}`;
    }

    formatBossDetail() {
        if (this.state.bossMaxHp <= 0) {
            return 'Dégâts boss: --';
        }

        return this.state.bossDamageTaken > 0
            ? `Derniers dégâts boss: -${this.state.bossDamageTaken}`
            : 'Dégâts boss: en attente';
    }

    formatPlayerLabel() {
        if (this.state.playerMaxHp <= 0) {
            return 'Joueur: en attente';
        }

        if (this.state.gameOver) {
            return `Joueur: game over (${this.state.playerBalls}/${this.state.playerMaxBalls} balles)`;
        }

        return `Joueur: ${this.state.playerHp}/${this.state.playerMaxHp} HP`;
    }

    formatPlayerDetail() {
        if (this.state.playerMaxHp <= 0) {
            return 'État joueur: --';
        }

        if (this.state.playerLastBallLost) {
            return 'Balle perdue';
        }

        if (this.state.playerLastDamageTaken > 0) {
            return `Derniers dégâts joueur: -${this.state.playerLastDamageTaken}`;
        }

        return 'Dégâts joueur: en attente';
    }

    formatPlayerBalls() {
        if (this.state.playerMaxBalls <= 0) {
            return 'Balles: --';
        }

        return `Balles: ${this.state.playerBalls}/${this.state.playerMaxBalls}`;
    }

    formatQuests() {
        if (!Array.isArray(this.state.quests) || this.state.quests.length === 0) {
            return 'Quêtes: en attente';
        }

        const lines = [`Quêtes: ${this.state.questsCompleted}/${this.state.questsRequired}`];
        for (const quest of this.state.quests) {
            const status = quest.completed ? '✓' : '-';
            lines.push(`${status} ${quest.label}: ${quest.progress}/${quest.target}`);
        }

        if (this.state.questsDone) {
            lines.push('Boss débloqué');
        }

        return lines.join('\n');
    }

    setSaveSlotHandler(handler) {
        this.onSaveSlot = handler;
    }

    setLoadSlotHandler(handler) {
        this.onLoadSlot = handler;
    }
}

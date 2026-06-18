const DEFAULT_TEXT = 'En attente du backend...';

export class BackglassDisplay {
    constructor({
        documentRef = globalThis.document,
        backendUrl = globalThis.location?.host
            ? `${globalThis.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${globalThis.location.host}/ws`
            : 'ws://localhost:8080/ws'
    } = {}) {
        this.documentRef = documentRef;
        this.backendUrl = backendUrl;
        this.container = null;
        this.socket = null;
        this.lastMessage = null;
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
        this.bossState = {
            active: false,
            hp: 0,
            maxHp: 0,
            damageTaken: 0,
            arrivalMessageUntil: 0
        };
        this.buttonEvents = [];
        this.mount();
        this.connectBackend();
    }

    mount(container = this.documentRef.getElementById('backglass')) {
        if (!container || this.container) {
            return this.container;
        }

        this.container = container;

        // create two child elements: combo line and quests block
        this.comboEl = this.documentRef.getElementById('combo');    
        this.questsEl = this.documentRef.getElementById('quests');
        this.buttonsEl = this.documentRef.getElementById('buttons-monitor');

        this.render();
        return this.container;
    }

    connectBackend() {
        if (!this.backendUrl) {
            return;
        }

        if (typeof globalThis.WebSocket !== 'function') {
            console.log('[DMD] WebSocket non disponible');
            return;
        }

        try {
            this.socket = new globalThis.WebSocket(this.backendUrl);

            this.socket.addEventListener('open', () => {
                console.log('[DMD] connecté au backend:', this.backendUrl);
            });

            this.socket.addEventListener('message', (event) => {
                this.handleBackendMessage(event.data);
            });

            this.socket.addEventListener('close', () => {
                console.log('[DMD] connexion backend fermée');
            });

            this.socket.addEventListener('error', (error) => {
                console.warn('[DMD] erreur WebSocket backend:', error);
            });
        } catch (error) {
            console.warn('[DMD] impossible de se connecter au backend:', error);
        }
    }

    handleBackendMessage(rawData) {
        try {
            const message = JSON.parse(rawData);
            this.lastMessage = message;

            this.updateComboState(message);
            this.updateQuestState(message);
            this.updateBossState(message);
            this.updateButtonState(message);

            console.log('[DMD] message reçu du backend:', message);
            console.log('[DMD] type:', message.type);
            console.log('[DMD] payload:', message.payload);

            this.render();
            return message;
        } catch (error) {
            console.warn('[DMD] message backend invalide:', rawData, error);
            return null;
        }
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

    updateButtonState(message) {
        if (message?.type !== 'button_event') {
            return;
        }

        const payload = message.payload ?? {};
        const action = payload.active ? 'APPUI' : 'RELACHE';
        const name = String(payload.name ?? payload.key ?? 'bouton_inconnu');

        this.buttonEvents.push(`${action} ${name}`);
        this.buttonEvents = this.buttonEvents.slice(-8);
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

    render() {
        try {
            this.comboEl.textContent = this.displayCombo();
            this.questsEl.textContent = this.displayQuests();
            this.buttonsEl.textContent = this.displayButtons();
        } catch (err) {
            this.comboEl.textContent = `DMD ${String(this.lastMessage.type ?? 'INCONNU').toUpperCase()}`;
            this.questsEl.textContent = this.formatFallbackMessage();
        }
    }

    displayButtons() {
        const lines = this.buttonEvents.length > 0
            ? this.buttonEvents
            : ['EN ATTENTE...'];

        return ['TEST BOUTONS', ...lines].join('\n');
    }
}

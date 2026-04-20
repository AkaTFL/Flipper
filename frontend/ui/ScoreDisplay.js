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
    bossDefeated: false
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
            minWidth: '220px',
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

        this.container.appendChild(title);
        this.container.appendChild(this.scoreValue);
        this.container.appendChild(this.comboValue);
        this.container.appendChild(this.deltaValue);
        this.container.appendChild(this.detailValue);
        this.container.appendChild(this.bossValue);
        this.container.appendChild(this.bossDetailValue);
        container.appendChild(this.container);

        if (typeof this.eventTarget?.addEventListener === 'function') {
            this.eventTarget.addEventListener('flipper:backend-message', this.boundHandler);
        }

        this.render();
        return this.container;
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
}

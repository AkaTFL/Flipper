export class DmdDisplay {
    constructor({
        documentRef = globalThis.document,
        backendUrl = globalThis.location?.host
            ? `${globalThis.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${globalThis.location.host}/ws`
            : 'ws://localhost:8080/ws',
        feedbackMs = 1800
    } = {}) {
        this.documentRef = documentRef;
        this.backendUrl = backendUrl;
        this.feedbackMs = feedbackMs;
        this.rootEl = null;
        this.titleEl = null;
        this.mainEl = null;
        this.subEl = null;
        this.socket = null;
        this.feedbackTimer = null;
        this.resizeFrame = null;
        this.state = {
            mode: 'score',
            score: 0,
            delta: 0,
            multiplier: 1,
            comboCount: 0,
            balls: null,
            maxBalls: null
        };
        this.mount();
        this.connectBackend();

        if (typeof globalThis.addEventListener === 'function') {
            globalThis.addEventListener('resize', () => this.adjustTextSizes());
        }
    }

    mount(rootEl = this.documentRef.getElementById('score')) {
        if (!rootEl || this.rootEl) {
            return this.rootEl;
        }

        this.rootEl = rootEl;
        this.rootEl.textContent = '';
        this.rootEl.className = 'dmd-screen';

        this.titleEl = this.createLine('dmd-title');
        this.mainEl = this.createLine('dmd-main');
        this.subEl = this.createLine('dmd-sub');

        this.rootEl.appendChild(this.titleEl);
        this.rootEl.appendChild(this.mainEl);
        this.rootEl.appendChild(this.subEl);

        this.render();
        this.documentRef.fonts?.ready.then(() => this.adjustTextSizes());
        return this.rootEl;
    }

    createLine(className) {
        const element = this.documentRef.createElement('div');
        element.className = className;
        return element;
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
            this.handleBackendEvent(message);
            return message;
        } catch (error) {
            console.warn('[DMD] message backend invalide:', rawData, error);
            return null;
        }
    }

    handleBackendEvent(message) {
        if (message?.type === 'score_update') {
            this.updateScoreState(message.payload ?? {});
        }

        if (message?.type === 'player_state_update') {
            this.updatePlayerState(message.payload ?? {});
        }

        this.render();
    }

    updateScoreState(payload) {
        const delta = Number(payload.delta ?? 0);
        const multiplier = Math.max(1, Number(payload.comboMultiplier ?? 1));
        const comboCount = Math.max(0, Number(payload.comboCount ?? 0));

        this.state.score = Number(payload.score ?? this.state.score ?? 0);
        this.state.delta = delta;
        this.state.multiplier = multiplier;
        this.state.comboCount = comboCount;

        if (multiplier >= 4) {
            this.showTemporaryMode('super-combo');
            return;
        }

        if (multiplier >= 2 || comboCount >= 2) {
            this.showTemporaryMode('combo');
            return;
        }

        if (delta > 0) {
            this.showTemporaryMode('points');
            return;
        }

        this.state.mode = 'score';
    }

    updatePlayerState(payload) {
        this.state.balls = Number.isFinite(Number(payload.balls)) ? Number(payload.balls) : this.state.balls;
        this.state.maxBalls = Number.isFinite(Number(payload.maxBalls)) ? Number(payload.maxBalls) : this.state.maxBalls;
    }

    showTemporaryMode(mode) {
        this.state.mode = mode;

        if (this.feedbackTimer) {
            clearTimeout(this.feedbackTimer);
        }

        this.feedbackTimer = setTimeout(() => {
            this.state.mode = 'score';
            this.render();
        }, this.feedbackMs);

        if (typeof this.feedbackTimer.unref === 'function') {
            this.feedbackTimer.unref();
        }
    }

    render() {
        if (!this.rootEl) {
            return;
        }

        this.rootEl.className = `dmd-screen dmd-${this.state.mode} dmd-multiplier-${this.multiplierLevel()}`;

        if (this.state.mode === 'super-combo') {
            this.titleEl.textContent = 'SUPER COMBO';
            this.mainEl.textContent = `x${this.state.multiplier}`;
            this.subEl.textContent = `${this.formatDelta(this.state.delta)}  SCORE ${this.formatScore(this.state.score)}`;
        } else if (this.state.mode === 'combo') {
            this.titleEl.textContent = `COMBO x${this.state.multiplier}`;
            this.mainEl.textContent = this.formatDelta(this.state.delta);
            this.subEl.textContent = `SCORE ${this.formatScore(this.state.score)}`;
        } else if (this.state.mode === 'points') {
            this.titleEl.textContent = 'POINTS';
            this.mainEl.textContent = this.formatDelta(this.state.delta);
            this.subEl.textContent = `SCORE ${this.formatScore(this.state.score)}`;
        } else {
            this.titleEl.textContent = 'SCORE';
            this.mainEl.textContent = this.formatScore(this.state.score);
            this.subEl.textContent = this.formatBalls();
        }

        this.adjustTextSizes();
    }

    adjustTextSizes() {
        if (typeof globalThis.requestAnimationFrame !== 'function') {
            return;
        }

        if (this.resizeFrame) {
            globalThis.cancelAnimationFrame(this.resizeFrame);
        }

        this.resizeFrame = globalThis.requestAnimationFrame(() => {
            const lines = [
                { element: this.titleEl, widthRatio: 0.94 },
                { element: this.mainEl, widthRatio: 0.9 },
                { element: this.subEl, widthRatio: 0.94 }
            ];

            for (const line of lines) {
                line.element.style.fontSize = '';

                const maxWidth = this.rootEl.clientWidth * line.widthRatio;
                const currentWidth = line.element.scrollWidth;

                if (!maxWidth || !currentWidth || currentWidth <= maxWidth) {
                    continue;
                }

                const currentSize = Number.parseFloat(globalThis.getComputedStyle(line.element).fontSize);
                line.element.style.fontSize = `${currentSize * (maxWidth / currentWidth)}px`;
            }

            this.resizeFrame = null;
        });
    }

    formatScore(value) {
        return new Intl.NumberFormat('fr-FR').format(Math.max(0, Number(value) || 0));
    }

    multiplierLevel() {
        return Math.min(4, Math.max(1, Math.floor(this.state.multiplier)));
    }

    formatDelta(value) {
        return `+${this.formatScore(value)}`;
    }

    formatBalls() {
        if (this.state.balls === null || this.state.maxBalls === null) {
            return 'BALLES --';
        }

        return `BALLES ${this.state.balls}/${this.state.maxBalls}`;
    }
}

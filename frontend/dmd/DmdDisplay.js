export class DmdDisplay {
    constructor({
        documentRef = globalThis.document,
        backendUrl = 'ws://localhost:8080/ws'
    } = {}) {
        this.documentRef = documentRef;
        this.backendUrl = backendUrl;
        this.scoreEl = null;
        this.socket = null;
        this.score = 0;
        this.mount();
        this.connectBackend();
    }

    mount(scoreEl = this.documentRef.getElementById('score')) {
        if (!scoreEl || this.scoreEl) {
            return this.scoreEl;
        }

        this.scoreEl = scoreEl;

        this.render();
        return this.scoreEl;
    }

    connectBackend() {
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
            this.updateScoreState(message);
            this.render();
            return message;
        } catch (error) {
            console.warn('[DMD] message backend invalide:', rawData, error);
            return null;
        }
    }

    updateScoreState(message) {
        if (message?.type !== 'score_update') {
            return;
        }

        const payload = message.payload ?? {};
        this.score = Number(payload.score ?? 0);
    }

    render() {
        if (!this.scoreEl) {
            return;
        }

        this.scoreEl.textContent = this.formatScore(this.score);
    }

    formatScore(value) {
        return new Intl.NumberFormat('fr-FR').format(Math.max(0, Number(value) || 0));
    }
}
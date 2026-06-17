export class DmdDisplay {
    constructor({
        documentRef = globalThis.document,
        eventTarget = globalThis,
        comboResetMs = 1000
    } = {}) {
        this.documentRef = documentRef;
        this.eventTarget = eventTarget;
        this.comboResetMs = comboResetMs;
        this.lines = [];
        this.score = 0;
        this.comboScore = 0;
        this.comboMultiplier = 1;
        this.balls = null;
        this.maxBalls = null;
        this.quests = { completedCount: 0, requiredCount: 0, activeQuests: [] };
        this.comboResetTimer = null;
        this.mount();
    }

    mount() {
        if (this.lines.length > 0) {
            return;
        }

        // Create a container for the 4 lines
        const container = this.documentRef.createElement('div');
        container.setAttribute('class', 'dmd-display');

        // Create 4 lines for DMD display
        for (let i = 0; i < 4; i++) {
            const line = this.documentRef.createElement('div');
            line.setAttribute('class', `dmd-line-${i}`);
            line.textContent = this.getDefaultLineText(i);
            this.lines.push(line);
            container.appendChild(line);
        }

        if (this.documentRef.body) {
            this.documentRef.body.appendChild(container);
        }

        return this.lines;
    }

    getDefaultLineText(lineIndex) {
        switch (lineIndex) {
            case 0:
                return 'SCORE 0';
            case 1:
                return 'SÉRIE +0              MULT x1';
            case 2:
                return 'BALLES --';
            case 3:
                return '';
            default:
                return '';
        }
    }

    handleBackendEvent(message) {
        if (!message || !message.type) {
            return null;
        }

        if (message.type === 'score_update') {
            this.handleScoreUpdate(message.payload);
        } else if (message.type === 'player_state_update') {
            this.handlePlayerStateUpdate(message.payload);
        } else if (message.type === 'quest_update') {
            this.handleQuestUpdate(message.payload);
        }

        this.render();
        return message;
    }

    handleScoreUpdate(payload) {
        if (!payload) return;

        this.score = Number(payload.score ?? 0);
        this.comboScore = Number(payload.delta ?? 0);
        this.comboMultiplier = Number(payload.comboMultiplier ?? 1);

        // Reset combo timer
        if (this.comboResetTimer) {
            clearTimeout(this.comboResetTimer);
        }

        this.comboResetTimer = setTimeout(() => {
            this.comboScore = 0;
            this.comboMultiplier = 1;
            this.render();
        }, this.comboResetMs);
    }

    handlePlayerStateUpdate(payload) {
        if (!payload) return;

        this.balls = Number(payload.balls ?? 0);
        this.maxBalls = Number(payload.maxBalls ?? 0);
    }

    handleQuestUpdate(payload) {
        if (!payload) return;

        this.quests = {
            completedCount: Number(payload.completedCount ?? 0),
            requiredCount: Number(payload.requiredCount ?? 0),
            activeQuests: payload.activeQuests ?? []
        };
    }

    render() {
        this.lines[0].textContent = this.formatScoreLine();
        this.lines[1].textContent = this.formatComboLine();
        this.lines[2].textContent = this.formatBallsLine();
        this.lines[3].textContent = this.formatQuestLine();
    }

    formatScoreLine() {
        const formattedScore = new Intl.NumberFormat('fr-FR').format(Math.max(0, this.score || 0));
        return `SCORE ${formattedScore}`;
    }

    formatComboLine() {
        const formattedScore = new Intl.NumberFormat('fr-FR').format(Math.max(0, this.comboScore || 0));
        const scoreText = `SÉRIE +${formattedScore}`;
        const multiplierText = `MULT x${this.comboMultiplier}`;
        
        // Pad the score text to align MULT on the right (total width approximately 30 chars)
        const padding = Math.max(1, 30 - scoreText.length - multiplierText.length);
        return scoreText + ' '.repeat(padding) + multiplierText;
    }

    formatBallsLine() {
        if (this.balls === null || this.maxBalls === null) {
            return 'BALLES --';
        }
        return `BALLES ${this.balls}/${this.maxBalls}`;
    }

    formatQuestLine() {
        return '';
    }
}
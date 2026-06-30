// Menu de l'écran playfield : menu principal -> sélection des sauvegardes (4 slots)
// -> actions Reprendre / Supprimer (avec modale de confirmation).
// Les données des slots viennent du backend Go (GET /saves, DELETE /saves?slot=N).

const MAX_SLOTS = 4;

// Thème de couleur par phase / niveau de boss (1-4)
const PHASE_THEMES = {
    1: { name: 'Nature', color: '#3fb950' }, // vert
    2: { name: 'Eau', color: '#3b82f6' },    // bleu
    3: { name: 'Feu', color: '#f97316' },    // orange
    4: { name: 'Néant', color: '#7c3aed' }   // violet sombre
};

const EMPTY_THEME = { name: 'Nouvelle Partie', color: '#3a3a40' };

function backendBaseUrl() {
    const host = globalThis.location?.hostname || 'localhost';
    return `http://${host}:8080`;
}

function clampLevel(level) {
    const value = Number(level);
    if (!Number.isFinite(value) || value < 1) {
        return 1;
    }
    return Math.min(MAX_SLOTS, Math.trunc(value));
}

function themeForLevel(level) {
    return PHASE_THEMES[clampLevel(level)] ?? PHASE_THEMES[1];
}

function formatSavedAt(ms) {
    if (!ms) {
        return '';
    }

    const date = new Date(ms);
    const pad = (n) => String(n).padStart(2, '0');
    const day = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
    const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
    return `${day} ${time}`;
}

function formatScore(score) {
    return Number(score ?? 0).toLocaleString('fr-FR');
}

const MENU_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Cinzel+Decorative:wght@700;900&display=swap');

#playfield-menu {
    position: absolute;
    inset: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #000;
    color: #ece3d0;
    font-family: 'Cinzel', 'Segoe UI', serif;
    user-select: none;
}
#playfield-menu *, #playfield-menu *::before, #playfield-menu *::after {
    box-sizing: border-box;
}
/* Cadre vertical 9:16 fixe (écran cabinet), letterboxé au centre.
   Fond = royaume des 4 éléments : Nature, Océan, Feu, Néant. */
#playfield-menu .menu-frame {
    position: relative;
    width: min(100%, calc(100vh * 9 / 16));
    aspect-ratio: 9 / 16;
    max-height: 100%;
    overflow: hidden;
    container-type: size;
    display: flex;
    align-items: center;
    justify-content: center;
    background:
        radial-gradient(circle at 12% 10%, rgba(63, 185, 80, 0.22), transparent 42%),
        radial-gradient(circle at 88% 12%, rgba(59, 130, 246, 0.22), transparent 42%),
        radial-gradient(circle at 14% 90%, rgba(249, 115, 22, 0.20), transparent 42%),
        radial-gradient(circle at 88% 90%, rgba(124, 58, 237, 0.26), transparent 44%),
        radial-gradient(circle at 50% 45%, #15131d 0%, #0a0810 60%, #050308 100%);
}
/* Vignette + grain léger pour la profondeur */
#playfield-menu .menu-frame::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(circle at 50% 42%, transparent 55%, rgba(0, 0, 0, 0.55) 100%);
}
#playfield-menu .menu-screen {
    position: relative;
    z-index: 1;
    width: 86%;
    max-height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2.4cqh;
    padding: 3cqh 0;
}
#playfield-menu .menu-title {
    margin: 0;
    font-family: 'Cinzel Decorative', 'Cinzel', serif;
    font-size: clamp(20px, 7cqw, 40px);
    line-height: 1.05;
    letter-spacing: 0.06em;
    font-weight: 900;
    text-transform: uppercase;
    text-align: center;
    color: #f6ecd0;
    text-shadow:
        0 0 10px rgba(255, 196, 110, 0.45),
        0 0 22px rgba(124, 58, 237, 0.25),
        0 2px 2px rgba(0, 0, 0, 0.6);
}
#playfield-menu .menu-logo {
    width: 100%;
    max-width: 98%;
    max-height: 46cqh;
    object-fit: contain;
    filter: drop-shadow(0 6px 18px rgba(0, 0, 0, 0.5));
}
#playfield-menu .menu-subtitle {
    margin: 0;
    font-size: clamp(10px, 2.7cqw, 14px);
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #b8a878;
    text-align: center;
}
/* Rangée des 4 éléments (menu principal) */
#playfield-menu .elements {
    display: flex;
    gap: 6cqw;
    justify-content: center;
    align-items: flex-start;
}
#playfield-menu .element {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1cqh;
}
#playfield-menu .element .orb {
    width: 11cqw;
    height: 11cqw;
    max-width: 58px;
    max-height: 58px;
    border-radius: 50%;
    background:
        radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.85), transparent 45%),
        radial-gradient(circle at 50% 55%, var(--el-color), #0a0810 80%);
    box-shadow: 0 0 16px var(--el-color), inset 0 0 10px rgba(0, 0, 0, 0.45);
    animation: orbPulse 3.6s ease-in-out infinite;
}
#playfield-menu .element:nth-child(2) .orb { animation-delay: 0.5s; }
#playfield-menu .element:nth-child(3) .orb { animation-delay: 1s; }
#playfield-menu .element:nth-child(4) .orb { animation-delay: 1.5s; }
#playfield-menu .element .el-label {
    font-size: clamp(8px, 2.2cqw, 11px);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #a99a72;
}
@keyframes orbPulse {
    0%, 100% { transform: scale(1); filter: brightness(1); }
    50% { transform: scale(1.08); filter: brightness(1.25); }
}
/* Boutons style parchemin / or */
#playfield-menu .menu-btn {
    cursor: pointer;
    border: 1px solid #b8924a;
    border-radius: 6px;
    padding: 11px 26px;
    font-family: 'Cinzel', serif;
    font-size: clamp(13px, 3cqw, 16px);
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #f6ecd0;
    background: linear-gradient(180deg, #2a2316 0%, #181208 100%);
    box-shadow: 0 0 12px rgba(184, 146, 74, 0.22), inset 0 0 14px rgba(184, 146, 74, 0.10);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
    transition: transform 0.08s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}
#playfield-menu .menu-btn:hover {
    transform: scale(1.03);
    border-color: #e7c87d;
    box-shadow: 0 0 18px rgba(231, 200, 125, 0.45), inset 0 0 16px rgba(231, 200, 125, 0.16);
}
#playfield-menu .menu-btn:active { transform: scale(0.98); }
#playfield-menu .menu-btn.ghost {
    background: linear-gradient(180deg, #1a1a22 0%, #101016 100%);
    border-color: #4a4a58;
    color: #9a9aa8;
    box-shadow: none;
}
#playfield-menu .menu-btn.ghost:hover { color: #ece3d0; border-color: #7a7a8a; box-shadow: none; }
#playfield-menu .menu-btn.danger {
    border-color: #b4422a;
    color: #ffd9cf;
    background: linear-gradient(180deg, #3a160e 0%, #200a06 100%);
    box-shadow: 0 0 12px rgba(229, 72, 45, 0.3), inset 0 0 14px rgba(229, 72, 45, 0.12);
}
#playfield-menu .menu-btn.danger:hover {
    border-color: #ff6a4d;
    box-shadow: 0 0 18px rgba(255, 106, 77, 0.45), inset 0 0 16px rgba(255, 106, 77, 0.18);
}
#playfield-menu .slots {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.6cqh;
    width: 100%;
}
/* Carte de sauvegarde = relique élémentaire */
#playfield-menu .slot {
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(184, 146, 74, 0.28);
    border-radius: 10px;
    background: linear-gradient(180deg, rgba(26, 22, 32, 0.92) 0%, rgba(14, 11, 18, 0.92) 100%);
    padding: 11px 12px 11px 20px;
    cursor: pointer;
    text-align: left;
    color: inherit;
    transition: border-color 0.15s ease, transform 0.08s ease, box-shadow 0.2s ease;
}
#playfield-menu .slot:hover {
    transform: translateY(-2px);
    border-color: var(--slot-color, #b8924a);
    box-shadow: 0 0 16px color-mix(in srgb, var(--slot-color, #b8924a) 45%, transparent);
}
/* Barre + halo de l'élément */
#playfield-menu .slot::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 5px;
    background: var(--slot-color, #3a3a40);
    box-shadow: 0 0 12px var(--slot-color, transparent);
}
#playfield-menu .slot::after {
    content: '';
    position: absolute;
    right: -20%; top: -40%;
    width: 70%; height: 180%;
    background: radial-gradient(circle, color-mix(in srgb, var(--slot-color, #3a3a40) 30%, transparent), transparent 70%);
    pointer-events: none;
}
/* Carte non interactive (écran d'actions) : pas de survol ni de focus clavier */
#playfield-menu .slot.static { cursor: default; }
#playfield-menu .slot.static:hover {
    transform: none;
    box-shadow: none;
    border-color: rgba(184, 146, 74, 0.28);
}
/* Élément sélectionné via la navigation borne/clavier */
#playfield-menu .slot.focused,
#playfield-menu .menu-btn.focused {
    outline: 2px solid #e7c87d;
    outline-offset: 2px;
    box-shadow: 0 0 18px rgba(231, 200, 125, 0.55);
}
#playfield-menu .slot.empty {
    border-style: dashed;
    border-color: rgba(184, 146, 74, 0.35);
    min-height: 72px;
    display: flex;
    flex-direction: column;
    justify-content: center;
}
#playfield-menu .slot.empty .slot-phase { color: #b8a878; }
#playfield-menu .slot.empty .slot-date { color: #8f8268; }
#playfield-menu .slot .slot-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 5px;
}
#playfield-menu .slot .slot-phase { font-size: clamp(12px, 3.2cqw, 15px); font-weight: 700; letter-spacing: 0.04em; }
#playfield-menu .slot .slot-num { font-size: clamp(9px, 2.4cqw, 11px); color: #8f8268; letter-spacing: 0.08em; }
#playfield-menu .slot .slot-score { font-size: clamp(16px, 4.5cqw, 22px); font-weight: 800; margin: 1px 0; color: #f1e7cf; }
#playfield-menu .slot .slot-date { font-size: clamp(9px, 2.4cqw, 11px); color: #8f8268; }
#playfield-menu .menu-actions-stack {
    display: flex;
    flex-direction: column;
    gap: 1.6cqh;
    width: 100%;
    max-width: 320px;
}
#playfield-menu .menu-actions-stack .menu-btn { width: 100%; }
#playfield-menu .menu-error {
    color: #ff6a4d;
    font-size: clamp(11px, 2.6cqw, 14px);
    text-align: center;
}
#playfield-menu .menu-modal {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(3, 2, 6, 0.72);
    backdrop-filter: blur(2px);
}
#playfield-menu .menu-modal .modal-card {
    width: min(420px, 86cqw);
    background: linear-gradient(180deg, #1b1622 0%, #100b18 100%);
    border: 1px solid rgba(184, 146, 74, 0.4);
    border-radius: 14px;
    padding: 26px;
    display: flex;
    flex-direction: column;
    gap: 18px;
    text-align: center;
    box-shadow: 0 0 30px rgba(124, 58, 237, 0.25);
}
#playfield-menu .menu-modal .modal-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
}
`;

export class Menu {
    /**
     * @param {Object} options
     * @param {(slot: number, mode: 'new'|'resume') => void} options.onPlay
     */
    constructor({ onPlay } = {}) {
        this.onPlay = typeof onPlay === 'function' ? onPlay : () => {};
        this.root = null;
        this.frame = null;
        this.selectedSlot = null;
        this.focusIndex = 0;
        this._onKeyDown = null;
    }

    mount() {
        if (!document.getElementById('playfield-menu-styles')) {
            const style = document.createElement('style');
            style.id = 'playfield-menu-styles';
            style.textContent = MENU_STYLES;
            document.head.appendChild(style);
        }

        this.root = document.createElement('div');
        this.root.id = 'playfield-menu';

        // Cadre vertical 9:16 persistant : toutes les vues s'affichent à l'intérieur
        this.frame = document.createElement('div');
        this.frame.className = 'menu-frame';
        this.root.appendChild(this.frame);

        document.body.appendChild(this.root);

        // Navigation borne/clavier : vert (g) = monter, rouge (h) = descendre, blanc gauche (x) = valider
        this._onKeyDown = (event) => this.handleKeyNav(event);
        window.addEventListener('keydown', this._onKeyDown);

        this.showMainScreen();
    }

    destroy() {
        if (this._onKeyDown) {
            window.removeEventListener('keydown', this._onKeyDown);
            this._onKeyDown = null;
        }
        this.root?.remove();
        this.root = null;
        this.frame = null;
    }

    // --- Navigation au clavier / boutons de borne -------------------------

    // Éléments navigables de la vue courante (ou de la modale si ouverte), dans l'ordre du DOM
    getFocusables() {
        if (!this.frame) {
            return [];
        }
        const modal = this.frame.querySelector('.menu-modal');
        const scope = modal || this.frame;
        return Array.from(scope.querySelectorAll('.menu-btn, .slot:not(.static)'));
    }

    applyFocus(list = this.getFocusables()) {
        list.forEach((el, index) => el.classList.toggle('focused', index === this.focusIndex));
    }

    focusFirst() {
        this.focusIndex = 0;
        this.applyFocus();
    }

    moveFocus(delta) {
        const list = this.getFocusables();
        if (list.length === 0) {
            return;
        }
        this.focusIndex = (this.focusIndex + delta + list.length) % list.length;
        this.applyFocus(list);
    }

    activateFocused() {
        const list = this.getFocusables();
        list[this.focusIndex]?.click();
    }

    handleKeyNav(event) {
        if (event.repeat) {
            return;
        }
        const key = (event.key || '').toLowerCase();
        if (key === 'g') {
            event.preventDefault();
            this.moveFocus(-1);
        } else if (key === 'h') {
            event.preventDefault();
            this.moveFocus(1);
        } else if (key === 'x') {
            event.preventDefault();
            this.activateFocused();
        }
    }

    clear() {
        if (this.frame) {
            this.frame.innerHTML = '';
        }
    }

    showMainScreen() {
        this.clear();

        const screen = document.createElement('div');
        screen.className = 'menu-screen';

        screen.innerHTML = `
            <img class="menu-logo" src="assets/ui/logo.png" alt="Elemental Legends" />
        `;

        const playButton = document.createElement('button');
        playButton.type = 'button';
        playButton.className = 'menu-btn';
        playButton.textContent = 'Jouer';
        playButton.addEventListener('click', () => this.showSaveSelection());

        screen.appendChild(playButton);
        this.frame.appendChild(screen);
        this.focusFirst();
    }

    async showSaveSelection() {
        this.clear();
        this.selectedSlot = null;

        const screen = document.createElement('div');
        screen.className = 'menu-screen';

        const subtitle = document.createElement('p');
        subtitle.className = 'menu-subtitle';
        subtitle.textContent = 'Chargement des sauvegardes…';

        const title = document.createElement('h2');
        title.className = 'menu-title';
        title.style.fontSize = 'clamp(28px, 5vw, 44px)';
        title.textContent = 'Choisis ta partie';

        const slotsContainer = document.createElement('div');
        slotsContainer.className = 'slots';

        const back = document.createElement('button');
        back.type = 'button';
        back.className = 'menu-btn ghost';
        back.textContent = 'Retour';
        back.addEventListener('click', () => this.showMainScreen());

        screen.append(title, subtitle, slotsContainer, back);
        this.frame.appendChild(screen);

        let slots;
        try {
            slots = await this.fetchSaves();
            subtitle.textContent = 'Slot vide = nouvelle partie · clique une partie pour la reprendre';
        } catch (error) {
            console.warn('Impossible de récupérer les sauvegardes:', error);
            subtitle.className = 'menu-error';
            subtitle.textContent = 'Backend injoignable — slots affichés comme vides.';
            slots = Array.from({ length: MAX_SLOTS }, (_, i) => ({ slot: i + 1, occupied: false }));
        }

        slotsContainer.innerHTML = '';
        slots.forEach((info) => slotsContainer.appendChild(this.renderSlot(info)));
        this.focusFirst();
    }

    renderSlot(info) {
        if (!info.occupied) {
            const empty = document.createElement('div');
            empty.className = 'slot empty';
            empty.style.setProperty('--slot-color', EMPTY_THEME.color);
            empty.innerHTML = `
                <div class="slot-head">
                    <span class="slot-phase">Nouvelle Partie</span>
                    <span class="slot-num">Slot ${info.slot}</span>
                </div>
                <div class="slot-date">Emplacement libre</div>
            `;
            empty.addEventListener('click', () => this.onPlay(info.slot, 'new'));
            return empty;
        }

        const theme = themeForLevel(info.level);
        const card = document.createElement('div');
        card.className = 'slot';
        card.style.setProperty('--slot-color', theme.color);
        card.innerHTML = `
            <div class="slot-head">
                <span class="slot-phase" style="color:${theme.color}">Phase ${clampLevel(info.level)} · ${theme.name}</span>
                <span class="slot-num">Slot ${info.slot}</span>
            </div>
            <div class="slot-score">${formatScore(info.score)} pts</div>
            <div class="slot-date">${formatSavedAt(info.savedAt)}</div>
        `;

        card.addEventListener('click', () => this.showSlotActions(info));
        return card;
    }

    // Écran dédié à une sauvegarde : Jouer ou Supprimer
    showSlotActions(info) {
        this.clear();

        const theme = themeForLevel(info.level);
        const screen = document.createElement('div');
        screen.className = 'menu-screen';

        const title = document.createElement('h2');
        title.className = 'menu-title';
        title.style.fontSize = 'clamp(28px, 5vw, 44px)';
        title.textContent = `Slot ${info.slot}`;

        const card = document.createElement('div');
        card.className = 'slot static';
        card.style.width = '100%';
        card.style.setProperty('--slot-color', theme.color);
        card.innerHTML = `
            <div class="slot-head">
                <span class="slot-phase" style="color:${theme.color}">Phase ${clampLevel(info.level)} · ${theme.name}</span>
                <span class="slot-num">Slot ${info.slot}</span>
            </div>
            <div class="slot-score">${formatScore(info.score)} pts</div>
            <div class="slot-date">${formatSavedAt(info.savedAt)}</div>
        `;

        const actions = document.createElement('div');
        actions.className = 'menu-actions-stack';

        const play = document.createElement('button');
        play.type = 'button';
        play.className = 'menu-btn';
        play.textContent = 'Jouer';
        play.addEventListener('click', () => this.onPlay(info.slot, 'resume', clampLevel(info.level)));

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'menu-btn danger';
        remove.textContent = 'Supprimer';
        remove.addEventListener('click', () => this.confirmDelete(info.slot));

        actions.append(play, remove);

        const back = document.createElement('button');
        back.type = 'button';
        back.className = 'menu-btn ghost';
        back.textContent = 'Retour';
        back.addEventListener('click', () => this.showSaveSelection());

        screen.append(title, card, actions, back);
        this.frame.appendChild(screen);
        this.focusFirst();
    }

    confirmDelete(slot) {
        const modal = document.createElement('div');
        modal.className = 'menu-modal';
        modal.innerHTML = `
            <div class="modal-card">
                <p class="menu-subtitle">Supprimer la sauvegarde du slot ${slot} ?<br>Cette action est définitive.</p>
                <div class="modal-actions"></div>
            </div>
        `;

        const actions = modal.querySelector('.modal-actions');

        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'menu-btn ghost';
        cancel.textContent = 'Annuler';
        cancel.addEventListener('click', () => {
            modal.remove();
            this.focusFirst();
        });

        const confirm = document.createElement('button');
        confirm.type = 'button';
        confirm.className = 'menu-btn danger';
        confirm.textContent = 'Supprimer';
        confirm.addEventListener('click', async () => {
            confirm.disabled = true;
            confirm.textContent = 'Suppression…';
            try {
                await this.deleteSave(slot);
            } catch (error) {
                console.warn('Échec de la suppression:', error);
            }
            modal.remove();
            this.showSaveSelection();
        });

        actions.append(cancel, confirm);
        this.frame.appendChild(modal);
        this.focusFirst();
    }

    async fetchSaves() {
        const response = await fetch(`${backendBaseUrl()}/saves`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
    }

    async deleteSave(slot) {
        const response = await fetch(`${backendBaseUrl()}/saves?slot=${slot}`, { method: 'DELETE' });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
    }
}

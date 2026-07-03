export const CABINET_BUTTON_KEYS = {
    'black-left': 'q',
    'white-left': 'w',
    'front-left-green': 'l',
    'front-left-yellow': 'b',
    'front-left-red': 'h',
    'black-right': 'd',
    'white-right': 'c',
    'front-white': 'f',
    plunger: ' '
};

export class CabinetButtons {
    constructor({ eventSourceUrl = '/events', windowRef = globalThis.window } = {}) {
        this.eventSourceUrl = eventSourceUrl;
        this.windowRef = windowRef;
        this.eventSource = null;
        this.previousButtons = null;
    }

    connect() {
        const EventSourceClass = this.windowRef?.EventSource ?? globalThis.EventSource;
        if (typeof EventSourceClass !== 'function') {
            console.warn('[boutons] EventSource non disponible');
            return;
        }

        this.eventSource = new EventSourceClass(this.eventSourceUrl);
        this.eventSource.addEventListener('message', (event) => {
            try {
                this.handleState(JSON.parse(event.data));
            } catch {
                console.warn('[boutons] état ESP32 invalide ignoré');
            }
        });
    }

    handleState(state) {
        const buttons = state?.buttons;
        if (!buttons || typeof buttons !== 'object') return;

        if (this.previousButtons === null) {
            this.previousButtons = { ...buttons };
            return;
        }

        for (const [name, active] of Object.entries(buttons)) {
            if (this.previousButtons[name] === active) continue;

            const key = CABINET_BUTTON_KEYS[name];
            if (key) {
                const KeyboardEventClass = this.windowRef?.KeyboardEvent ?? globalThis.KeyboardEvent;
                this.windowRef.dispatchEvent(new KeyboardEventClass(active ? 'keydown' : 'keyup', {
                    key,
                    bubbles: true
                }));
            }
        }

        this.previousButtons = { ...buttons };
    }
}

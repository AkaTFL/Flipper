import Config from '../physics/Config.js';
import { AudioManager } from '../physics/Audio.js';

export class Controls{
    /**
     * @param {string|string[]} left
     * @param {string|string[]} right
     * @param {string} launch
     */

    constructor(left = 'q', right = 'd', launch = 'space', bossDebug = 'b') {
        this.leftKeys = this.normalizeKeys(left);
        this.rightKeys = this.normalizeKeys(right);
        this.left = [...this.leftKeys][0];
        this.right = [...this.rightKeys][0];
        this.launch = this.normalizeKey(launch);
        this.bossDebug = this.normalizeKey(bossDebug);
        this.bossDamageDebug = 'k';
        this.playerDamageDebug = 'h';
        this.ballLostDebug = 'l';
        this.pressedLeftKeys = new Set();
        this.pressedRightKeys = new Set();

        this.input = { left: false, right: false, launch: false, launchPower: 0 };

        this.launchChargeStart = 0;
        this.launchChargeCount = 0;
        this.launchingRampRef = null;
        this.ballRef = null;
        this.impulseUsed = false;
        this.startGameCallback = null;
        this.bossFightStartCallback = null;
        this.bossDamageCallback = null;
        this.playerDamageCallback = null;
        this.ballLostCallback = null;
        this.audioManager = AudioManager.getShared();
        this.audioManager.preloadSounds([
            Config.global.sounds.launchingRamp.charging,
            Config.global.sounds.launchingRamp.launch,
            Config.global.sounds.palles.movement
        ]);

        this.initControls();
    }

    normalizeKey(key) {
        return key === ' ' ? 'space' : String(key ?? '').toLowerCase();
    }

    normalizeKeys(keys) {
        const values = Array.isArray(keys) ? keys : [keys];
        return new Set(values.map((key) => this.normalizeKey(key)).filter(Boolean));
    }

    getInputKey(event) {
            if (event.key === ' ') {
                event.preventDefault();
                return 'space';
            }

            const key = (event.key || '').toLowerCase();
            return key;
    }

    initControls() {

        window.addEventListener('keydown', (e) => {
            this.audioManager.unlock();
            const key = this.getInputKey(e);

            if (this.leftKeys.has(key)) {
                this.pressedLeftKeys.add(key);
                this.input.left = true;
                return;
                }
            if (this.rightKeys.has(key)) {
                this.pressedRightKeys.add(key);
                this.input.right = true;
                return;
            }
            if (key === this.launch) {
                if (e.repeat) return;

                this.input.launch = true;
                this.launchChargeStart = Date.now();
                this.launchChargeCount += 1;
                console.log('Launch button pressed');
                if (!this.impulseUsed) this.audioManager.playSound(Config.global.sounds.launchingRamp.charging);
                return;
            }
            if (key === this.bossDebug) {
                if (e.repeat) return;
                if (typeof this.bossFightStartCallback === 'function') {
                    console.log('Boss fight debug triggered');
                    this.bossFightStartCallback();
                }
                return;
            }
            if (key === this.bossDamageDebug) {
                if (e.repeat) return;
                if (typeof this.bossDamageCallback === 'function') {
                    console.log('Boss damage debug triggered');
                    this.bossDamageCallback();
                }
                return;
            }
            if (key === this.playerDamageDebug) {
                if (e.repeat) return;
                if (typeof this.playerDamageCallback === 'function') {
                    this.playerDamageCallback();
                }
                return;
            }
            if (key === this.ballLostDebug) {
                if (e.repeat) return;
                if (typeof this.ballLostCallback === 'function') {
                    this.ballLostCallback();
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            const key = this.getInputKey(e);

            if (this.leftKeys.has(key)) {
                this.pressedLeftKeys.delete(key);
                this.input.left = this.pressedLeftKeys.size > 0;
                console.log('Left flipper released');
                return;
            }
            if (this.rightKeys.has(key)) {
                this.pressedRightKeys.delete(key);
                this.input.right = this.pressedRightKeys.size > 0;
                console.log('Right flipper released');
                return;
            }
            if (key === this.launch) {
                this.input.launch = false;

                const chargeDuration = this.launchChargeStart > 0 ? Date.now() - this.launchChargeStart : 0;

                this.input.launchPower = this.calculateLaunchSpeed(chargeDuration);

                this.launchChargeStart = 0;
                console.log(`Launch button released after charging for ${chargeDuration}ms, power: ${this.input.launchPower}`);

                    if (this.ballRef && !this.impulseUsed) {
                        this.audioManager.stopSound(Config.global.sounds.launchingRamp.charging);
                        this.audioManager.playSound(Config.global.sounds.launchingRamp.launch);
                        if (typeof this.startGameCallback === 'function') {
                            this.startGameCallback();
                        }
                        this.ballRef.rigidBody.setLinvel({
                            x: 0,
                            y: 0,
                            z: this.input.launchPower
                        }, true);
                        this.impulseUsed = true;
                    }
                }
            }
        );
    }

    calculateLaunchSpeed(chargeDurationMs) {
        const config = Config.global.positioning.launchingRamp;
        const charge = Math.min(1, Math.max(0, chargeDurationMs) / config.chargeDurationMs);
        const easedCharge = 1 - Math.pow(1 - charge, 2);
        return config.minimalSpeed
            + (config.maximalSpeed - config.minimalSpeed) * easedCharge;
    }

    setLaunchingRampRef(ref) {
        this.launchingRampRef = ref;
    }

    setBallRef(ref) {
        this.ballRef = ref;
        this.impulseUsed = false;
    }

    setStartGameCallback(callback) {
        this.startGameCallback = callback;
    }

    setBossFightStartCallback(callback) {
        this.bossFightStartCallback = callback;
    }

    setBossDamageCallback(callback) {
        this.bossDamageCallback = callback;
    }

    setPlayerDamageCallback(callback) {
        this.playerDamageCallback = callback;
    }

    setBallLostCallback(callback) {
        this.ballLostCallback = callback;
    }

    setImpulseUsed(value) {
        this.impulseUsed = value;
    }
}

import Config from '../physics/Config.js';
import { AudioManager } from '../physics/Audio.js';

export class Controls{
    /**
     * @param {string} left
     * @param {string} right
     * @param {string} launch
     */

    constructor(left = 'a', right = 'e', launch = 'space', bossDebug = 'b') {
        this.left = left;
        this.right = right;
        this.launch = launch;
        this.bossDebug = bossDebug;
        this.playerDamageDebug = 'h';
        this.ballLostDebug = 'l';

        this.input = { left: false, right: false, launch: false, launchPower: 0 };

        this.launchChargeStart = 0;
        this.launchChargeCount = 0;
        this.launchingRampRef = null;
        this.ballRef = null;
        this.impulseUsed = false;
        this.startGameCallback = null;
        this.bossFightStartCallback = null;
        this.playerDamageCallback = null;
        this.ballLostCallback = null;
        this.audioManager = AudioManager.getShared();

        this.initControls();
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

            if (key === this.left) {
                this.input.left = true;
                return;
                }
            if (key === this.right) {
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
                    this.bossFightStartCallback();
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

            if (key === this.left) {
                this.input.left = false;
                return;
            }
            if (key === this.right) {
                this.input.right = false;
                return;
            }
            if (key === this.launch) {
                this.input.launch = false;

                const chargeDuration = this.launchChargeStart > 0 ? Date.now() - this.launchChargeStart : 0;

                this.input.launchPower = Math.min(Config.global.positioning.launchingRamp.minimalPower + (chargeDuration * Config.global.positioning.launchingRamp.powerBuild) / 10, Config.global.positioning.launchingRamp.maximalPower);

                this.launchChargeStart = 0;
                console.log(`Launch button released after charging for ${chargeDuration}ms, power: ${this.input.launchPower}`);

                    if (this.ballRef && !this.impulseUsed) {
                        this.audioManager.stopSound(Config.global.sounds.launchingRamp.charging);
                        this.audioManager.playSound(Config.global.sounds.launchingRamp.launch);
                        if (typeof this.startGameCallback === 'function') {
                            this.startGameCallback();
                        }
                        const chargedPower = Config.global.positioning.launchingRamp.maximalPower * Math.max(0.1, this.input.launchPower) * Config.forceMultiplier;
                        this.ballRef.rigidBody.applyImpulse({ x: 0, y: 0, z: chargedPower }, true);
                        this.impulseUsed = true;
                    }
                }
            }
        );
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

    setPlayerDamageCallback(callback) {
        this.playerDamageCallback = callback;
    }

    setBallLostCallback(callback) {
        this.ballLostCallback = callback;
    }

    setLaunchChargeCount(value) {
        this.launchChargeCount = value;
    }

    setImpulseUsed(value) {
        this.impulseUsed = value;
    }
}

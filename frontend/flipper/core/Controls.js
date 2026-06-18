import Config from '../physics/Config.js';
import {Objects} from '../objects/Objects.js';
import { AudioManager } from '../physics/Audio.js';

export class Controls{
    /**
     * @param {string} left
     * @param {string} right
     * @param {string} launch
     */

    constructor(left = 'x', right = 'c', launch = 'd', bossDebug = 'b') {
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
        this.buttonEventCallback = null;
        this.buttonNames = {
            a: 'button_black_left',
            x: 'button_white_left',
            g: 'button_front_left_green',
            b: 'button_front_left_yellow',
            h: 'button_front_left_red',
            e: 'button_black_right',
            c: 'button_white_right',
            f: 'button_front_white',
            d: 'plunger'
        };

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

    obj = new Objects();

    initControls() {

        window.addEventListener('keydown', (e) => {
            const key = this.getInputKey(e);

            if (!e.repeat) {
                this.emitButtonEvent(key, true);
            }

            if (key === this.left) {
                this.input.left = true;
                console.log('Left flipper pressed');
                return;
                }
            if (key === this.right) {
                this.input.right = true;
                console.log('Right flipper pressed');
                return;
            }
            if (key === this.launch) {
                if (e.repeat) return;

                this.input.launch = true;
                this.launchChargeStart = Date.now();
                this.launchChargeCount += 1;
                console.log('Launch button pressed');
                if (!this.impulseUsed) this.obj.playSound(Config.global.sounds.launchingRamp.charging);
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

            this.emitButtonEvent(key, false);

            if (key === this.left) {
                this.input.left = false;
                console.log('Left flipper released');
                return;
            }
            if (key === this.right) {
                this.input.right = false;
                console.log('Right flipper released');
                return;
            }
            if (key === this.launch) {
                this.input.launch = false;

                const chargeDuration = this.launchChargeStart > 0 ? Date.now() - this.launchChargeStart : 0;

                this.input.launchPower = Math.min(Config.global.positioning.launchingRamp.minimalPower + (chargeDuration * Config.global.positioning.launchingRamp.powerBuild) / 10, Config.global.positioning.launchingRamp.maximalPower);

                this.launchChargeStart = 0;
                console.log(`Launch button released after charging for ${chargeDuration}ms, power: ${this.input.launchPower}`);

                    if (this.ballRef && !this.impulseUsed) {
                        this.obj.stopSound(Config.global.sounds.launchingRamp.charging);
                        this.obj.playSound(Config.global.sounds.launchingRamp.launch);
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

    setButtonEventCallback(callback) {
        this.buttonEventCallback = callback;
    }

    emitButtonEvent(key, active) {
        const name = this.buttonNames[key];

        if (!name || typeof this.buttonEventCallback !== 'function') {
            return;
        }

        this.buttonEventCallback({ name, key, active });
    }

    setLaunchChargeCount(value) {
        this.launchChargeCount = value;
    }

    setImpulseUsed(value) {
        this.impulseUsed = value;
    }
}

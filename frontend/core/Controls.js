import Config from '../physics/Config.js';

export class Controls{
    /**
     * @param {string} left
     * @param {string} right
     * @param {string} launch
     */

    constructor(left = 'a', right = 'e', launch = 'space') {
        this.left = left;
        this.right = right;
        this.launch = launch;

        this.input = { left: false, right: false, launch: false, launchPower: 0 };

        this.launchChargeStart = 0;
        this.launchChargeCount = 0;
        this.launchingRampRef = null;
        this.ballRef = null;
        this.impulseUsed = false;
        this.startGameCallback = null;

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
            const key = this.getInputKey(e);

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
            }
        });

        window.addEventListener('keyup', (e) => {
            const key = this.getInputKey(e);

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

                this.input.launchPower = Math.min(Config.launchingRamp.minimalPower + (chargeDuration * Config.launchingRamp.powerBuild) / 10, Config.launchingRamp.maximalPower);

                this.launchChargeStart = 0;
                console.log(`Launch button released after charging for ${chargeDuration}ms, power: ${this.input.launchPower}`);

                    if (this.ballRef && !this.impulseUsed) {
                        if (typeof this.startGameCallback === 'function') {
                            this.startGameCallback();
                        }
                        const chargedPower = Config.launchingRamp.maximalPower * Math.max(0.1, this.input.launchPower) * Config.forceMultiplier;
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

    getLaunchChargeCount() {
        return this.launchChargeCount;
    }

    setLaunchChargeCount(value) {
        this.launchChargeCount = value;
    }
}

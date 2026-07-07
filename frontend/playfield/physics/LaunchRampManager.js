import Config from './Config.js';

export class LaunchRampManager {
    constructor(physics) {
        this.physics = physics;
        this.launchingRampVisible = true;
        this.holdLaunchingRampVisibleAfterBallLost = false;
        this.ballRespawnedAfterBallLost = false;
        this.ballPassedAboveTriggerAfterRespawn = false;
        this.launchingRampHideTimeout = null;
    }

    setLaunchingRampVisible(visible) {
        if (!this.physics.launchingRamp?.mesh) {
            return;
        }

        if (this.launchingRampHideTimeout) {
            clearTimeout(this.launchingRampHideTimeout);
            this.launchingRampHideTimeout = null;
        }

        this.launchingRampVisible = visible;
        this.setPhysicsObjectEnabled(this.physics.launchingRamp, visible);
        this.setPhysicsObjectEnabled(this.physics.rampB, !visible);

        if (visible) {
            this.ballPassedAboveTriggerAfterRespawn = false;
        }

        if (globalThis.document?.body) {
            globalThis.document.body.dataset.launchingRamp = visible ? 'visible' : 'hidden';
            globalThis.document.body.dataset.rightRamp = visible ? 'hidden' : 'visible';
        }
    }

    setPhysicsObjectEnabled(object, enabled) {
        if (!object) return;
        if (object.mesh) object.mesh.visible = enabled;
        if (object._physicsEnabled === enabled) return;
        object._physicsEnabled = enabled;

        const colliders = new Set([
            object.collider,
            ...(Array.isArray(object.colliders) ? object.colliders : []),
            ...(Array.isArray(object.collisionEntries)
                ? object.collisionEntries.map((entry) => entry?.collider)
                : [])
        ].filter(Boolean));

        object._collisionGroupsByCollider ??= new WeakMap();
        for (const collider of colliders) {
            if (!object._collisionGroupsByCollider.has(collider)) {
                object._collisionGroupsByCollider.set(
                    collider,
                    typeof collider.collisionGroups === 'function'
                        ? collider.collisionGroups()
                        : 0xffffffff
                );
            }
            collider.setCollisionGroups?.(
                enabled ? object._collisionGroupsByCollider.get(collider) : 0
            );
        }
    }

    checkLaunchingRampHeight() {
        if (!this.launchingRampVisible || !this.physics.controls?.impulseUsed || !this.physics.ball?.rigidBody) {
            return;
        }

        const position = this.physics.ball.rigidBody.translation();
        const launchConfig = Config.global.positioning.launchingRamp;

        if (position.z >= launchConfig.curveStartZ) {
            const velocity = this.physics.ball.rigidBody.linvel();
            const horizontalSpeed = Math.hypot(velocity.x ?? 0, velocity.z ?? 0);
            const currentAngle = Math.atan2(velocity.x ?? 0, velocity.z ?? 0);
            const targetAngle = Math.atan2(
                launchConfig.exitX - position.x,
                launchConfig.exitZ - position.z
            );
            const rawDelta = Math.atan2(
                Math.sin(targetAngle - currentAngle),
                Math.cos(targetAngle - currentAngle)
            );
            const turn = Math.max(
                -launchConfig.curveTurnRate,
                Math.min(launchConfig.curveTurnRate, rawDelta)
            );
            const steeredAngle = currentAngle + turn;

            this.physics.ball.rigidBody.setLinvel({
                x: Math.sin(steeredAngle) * horizontalSpeed,
                y: velocity.y ?? 0,
                z: Math.cos(steeredAngle) * horizontalSpeed
            }, true);
        }

        const distanceToExit = Math.hypot(
            launchConfig.exitX - position.x,
            launchConfig.exitZ - position.z
        );
        if (distanceToExit > launchConfig.exitRadius) {
            return;
        }

        this.holdLaunchingRampVisibleAfterBallLost = false;
        this.ballPassedAboveTriggerAfterRespawn = true;
        this.setLaunchingRampVisible(false);
    }
}
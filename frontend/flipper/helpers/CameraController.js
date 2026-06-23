import * as THREE from 'three';

/**
 * CameraController
 *
 * Helper to read and update the orthographic camera parameters
 * managed by Scene.js at runtime.
 *
 * Usage:
 *   import { CameraController } from './helpers/CameraController.js';
 *   const cam = new CameraController(scene);   // scene is your Scene instance
 *
 *   cam.setPosition(0, 1130, -280);
 *   cam.setTarget(-10, 0, -130);
 *   cam.setZoom(1.5);
 *   cam.setNearFar(0.1, 5000);
 *   cam.snapshot();   // log the current state to the console
 */
export class CameraController {
    /**
     * @param {import('../scene/Scene.js').Scene} sceneInstance
     *   The Scene instance that owns the camera and renderer.
     */
    constructor(sceneInstance) {
        this._scene = sceneInstance;

        /** @type {THREE.OrthographicCamera} */
        this._camera = sceneInstance.camera;

        /** @type {THREE.WebGLRenderer} */
        this._renderer = sceneInstance.renderer;

        // Internal target so we can re-apply lookAt after position changes.
        this._target = new THREE.Vector3(-10, 0, -130);

        // Keep frustumHeight in sync with Scene so window-resize stays consistent.
        this._syncFrustumHeight();
    }

    // ─────────────────────────────────────────────
    // Internal helpers
    // ─────────────────────────────────────────────

    /** Pull frustumHeight from the Scene instance so both stay in sync. */
    _syncFrustumHeight() {
        this._frustumHeight = this._scene.frustumHeight;
    }

    /** Recompute frustum planes from the current frustumHeight and renderer size. */
    _applyFrustum() {
        const aspect = this._renderer.domElement.clientWidth /
                       this._renderer.domElement.clientHeight;
        const halfH = this._frustumHeight / 2;
        const halfW = halfH * aspect;

        this._camera.left   = -halfW;
        this._camera.right  =  halfW;
        this._camera.top    =  halfH;
        this._camera.bottom = -halfH;

        // Write back so Scene's resize handler keeps the same value.
        this._scene.frustumHeight = this._frustumHeight;

        this._camera.updateProjectionMatrix();
    }

    // ─────────────────────────────────────────────
    // Position & orientation
    // ─────────────────────────────────────────────

    /**
     * Move the camera to a new position in world space.
     * The camera keeps looking at the current target.
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    setPosition(x, y, z) {
        this._camera.position.set(x, y, z);
        this._camera.lookAt(this._target);
        return this;
    }

    /**
     * Translate the camera by a delta relative to its current position.
     * @param {number} dx
     * @param {number} dy
     * @param {number} dz
     */
    translate(dx, dy, dz) {
        this._camera.position.x += dx;
        this._camera.position.y += dy;
        this._camera.position.z += dz;
        this._camera.lookAt(this._target);
        return this;
    }

    /**
     * Change the look-at target (pivot point).
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    setTarget(x, y, z) {
        this._target.set(x, y, z);
        this._camera.lookAt(this._target);
        return this;
    }

    /**
     * Set the camera's up vector.
     * Default in Scene.js is (0, 0, 1) for the top-down orthographic view.
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    setUp(x, y, z) {
        this._camera.up.set(x, y, z);
        this._camera.lookAt(this._target);
        return this;
    }

    // ─────────────────────────────────────────────
    // Frustum / zoom
    // ─────────────────────────────────────────────

    /**
     * Set the frustum height directly (world units).
     * This drives the left/right/top/bottom planes automatically.
     * @param {number} height
     */
    setFrustumHeight(height) {
        this._frustumHeight = height;
        this._applyFrustum();
        return this;
    }

    /**
     * Multiply the current frustum height by a factor.
     * factor < 1 → zoom in, factor > 1 → zoom out.
     * @param {number} factor
     */
    zoom(factor) {
        this._syncFrustumHeight();
        this._frustumHeight *= factor;
        this._applyFrustum();
        return this;
    }

    /**
     * Set the camera zoom property directly (THREE.js built-in).
     * 1 = default, 2 = 2× closer.
     * @param {number} value
     */
    setZoom(value) {
        this._camera.zoom = value;
        this._camera.updateProjectionMatrix();
        return this;
    }

    // ─────────────────────────────────────────────
    // Near / far clipping planes
    // ─────────────────────────────────────────────

    /**
     * @param {number} near
     * @param {number} far
     */
    setNearFar(near, far) {
        this._camera.near = near;
        this._camera.far  = far;
        this._camera.updateProjectionMatrix();
        return this;
    }

    // ─────────────────────────────────────────────
    // Smooth transitions
    // ─────────────────────────────────────────────

    /**
     * Smoothly move the camera position over `duration` milliseconds.
     * @param {{ x: number, y: number, z: number }} targetPosition
     * @param {number} duration  Duration in ms (default 600).
     * @returns {Promise<void>}  Resolves when the animation is done.
     */
    animateTo(targetPosition, duration = 600) {
        return new Promise((resolve) => {
            const start = performance.now();
            const from  = this._camera.position.clone();
            const to    = new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z);

            const tick = (now) => {
                const t = Math.min((now - start) / duration, 1);
                const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease-in-out quad

                this._camera.position.lerpVectors(from, to, ease);
                this._camera.lookAt(this._target);

                if (t < 1) {
                    requestAnimationFrame(tick);
                } else {
                    resolve();
                }
            };

            requestAnimationFrame(tick);
        });
    }

    /**
     * Smoothly zoom in / out to a target frustum height over `duration` ms.
     * @param {number} targetFrustumHeight
     * @param {number} duration
     * @returns {Promise<void>}
     */
    animateFrustumTo(targetFrustumHeight, duration = 600) {
        this._syncFrustumHeight();
        return new Promise((resolve) => {
            const start   = performance.now();
            const fromH   = this._frustumHeight;
            const toH     = targetFrustumHeight;

            const tick = (now) => {
                const t    = Math.min((now - start) / duration, 1);
                const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

                this._frustumHeight = fromH + (toH - fromH) * ease;
                this._applyFrustum();

                if (t < 1) {
                    requestAnimationFrame(tick);
                } else {
                    resolve();
                }
            };

            requestAnimationFrame(tick);
        });
    }

    // ─────────────────────────────────────────────
    // Presets
    // ─────────────────────────────────────────────

    /**
     * Restore the exact camera state defined in Scene.js constructor.
     * Useful as a "reset" after runtime tweaks.
     * @param {{ x: number, y: number, z: number }} scenePosition
     *   The `position` argument originally passed to the Scene constructor.
     */
    resetToDefault(scenePosition = { x: 0, y: 500, z: 0 }) {
        const camPos = {
            x: scenePosition.x,
            y: scenePosition.y + 630,
            z: scenePosition.z - 280,
        };
        this.setPosition(camPos.x, camPos.y, camPos.z);
        this.setTarget(-10, 0, -130);
        this.setUp(0, 0, 1);
        this.setNearFar(0.1, 3000);
        this.setZoom(1);

        // Recompute frustumHeight as Scene.js does.
        const aspect    = this._renderer.domElement.clientWidth /
                          this._renderer.domElement.clientHeight;
        const distance  = this._camera.position.distanceTo(this._target);
        this._frustumHeight = 2 * Math.tan(THREE.MathUtils.degToRad(55 / 2)) * distance;
        this._applyFrustum();

        return this;
    }

    // ─────────────────────────────────────────────
    // Inspection
    // ─────────────────────────────────────────────

    /**
     * Print the current camera state to the console.
     * Handy for dialling in values during development.
     */
    snapshot() {
        this._syncFrustumHeight();
        const c = this._camera;
        console.group('[CameraController] snapshot');
        console.log('position    :', c.position.toArray().map(v => +v.toFixed(2)));
        console.log('target      :', this._target.toArray().map(v => +v.toFixed(2)));
        console.log('up          :', c.up.toArray());
        console.log('zoom        :', c.zoom);
        console.log('frustumH    :', +this._frustumHeight.toFixed(2));
        console.log('near / far  :', c.near, '/', c.far);
        console.log('left/right  :', +c.left.toFixed(2), '/', +c.right.toFixed(2));
        console.log('top/bottom  :', +c.top.toFixed(2), '/', +c.bottom.toFixed(2));
        console.groupEnd();
        return this;
    }

    // ─────────────────────────────────────────────
    // Getters (read-only convenience)
    // ─────────────────────────────────────────────

    get position()      { return this._camera.position.clone(); }
    get target()        { return this._target.clone(); }
    get frustumHeight() { return this._frustumHeight; }
    get zoom()          { return this._camera.zoom; }
    get near()          { return this._camera.near; }
    get far()           { return this._camera.far; }
}s
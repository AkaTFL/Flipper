import * as RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Objects {
    constructor(
        world,
        length = null,
        width = null,
        height = null,
        position = { x: 0, y: 0, z: 0 },
        rotation = { x: 0, y: 0, z: 0 },
        radius = null,
        mesh = [],
        side = null,
        sound = null
    ) {
        this.world = world;
        this.length = length;
        this.width = width;
        this.height = height;
        this.position = position;
        this.rotation = rotation;
        this.radius = radius;
        this.mesh = mesh;
        this.side = side;
        this.sound = sound;

        this.mesh = new THREE.Group();

        const hasBoxDimensions = this.length != null && this.width != null && this.height != null;
        this.TreeMesh = null;

        if (hasBoxDimensions) {
            this.TreeMesh = new THREE.Mesh(
                new THREE.BoxGeometry(this.length, this.width, this.height),
                new THREE.MeshStandardMaterial({
                    color: 0x606060,
                    metalness: 0.5,
                    roughness: 0.5
                })
            );
            this.mesh.add(this.TreeMesh);
        }

        if (position) {
            this.mesh.position.copy(position);
        }

        if (rotation) {
            this.mesh.rotation.x = rotation.x ?? 0;
            this.mesh.rotation.y = rotation.y ?? 0;
            this.mesh.rotation.z = rotation.z ?? 0;
        }

        this.audio = this.initSound(this.sound);
    }

    initSound(soundConfig = null) {
        if (typeof Audio === 'undefined') return null;

        const soundFile =soundConfig?.file || null;
        if (!soundFile) return null;

        const source = new URL(`${soundFile}`, import.meta.url).href;
        const audio = new Audio(source);
        audio.preload = 'auto';
        audio.volume = soundConfig.volume ?? 1;
        return audio;
    }

    playSound(soundOptions = null) {
        const options = soundOptions ?? this.sound;
        if (!this.audio) return;

        this.audio.volume = options.volume ?? 1;

        this.audio.currentTime = 0;
        this.audio.play().catch((error) => {
            console.error('Failed to play sound:', error);
        });
    }

    toRotationQuaternion(rotation = this.rotation) {
        const rx = rotation?.x ?? 0;
        const ry = rotation?.y ?? 0;
        const rz = rotation?.z ?? 0;

        return {
            x: Math.sin(rx / 2),
            y: Math.sin(ry / 2),
            z: Math.sin(rz / 2),
            w: Math.cos(rx / 2) * Math.cos(ry / 2) * Math.cos(rz / 2)
        };
    }

    createFixedRigidBody(position = this.position, rotation = this.rotation, withRotation = true) {
        if (!this.world || !position) return null;

        let rigidBodyDesc = RAPIER.RigidBodyDesc.fixed()
            .setTranslation(position.x, position.y, position.z);

        if (withRotation) {
            rigidBodyDesc = rigidBodyDesc.setRotation(this.toRotationQuaternion(rotation));
        }

        this.rigidBody = this.world.createRigidBody(rigidBodyDesc);
        return this.rigidBody;
    }

    attachCollider(colliderDesc, rigidBody = this.rigidBody) {
        this.collider = this.world.createCollider(colliderDesc, rigidBody);
        return this.collider;
    }

    addMesh(modelPath, onModelLoaded) {
        const loader = new GLTFLoader();

        loader.loadAsync(modelPath)
            .then(({ scene: modelRoot }) => {
                modelRoot.position.set(0, 0, 0);

                const box = new THREE.Box3().setFromObject(modelRoot);
                const size = box.getSize(new THREE.Vector3());

                if (size.x > 0) {
                    modelRoot.scale.setScalar(this.length / size.x);
                }

                if (onModelLoaded) {
                    onModelLoaded(modelRoot);
                }

                this.mesh.add(modelRoot);
                if (this.fallbackMesh) {
                    this.fallbackMesh.visible = false;
                }
            })
            .catch((error) => {
                console.error('Failed to load flipper model:', error);
            });
    }

    syncObjects() {
        if (!this.rigidBody || !this.mesh) return;

        const position = this.rigidBody.translation();
        this.mesh.position.set(position.x, position.y, position.z);

        const rotation = this.rigidBody.rotation();
        this.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    }
}

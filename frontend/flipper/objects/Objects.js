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
        side = null,
    ) {
        this.world = world;
        this.length = length;
        this.width = width;
        this.height = height;
        this.position = position;
        this.rotation = rotation;
        this.radius = radius;
        this.side = side;

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
            this.mesh.rotation.set(rotation.x ?? 0, rotation.y ?? 0, rotation.z ?? 0);
        }

        this.audio = this.initSound(this.sound);
    }

    initSound(sound) {
        if (!sound) return null;
        
        const soundConfig = typeof sound === 'string' ? { file: sound, volume: 1 } : sound;

        let source;
        try {
            source = new URL(soundConfig.file, import.meta.url).href;
        } catch (e) {
            console.warn('Le chemin du fichier son est invalide:', soundConfig.file);
            return null;
        }
        this.audio = new Audio(source);
        this.audio.preload = 'auto';
        this.audio.volume = soundConfig.volume ?? 1;
        this.audio.onerror = () => {
            console.warn(`Le fichier son est manquant : ${soundConfig.file}`);
        };
        return this.audio;
    }

    playSound(sound = this.sound) {
        this.audio = this.initSound(sound);
        if (this.audio === null) return;

        this.audio.currentTime = 0;
        this.audio.play().catch((error) => {
            console.error('Impossible de lire le son:', error);
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
        };
    }

    createFixedRigidBody(position = this.position, rotation = this.rotation) {
        if (!this.world || !position) return null;

        const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed()
            .setTranslation(position.x, position.y, position.z);

        const finalRigidBodyDesc = rotation
            ? rigidBodyDesc.setRotation(this.toRotationQuaternion(rotation))
            : rigidBodyDesc;

        this.rigidBody = this.world.createRigidBody(finalRigidBodyDesc);
        return this.rigidBody;
    }

    attachCollider(colliderDesc, rigidBody = this.rigidBody) {
        this.collider = this.world.createCollider(colliderDesc, rigidBody);
        return this.collider;
    }

    replaceCollider(colliderDesc, rigidBody = this.rigidBody) {
        if (this.collider && typeof this.world.removeCollider === 'function') {
            this.world.removeCollider(this.collider, true);
            this.collider = null;
        }

        return this.attachCollider(colliderDesc, rigidBody);
    }

    buildTrimeshColliderDescFromMesh(modelRoot) {
        if (!modelRoot) return null;

        modelRoot.updateMatrixWorld(true);

        const vertices = [];
        const indices = [];
        let vertexOffset = 0;

        modelRoot.traverse((child) => {
            if (!child.isMesh || !child.geometry) return;

            const geometry = child.geometry.clone();
            const positionAttribute = geometry.getAttribute('position');
            if (!positionAttribute) {
                geometry.dispose();
                return;
            }

            if (!geometry.index) {
                geometry.setIndex(Array.from({ length: positionAttribute.count }, (_, i) => i));
            }

            geometry.applyMatrix4(child.matrixWorld);

            const transformedPosition = geometry.getAttribute('position');
            for (let i = 0; i < transformedPosition.count; i += 1) {
                vertices.push(
                    transformedPosition.getX(i),
                    transformedPosition.getY(i),
                    transformedPosition.getZ(i)
                );
            }

            const geometryIndices = geometry.index?.array;
            if (geometryIndices && geometryIndices.length >= 3) {
                for (let i = 0; i < geometryIndices.length; i += 1) {
                    indices.push(geometryIndices[i] + vertexOffset);
                }
            }

            vertexOffset += transformedPosition.count;
            geometry.dispose();
        });

        if (vertices.length < 9 || indices.length < 3) {
            return null;
        }

        return RAPIER.ColliderDesc.trimesh(vertices, indices);
    }

    addMesh(modelPath, onModelLoaded) {
        const loader = new GLTFLoader();

        loader.loadAsync(modelPath)
            .then(({ scene: modelRoot }) => {
                modelRoot.position.set(0, 0, 0);
                modelRoot.updateMatrixWorld(true);

                const box = new THREE.Box3().setFromObject(modelRoot);
                const size = box.getSize(new THREE.Vector3());

                if (size.x === 0 || size.y === 0 || size.z === 0) {
                    console.warn('Le modèle 3D a des dimensions invalides (taille nulle) :', modelPath);
                    return;
                }

                const scaleX = this.length ? (this.length / size.x) : 1;
                const scaleY = this.width ? (this.width / size.y) : scaleX;
                const scaleZ = this.height ? (this.height / size.z) : scaleX;

                modelRoot.scale.set(scaleX, scaleY, scaleZ);
                modelRoot.updateMatrixWorld(true);

                modelRoot.traverse((child) => {
                    if (child.isMesh) {
                        if (!child.material || Object.keys(child.material).length === 0) {
                            child.material = new THREE.MeshStandardMaterial({
                                color: 0xcccccc
                            });
                        }
                        child.material.side = THREE.DoubleSide;
                    }
                });

                if (onModelLoaded) {
                    onModelLoaded(modelRoot);
                }

                this.mesh.add(modelRoot);
            })
            .catch((error) => {
                console.error('Failed to load flipper model:', error);
            });
    }

    getMeshMetrics(modelRoot) {
        modelRoot.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(modelRoot);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        return { box, size, center, halfLengthX: size.x / 2 };
    }

    syncObjects() {
        if (!this.rigidBody || !this.mesh) return;

        const position = this.rigidBody.translation();
        this.mesh.position.set(position.x, position.y, position.z);

        const rotation = this.rigidBody.rotation();
        this.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    }
}
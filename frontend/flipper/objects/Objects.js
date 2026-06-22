import * as RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { AudioManager } from '../physics/Audio.js';

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
        this.modelRoot = null;
        this.debugColliderBuilder = null;

        const hasBoxDimensions = this.length != null && this.width != null && this.height != null;
        this.TreeMesh = null;

        if (hasBoxDimensions) {
            this.TreeMesh = new THREE.Mesh(
                new THREE.BoxGeometry(this.length, this.width, this.height),
            );
            this.mesh.add(this.TreeMesh);
        }

        if (position) {
            this.mesh.position.copy(position);
        }

        if (rotation) {
            this.mesh.rotation.set(rotation.x ?? 0, rotation.y ?? 0, rotation.z ?? 0);
        }

        this.audioManager = AudioManager.getShared();
        this.audio = null;
        this.loader = new GLTFLoader();
    }

    initSound(sound) {
        const created = this.audioManager.createAudio(sound);
        this.audio = created?.audio ?? null;
        return this.audio;
    }

    playSound(sound, volume) {
        return this.audioManager.playSound(sound, volume);
    }

    stopSound(sound) {
        return this.audioManager.stopSound(sound);
    }

    toRotationQuaternion(rotation = this.rotation) {
        const rx = rotation?.x ?? 0;
        const ry = rotation?.y ?? 0;
        const rz = rotation?.z ?? 0;

        // Formule pour une rotation composite XYZ
        const cx = Math.cos(rx / 2), sx = Math.sin(rx / 2);
        const cy = Math.cos(ry / 2), sy = Math.sin(ry / 2);
        const cz = Math.cos(rz / 2), sz = Math.sin(rz / 2);

        return {
            x: sx * cy * cz - cx * sy * sz,
            y: cx * sy * cz + sx * cy * sz,
            z: cx * cy * sz - sx * sy * cz,
            w: cx * cy * cz + sx * sy * sz
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

        const collider = this.world.createCollider( colliderDesc, rigidBody);

        if (!this.colliders) {
            this.colliders = [];
        }

        this.colliders.push(collider);

        if (!this.collider) {
            this.collider = collider;
        }

        try {
            if (
                this.gamePhysics &&
                collider &&
                typeof collider.handle !== 'undefined'
            ) {
                const handle = collider.handle;

                this.gamePhysics.colliderOwners?.set(handle, this);
                this.gamePhysics.colliderResponders?.set(handle, this);
            }
        } catch (e) {
            console.warn('[attachCollider] failed to register collider', e);
        }
        return collider;
    }

    buildTrimeshCollider(modelRoot) {
        if (!modelRoot || !modelRoot.isObject3D) return null;

        modelRoot.updateMatrixWorld(true);

        let firstColliderDesc = null;

        const worldPos = new THREE.Vector3();

        modelRoot.traverse((child) => {
            if (!child.isMesh || !child.geometry) return;

            const geometry = child.geometry;
            const position = geometry.getAttribute('position');

            if (!position) return;

            const vertices = [];
            const indices = [];

            // Important : s'assurer que la matrice monde est à jour
            child.updateWorldMatrix(true, false);

            // Transforme chaque sommet dans l'espace monde sans cloner la géométrie
            for (let i = 0; i < position.count; i++) {
                worldPos.fromBufferAttribute(position, i);
                worldPos.applyMatrix4(child.matrixWorld);

                vertices.push(worldPos.x, worldPos.y, worldPos.z);
            }

            if (geometry.index) {
                const indexArray = geometry.index.array;
                for (let i = 0; i < indexArray.length; i++) {
                    indices.push(indexArray[i]);
                }
            } else {
                for (let i = 0; i < position.count; i++) {
                    indices.push(i);
                }
            }

            if (vertices.length > 0 && indices.length > 0) {
                const desc = RAPIER.ColliderDesc.trimesh(vertices, indices);
                this.attachCollider(desc);

                if (!firstColliderDesc) {
                    firstColliderDesc = desc;
                }
            }
        });

        return firstColliderDesc;
    }

    addMesh(modelPath, onModelLoaded) {
        this.loader.loadAsync(modelPath)
            .then(({ scene: modelRoot }) => {
                this.modelRoot = modelRoot;
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
                        child.material.side = THREE.DoubleSide;
                        child.castShadow = true;
                        child.receiveShadow = true;
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

    addTexture(textureOrMaps, target = this.mesh) {
        if (!textureOrMaps) return null;

        const maps = typeof textureOrMaps === 'string'
            ? { map: textureOrMaps }
            : textureOrMaps;

        const repeat = maps.repeat ?? [1, 1];
        const displacementScale = maps.displacementScale;
        const loader = new THREE.TextureLoader();

        const loadedMaps = {};

        Object.entries(maps).forEach(([key, value]) => {
            if (
                key === 'repeat' ||
                key === 'displacementScale' ||
                !value
            ) return;

            const texture = value.isTexture
                ? value
                : loader.load(value);

            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(repeat[0], repeat[1]);

            if (key === 'map') {
                texture.colorSpace = THREE.SRGBColorSpace;
            }

            loadedMaps[key] = texture;
        });
        const applyMaps = (mesh) => {
            if (!mesh.isMesh || !mesh.material) return;

            const materials = Array.isArray(mesh.material)
                ? mesh.material.map((material) => material.clone())
                : [mesh.material.clone()];

            materials.forEach((material) => {
                Object.assign(material, loadedMaps);

                if (displacementScale !== undefined) {
                    material.displacementScale = displacementScale;
                }

                material.needsUpdate = true;
            });

            if (
                loadedMaps.aoMap &&
                mesh.geometry.attributes.uv &&
                !mesh.geometry.attributes.uv2
            ) {
                mesh.geometry.setAttribute(
                    'uv2',
                    mesh.geometry.attributes.uv.clone()
                );
            }

            mesh.material = Array.isArray(mesh.material)
                ? materials
                : materials[0];
        };

        target?.isMesh
            ? applyMaps(target)
            : target?.traverse(applyMaps);

        return loadedMaps;
    }

    getMeshMetrics(modelRoot) {
        if (modelRoot.userData._metrics) {
            return modelRoot.userData._metrics;
        }

        modelRoot.updateMatrixWorld(false);

        const box = new THREE.Box3();

        modelRoot.traverse((child) => {
            if (!child.isMesh) return;

            child.geometry.computeBoundingBox();

            const geomBox = child.geometry.boundingBox.clone();
            geomBox.applyMatrix4(child.matrixWorld);

            box.union(geomBox);
        });

        const size = new THREE.Vector3();
        const center = new THREE.Vector3();

        box.getSize(size);
        box.getCenter(center);

        const metrics = {
            box,
            center,
            halfLengthX: size.x * 0.5
        };

        modelRoot.userData._metrics = metrics;

        return metrics;
    }

    syncObjects() {
        if (!this.rigidBody || !this.mesh) return;

        const position = this.rigidBody.translation();
        this.mesh.position.set(position.x, position.y, position.z);

        const rotation = this.rigidBody.rotation();
        this.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    }
}
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

        modelRoot.traverse((child) => {
            if (!child.isMesh || !child.geometry) return;

            const geometry = child.geometry.clone();

            if (!geometry.getAttribute('position')) {
                geometry.dispose();
                return;
            }

            geometry.applyMatrix4(child.matrixWorld);

            const position = geometry.getAttribute('position');
            const vertices = [];
            const indices = [];

            for (let i = 0; i < position.count; i++) {
                vertices.push(
                    position.getX(i),
                    position.getY(i),
                    position.getZ(i)
                );
            }

            if (geometry.index) {
                for (let i = 0; i < geometry.index.count; i++) {
                    indices.push(geometry.index.getX(i));
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

            geometry.dispose();
        });

        return firstColliderDesc;
    }

    /**
     * Construit un collider à partir d'un mesh en conservant ses coordonnées
     * locales par rapport au groupe porté par le rigid body.
     *
     * `buildTrimeshCollider` historique applique `matrixWorld`, puis attache le
     * résultat à un rigid body déjà positionné : la translation et la rotation
     * peuvent alors être appliquées deux fois. Cette variante est utilisée par
     * les accès aux rampes, pour lesquels l'alignement visuel/physique doit être
     * exact.
     */
    buildLocalTrimeshCollider(mesh, { sensor = false, activeEvents = null } = {}) {
        if (!mesh?.isMesh || !mesh.geometry || !this.mesh) return null;

        this.mesh.updateMatrixWorld(true);
        mesh.updateMatrixWorld(true);

        const geometry = mesh.geometry.clone();
        const position = geometry.getAttribute('position');
        if (!position) {
            geometry.dispose();
            return null;
        }

        const relativeMatrix = new THREE.Matrix4()
            .copy(this.mesh.matrixWorld)
            .invert()
            .multiply(mesh.matrixWorld);

        geometry.applyMatrix4(relativeMatrix);

        const vertices = [];
        const indices = [];

        for (let i = 0; i < position.count; i++) {
            vertices.push(position.getX(i), position.getY(i), position.getZ(i));
        }

        if (geometry.index) {
            for (let i = 0; i < geometry.index.count; i++) {
                indices.push(geometry.index.getX(i));
            }
        } else {
            for (let i = 0; i < position.count; i++) indices.push(i);
        }

        geometry.dispose();
        if (vertices.length === 0 || indices.length === 0) return null;

        let desc = RAPIER.ColliderDesc.trimesh(vertices, indices);
        if (sensor) desc = desc.setSensor(true);
        if (activeEvents !== null) desc = desc.setActiveEvents(activeEvents);

        return this.attachCollider(desc);
    }

    buildConvexHullCollider(modelRoot, offsetTranslation = { x: 0, y: 0, z: 0 }) {
        if (!modelRoot || !modelRoot.isObject3D) return null;

        modelRoot.updateMatrixWorld(true);

        const points = [];

        modelRoot.traverse((child) => {
            if (!child.isMesh || !child.geometry) return;

            const geometry = child.geometry.clone();
            geometry.applyMatrix4(child.matrixWorld);

            const position = geometry.getAttribute('position');
            if (!position) { geometry.dispose(); return; }

            for (let i = 0; i < position.count; i++) {
                points.push(position.getX(i), position.getY(i), position.getZ(i));
            }

            geometry.dispose();
        });

        if (points.length === 0) return null;

        const vertices = new Float32Array(points);

        const desc = RAPIER.ColliderDesc.convexHull(vertices)
            ?.setTranslation(offsetTranslation.x, offsetTranslation.y, offsetTranslation.z)
            ?.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

        if (!desc) return null;

        return this.attachCollider(desc, this.rigidBody);
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

                this.mesh.add(modelRoot);
                modelRoot.updateMatrixWorld(true);
                
                if (onModelLoaded) {
                    onModelLoaded(modelRoot);
                }

                if (this.objectType) {
                    this.mesh.userData.objectType = this.objectType;
                    modelRoot.traverse((child) => {
                        child.userData.objectType = this.objectType;
                    });
                }
            })
            .catch((error) => {
                console.error('Failed to load flipper model:', error);
                console.error('Model path:', modelPath);
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
                : loader.load(new URL(value, import.meta.url).href);

            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(repeat[0], repeat[1]);

            if (key === 'map') {
                texture.colorSpace = THREE.SRGBColorSpace;
            }

            loadedMaps[key] = texture;
        });

        console.log('OBJECT TYPE =', this.objectType);
        console.log('maps =', maps);

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

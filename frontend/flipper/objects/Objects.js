import * as RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import AudioManager from '../physics/Audio.js';

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

        this.audioManager = new AudioManager();
        this.audio = null;
    }

    initSound(sound) {
        this.audio = this.audioManager.initSound(sound);
        return this.audio;
    }

    playSound(sound) {
        return this.audioManager.playSound(sound);
    }

    playBallSound(surface, speed) {
        return this.audioManager.playBallSound(surface, speed);
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
        this.collider = this.world.createCollider(colliderDesc, rigidBody);

        // If this object has a reference to the GamePhysics instance, register
        // the collider handle so collision lookup works even when colliders are
        // created asynchronously (e.g. after model load).
        try {
            if (this.gamePhysics && this.collider && typeof this.collider.handle !== 'undefined') {
                const handle = this.collider.handle;
                if (this.gamePhysics.colliderOwners && typeof this.gamePhysics.colliderOwners.set === 'function') {
                    this.gamePhysics.colliderOwners.set(handle, this);
                }
                if (this.gamePhysics.colliderResponders && typeof this.gamePhysics.colliderResponders.set === 'function') {
                    this.gamePhysics.colliderResponders.set(handle, this);
                }
            }
        } catch (e) {
            console.warn('[attachCollider] failed to register collider with gamePhysics', e);
        }

        return this.collider;
    }

    replaceCollider(colliderDesc, rigidBody = this.rigidBody) {
        // Clean up any existing collider and mappings
        try {
            if (this.collider) {
                if (this.gamePhysics && typeof this.collider.handle !== 'undefined') {
                    const oldHandle = this.collider.handle;
                    try {
                        this.gamePhysics.colliderOwners?.delete(oldHandle);
                        this.gamePhysics.colliderResponders?.delete(oldHandle);
                    } catch (e) {
                        // ignore
                    }
                }

                if (typeof this.world.removeCollider === 'function') {
                    this.world.removeCollider(this.collider, true);
                }
                this.collider = null;
            }
        } catch (e) {
            console.warn('[replaceCollider] error while removing old collider', e);
        }

        return this.attachCollider(colliderDesc, rigidBody);
    }

    buildTrimeshCollider(modelRoot) {
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
                const x = transformedPosition.getX(i);
                const y = transformedPosition.getY(i);
                const z = transformedPosition.getZ(i);
                
                // ✅ VÉRIFICATION : rejeter les valeurs invalides
                if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
                    console.warn(`[buildTrimeshCollider] Vertex invalide détecté: (${x}, ${y}, ${z})`);
                    geometry.dispose();
                    return;
                }
                
                vertices.push(x, y, z);
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

        // ✅ VÉRIFICATION : émettre un avertissement si trimesh vide
        if (vertices.length === 0 || indices.length === 0) {
            console.warn(`[buildTrimeshCollider] Pas de géométrie valide trouvée (vertices: ${vertices.length}, indices: ${indices.length})`);
            return null;
        }

        if (vertices.length < 9 || indices.length < 3) {
            console.warn(`[buildTrimeshCollider] Géométrie insuffisante (vertices: ${vertices.length}, indices: ${indices.length})`);
            return null;
        }

        console.log(`[buildTrimeshCollider] Trimesh créé : ${vertices.length / 3} vertices, ${indices.length / 3} triangles`);
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
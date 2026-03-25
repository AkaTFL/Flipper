import * as RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Config from '../physics/Config.js';

export class Palles {
    /**
     * @param {Object} world - The physics world
     * @param {number} length - The length of the palles
     * @param {number} height - The height of the palles
     * @param {Object} position - The position object with x, y, z properties
     * @param {Object} rotation - The rotation object with x, y, z properties
     */
    constructor(world, length = 500, width = 10, height = 10, position = {x: 250, y: 500, z: 0}, rotation = {x: 0, y: 0, z: 0}, side) {
        this.world = world;
        this.length = length;
        this.width = width;
        this.height = height;
        this.position = position;
        this.rotation = rotation;
        this.side = side;
        this.isLeft = side === 'left';

        this.angle = Math.abs(Config.palles.rotationAngle);
        this.rotationSpeed = Config.palles.rotationSpeed;

        this.mesh = new THREE.Group();

        this.fallbackMesh = new THREE.Mesh(
            new THREE.BoxGeometry(this.length, this.width, this.height),
            new THREE.MeshStandardMaterial({
                color: 0x606060,
                metalness: 0.5,
                roughness: 0.5
            })
        );
        this.mesh.add(this.fallbackMesh);

        this.mesh.position.copy(position);

        this.mesh.rotation.x = rotation.x;
        this.mesh.rotation.y = rotation.y;
        this.mesh.rotation.z = rotation.z;

        this.loadFlipperModel();

        // Physics properties - hinge anchors differ for left/right flippers
        const isLeft = side === 'left';
        const anchorBody = isLeft ? { x: (length / 2), y: 0, z: 0 } : { x: (-length / 2), y: 0, z: 0 };
        const pivotWorldX = isLeft ? position.x + (length / 2) : position.x - (length / 2);


        const pallesDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(position.x, position.y, position.z)
            .setCanSleep(false)
            .setRotation({ x: Math.sin(rotation.x / 2), y: Math.sin(rotation.y / 2), z: Math.sin(rotation.z / 2), w: Math.cos(rotation.x / 2) * Math.cos(rotation.y / 2) * Math.cos(rotation.z / 2) });

        this.rigidBody = this.world.createRigidBody(pallesDesc);

        const pivotDesc = RAPIER.RigidBodyDesc.fixed()
        .setTranslation(pivotWorldX, position.y, position.z);
        const pivotBody = this.world.createRigidBody(pivotDesc);

        // Ajout d'un point pivot pour permettre la rotation autour d'un point spécifique
        const pivot = RAPIER.JointData.revolute({ x: 0, y: 0, z: 0 }, anchorBody, { x: 0, y: 1, z: 0 });

        this.joint = this.world.createImpulseJoint(pivot, pivotBody, this.rigidBody, true);

        const colliderDesc = RAPIER.ColliderDesc.cuboid(this.length / 2, this.width / 2, this.height / 2)
            .setRestitution(Config.palles.restitution)
            .setFriction(Config.palles.friction);

        this.collider = this.world.createCollider(colliderDesc, this.rigidBody);

        //Movements of the palles
        if (this.isLeft) {
            this.joint.setLimits(-this.angle, 0);
        } else {
            this.joint.setLimits(0, this.angle);
        }
    }

    loadFlipperModel() {
        const loader = new GLTFLoader();
        const model = new URL(
            this.isLeft ? '../assets/Right_flipper.glb' : '../assets/Left_flipper.glb',
            import.meta.url
        ).href;

        loader.loadAsync(model)
            .then((asset) => {
                const modelRoot = asset.scene;
                const box = new THREE.Box3().setFromObject(modelRoot);
                const size = new THREE.Vector3();
                const center = new THREE.Vector3();
                box.getSize(size);
                box.getCenter(center);

                modelRoot.position.set(0, 0, 0);
                if (size.x > 0) {
                    const uniformScale = this.length / size.x;
                    modelRoot.scale.setScalar(uniformScale);
                }

                const visualYawOffset = this.isLeft ? (-Math.PI / 5) : (Math.PI / 5);
                modelRoot.rotation.y = visualYawOffset;

                const alignedBox = new THREE.Box3().setFromObject(modelRoot);
                const hingeTargetX = this.isLeft ? (this.length / 2) : (-this.length / 2);
                const hingeCurrentX = this.isLeft ? alignedBox.max.x : alignedBox.min.x;
                modelRoot.position.x += hingeTargetX - hingeCurrentX;
                modelRoot.position.y -= center.y;
                modelRoot.position.z -= center.z;

                this.mesh.add(modelRoot);
                this.fallbackMesh.visible = false;
            })
            .catch((error) => {
                console.error('Failed to load flipper model:', error);
            });
    }

    setActive(active) {
        const targetAngle = active
            ? (this.isLeft ? this.angle : -this.angle)
            : 0;
    
        this.joint.configureMotorPosition(targetAngle, 60.0, 8.0);
    }

    syncPalle() {
        const position = this.rigidBody.translation();
        this.mesh.position.set(position.x, position.y, position.z);
        
        const rotation = this.rigidBody.rotation();
        this.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    }
}
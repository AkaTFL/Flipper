# Guide Frontend - Flipper 🎮

## Vue d'ensemble

Le frontend utilise **3 technologies**:
- **Three.js** → Affiche les objets 3D à l'écran
- **Rapier** → Simule la physique (gravité, collisions)
- **JavaScript ES6** → Crée les objets du jeu

## Comment ça marche?

Chaque frame (60 fois/sec):
```
1. Rapier calcule les nouvelles positions (physique)
2. On copie ces positions sur les objets 3D
3. Three.js affiche à l'écran
```

---

## 1️⃣ Initialiser la scène (Three.js)

**Fichier:** `Scene.js`

```javascript
// Crée le rendu, la caméra et la scène
renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(WIDTH, HEIGHT);

scene = new THREE.Scene();
scene.background = new THREE.Color(0x0);  // Noir

camera = new THREE.PerspectiveCamera(60, WIDTH/HEIGHT, 0.1, 1550);
camera.position.set(50, 10, -100);  // Position de la caméra
```

**Points importants:**
- Le `renderer` affiche à l'écran
- La `scene` contient tous les objets
- La `camera` définit le point de vue

---

## 2️⃣ Créer le monde physique (Rapier)

**Fichier:** `GamePhysics.js`

```javascript
async init() {
    await RAPIER.init();
    this.world = new RAPIER.World({x: 0, y: -9.81, z: 0});
}

step() {
    this.world.step();  // Avance la simulation
}
```

C'est simple: 
- `init()` crée le monde avec la gravité
- `step()` met à jour les positions de tous les objets

---

## 3️⃣ Créer un objet (Mesh + Physique)

**Fichier:** `Ball.js`

```javascript
constructor(world, radius) {
    // Partie VISUELLE (ce qu'on voit)
    this.mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 32, 32),
        new THREE.MeshStandardMaterial({color: 0xff0000})
    );
    
    // Partie PHYSIQUE (corps rigide)
    const desc = RAPIER.RigidBodyDesc.ball(radius);
    this.rigidBody = world.createRigidBody(desc);
    
    // Forme de collision
    const collider = RAPIER.ColliderDesc.ball(radius);
    world.createCollider(collider, this.rigidBody);
}

// Copier la position/rotation depuis Rapier vers Three.js
syncFromPhysics() {
    const pos = this.rigidBody.translation();
    this.mesh.position.set(pos.x, pos.y, pos.z);
}
```

**Résumé:** Chaque objet a deux parties:
- Un `mesh` (visuel dans Three.js)
- Un `rigidBody` + `collider` (physique dans Rapier)

---

## 4️⃣ Ajouter un nouvel objet

### Exemple: Créer un flipper

1. **Créer le fichier** `frontend/objects/Flipper.js`:

```javascript
import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import * as RAPIER from "@dimforge/rapier3d-compat";

export class Flipper {
    constructor(world) {
        // Visuel
        this.mesh = new THREE.Mesh(
            new THREE.BoxGeometry(100, 20, 10),
            new THREE.MeshStandardMaterial({color: 0x0088ff})
        );
        
        // Physique (fixe = ne bouge pas)
        const desc = RAPIER.RigidBodyDesc.fixed();
        this.rigidBody = world.createRigidBody(desc);
        
        const collider = RAPIER.ColliderDesc.cuboid(50, 10, 5);
        world.createCollider(collider, this.rigidBody);
    }
}
```

2. **Utiliser dans** `Flipper.js`:

```javascript
import { Flipper } from '../objects/Flipper.js';

const flipper = new Flipper(physics.world);
flipper.mesh.position.y = -50;  // Placer en bas
scene.add(flipper.mesh);
```

---

## 5️⃣ Types de corps Rapier

```javascript
// FIXE (ne bouge pas) → Murs, sol
RAPIER.RigidBodyDesc.fixed()

// DYNAMIQUE (tombe avec la gravité) → Balle
RAPIER.RigidBodyDesc.dynamic()

// KINEMATIC (bougé manuellement) → Plateforme mobile
RAPIER.RigidBodyDesc.kinematic()
```

---

## 6️⃣ Formes de collision (Colliders)

```javascript
// Sphère
RAPIER.ColliderDesc.ball(radius);

// Cube
RAPIER.ColliderDesc.cuboid(halfWidth, halfHeight, halfDepth);

// Cylindre
RAPIER.ColliderDesc.cylinder(halfHeight, radius);
```

---

## 7️⃣ Ajouter des assets (textures/modèles)

### Charger une texture:

```javascript
const loader = new THREE.TextureLoader();
loader.load('assets/texture.png', (texture) => {
    const material = new THREE.MeshStandardMaterial({map: texture});
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), material);
    scene.add(mesh);
});
```

### Charger un modèle 3D (GLB):

```javascript
const gltfLoader = new THREE.GLTFLoader();
gltfLoader.load('assets/model.glb', (gltf) => {
    const model = gltf.scene;
    scene.add(model);
});
```

---

## 📋 Checklist pour un nouvel objet

1. **Créer une classe** avec `mesh` (visuel) et `rigidBody` (physique)
2. **Ajouter au monde** `physics.world.createRigidBody()`
3. **Ajouter un collider** `world.createCollider()`
4. **Ajouter au rendu** `scene.add(mesh)`
5. **Synchroniser** `syncFromPhysics()` dans la boucle

---

## ✅ Bonnes pratiques

- ✅ Synchroniser après `physics.step()`
- ✅ Attendre `RAPIER.init()` avant créer le monde
- ✅ Un objet = 1 mesh + 1 rigidBody
- ❌ Ne pas créer d'objets dans la boucle de rendu

# Frontend Guide - Flipper 🎮

## Overview

The frontend uses **3 technologies**:
- **Three.js** → Displays 3D objects on screen
- **Rapier** → Simulates physics (gravity, collisions)
- **JavaScript ES6** → Creates game objects

## How Does It Work?

Every frame (60 times/sec):
```
1. Rapier calculates new positions (physics)
2. Copy those positions to 3D objects
3. Three.js displays on screen
```

---

## 1️⃣ Initialize the Scene (Three.js)

**File:** `Scene.js`

```javascript
// Create renderer, camera, and scene
renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(WIDTH, HEIGHT);

scene = new THREE.Scene();
scene.background = new THREE.Color(0x0);  // Black

camera = new THREE.PerspectiveCamera(60, WIDTH/HEIGHT, 0.1, 1550);
camera.position.set(50, 10, -100);  // Camera position
```

**Key points:**
- The `renderer` displays on screen
- The `scene` contains all objects
- The `camera` defines the viewpoint

---

## 2️⃣ Create the Physics World (Rapier)

**File:** `GamePhysics.js`

```javascript
async init() {
    await RAPIER.init();
    this.world = new RAPIER.World({x: 0, y: -9.81, z: 0});
}

step() {
    this.world.step();  // Advance simulation
}
```

Simple:
- `init()` creates the world with gravity
- `step()` updates positions of all objects

---

## 3️⃣ Create an Object (Mesh + Physics)

**File:** `Ball.js`

```javascript
constructor(world, radius) {
    // VISUAL part (what we see)
    this.mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 32, 32),
        new THREE.MeshStandardMaterial({color: 0xff0000})
    );
    
    // PHYSICS part (rigid body)
    const desc = RAPIER.RigidBodyDesc.ball(radius);
    this.rigidBody = world.createRigidBody(desc);
    
    // Collision shape
    const collider = RAPIER.ColliderDesc.ball(radius);
    world.createCollider(collider, this.rigidBody);
}

// Copy position/rotation from Rapier to Three.js
syncFromPhysics() {
    const pos = this.rigidBody.translation();
    this.mesh.position.set(pos.x, pos.y, pos.z);
}
```

**Summary:** Each object has two parts:
- A `mesh` (visual in Three.js)
- A `rigidBody` + `collider` (physics in Rapier)

---

## 4️⃣ Add a New Object

### Example: Create a Flipper

1. **Create file** `frontend/objects/Flipper.js`:

```javascript
import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import * as RAPIER from "@dimforge/rapier3d-compat";

export class Flipper {
    constructor(world) {
        // Visual
        this.mesh = new THREE.Mesh(
            new THREE.BoxGeometry(100, 20, 10),
            new THREE.MeshStandardMaterial({color: 0x0088ff})
        );
        
        // Physics (fixed = doesn't move)
        const desc = RAPIER.RigidBodyDesc.fixed();
        this.rigidBody = world.createRigidBody(desc);
        
        const collider = RAPIER.ColliderDesc.cuboid(50, 10, 5);
        world.createCollider(collider, this.rigidBody);
    }
}
```

2. **Use in** `Flipper.js`:

```javascript
import { Flipper } from '../objects/Flipper.js';

const flipper = new Flipper(physics.world);
flipper.mesh.position.y = -50;  // Position at bottom
scene.add(flipper.mesh);
```

---

## 5️⃣ Rapier Body Types

```javascript
// FIXED (doesn't move) → Walls, floor
RAPIER.RigidBodyDesc.fixed()

// DYNAMIC (falls with gravity) → Ball
RAPIER.RigidBodyDesc.dynamic()

// KINEMATIC (moved manually) → Moving platform
RAPIER.RigidBodyDesc.kinematic()
```

---

## 6️⃣ Collision Shapes (Colliders)

```javascript
// Sphere
RAPIER.ColliderDesc.ball(radius);

// Box
RAPIER.ColliderDesc.cuboid(halfWidth, halfHeight, halfDepth);

// Cylinder
RAPIER.ColliderDesc.cylinder(halfHeight, radius);
```

---

## 7️⃣ Add Assets (Textures/Models)

### Load a Texture:

```javascript
const loader = new THREE.TextureLoader();
loader.load('assets/texture.png', (texture) => {
    const material = new THREE.MeshStandardMaterial({map: texture});
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), material);
    scene.add(mesh);
});
```

### Load a 3D Model (GLB):

```javascript
const gltfLoader = new THREE.GLTFLoader();
gltfLoader.load('assets/model.glb', (gltf) => {
    const model = gltf.scene;
    scene.add(model);
});
```

---

## 📋 Checklist for a New Object

1. **Create a class** with `mesh` (visual) and `rigidBody` (physics)
2. **Add to world** `physics.world.createRigidBody()`
3. **Add a collider** `world.createCollider()`
4. **Add to render** `scene.add(mesh)`
5. **Synchronize** `syncFromPhysics()` in loop

---

## ✅ Best Practices

- ✅ Synchronize after `physics.step()`
- ✅ Wait for `RAPIER.init()` before creating world
- ✅ One object = 1 mesh + 1 rigidBody
- ❌ Don't create objects in render loop
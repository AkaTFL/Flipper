# Guide frontend Flipper

Objectif de ce document: expliquer simplement comment le front est organise, et dans quel ordre les objets sont instancies.

## Version francaise

### Vue rapide

Le frontend combine:
- Three.js pour l affichage 3D
- Rapier pour la physique
- Des classes JS pour chaque objet du jeu

Principe general:
- Chaque objet de jeu possede une partie visuelle mesh Three.js
- Et une partie physique rigidBody + collider Rapier
- A chaque frame, on avance la physique puis on synchronise le mesh avec le rigidBody

### Arbre des fichiers frontend

frontend/
- index.html
  - Point d entree navigateur
  - Charge le module principal core/Flipper.js
- core/
  - Flipper.js: orchestration du jeu, instancie tout
  - Scene.js: renderer, camera, scene Three.js, boucle de rendu
  - Controls.js: clavier et actions joueur
- physics/
  - GamePhysics.js: monde Rapier, pas de simulation, evenements de collision
  - Config.js: parametres gameplay/physique
  - LevelConfig.js: donnees de niveau
- objects/
  - Objects.js: classe de base commune, helpers mesh/collider/sync
  - Ball.js: balle dynamique
  - Palles.js: flippers avec joint revolute
  - Bumper.js: bumpers
  - LaunchingRamp.js: lanceur
  - Wall.js, etc.: elements statiques
- assets/
  - mesh/: modeles 3D GLB

### Instanciations: ordre reel au demarrage

1. index.html charge core/Flipper.js
2. initFlipper() est appelee
3. GamePhysics est cree puis await physics.init()
   - RAPIER.init()
   - creation du monde this.world
4. Scene est instanciee avec physics.world
   - creation renderer/camera/scene
   - creation du sol visuel + sol physique
5. Controls est instancie
6. Les objets de jeu sont crees
   - murs Wall
   - launcher LaunchingRamp
   - bumpers Bumper
   - flippers Palles
   - balle Ball
7. Les references de controle sont branchees
   - controls.setLaunchingRampRef(...)
   - controls.setBallRef(...)
8. Les objets visuels sont ajoutes a sceneManager.scene
9. sceneManager.startRender(physics, onUpdate) demarre la boucle

### Ce qui se passe dans la boucle

Dans Scene.render:
1. physics.step() avance Rapier
2. onUpdate() execute la logique metier
   - sync des flippers et de la balle
   - activation des flippers selon clavier
3. renderer.render(scene, camera) dessine la frame
4. requestAnimationFrame relance la frame suivante

### Regle simple pour ajouter un nouvel objet

1. Creer une classe dans objects/ (souvent en heritant de Objects)
2. Dans le constructor:
   - creer le mesh Three.js
   - creer le rigidBody Rapier
   - attacher le collider
3. Ajouter l instance dans core/Flipper.js
4. Ajouter son mesh dans la scene
5. Ajouter une methode de sync dans onUpdate si besoin

### Resume en une phrase

core/Flipper.js instancie monde + scene + objets, puis la boucle appelle physique -> sync -> rendu en continu.

## English version

### Quick overview

The frontend combines:
- Three.js for 3D rendering
- Rapier for physics
- JavaScript classes for game objects

Core idea:
- Each game object has a visual part (Three.js mesh)
- And a physics part (Rapier rigidBody + collider)
- On each frame, physics is updated first, then mesh transforms are synced from rigid bodies

### Frontend file tree

frontend/
- index.html
  - Browser entry point
  - Loads the main module core/Flipper.js
- core/
  - Flipper.js: game orchestration, instantiates everything
  - Scene.js: Three.js renderer, camera, scene, render loop
  - Controls.js: keyboard input and player actions
- physics/
  - GamePhysics.js: Rapier world, simulation step, collision events
  - Config.js: gameplay and physics settings
  - LevelConfig.js: level data
- objects/
  - Objects.js: shared base class, mesh/collider/sync helpers
  - Ball.js: dynamic ball
  - Palles.js: flippers with revolute joint
  - Bumper.js: bumpers
  - LaunchingRamp.js: launcher
  - Wall.js, etc.: static elements
- assets/
  - mesh/: GLB 3D models

### Instantiation order at startup

1. index.html loads core/Flipper.js
2. initFlipper() is called
3. GamePhysics is created, then await physics.init()
   - RAPIER.init()
   - this.world creation
4. Scene is instantiated with physics.world
   - renderer/camera/scene creation
   - visual floor + physical floor creation
5. Controls is instantiated
6. Game objects are created
   - walls (Wall)
   - launcher (LaunchingRamp)
   - bumpers (Bumper)
   - flippers (Palles)
   - ball (Ball)
7. Control references are connected
   - controls.setLaunchingRampRef(...)
   - controls.setBallRef(...)
8. Visual objects are added to sceneManager.scene
9. sceneManager.startRender(physics, onUpdate) starts the loop

### What happens in the render loop

In Scene.render:
1. physics.step() updates Rapier
2. onUpdate() runs game logic
   - flipper and ball sync
   - flipper activation from keyboard input
3. renderer.render(scene, camera) draws the frame
4. requestAnimationFrame schedules the next frame

### Simple rule to add a new object

1. Create a class in objects/ (often extending Objects)
2. In the constructor:
   - create the Three.js mesh
   - create the Rapier rigid body
   - attach the collider
3. Instantiate it in core/Flipper.js
4. Add its mesh to the scene
5. Add a sync call in onUpdate if needed

### One-line summary

core/Flipper.js instantiates world + scene + objects, then the loop runs physics -> sync -> render continuously.
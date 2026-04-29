export default {
    backend: {
        host: 'localhost',
        port: '8080',
        path: '/ws'
    },

    gravity: { x: 0, y: -9.75, z: -1.11 },
    
    ball: {
        density: 2.0,       // Densité
        radius: 14,          // Rayon de la balle. Une balle de flipper typique a un rayon d'environ 14 mm)
        mass: 80,           // Masse
        restitution: 0.7,   // Bounciness (0 = pas de rebond, 1 = rebond total)
        friction: 0.1,      // Glissement 
    },

    launchingRamp: {
        width: 100,
        length: 250,
        height: 800,
        position: { x: -80, y: 30, z: -50 },
        rotation: { x: 0, y: Math.PI, z: 0 },
        minimalPower: 10,  // Puissance minimale de lancement pour garantir que la balle se déplace même avec une charge très courte
        maximalPower: 50,
        powerBuild: 0.25,  // Vitesse à laquelle la puissance de lancement augmente pendant que le bouton est maintenu enfoncé
        power: 10
    },

    wall: {
        restitution: 0.3,
        friction: 0.5
    },

    scene: {
        restitution: 0,
        friction: 0
    },

    bumper: {
        restitution: 0.9,
        friction: 0.5,
        power: 100
    },

    bumpers: [
        {
            objectId: 'bumper-2',
            width: 50,
            position: { x: -80, y: 20, z: -120 },
            rotation: { x: 0, y: 0, z: 0 }
        },
        {
            objectId: 'bumper-3',
            width: 50,
            position: { x: 0, y: 20, z: -20 },
            rotation: { x: 0, y: 0, z: 0 }
        },
        {
            objectId: 'bumper-4',
            width: 50,
            position: { x: 80, y: 20, z: -120 },
            rotation: { x: 0, y: 0, z: 0 }
        }
    ],
    bumpers_triangle: [
        {
            objectId: 'bumper-triangle-left-1',
            variant: 'left',
            width: 50,
            position: { x: -80, y: 20, z: -120 },
            rotation: { x: 0, y: 0, z: 0 }
        },
        {
            objectId: 'bumper-triangle-right-1',
            variant: 'right',
            width: 50,
            position: { x: 0, y: 20, z: -20 },
            rotation: { x: 0, y: 0, z: 0 }
        }
    ],
    palles: {
        restitution: 0.5,
        friction: 0.5,
        rotationSpeed: 300,
        rotationAngle: 50 * (Math.PI / 180),
        initialAngle: 30 * (Math.PI / 180)
    },

    sounds: {
        ball: {
            collision: { file: "", volume: 0.5 },
            movement: { file: "", volume: 0.5 }
        },
        
        bumper: {
            collision: { file: "", volume: 0.5 },
        },

        wall: {
            collision: { file: "", volume: 0.5 }
        },

        launchingRamp: {  
            charging: {file: "../assets/sound/Ramp_charging.mp3"} , 
            launch: {file: "../assets/sound/Ramp_launch.mp3", volume: 0.5},       
            rolling: { file: "../assets/sound/Ramp_rolling.mp3", volume: 0.5 }
        },

        palles: {
            collision: { file: "", volume: 0.6 },
            movement: { file: "", volume: 0.5 }
        },

        rail: {        
            collision: { file: "", volume: 0.5 }
        }
    },

    forceMultiplier: 100.0  // Multiplicateur de force pour ajuster l'intensité de la physique en fonction de l'échelle
}

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
        position: { x: -230, y: 35, z: -400 } // Position de départ
    },

    launchingRamp: {
        width: 30,
        length: 50,
        height: 800,
        position: { x: -230, y: 30, z: -50 },
        rotation: { x: 0, y: 0, z: 0 },
        minimalPower: 10,  // Puissance minimale de lancement pour garantir que la balle se déplace même avec une charge très courte
        maximalPower: 50,
        powerBuild: 0.25,  // Vitesse à laquelle la puissance de lancement augmente pendant que le bouton est maintenu enfoncé
        power: 10
    },

    wall: {
        restitution: 0.3,
        friction: 0.5,
        instances: [
            { length: 950, height: 100, position: { x: 255, y: 0, z: 0 }, rotation: { x: 0, y: (Math.PI / 2), z: 0 } },
            { length: 950, height: 100, position: { x: -255, y: 0, z: 0 }, rotation: { x: 0, y: (-Math.PI / 2), z: 0 } },
            { length: 540, height: 100, position: { x: 0, y: 0, z: -471 }, rotation: { x: 0, y: 0, z: 0 } },
            { length: 540, height: 100, position: { x: 0, y: 0, z: 471 }, rotation: { x: 0, y: 0, z: 0 } }
        ]
    },

    scene: {
        restitution: 0,
        friction: 0,
        manager: {
            width: 950,
            height: 540,
            position: { x: 0, y: 500, z: 0 },
            rotation: { x: (-Math.PI / 2), y: 0, z: 0 }
        }
    },

    bumper: {
        restitution: 0.9,
        friction: 0.5,
        power: 100,
        instances: [
            { radius: 50, position: { x: 0, y: 0, z: 100 }, rotation: { x: 0, y: 0, z: 0 }, id: 'bumper-1' },
            { radius: 50, position: { x: 100, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, id: 'bumper-2' }
        ]
    },

    palles: {
        restitution: 0.5,
        friction: 0.5,
        rotationSpeed: 300,
        rotationAngle: 50 * (Math.PI / 180),
        initialAngle: 30 * (Math.PI / 180),
        instances: [
            { length: 70, width: 20, height: 30, position: { x: 100, y: 13, z: -400 }, rotation: { x: 0, y: 0, z: 0 }, side: 'left' },
            { length: 70, width: 20, height: 30, position: { x: -100, y: 13, z: -400 }, rotation: { x: 0, y: 0, z: 0 }, side: 'right' }
        ]
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

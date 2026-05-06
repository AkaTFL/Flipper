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
        position: { x: -230, y: 35, z: -400 },
        model: '../assets/mesh/Body_flipper.glb' // Position de départ
    },
    

    launchingRamp: {
        width: 60,
        length: 290,
        height: 1000,
        position: { x: -78, y: 15, z: -70 },
        rotation: { x: Math.PI, y: 0, z: Math.PI },
        minimalPower: 10,  // Puissance minimale de lancement pour garantir que la balle se déplace même avec une charge très courte
        maximalPower: 50,
        powerBuild: 0.25,  // Vitesse à laquelle la puissance de lancement augmente pendant que le bouton est maintenu enfoncé
        power: 10,
        model: '../assets/mesh/ramp_launch.glb'
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
            {
                width: 40,
                position: { x: 0, y: 10, z: 100 },
                rotation: { x: 0, y: 0, z: 0 },
                objectId: 'bumper-1',
                model: '../assets/mesh/bumper.glb'
            },
            {
                width: 40,
                position: { x: 100, y: 10, z: 180 },
                rotation: { x: 0, y: 0, z: 0 },
                objectId: 'bumper-2',
                model: '../assets/mesh/bumper.glb'
            },
            {
                width: 40,
                position: { x: -100, y: 10, z: 180 },
                rotation: { x: 0, y: 0, z: 0 },
                objectId: 'bumper-3',
                model: '../assets/mesh/bumper.glb'
            }
        ],
    },

    ramps: {
        // A: {
        //     length: 600,
        //     width: 80,
        //     height: 500,
        //     position: { x: -160, y: 0, z: -120 },
        //     rotation: { x: 0, y: Math.PI, z: 0 },
        //     objectId: 'ramp-a',
        //     model: '../assets/mesh/ramp_A.glb'
        // },
        B: {
            length: 200,
            width: 80,
            height: 400,
            position: { x: 10, y: 0, z: 160 },
            rotation: { x: 0, y: Math.PI, z: 0 },
            objectId: 'ramp-b',
            model: '../assets/mesh/ramp_Bglb.glb'
        }
    },

    bumpers_triangle: [
        {
            variant: 'left',
            width: 60,
            height: 30,
            position: { x: -90, y: 40, z: -330 },
            rotation: { x: 0, y: -(Math.PI / 3.5), z: 0 },
            objectId: 'bumper-triangle-left',
            model: '../assets/mesh/bumper_triangle_right.glb'
        },
        {
            variant: 'right',
            width: 60,
            height: 30,
            position: { x: 90, y: 40, z: -330 },
            rotation: { x: 0, y: (Math.PI / 3.5), z: 0 },
            objectId: 'bumper-triangle-right',
            model: '../assets/mesh/bumper_triangle_right.glb'
        }
    ],

    scoreZones: {
        instances: [
            {
                id: 'loop-left',
                type: 'lane',
                center: { x: 205, y: 0, z: 170 },
                size: { x: 95, y: 80, z: 130 }
            },
            {
                id: 'loop-right',
                type: 'lane',
                center: { x: -205, y: 0, z: 170 },
                size: { x: 95, y: 80, z: 130 }
            },
            {
                id: 'target-left',
                type: 'target',
                center: { x: 155, y: 0, z: -265 },
                size: { x: 70, y: 80, z: 85 }
            },
            {
                id: 'target-right',
                type: 'target',
                center: { x: -155, y: 0, z: -265 },
                size: { x: 70, y: 80, z: 85 }
            },
            {
                id: 'target-left-centre',
                type: 'target',
                center: { x: 155, y: 0, z: -265 },
                size: { x: 28, y: 80, z: 32 }
            },
            {
                id: 'target-right-centre',
                type: 'target',
                center: { x: -155, y: 0, z: -265 },
                size: { x: 28, y: 80, z: 32 }
            },
            {
                id: 'star-center',
                type: 'star_zone',
                center: { x: 0, y: 0, z: -245 },
                size: { x: 150, y: 90, z: 120 }
            },
            {
                id: 'star-center-exact',
                type: 'star_zone',
                center: { x: 0, y: 0, z: -245 },
                size: { x: 48, y: 90, z: 42 }
            }
        ]
    },

    rampScoring: {
        entryZone: {
            id: 'ramp-main-entry',
            center: { x: -225, y: 0, z: -280 },
            size: { x: 80, y: 90, z: 130 }
        },
        exitZone: {
            id: 'ramp-main-exit',
            center: { x: -225, y: 0, z: 170 },
            size: { x: 80, y: 90, z: 140 }
        },
        timeoutMs: 4000
    },

    palles: {
        restitution: 0.5,
        friction: 0.5,
        rotationSpeed: 300,
        rotationAngle: 50 * (Math.PI / 180),
        initialAngle: 30 * (Math.PI / 180),
        instances: [
            { length: 70, width: 20, height: 30, position: { x: 100, y: 15, z: -400 }, rotation: { x: 0, y: 0, z: (Math.PI / 6) }, side: 'left' },
            { length: 70, width: 20, height: 30, position: { x: -100, y: 15, z: -400 }, rotation: { x: 0, y: 0, z: -(Math.PI / 6) }, side: 'right' }
        ],
        modelRight: '../assets/mesh/Right_flipper.glb',
        modelLeft: '../assets/mesh/Left_flipper.glb'
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
            charging: {file: "../assets/sound/Ramp_reload_1.mp3"} , 
            launch: {file: "../assets/sound/Ramp_launch.mp3", volume: 0.5},       
            rolling: { file: "../assets/sound/Ramp_rolling.mp3", volume: 0.5 }
        },

        palles: {
            collision: { file: "", volume: 0.6 },
            movement: { file: "../assets/sound/Palles_move.mp3", volume: 0.5 }
        },

        rail: {        
            collision: { file: "", volume: 0.5 }
        }
    },

    forceMultiplier: 100.0  // Multiplicateur de force pour ajuster l'intensité de la physique en fonction de l'échelle
}

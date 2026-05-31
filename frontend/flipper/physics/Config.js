export default {
    gravity: { x: 0, y: -9.75, z: -1.11 },
    
    ball: {
        density: 2.0,       // Densité
        radius: 14,          // Rayon de la balle. Une balle de flipper typique a un rayon d'environ 14 mm)
        mass: 80,           // Masse
        restitution: 0.7,   // Bounciness (0 = pas de rebond, 1 = rebond total)
        friction: 0.1,      // Glissement 
        position: { x: -250, y: 105, z: -600 },
        model: '../assets/mesh/Body_flipper.glb', // Position de départ
        objectId: 'ball'
    },
    
    launchingRamp: {
        width: 60,
        length: 230,
        height: 1000,
        position: { x: -180, y: 100, z: 20 },
        rotation: { x: Math.PI, y: 0, z: Math.PI },
        minimalPower: 10,  // Puissance minimale de lancement pour garantir que la balle se déplace même avec une charge très courte
        maximalPower: 50,
        powerBuild: 0.25,  // Vitesse à laquelle la puissance de lancement augmente pendant que le bouton est maintenu enfoncé
        power: 10,
        model: '../assets/mesh/ramp_lanch.glb',
        objectId: 'launching-ramp'
    },

    scene: {
        restitution: 0,
        friction: 0,
        manager: {
            width: 950,
            height: 540,
            position: { x: 10, y: 500, z: 20 },
            rotation: { x: (-Math.PI / 2), y: 0, z: 0 }
        }
    },

    bumper: {
        restitution: 0.9,
        friction: 0.5,
        power: 130,
        instances: [
            {
                width: 40,
                position: { x: 10, y: 10, z: 105 },
                rotation: { x: 0, y: 0, z: 0 },
                objectId: 'bumper-1',
                model: '../assets/mesh/Mesh_final/Bumper_big_.glb'
            },
            {
                width: 40,
                position: { x: 120, y: 10, z: 193 },
                rotation: { x: 0, y: 0, z: 0 },
                objectId: 'bumper-2',
                model: '../assets/mesh/Bumper_big_.glb'
            },
            {
                width: 40,
                position: { x: -100, y: 10, z: 193 },
                rotation: { x: 0, y: 0, z: 0 },
                objectId: 'bumper-3',
                model: '../assets/mesh/Bumper_big_.glb'
            },



            {
                width: 25,
                position: { x: 240, y: 60, z: 317 },
                rotation: { x: 0, y: 0, z: 0 },
                objectId: 'bumper-4',
                model: '../assets/mesh/Bumper_little_.glb'
            },
            {
                width: 25,
                position: { x: 120, y: 60, z: 317 },
                rotation: { x: 0, y: 0, z: 0 },
                objectId: 'bumper-5',
                model: '../assets/mesh/Bumper_little_.glb'
            },
            {
                width: 25,
                position: { x: 180, y: 60, z: 217 },
                rotation: { x: 0, y: 0, z: 0 },
                objectId: 'bumper-6',
                model: '../assets/mesh/Bumper_little_.glb'
            },
            {
                width: 25,
                position: { x: 195, y: 60, z: 117 },
                rotation: { x: 0, y: 0, z: 0 },
                objectId: 'bumper-7',
                model: '../assets/mesh/Bumper_little_.glb'
            },
            {
                width: 25,
                position: { x: 250, y: 60, z: 157 },
                rotation: { x: 0, y: 0, z: 0 },
                objectId: 'bumper-8',
                model: '../assets/mesh/Bumper_little_.glb'
            },
        ],
    },

    ramps: {
        B: {
            length: 200,
            width: 80,
            height: 400,
            position: { x: -46.1, y: 44, z: 130 },
            rotation: { x: 0, y: Math.PI, z: 0 },
            objectId: 'ramp-b',
            model: '../assets/mesh/ramp.glb',

            entryZone: {
                id: 'ramp-main-entry',
                center: { x: -1, y: 0, z: -156 },
                size: { x: 80, y: 90, z: 130 }
            },
            exitZone: {
                id: 'ramp-main-exit',
                center: { x: -1, y: 0, z: -156 },
                size: { x: 80, y: 90, z: 140 }
            },
        },                     
        
        timeoutMs: 4000
    },

    bumpers_triangle: [
        {
            variant: 'left',
            length: 70,
            width: 40,
            height: 70,
            position: { x: -105.5, y: 20, z: -441 },
            rotation: { x: 0, y: -(Math.PI / 3), z: 0 },
            objectId: 'bumper-triangle-left',
            model: '../assets/mesh/Bumper_triangle_Left.glb'
        },
        {
            variant: 'right',
            length: 70,
            width: 40,
            height: 70,
            position: { x: 92.5, y: 20, z: -441 },
            rotation: { x: 0, y: (Math.PI / 3), z: 0 },
            objectId: 'bumper-triangle-right',
            model: '../assets/mesh/Bumper_triangle_right.glb'
        }
    ],

    scoreZones: {
        instances: []
    },

    palles: {
        restitution: 0.5,
        friction: 0.5,
        rotationSpeed: 400,
        rotationAngle: 50 * (Math.PI / 180),
        initialAngle: 30 * (Math.PI / 180),
        instances: [
            { length: 60, width: 20, height: 30, position: { x: 53, y: 15, z: -530 }, rotation: { x: 0, y: 0, z: (Math.PI / 6) }, side: 'left' },
            { length: 60, width: 20, height: 30, position: { x: -63, y: 15, z: -530 }, rotation: { x: 0, y: 0, z: -(Math.PI / 6) }, side: 'right' },
            { length: 40, width: 13, height: 20, position: { x: -100, y: 15, z: 0 }, rotation: { x: 0, y: 0, z: (Math.PI / 6) }, side: 'left' },
            { length: 40, width: 13, height: 20, position: { x: -200, y: 15, z: 0 }, rotation: { x: 0, y: 0, z: -(Math.PI / 6) }, side: 'right' }
        ],
        modelRight: '../assets/mesh/Right_flipper.glb',
        modelLeft: '../assets/mesh/Left_flipper.glb'
    },

    sounds: {
        ball: {
            wood: {
                file: '../assets/sound/Ball/wood/rolling/1.mp3',
            },

            metal: {
                file: '../assets/sound/Ball/metal/rolling/1.mp3',
            },

            param: {
                minSpeed: 10,
                maxSpeed: 2000,
                minSound: 0,
                maxSound: 1,
                minPitch: 0.5,
                maxPitch: 2.5
            }
        },
        
        bumper: {
            collision: { file: "../assets/sound/Bumpers_collision.mp3", volume: 0.2 },
        },

        staticMesh: {
            collision: { file: "../assets/sound/Ball/wood/collision/1.mp3", volume: 0.2 }
        },

        launchingRamp: {  
            charging: {file: "../assets/sound/Ramp_reload_1.mp3"} , 
            launch: {file: "../assets/sound/Ramp_launch.mp3", volume: 0.2}
        },

        palles: {
            collision: { file: "../assets/sound/Ball/wood/collision/1.mp3", volume: 0.2 },
            movement: { file: "../assets/sound/Palles_move.mp3", volume: 0.2 }
        },

        ramp: {        
            collision: { file: "../assets/sound/Ball/wood/collision/1.mp3", volume: 0.2 }
        },

        soundtrack: {
            "Boss 1": [
                "../assets/sound/Boss 1/1.mp3",
                "../assets/sound/Boss 1/2.mp3",
                "../assets/sound/Boss 1/3.mp3",
                "../assets/sound/Boss 1/4.mp3",
                "../assets/sound/Boss 1/5.mp3",
                "../assets/sound/Boss 1/6.mp3"
            ],
            "Boss 2": [
                "../assets/sound/Boss 2/1.mp3",
                "../assets/sound/Boss 2/2.mp3",
                "../assets/sound/Boss 2/3.mp3",
                "../assets/sound/Boss 2/4.mp3",
                "../assets/sound/Boss 2/5.mp3",
            ],
            "Boss 3": [
                "../assets/sound/Boss 3/1.mp3",
                "../assets/sound/Boss 3/2.mp3",
                "../assets/sound/Boss 3/3.mp3",
                "../assets/sound/Boss 3/4.mp3",
                "../assets/sound/Boss 3/5.mp3",
                "../assets/sound/Boss 3/6.mp3",
                "../assets/sound/Boss 3/7.mp3",
                "../assets/sound/Boss 3/8.mp3",
                "../assets/sound/Boss 3/9.mp3",
            ],
            "Boss 4 (Final)": [
                "../assets/sound/Boss 4 (Final)/1.mp3",
                "../assets/sound/Boss 4 (Final)/2.mp3",
                "../assets/sound/Boss 4 (Final)/3.mp3",
                "../assets/sound/Boss 4 (Final)/4.mp3",
                "../assets/sound/Boss 4 (Final)/5.mp3",
                "../assets/sound/Boss 4 (Final)/6.mp3",
                "../assets/sound/Boss 4 (Final)/7.mp3",
                "../assets/sound/Boss 4 (Final)/8.mp3"
            ],
            volume: 0.1
        }
    },

    bodyFlipper: {
        model: '../assets/mesh/body_flipper.glb',
        objectId: 'body-flipper',
        objectType: 'wall',
        length: 627,
        width: null,
        height: 1100,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: Math.PI, z: 0 }
    },

    etage: {
        model: '../assets/mesh/etage.glb',
        objectId: 'etage',
        objectType: 'floor',
        length: 200,
        width: 80,
        height: 400,
        radius: null,
        side: null,
        position: { x: 70.5, y: -60, z: 185},
        rotation: { x: 0, y: 0, z:0  }
    },

    staticMeshes: [

        {
            model: '../assets/mesh/murs_cible_left.glb',
            objectId: 'murs-cible-left',
            objectType: 'wall',
            length: 50,
            width: 50,
            height: 50,
            position: { x: 241.55, y: 20.50, z: -55.24 },
            rotation: { x: 0, y: 0, z: 0 }

        },
        {
            model: '../assets/mesh/murs_cible_left.glb',
            objectId: 'murs-cible-left',
            objectType: 'wall',
            length: 50,
            width: 50,
            height: 50,
            position: { x: 241.55, y: 20.50, z: -132.24 },
            rotation: { x: 0, y: 0, z: 0 }

        },
        {
            model: '../assets/mesh/murs_cible_right.glb',
            objectId: 'murs-cible-right',
            objectType: 'wall',
            length: 50,
            width: 50,
            height: 50,
            position: { x: -270, y: 20.50, z: -132.24 },
            rotation: { x: 0, y: 0, z: 0 }
        },
        {
            model: '../assets/mesh/murs_cible_right.glb',
            objectId: 'murs-cible-right',
            objectType: 'wall',
            length: 50,
            width: 50,
            height: 50,
            position: { x: -270, y: 20.50, z: -55.24 },
            rotation: { x: 0, y: 0, z: 0 }
        },
        {
            model: '../assets/mesh/quadri_left_cible.glb',
            objectId: 'quadri-left-cible',
            objectType: 'bumper',
            length: 50,
            width: 50,
            height: 50,
            position: { x: 241.55, y: 20.50, z: -212.24 },
            rotation: { x: 0, y: 0, z: Math.PI }
        },
        {
            model: '../assets/mesh/quadri_right_cible.glb',
            objectId: 'quadri-right-cible',
            objectType: 'bumper',
            length: 50,
            width: 50,
            height: 50,
            position: { x: -270, y: 20.50, z: -212.24 },
            rotation: { x: 0, y: 0, z: Math.PI }
        },
        {
            model: '../assets/mesh/raque_side.glb',
            objectId: 'raque-side-left',
            objectType: 'wall',
            length: 5,
            width: 50,
            height: 160,
            position: { x: 208, y: 7, z: -600 },
            rotation: { x: 0, y: -3.14, z: (Math.PI) }
        },
        {
            model: '../assets/mesh/raque_side.glb',
            objectId: 'raque-side-right',
            objectType: 'wall',
            length: 5,
            width: 50,
            height: 160,
            position: { x: -230, y: 7, z: -600 },
            rotation: { x: 0, y: -3.14, z: 0 }
        }
    ],

    rampPales: {
        right: {
            model: '../assets/mesh/ramp_pale_down_right.glb',
            objectId: 'ramp-pale-down-right',
            objectType: 'wall',
            length: 90,
            width: 90,
            height: 90,
            position: { x: -144, y: 0, z: -473 },
            rotation: { x: 0, y: 3.14, z: 0 }
        },
        left: {
            model: '../assets/mesh/ramp_pale_down_left.glb',
            objectId: 'ramp-pale-down-left',
            objectType: 'wall',
            length: 90,
            width: 90,
            height: 90,
            position: { x: 164, y: 0, z: -473 },
            rotation: { x: 0, y: 3.14, z: 0 }
        },
        rightDeath: {
            model: '../assets/mesh/ramp_pale_down_right_death.glb',
            objectId: 'ramp-pale-down-right-death',
            objectType: 'wall',
            length: 90,
            width: 90,
            height: 90,
            position: { x: -232, y: 0, z: -495 },
            rotation: { x: 0, y: 3.14, z: 0 }
        },
        leftDeath: {
            model: '../assets/mesh/ramp_pale_down_left_death.glb',
            objectId: 'ramp-pale-down-left-death',
            objectType: 'wall',
            length: 90,
            width: 90,
            height: 90,
            position: { x: 169.5, y: 0, z: -495 },
            rotation: { x: 0, y: 3.14, z: 0 }
        }
    },

    forceMultiplier: 100.0  // Multiplicateur de force pour ajuster l'intensité de la physique en fonction de l'échelle
}
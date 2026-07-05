let _niveauActuel = 1;

export function getNiveauActuel() {
    return _niveauActuel;
}

export function setNiveauActuel(n) {
    _niveauActuel = n;
}

const soundAsset = (path) => {
    const resolved = new URL(path, import.meta.url).href;
    console.info(`[sound-import] ${path} -> ${resolved}`);
    return resolved;
};

export default {
    currentLevel: 'lvl_1',
    
    global: {
        positioning: {
            drainZThreshold: -650,
            drainYThreshold: 15,

            ball: {
                density: 2.0,       // Densité
                radius: 14,          // Rayon de la balle. Une balle de flipper typique a un rayon d'environ 14 mm)
                mass: 80,           // Masse
                restitution: 0.7,   // Bounciness (0 = pas de rebond, 1 = rebond total)
                friction: 0.1,      // Glissement 
                position: { x: -260, y: 210, z: -560 },
                model: `../assets/mesh/Body_flipper.glb`, // Position de départ
                objectId: 'ball'
            },
        
            launchingRamp: {
                width: 200,
                length: 230,
                height: 1000,
                position: { x: -190, y: 100, z: 10 },
                rotation: { x: Math.PI, y: 0, z: Math.PI },
                // Vitesse contrôlée plutôt qu'une impulsion dépendante de la masse.
                // Un appui bref sort toujours la balle du couloir; un appui long
                // reste sous la limite qui pourrait l'éjecter du playfield.
                minimalSpeed: 1500,
                maximalSpeed: 1750,
                chargeDurationMs: 900,
                get model() { return `../assets/mesh/ramp_launch/ramp_launch_lvl_${getNiveauActuel()}.glb`; },
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
                power: 150,
                instances: [
                    {
                        width: 40,
                        position: { x: -130, y: 10, z: 105 },
                        rotation: { x: 0, y: 0, z: 0 },
                        objectType: 'bumper',
                        objectId: 'bumper-1',
                        get model() { return `../assets/mesh/bumpers/bumper_lvl_${getNiveauActuel()}.glb`; }
                    },
                    {
                        width: 40,
                        position: { x: 60, y: 10, z: 105 },
                        rotation: { x: 0, y: 0, z: 0 },
                        objectType: 'bumper',
                        objectId: 'bumper-2',
                        get model() { return `../assets/mesh/bumpers/bumper_lvl_${getNiveauActuel()}.glb`; }
                    },
                    
                    {
                        width: 40,
                        position: { x: 120, y: 10, z: 193 },
                        rotation: { x: 0, y: 0, z: 0 },
                        objectType: 'bumper',
                        objectId: 'bumper-3',
                        get model() { return `../assets/mesh/bumpers/bumper_lvl_${getNiveauActuel()}.glb`; }
                    },
                    {
                        width: 40,
                        position: { x: -180, y: 10, z: 193 },
                        rotation: { x: 0, y: 0, z: 0 },
                        objectType: 'bumper',
                        objectId: 'bumper-4',
                        get model() { return `../assets/mesh/bumpers/bumper_lvl_${getNiveauActuel()}.glb`; }
                    },

                    {
                        width: 40,
                        position: { x: -30, y: 10, z: 270 },
                        rotation: { x: 0, y: 0, z: 0 },
                        objectType: 'bumper',
                        objectId: 'bumper-5',
                        get model() { return `../assets/mesh/bumpers/bumper_lvl_${getNiveauActuel()}.glb`; }
                    },



                    {
                        width: 25,
                        position: { x: 240, y: 60, z: 317 },
                        rotation: { x: 0, y: 0, z: 0 },
                        objectType: 'bumper',
                        objectId: 'bumper-6',
                        get model() { return `../assets/mesh/bumpers/bumper_lvl_${getNiveauActuel()}.glb`; }
                    },
                    {
                        width: 25,
                        position: { x: 120, y: 60, z: 317 },
                        rotation: { x: 0, y: 0, z: 0 },
                        objectType: 'bumper',
                        objectId: 'bumper-7',
                        get model() { return `../assets/mesh/bumpers/bumper_lvl_${getNiveauActuel()}.glb`; }
                    },
                    {
                        width: 25,
                        position: { x: 180, y: 60, z: 217 },
                        rotation: { x: 0, y: 0, z: 0 },
                        objectType: 'bumper',
                        objectId: 'bumper-8',
                        get model() { return `../assets/mesh/bumpers/bumper_lvl_${getNiveauActuel()}.glb`; }
                    },
                    {
                        width: 25,
                        position: { x: 195, y: 60, z: 117 },
                        rotation: { x: 0, y: 0, z: 0 },
                        objectType: 'bumper',
                        objectId: 'bumper-9',
                        get model() { return `../assets/mesh/bumpers/bumper_lvl_${getNiveauActuel()}.glb`; }
                    },
                    {
                        width: 25,
                        position: { x: 250, y: 60, z: 157 },
                        rotation: { x: 0, y: 0, z: 0 },
                        objectType: 'bumper',
                        objectId: 'bumper-10',
                        get model() { return `../assets/mesh/bumpers/bumper_lvl_${getNiveauActuel()}.glb`; }
                    },

                    {
                        width: 110,
                        position: { x: -140.5, y: 90, z: -441 },
                        rotation: { x: 0, y: -(Math.PI / 3) - 0.1, z: 0 },
                        objectType: 'bumper',
                        objectId: 'bumper-triangle-left',
                        get model() { return `../assets/mesh/bumpers_triangle/bumpers_triangle_left_lvl_${getNiveauActuel()}.glb`; }
                    },
                    {
                        width: 110,
                        position: { x: 110.5, y: 90, z: -441 },
                        rotation: { x: 0, y: (Math.PI / 3) + 0.1, z: 0 },
                        objectType: 'bumper',
                        objectId: 'bumper-triangle-right',
                        get model() { return `../assets/mesh/bumpers_triangle/bumpers_triangle_right_lvl_${getNiveauActuel()}.glb`; }
                    },
                ],
            },

            repulse: {
                restitution: 1,
                friction: 0,
                power: 200,
                instances: [
                    {
                        width: 5,
                        height: 60,
                        length: 30,
                        position: { x: 245, y: 10, z: -670 },
                        rotation: { x: 0, y: (Math.PI / 2), z: (Math.PI / 2) },
                        objectType: 'repulse',
                        objectId: 'repulse-zone-1',
                        model: '../assets/mesh/Repulse.glb'
                    },
                    {
                        width: 5,
                        height: 60,
                        length: 30,
                        position: { x: -265, y: 10, z: -670 },
                        rotation: { x: 0, y: (Math.PI / 2), z: (Math.PI / 2) },
                        objectType: 'repulse',
                        objectId: 'repulse-zone-2',
                        model: '../assets/mesh/Repulse.glb'
                    },


                    {
                        width: 5,
                        height: 60,
                        length: 30,
                        position: { x: 262, y: 10, z: -85 },
                        rotation: { x: 0, y: 0, z: (Math.PI / 2) },
                        objectType: 'repulse',
                        objectId: 'target-left-top',
                        model: '../assets/mesh/Repulse.glb'
                    },
                    {
                        width: 5,
                        height: 60,
                        length: 30,
                        position: { x: -282, y: 10, z: -85 },
                        rotation: { x: 0, y: 0, z: (Math.PI / 2) },
                        objectType: 'repulse',
                        objectId: 'target-right-top',
                        model: '../assets/mesh/Repulse.glb'
                    },
                    {
                        width: 5,
                        height: 60,
                        length: 30,
                        position: { x: 262, y: 10, z: -158 },
                        rotation: { x: 0, y: 0, z: (Math.PI / 2) },
                        objectType: 'repulse',
                        objectId: 'target-left-bottom',
                        model: '../assets/mesh/Repulse.glb'
                    },
                    {
                        width: 5,
                        height: 60,
                        length: 30,
                        position: { x: -282, y: 10, z: -158 },
                        rotation: { x: 0, y: 0, z: (Math.PI / 2) },
                        objectType: 'repulse',
                        objectId: 'target-right-bottom',
                        model: '../assets/mesh/Repulse.glb'
                    },
                ],
            },

            ramps: {
                B: {
                    length: 200,
                    width: 80,
                    height: 400,
                    position: { x: -160, y: 43, z: 150 },
                    rotation: { x: 0, y: Math.PI, z: 0 },
                    objectType: 'ramp',
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

            scoreZones: {
                instances: []
            },

            palles: {
                restitution: 0.5,
                friction: 0.5,
                rotationSpeed: 1400,
                // Le moteur doit frapper rapidement tout en revenant sans osciller.
                motorStiffness: 5000,
                motorDamping: 150,
                rotationAngle: 40 * (Math.PI / 180),
                initialAngle: 30 * (Math.PI / 180),
                instances: [
                    { length: 80, width: 26, height: 40, position: { x: 74, y: 5, z: -532 }, rotation: { x: 0, y: 0, z: (Math.PI / 6) }, side: 'left' },
                    { length: 80, width: 26, height: 40, position: { x: -100, y: 5, z: -532 }, rotation: { x: 0, y: 0, z: -(Math.PI / 6) }, side: 'right' },
                    { length: 60, width: 20, height: 30, position: { x: 55, y: 5, z: 15 }, rotation: { x: 0, y: 0, z: (Math.PI / 6) }, side: 'left' },
                    { length: 60, width: 20, height: 30, position: { x: -100, y: 5, z: 15 }, rotation: { x: 0, y: 0, z: -(Math.PI / 6) }, side: 'right' }
                ],
                get modelRight() { return `../assets/mesh/palles/Right_flipper_lvl_${getNiveauActuel()}.glb`; },
                get modelLeft() { return `../assets/mesh/palles/Left_flipper_lvl_${getNiveauActuel()}.glb`; }
            },

            bodyFlipper: {
                model: '../assets/mesh/Body_flipper.glb',
                objectId: 'body-flipper',
                objectType: 'wall',
                length: 627,
                width: null,
                height: 1100,
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: Math.PI, z: 0 }
            },

            etage: {
                get model() { return `../assets/mesh/etage/etage_lvl_${getNiveauActuel()}.glb`; },
                objectId: 'etage',
                objectType: 'etage',
                // Élargit l'accès gauche sans modifier la hauteur de l'étage.
                length: 230,
                width: 80,
                height: 450,
                radius: null,
                side: null,
                position: { x: 180.5, y: 20, z: 170},
                rotation: { x: 0, y: Math.PI, z:0 }
            },

            StaticMesh: [
                {
                    get model() { return `../assets/mesh/murs_cible_left/murs_cible_left_lvl_${getNiveauActuel()}.glb`; },
                    objectId: 'murs-cible-left',
                    objectType: 'wall',
                    length: 50,
                    width: 50,
                    height: 50,
                    position: { x: 241.55, y: 20.50, z: -55.24 },
                    rotation: { x: 0, y: 0, z: 0 }

                },
                {
                    get model() { return `../assets/mesh/murs_cible_left/murs_cible_left_lvl_${getNiveauActuel()}.glb`; },
                    objectId: 'murs-cible-left-2',
                    objectType: 'wall',
                    length: 50,
                    width: 50,
                    height: 50,
                    position: { x: 241.55, y: 20.50, z: -132.24 },
                    rotation: { x: 0, y: 0, z: 0 }

                },
                {
                    get model() { return `../assets/mesh/murs_cible_left/murs_cible_left_lvl_${getNiveauActuel()}.glb`; },
                    objectId: 'murs-cible-droit',
                    objectType: 'wall',
                    length: 50,
                    width: 50,
                    height: 50,
                    position: { x: -270, y: 20.50, z: -55.24 },
                    rotation: { x: Math.PI, y: Math.PI, z: 0 }

                },
                {
                    get model() { return `../assets/mesh/murs_cible_left/murs_cible_left_lvl_${getNiveauActuel()}.glb`; },
                    objectId: 'murs-cible-droit-2',
                    objectType: 'wall',
                    length: 50,
                    width: 50,
                    height: 50,
                    position: { x: -270, y: 20.50, z: -132.24 },
                    rotation: { x: Math.PI, y: Math.PI, z: 0 }

                },
                {
                    get model() { return `../assets/mesh/quadri/quadri_left_cible_lvl_${getNiveauActuel()}.glb`; },
                    objectId: 'quadri-left-cible',
                    objectType: 'wall',
                    length: 50,
                    width: 50,
                    height: 50,
                    position: { x: 241.55, y: 20.50, z: -212.24 },
                    rotation: { x: 0, y: 0, z: Math.PI }
                },
                {
                    get model() { return `../assets/mesh/quadri/quadri_right_cible_lvl_${getNiveauActuel()}.glb`; },
                    objectId: 'quadri-right-cible',
                    objectType: 'wall',
                    length: 50,
                    width: 50,
                    height: 50,
                    position: { x: -270, y: 20.50, z: -212.24 },
                    rotation: { x: 0, y: 0, z: Math.PI }
                },
                {
                    get model() { return `../assets/mesh/raque_side/raque_side_lvl_${getNiveauActuel()}.glb`; },
                    objectId: 'raque-side-left',
                    objectType: 'wall',
                    length: 5,
                    width: 50,
                    height: 160,
                    position: { x: 218, y: 7, z: -600 },
                    rotation: { x: 0, y: -3.14, z: (Math.PI) }
                },
                {
                    get model() { return `../assets/mesh/raque_side/raque_side_lvl_${getNiveauActuel()}.glb`; },
                    objectId: 'raque-side-right',
                    objectType: 'wall',
                    length: 5,
                    width: 50,
                    height: 160,
                    position: { x: -240, y: 7, z: -600 },
                    rotation: { x: 0, y: -3.14, z: 0 }
                },


                {
                    get model() { return `../assets/mesh/wall_up_right/wall_up_right_lvl_${getNiveauActuel()}.glb`; },
                    objectId: 'wall-up-right',
                    objectType: 'wall',
                    length: 170,
                    width: 50,
                    height: 100,
                    position: { x: 140, y: 7, z: 125 },
                    rotation: { x: 0, y: -3.14, z: 0 }
                }
            ],

            rampPales: {
                right: {
                    get model() { return `../assets/mesh/ramp_pale_down_right/ramp_pale_down_right_lvl_${getNiveauActuel()}.glb`; },
                    objectId: 'ramp-pale-down-right',
                    objectType: 'wall',
                    length: 100,
                    width: 90,
                    height: 90,
                    position: { x: -160, y: 0, z: -471 },
                    rotation: { x: 0, y: 3.14, z: 0 }
                },
                left: {
                    get model() { return `../assets/mesh/ramp_pale_down_left/ramp_pale_down_left_lvl_${getNiveauActuel()}.glb`; },
                    objectId: 'ramp-pale-down-left',
                    objectType: 'wall',
                    length: 100,
                    width: 90,
                    height: 90,
                    position: { x: 174, y: 0, z: -473 },
                    rotation: { x: 0, y: 3.14, z: 0 }
                },
                rightDeath: {
                    get model() { return `../assets/mesh/ramp_pale_down_right_death/ramp_pale_down_right_death_lvl_${getNiveauActuel()}.glb`; },
                    objectId: 'ramp-pale-down-right-death',
                    objectType: 'wall',
                    length: 90,
                    width: 90,
                    height: 90,
                    position: { x: -242, y: 0, z: -495 },
                    rotation: { x: 0, y: 3.14, z: 0 }
                },
                leftDeath: {
                    get model() { return `../assets/mesh/ramp_pale_down_left_death/ramp_pale_down_left_death_lvl_${getNiveauActuel()}.glb`; },
                    objectId: 'ramp-pale-down-left-death',
                    objectType: 'wall',
                    length: 90,
                    width: 90,
                    height: 90,
                    position: { x: 179.5, y: 0, z: -495 },
                    rotation: { x: 0, y: 3.14, z: 0 }
                }
            },
        },

        sounds: {
            ball: {
                wood: {
                    file: soundAsset('../assets/sound/Ball/wood/rolling/1.mp3'),
                },

                metal: {
                    file: soundAsset('../assets/sound/Ball/metal/rolling/1.mp3'),
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
                collision: { file: soundAsset("../assets/sound/Bumpers_collision.mp3"), volume: 0.2 },
                move: { file: soundAsset("../assets/sound/Bumpers_collision.mp3"), volume: 0.15 },
            },

            wall: {
                collision: { file: soundAsset("../assets/sound/Ball/wood/collision/1.mp3"), volume: 0.08 },
            },

            staticMesh: {
                collision: { file: soundAsset("../assets/sound/Ball/wood/collision/1.mp3"), volume: 0.05 },
            },

            launchingRamp: {  
                charging: { file: soundAsset("../assets/sound/Ramp_reload_1.mp3"), volume: 0.25, loop: true },
                launch: { file: soundAsset("../assets/sound/Ramp_launch.mp3"), volume: 0.2 }
            },

            palles: {
                collision: { file: soundAsset("../assets/sound/Ball/wood/collision/1.mp3"), volume: 0.05 },
                movement: { file: soundAsset("../assets/sound/Palles_move.mp3"), volume: 0.2 }
            },

            ramp: {        
                collision: { file: soundAsset("../assets/sound/Ball/wood/collision/1.mp3"), volume: 0.05 }
            },
        },
    },

    lvl_1: {
       textures: {
            ball: {
                map: '../assets/textures/lvl1/ball/metal.png',
                repeat: [4, 4],
            },

            bumper: {
            },

            body: {
                table: {
                    map: '../assets/textures/lvl1/body/table/image.png',
                    aoMap: '../assets/textures/lvl1/body/table/jungle_dark_ao_map.png',
                    roughnessMap: '../assets/textures/lvl1/body/table/jungle_dark_roughness_map.png',
                    normalMap: '../assets/textures/lvl1/body/table/jungle_dark_normal_map.png',
                    repeat: [2, 1]
                },

                walls: {
                    map: '../assets/textures/lvl1/body/walls/elfic_wall_map_clean_1k.png',               
                    aoMap: '../assets/textures/lvl1/body/walls/elfic_wall_ao_clean_1k.png',
                    roughnessMap: '../assets/textures/lvl1/body/walls/elfic_wall_roughness_clean_1k.png',
                    normalMap: '../assets/textures/lvl1/body/walls/elfic_wall_normal_clean_1k.png',
                    repeat: [10, 10]
                },
            },

            bumper_triangle: {
            },

            etage: {
            },

            ramps: {
                entrance: {
                    map: '../assets/textures/lvl1/ramps/entrance/mossy_sandstone_diff_1k.png',
                    aoMap: '../assets/textures/lvl1/ramps/entrance/mossy_sandstone_arm_1k.png',
                    roughnessMap: '../assets/textures/lvl1/ramps/entrance/mossy_sandstone_arm_1k.png',
                    metalnessMap: '../assets/textures/lvl1/ramps/entrance/mossy_sandstone_arm_1k.png',
                    normalMap: '../assets/textures/lvl1/ramps/entrance/mossy_sandstone_nor_gl_1k.png',
                    repeat: [1, 1]
                },

                rail: {
                    map: '../assets/textures/lvl1/ramps/rail/Metal008_1K-PNG_Color.png',
                    metalnessMap: '../assets/textures/lvl1/ramps/rail/Metal008_1K-PNG_Metalness.png',
                    normalMap: '../assets/textures/lvl1/ramps/rail/Metal008_1K-PNG_NormalGL.png',
                    roughnessMap: '../assets/textures/lvl1/ramps/rail/Metal008_1K-PNG_Roughness.png',
                    displacementMap: '../assets/textures/lvl1/ramps/rail/Metal008_1K-PNG_Displacement.png',
                    displacementScale: 0.005,
                    repeat: [1, 1]
                },
            },

            palles: {
            },

            launching_ramp: {
            },

            repulse: {
                map: '../assets/textures/lvl1/repulse/ChatGPT.png',
                aoMap: '../assets/textures/lvl1/repulse/ao_map(1).png',
                roughnessMap: '../assets/textures/lvl1/repulse/arm_map.png',
                metalnessMap: '../assets/textures/lvl1/repulse/arm_map.png',
                normalMap: '../assets/textures/lvl1/repulse/stone_texture_normal_opengl_1k.png',
                repeat: [4, 4]
            },

            wall: {
            },
        },
        
        soundtrack: {
            "Boss 1": [
                soundAsset("../assets/sound/Boss 1/1.mp3"),
                soundAsset("../assets/sound/Boss 1/2.mp3"),
                soundAsset("../assets/sound/Boss 1/3.mp3"),
                soundAsset("../assets/sound/Boss 1/4.mp3"),
                soundAsset("../assets/sound/Boss 1/5.mp3"),
                soundAsset("../assets/sound/Boss 1/6.mp3")
            ]},

        bloom: 0x00ff00,
        outline: 0xffff00,
        sparks: 0x00ff00,
        outlineImpactColor: 0x00ff00,

        gravity: { x: 0, y: -20.75, z: -1.11 },
    },
    
    lvl_2: {
        textures: {
            ball: {
                map: '../assets/textures/lvl1/ball/metal.png',
            },
            
            bumper: {
                
            },

            body: {
                table: {
                    map: '../assets/textures/lvl2/body/table/image.png',
                    aoMap: '../assets/textures/lvl2/body/table/sea_ao_map.png',
                    roughnessMap: '../assets/textures/lvl2/body/table/sea_roughness_map.png',
                    normalMap: '../assets/textures/lvl2/body/table/sea_normal_map.png',
                    repeat: [2, 1]
                },
                walls: {
                    map: '../assets/textures/lvl2/body/walls/sea_wall_map.png',               
                    aoMap: '../assets/textures/lvl2/body/walls/sea_wall_ao_map.png',
                    roughnessMap: '../assets/textures/lvl2/body/walls/sea_wall_roughness_map.png',
                    normalMap: '../assets/textures/lvl2/body/walls/sea_wall_normal_map.png',
                    repeat: [10, 10]
                },
            },

            bumper_triangle: {
            },

            etage: {
            },

            ramps: {
                entrance: {
                    map: '../assets/textures/lvl1/ramps/entrance/mossy_sandstone_diff_1k.png',
                    aoMap: '../assets/textures/lvl1/ramps/entrance/mossy_sandstone_arm_1k.png',
                    roughnessMap: '../assets/textures/lvl1/ramps/entrance/mossy_sandstone_arm_1k.png',
                    metalnessMap: '../assets/textures/lvl1/ramps/entrance/mossy_sandstone_arm_1k.png',
                    normalMap: '../assets/textures/lvl1/ramps/entrance/mossy_sandstone_nor_gl_1k.png',
                    repeat: [1, 1]
                },

                rail: {
                    map: '../assets/textures/lvl1/ramps/rail/Metal008_1K-PNG_Color.png',
                    metalnessMap: '../assets/textures/lvl1/ramps/rail/Metal008_1K-PNG_Metalness.png',
                    normalMap: '../assets/textures/lvl1/ramps/rail/Metal008_1K-PNG_NormalGL.png',
                    roughnessMap: '../assets/textures/lvl1/ramps/rail/Metal008_1K-PNG_Roughness.png',
                    displacementMap: '../assets/textures/lvl1/ramps/rail/Metal008_1K-PNG_Displacement.png',
                    displacementScale: 0.005,
                    repeat: [1, 1]
                },
            },

            launching_ramp: {
                entrance: {

                },
                rail: {
                
                },
            },

            palles: {

            },

            repulse: {

            }
        },

        soundtrack: {
            "Boss 2": [
                    soundAsset("../assets/sound/Boss 2/1.mp3"),
                    soundAsset("../assets/sound/Boss 2/2.mp3"),
                    soundAsset("../assets/sound/Boss 2/3.mp3"),
                    soundAsset("../assets/sound/Boss 2/4.mp3"),
                    soundAsset("../assets/sound/Boss 2/5.mp3"),
                ]},
        
        gravity: { x: 0, y: -12.1875, z: -1.3875 },
    },

    lvl_3: {
        textures: {
            ball: {
                map: '../assets/textures/lvl1/metal.png',
                repeat: [4, 4],
            },
            
            bumper: {
            },

            body: {
                table: {
                    map: '../assets/textures/lvl3/body/table/nature.png',
                    aoMap: '../assets/textures/lvl3/body/table/fire_dark_ao.png',
                    roughnessMap: '../assets/textures/lvl3/body/table/fire_dark_roughness.png',
                    normalMap: '../assets/textures/lvl3/body/table/fire_dark_normal.png',
                    repeat: [2, 1]
                },
                walls: {
                    map: '../assets/textures/lvl3/body/walls/fire_wall.png',
                    aoMap: '../assets/textures/lvl3/body/walls/fire_wall_ao.png',
                    roughnessMap: '../assets/textures/lvl3/body/walls/fire_wall_roughness.png',
                    normalMap: '../assets/textures/lvl3/body/walls/fire_wall_normal.png',
                    repeat: [4, 4]
                }
            },

            bumper_triangle: {
            },

            etage: {
            },

            launching_ramp: {
                entrance: {
                },
                rail: {                
                },
            },

            palles: {
            },

            ramps: {
                entrance: {
                    map: '../assets/textures/lvl1/ramps/entrance/mossy_sandstone_diff_1k.png',
                    aoMap: '../assets/textures/lvl1/ramps/entrance/mossy_sandstone_arm_1k.png',
                    roughnessMap: '../assets/textures/lvl1/ramps/entrance/mossy_sandstone_arm_1k.png',
                    metalnessMap: '../assets/textures/lvl1/ramps/entrance/mossy_sandstone_arm_1k.png',
                    normalMap: '../assets/textures/lvl1/ramps/entrance/mossy_sandstone_nor_gl_1k.png',
                    repeat: [1, 1]
                },

                rail: {
                    map: '../assets/textures/lvl1/ramps/rail/Metal008_1K-PNG_Color.png',
                    metalnessMap: '../assets/textures/lvl1/ramps/rail/Metal008_1K-PNG_Metalness.png',
                    normalMap: '../assets/textures/lvl1/ramps/rail/Metal008_1K-PNG_NormalGL.png',
                    roughnessMap: '../assets/textures/lvl1/ramps/rail/Metal008_1K-PNG_Roughness.png',
                    displacementMap: '../assets/textures/lvl1/ramps/rail/Metal008_1K-PNG_Displacement.png',
                    displacementScale: 0.005,
                    repeat: [1, 1]
                },
            },

            repulse: {
                map: '../assets/textures/lvl1/repulse/coast_sand_rocks_02_diff_1k.png',
                aoMap: '../assets/textures/lvl1/repulse/coast_sand_rocks_02_arm_1k.png',
                roughnessMap: '../assets/textures/lvl1/repulse/coast_sand_rocks_02_arm_1k.png',
                metalnessMap: '../assets/textures/lvl1/repulse/coast_sand_rocks_02_arm_1k.png',
                normalMap: '../assets/textures/lvl1/repulse/coast_sand_rocks_02_nor_gl_1k.png',
                repeat: [4, 4]
            },
        },

        soundtrack: {
            "Boss 3": [
                soundAsset("../assets/sound/Boss 3/1.mp3"),
                soundAsset("../assets/sound/Boss 3/2.mp3"),
                soundAsset("../assets/sound/Boss 3/3.mp3"),
                soundAsset("../assets/sound/Boss 3/4.mp3"),
                soundAsset("../assets/sound/Boss 3/5.mp3"),
                soundAsset("../assets/sound/Boss 3/6.mp3"),
                soundAsset("../assets/sound/Boss 3/7.mp3"),
                soundAsset("../assets/sound/Boss 3/8.mp3"),
                soundAsset("../assets/sound/Boss 3/9.mp3"),
            ]},
        
        gravity: { x: 0, y: -14.625, z: -1.665 },
    },

    lvl_4: {
        textures: {
            ball: {
                map: '../assets/textures/lvl1/metal.png',
                repeat: [4, 4],
            },
            
            bumper: {
            },

            body: {
                table: {
                    map: '../assets/textures/lvl4/body/table/nature.png',
                    aoMap: '../assets/textures/lvl4/body/table/portal_ao_map.png',
                    roughnessMap: '../assets/textures/lvl4/body/table/portal_roughness_map.png',
                    normalMap: '../assets/textures/lvl4/body/table/portal_nor_map.png',
                    repeat: [2, 1]
                },
                walls: {
                    map: '../assets/textures/lvl4/body/walls/level4_wall_map.png',
                    aoMap: '../assets/textures/lvl4/body/walls/level4_wall_ao_map.png',
                    roughnessMap: '../assets/textures/lvl4/body/walls/level4_wall_roughness_map.png',
                    normalMap: '../assets/textures/lvl4/body/walls/level4_wall_nor_map.png',
                    repeat: [2, 2]
                }
            },

            bumper_triangle: {
            },

            etage: {
            },

            launching_ramp: {
                entrance: {
                },
                rail: {
                },
            },

            palles: {
            },

            ramps: {
                entrance: {
                    map: '../assets/textures/lvl1/ramps/entrance/mossy_sandstone_diff_1k.png',
                    aoMap: '../assets/textures/lvl1/ramps/entrance/mossy_sandstone_arm_1k.png',
                    roughnessMap: '../assets/textures/lvl1/ramps/entrance/mossy_sandstone_arm_1k.png',
                    metalnessMap: '../assets/textures/lvl1/ramps/entrance/mossy_sandstone_arm_1k.png',
                    normalMap: '../assets/textures/lvl1/ramps/entrance/mossy_sandstone_nor_gl_1k.png',
                    repeat: [1, 1]
                },

                rail: {
                    map: '../assets/textures/lvl1/ramps/rail/Metal008_1K-PNG_Color.png',
                    metalnessMap: '../assets/textures/lvl1/ramps/rail/Metal008_1K-PNG_Metalness.png',
                    normalMap: '../assets/textures/lvl1/ramps/rail/Metal008_1K-PNG_NormalGL.png',
                    roughnessMap: '../assets/textures/lvl1/ramps/rail/Metal008_1K-PNG_Roughness.png',
                    displacementMap: '../assets/textures/lvl1/ramps/rail/Metal008_1K-PNG_Displacement.png',
                    displacementScale: 0.005,
                    repeat: [1, 1]
                },
            },

            repulse: {
                map: '../assets/textures/lvl1/repulse/coast_sand_rocks_02_diff_1k.png',
                aoMap: '../assets/textures/lvl1/repulse/coast_sand_rocks_02_arm_1k.png',
                roughnessMap: '../assets/textures/lvl1/repulse/coast_sand_rocks_02_arm_1k.png',
                normalMap: '../assets/textures/lvl1/repulse/coast_sand_rocks_02_nor_gl_1k.png',
                repeat: [4, 4]
            }
        },

        soundtrack: {
        "Boss 4 (Final)": [
            soundAsset("../assets/sound/Boss 4 (Final)/1.mp3"),
            soundAsset("../assets/sound/Boss 4 (Final)/2.mp3"),
            soundAsset("../assets/sound/Boss 4 (Final)/3.mp3"),
            soundAsset("../assets/sound/Boss 4 (Final)/4.mp3"),
            soundAsset("../assets/sound/Boss 4 (Final)/5.mp3"),
            soundAsset("../assets/sound/Boss 4 (Final)/6.mp3"),
            soundAsset("../assets/sound/Boss 4 (Final)/7.mp3"),
            soundAsset("../assets/sound/Boss 4 (Final)/8.mp3")
            ]},
        
        gravity: { x: 0, y: -17.0625, z: -1.9425 },
    },

    post_lvl: {
        textures: {
            ball: {
                map: '../assets/textures/lvl1/metal.png',
            },
            
            bumper: {
            },

            body: {
            },

            bumper_triangle: {
            },

            etage: {

            },

            launching_ramp: {
                entrance: {

                },
                rail: {
                
                },
            },

            palles: {

            },

            ramps: {
                entrance: {
                    map: '../assets/textures/lvl1/ramps/entrance/mossy_sandstone_diff_1k.png',
                    aoMap: '../assets/textures/lvl1/ramps/entrance/mossy_sandstone_arm_1k.png',
                    roughnessMap: '../assets/textures/lvl1/ramps/entrance/mossy_sandstone_arm_1k.png',
                    metalnessMap: '../assets/textures/lvl1/ramps/entrance/mossy_sandstone_arm_1k.png',
                    normalMap: '../assets/textures/lvl1/ramps/entrance/mossy_sandstone_nor_gl_1k.png',
                    repeat: [1, 1]
                },

                rail: {
                    map: '../assets/textures/lvl1/ramps/rail/Metal008_1K-PNG_Color.png',
                    metalnessMap: '../assets/textures/lvl1/ramps/rail/Metal008_1K-PNG_Metalness.png',
                    normalMap: '../assets/textures/lvl1/ramps/rail/Metal008_1K-PNG_NormalGL.png',
                    roughnessMap: '../assets/textures/lvl1/ramps/rail/Metal008_1K-PNG_Roughness.png',
                    displacementMap: '../assets/textures/lvl1/ramps/rail/Metal008_1K-PNG_Displacement.png',
                    displacementScale: 0.005,
                    repeat: [1, 1]
                },
            },

            repulse: {

            }
        },
        
        soundtrack: {
            "Boss 4 (Final)": [
                    soundAsset("../assets/sound/Boss 4 (Final)/1.mp3"),
                    soundAsset("../assets/sound/Boss 4 (Final)/2.mp3"),
                    soundAsset("../assets/sound/Boss 4 (Final)/3.mp3"),
                    soundAsset("../assets/sound/Boss 4 (Final)/4.mp3"),
                    soundAsset("../assets/sound/Boss 4 (Final)/5.mp3"),
                    soundAsset("../assets/sound/Boss 4 (Final)/6.mp3"),
                    soundAsset("../assets/sound/Boss 4 (Final)/7.mp3"),
                    soundAsset("../assets/sound/Boss 4 (Final)/8.mp3")
                ]},
            
            gravity: { x: 0, y: -17.0625, z: -2.22 },
    },

    forceMultiplier: 150.0  // Multiplicateur de force pour ajuster l'intensité de la physique en fonction de l'échelle
}
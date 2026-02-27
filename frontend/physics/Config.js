export default {
    gravity: { x: 0, y: -9.75, z: -1.11 },
    
    ball: {
        density: 2.0,       // Densité
        radius: 14,          // Rayon de la balle. Une balle de flipper typique a un rayon d'environ 14 mm)
        mass: 80,           // Masse
        restitution: 0.7,   // Bounciness (0 = pas de rebond, 1 = rebond total)
        friction: 0.1,      // Glissement 
    },

    wall: {
        restitution: 0.3,
        friction: 0.5
    },

    scene: {
        restitution: 0,
        friction: 0
    },

    scale: 100, // Échelle pour convertir les unités physiques en unités de rendu (ex: 1 unité physique = 100 unités de rendu)
    forceMultiplier: 100.0  // Multiplicateur de force pour ajuster l'intensité de la physique en fonction de l'échelle
}
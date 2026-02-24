export default {
    gravity: { x: 0, y: -9.81, z: 0 },
    
    ball: {
        density: 2.0,       // Densité
        radius: 5,          // Rayon de la balle
        mass: 80,           // Masse
        restitution: 0.7,   // Bounciness (0 = pas de rebond, 1 = rebond total)
        friction: 0.1,      // Glissement 
    },

    wall: {
        restitution: 0,
        friction: 0.1
    },

    scene: {
        restitution: 0,
        friction: 0
    },

    scale: 100,
    forceMultiplier: 100.0  // Multiplicateur de force pour ajuster l'intensité de la physique en fonction de l'échelle
}
export default {
    gravity: { x: 0, y: -9.81, z: 0 },
    
    ball: {
        density: 2.0,      // Densité élevée (acier)
        radius: 5,
        mass: 80,           // Masse explicite ou densité
        restitution: 0.5,   // Bounciness (0 = pas de rebond, 1 = rebond total)
        friction: 0.1,      // Glissement (bas pour une bille qui roule)
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
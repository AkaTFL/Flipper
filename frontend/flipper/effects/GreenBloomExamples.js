/**
 * Exemples d'utilisation du Green Bloom Effect
 * À intégrer dans votre code selon vos besoins
 */

// ============================================
// EXEMPLE 1: Configuration basique
// ============================================
// Dans Flipper.js ou votre script principal

/*
const sceneManager = new Scene(physics.world, ...);

// L'effet est automatiquement créé et utilisé
// Aucune configuration additionnelle n'est nécessaire
// mais vous pouvez l'ajuster:

sceneManager.greenBloomEffect.updateParams({
    bloomIntensity: 2.0
});
*/

// ============================================
// EXEMPLE 2: Fonction d'aide pour configurer l'effet
// ============================================

export function configureGreenBloom(sceneManager, preset = 'default') {
    const presets = {
        // Subtil - effet léger
        subtle: {
            greenThreshold: 0.4,
            greenRange: 0.35,
            bloomIntensity: 0.8
        },
        
        // Normal - équilibré (par défaut)
        default: {
            greenThreshold: 0.3,
            greenRange: 0.3,
            bloomIntensity: 1.5
        },
        
        // Intense - très visible
        intense: {
            greenThreshold: 0.2,
            greenRange: 0.25,
            bloomIntensity: 2.5
        },
        
        // Extreme - maximum
        extreme: {
            greenThreshold: 0.15,
            greenRange: 0.2,
            bloomIntensity: 3.0
        },
        
        // Strict - seulement les verts purs
        strict: {
            greenThreshold: 0.5,
            greenRange: 0.45,
            bloomIntensity: 1.2
        }
    };

    const selected = presets[preset] || presets.default;
    sceneManager.greenBloomEffect.updateParams(selected);
    
    console.log(`Green Bloom configured with preset: ${preset}`, selected);
}

// Utilisation:
// configureGreenBloom(sceneManager, 'intense');

// ============================================
// EXEMPLE 3: Ajustement dynamique au runtime
// ============================================

export function createBloomAdjustmentPanel(sceneManager) {
    // Créer un panneau de contrôle UI simple
    const panel = document.createElement('div');
    panel.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: #0f0;
        padding: 15px;
        border-radius: 8px;
        font-family: monospace;
        font-size: 12px;
        z-index: 1000;
    `;

    // Slider pour greenThreshold
    const thresholdSlider = document.createElement('input');
    thresholdSlider.type = 'range';
    thresholdSlider.min = '0';
    thresholdSlider.max = '1';
    thresholdSlider.step = '0.05';
    thresholdSlider.value = '0.3';
    thresholdSlider.addEventListener('input', (e) => {
        sceneManager.greenBloomEffect.updateParams({
            greenThreshold: parseFloat(e.target.value)
        });
        valueDisplay.textContent = `Threshold: ${parseFloat(e.target.value).toFixed(2)}`;
    });

    // Slider pour bloomIntensity
    const intensitySlider = document.createElement('input');
    intensitySlider.type = 'range';
    intensitySlider.min = '0';
    intensitySlider.max = '3';
    intensitySlider.step = '0.1';
    intensitySlider.value = '1.5';
    intensitySlider.addEventListener('input', (e) => {
        sceneManager.greenBloomEffect.updateParams({
            bloomIntensity: parseFloat(e.target.value)
        });
        intensityDisplay.textContent = `Intensity: ${parseFloat(e.target.value).toFixed(2)}`;
    });

    const valueDisplay = document.createElement('div');
    valueDisplay.textContent = 'Threshold: 0.30';
    
    const intensityDisplay = document.createElement('div');
    intensityDisplay.textContent = 'Intensity: 1.50';

    panel.appendChild(document.createElement('div')).textContent = 'Green Bloom Controls';
    panel.appendChild(valueDisplay);
    panel.appendChild(thresholdSlider);
    panel.appendChild(document.createElement('br'));
    panel.appendChild(intensityDisplay);
    panel.appendChild(intensitySlider);

    document.body.appendChild(panel);
    return panel;
}

// Utilisation:
// createBloomAdjustmentPanel(sceneManager);

// ============================================
// EXEMPLE 4: Détection et logging des params
// ============================================

export function debugGreenBloom(sceneManager) {
    console.group('🟢 Green Bloom Debug Info');
    
    const params = sceneManager.greenBloomEffect.getParams();
    console.log('Current Parameters:', params);
    
    console.log('Effect description:');
    console.log(`  - Détecte les verts avec seuil: ${params.greenThreshold}`);
    console.log(`  - Plage de détection: ${params.greenRange}`);
    console.log(`  - Intensité du bloom: ${params.bloomIntensity}`);
    
    console.log('\nPour ajuster:');
    console.log('  sceneManager.greenBloomEffect.updateParams({');
    console.log('    greenThreshold: 0.3,');
    console.log('    greenRange: 0.3,');
    console.log('    bloomIntensity: 1.5');
    console.log('  });');
    
    console.groupEnd();
}

// Utilisation:
// debugGreenBloom(sceneManager);

// ============================================
// EXEMPLE 5: Animation du bloom
// ============================================

export function animateBloom(sceneManager, durationMs = 2000, loop = false) {
    const startTime = Date.now();
    const originalParams = sceneManager.greenBloomEffect.getParams();
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = (elapsed % durationMs) / durationMs;
        
        // Créer une animation pulse
        const intensity = originalParams.bloomIntensity * (0.5 + 0.5 * Math.sin(progress * Math.PI * 2));
        
        sceneManager.greenBloomEffect.updateParams({
            bloomIntensity: intensity
        });
        
        if (loop) {
            requestAnimationFrame(animate);
        } else if (elapsed < durationMs) {
            requestAnimationFrame(animate);
        } else {
            // Restaurer les valeurs originales
            sceneManager.greenBloomEffect.updateParams(originalParams);
        }
    }
    
    animate();
}

// Utilisation:
// animateBloom(sceneManager, 2000, true); // Animation infinie de 2 secondes

// ============================================
// EXEMPLE 6: Activer/Désactiver l'effet
// ============================================

export function toggleGreenBloom(sceneManager) {
    const params = sceneManager.greenBloomEffect.getParams();
    const isEnabled = params.bloomIntensity > 0;
    
    sceneManager.greenBloomEffect.updateParams({
        bloomIntensity: isEnabled ? 0 : 1.5
    });
    
    console.log(`Green Bloom ${isEnabled ? 'disabled' : 'enabled'}`);
}

// Utilisation:
// Appuyez sur 'G' pour activer/désactiver
// document.addEventListener('keydown', (e) => {
//     if (e.key === 'g' || e.key === 'G') {
//         toggleGreenBloom(sceneManager);
//     }
// });

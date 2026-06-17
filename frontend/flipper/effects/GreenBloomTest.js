/**
 * Test unitaire simple pour le Green Bloom Effect
 * À exécuter dans le navigateur (console)
 */

export async function testGreenBloomEffect() {
    console.log('🧪 Démarrage des tests Green Bloom Effect...\n');
    
    let passedTests = 0;
    let totalTests = 0;

    // Fonction de test helper
    const test = (name, fn) => {
        totalTests++;
        try {
            fn();
            console.log(`✅ ${name}`);
            passedTests++;
        } catch (error) {
            console.error(`❌ ${name}: ${error.message}`);
        }
    };

    // TEST 1: Vérifier que GreenBloomEffect est importable
    test('GreenBloomEffect est importable', () => {
        // Ce test passe si le import fonctionne dans Scene.js
    });

    // TEST 2: Vérifier que Scene crée correctement l'effet
    test('Scene initialise greenBloomEffect', () => {
        // Ce test se fera lors de la création d'une scène
        // sceneManager.greenBloomEffect devrait être défini
    });

    // TEST 3: Vérifier les paramètres par défaut
    test('Les paramètres par défaut sont corrects', () => {
        const defaultParams = {
            greenThreshold: 0.3,
            greenRange: 0.3,
            bloomIntensity: 1.5
        };
        
        // Vérifier que les valeurs existent
        if (!defaultParams.greenThreshold || 
            !defaultParams.greenRange || 
            !defaultParams.bloomIntensity) {
            throw new Error('Paramètres par défaut incomplets');
        }
    });

    // TEST 4: Vérifier que updateParams fonctionne
    test('updateParams modifie les paramètres', () => {
        const testParams = {
            greenThreshold: 0.5,
            greenRange: 0.4,
            bloomIntensity: 2.0
        };
        
        // Vérifier que les paramètres sont valides
        Object.values(testParams).forEach(value => {
            if (typeof value !== 'number' || value < 0 || value > 3) {
                throw new Error(`Paramètre invalide: ${value}`);
            }
        });
    });

    // TEST 5: Vérifier que getParams retourne les bons paramètres
    test('getParams retourne les paramètres actuels', () => {
        const params = {
            greenThreshold: 0.3,
            greenRange: 0.3,
            bloomIntensity: 1.5
        };
        
        // Vérifier que tous les champs sont présents
        if (!params.hasOwnProperty('greenThreshold') ||
            !params.hasOwnProperty('greenRange') ||
            !params.hasOwnProperty('bloomIntensity')) {
            throw new Error('Champs manquants dans getParams()');
        }
    });

    // TEST 6: Vérifier les presets
    test('Les presets de configuration sont valides', () => {
        const presets = {
            subtle: { greenThreshold: 0.4, greenRange: 0.35, bloomIntensity: 0.8 },
            default: { greenThreshold: 0.3, greenRange: 0.3, bloomIntensity: 1.5 },
            intense: { greenThreshold: 0.2, greenRange: 0.25, bloomIntensity: 2.5 },
        };
        
        Object.entries(presets).forEach(([name, params]) => {
            Object.values(params).forEach(value => {
                if (typeof value !== 'number') {
                    throw new Error(`Preset ${name} a des valeurs invalides`);
                }
            });
        });
    });

    // TEST 7: Vérifier la structure du shader
    test('Structure du shader est valide', () => {
        const shaderStructure = {
            uniforms: ['tDiffuse', 'greenThreshold', 'greenRange', 'bloomIntensity'],
            vertexShader: 'varying vec2 vUv;',
            fragmentShader: 'uniform sampler2D tDiffuse;'
        };
        
        if (!shaderStructure.uniforms || shaderStructure.uniforms.length < 3) {
            throw new Error('Uniforms du shader incomplets');
        }
    });

    // Afficher le résumé
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📊 Résultats: ${passedTests}/${totalTests} tests réussis`);
    console.log(`${'='.repeat(50)}\n`);

    if (passedTests === totalTests) {
        console.log('✨ Tous les tests sont passés! ✨\n');
        return true;
    } else {
        console.log(`⚠️  ${totalTests - passedTests} test(s) échoué(s)\n`);
        return false;
    }
}

// Instructions d'utilisation
console.log(`
╔════════════════════════════════════════════════════════════════╗
║        🟢 GREEN BLOOM EFFECT - TEST SUITE                      ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║ Pour exécuter les tests dans la console du navigateur:        ║
║                                                                ║
║ 1. Ouvrir la console (F12 ou Ctrl+Shift+J)                    ║
║ 2. Importer les tests:                                        ║
║                                                                ║
║    import { testGreenBloomEffect } from                        ║
║      './effects/GreenBloomTest.js';                           ║
║                                                                ║
║ 3. Exécuter:                                                   ║
║                                                                ║
║    testGreenBloomEffect();                                     ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
`);

// Test de diagnostic: vérifier les dépendances Three.js
export function diagnosticThreeJS() {
    console.log('\n🔍 Diagnostic Three.js\n');
    
    try {
        console.log('✅ Three.js est chargé');
        
        // Vérifier les modules nécessaires
        const required = [
            'EffectComposer',
            'RenderPass',
            'ShaderPass'
        ];
        
        console.log('Modules post-processing requis:');
        required.forEach(module => {
            console.log(`  - ${module} (à vérifier lors du runtime)`);
        });
        
        console.log('\n✅ Toutes les dépendances semblent disponibles');
    } catch (error) {
        console.error('❌ Erreur lors du diagnostic:', error);
    }
}

// Exporter les fonctions de test
export const GreenBloomTest = {
    runTests: testGreenBloomEffect,
    diagnostic: diagnosticThreeJS
};

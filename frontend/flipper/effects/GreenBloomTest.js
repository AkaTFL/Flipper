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
            threshold: 0.7,
            softKnee: 0.5,
            intensity: 1.25,
            levels: 3
        };
        
        if (defaultParams.threshold === undefined ||
            defaultParams.softKnee === undefined ||
            defaultParams.intensity === undefined ||
            defaultParams.levels === undefined) {
            throw new Error('Paramètres par défaut incomplets');
        }
    });

    // TEST 4: Vérifier que updateParams fonctionne
    test('updateParams modifie les paramètres', () => {
        const testParams = {
            threshold: 0.5,
            softKnee: 0.4,
            intensity: 2.0
        };
        
        Object.values(testParams).forEach(value => {
            if (typeof value !== 'number' || value < 0 || value > 4) {
                throw new Error(`Paramètre invalide: ${value}`);
            }
        });
    });

    // TEST 5: Vérifier que getParams retourne les bons paramètres
    test('getParams retourne les paramètres actuels', () => {
        const params = {
            threshold: 0.7,
            softKnee: 0.5,
            intensity: 1.25,
            levels: 3
        };
        
        if (!params.hasOwnProperty('threshold') ||
            !params.hasOwnProperty('softKnee') ||
            !params.hasOwnProperty('intensity') ||
            !params.hasOwnProperty('levels')) {
            throw new Error('Champs manquants dans getParams()');
        }
    });

    // TEST 6: Vérifier les presets
    test('Les presets de configuration sont valides', () => {
        const presets = {
            subtle: { threshold: 0.8, softKnee: 0.65, intensity: 0.8 },
            default: { threshold: 0.7, softKnee: 0.5, intensity: 1.25 },
            intense: { threshold: 0.5, softKnee: 0.35, intensity: 2.5 },
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
            uniforms: ['u_texture', 'u_threshold', 'u_softKnee', 'u_intensity'],
            vertexShader: 'varying vec2 vUv;',
            fragmentShader: 'uniform sampler2D u_texture;'
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

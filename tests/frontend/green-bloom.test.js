import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../');
const effectPath = path.join(projectRoot, 'frontend', 'playfield', 'postprocessing', 'BloomEffect.js');
<<<<<<< HEAD
const manualTestPath = path.join(projectRoot, 'frontend', 'playfield', 'postprocessing', 'BloomEffect.js');

=======
>>>>>>> 9c2eeb98adf79f6cf0944a9465a6cca832f9216e
const effectSource = await readFile(effectPath, 'utf8');

<<<<<<< HEAD
test('GreenBloomEffect shader file exists and contains the effect class', () => {
  assert.ok(effectSource.includes('createBloom'));
=======
test('le bloom actuel existe et exporte sa fabrique', () => {
  assert.match(effectSource, /export function createBloom/);
>>>>>>> 9c2eeb98adf79f6cf0944a9465a6cca832f9216e
});

test('le bloom sélectionne la couleur verte et réutilise ses matériaux', () => {
  assert.match(effectSource, /targetColor/);
  assert.match(effectSource, /tolerance/);
  assert.match(effectSource, /darkMaterial/);
  assert.match(effectSource, /originalMaterials/);
});

<<<<<<< HEAD
test('GreenBloomEffect exports parameter update and getter logic', () => {
  assert.match(effectSource, /strength\s*=\s*1\.5/);
  assert.match(effectSource, /radius\s*=\s*0\.4/);
  assert.match(effectSource, /threshold\s*=\s*0/);
  assert.match(effectSource, /tableStrength/);
  assert.match(effectSource, /tableRadius/);
});

test('GreenBloom manual browser test file exists and exposes the test helper', () => {
  assert.ok(manualTestSource.includes('createBloom'));
  assert.match(manualTestSource, /ShaderPass/);
  assert.match(manualTestSource, /UnrealBloomPass/);
  assert.match(manualTestSource, /targetColor/);
=======
test('le bloom peut actualiser les objets après leur chargement', () => {
  assert.match(effectSource, /refreshSelection/);
>>>>>>> 9c2eeb98adf79f6cf0944a9465a6cca832f9216e
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');
const effectPath = path.join(projectRoot, 'frontend', 'flipper', 'effects', 'GreenBloomEffect.js');
const manualTestPath = path.join(projectRoot, 'frontend', 'flipper', 'effects', 'GreenBloomTest.js');

const effectSource = readFileSync(effectPath, 'utf8');
const manualTestSource = readFileSync(manualTestPath, 'utf8');

test('GreenBloomEffect shader file exists in frontend tests folder', () => {
  assert.ok(effectSource.includes('class GreenBloomEffect'));
});

test('GreenBloomEffect source imports the native Three.js composer and bloom pass', () => {
  assert.match(effectSource, /EffectComposer/);
  assert.match(effectSource, /RenderPass/);
  assert.match(effectSource, /UnrealBloomPass/);
});

test('GreenBloomEffect source contains bloom parameter handling', () => {
  assert.match(effectSource, /this\.params\s*=\s*\{/);
  assert.match(effectSource, /threshold:\s*0\.95/);
  assert.match(effectSource, /strength:\s*0\.15/);
  assert.match(effectSource, /radius:\s*0\.1/);
  assert.match(effectSource, /exposure:\s*1\.0/);
});

test('GreenBloomEffect contains updateParams and getParams patterns', () => {
  assert.match(effectSource, /updateParams\s*\(/);
  assert.match(effectSource, /getParams\s*\(/);
  assert.match(effectSource, /this\.bloomPass\.threshold\s*=\s*params\.threshold/);
  assert.match(effectSource, /this\.bloomPass\.strength\s*=\s*params\.strength/);
  assert.match(effectSource, /this\.bloomPass\.radius\s*=\s*params\.radius/);
});

test('GreenBloom manual browser test helper exists in the expected frontend location', () => {
  assert.ok(manualTestSource.includes('export async function testGreenBloomEffect'));
  assert.match(manualTestSource, /Structure du shader est valide/);
  assert.match(manualTestSource, /Les paramètres par défaut sont corrects/);
  assert.match(manualTestSource, /updateParams modifie les paramètres/);
});

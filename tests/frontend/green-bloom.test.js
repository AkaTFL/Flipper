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

test('GreenBloomEffect shader source contains the custom shader uniforms', () => {
  assert.match(effectSource, /uniform\s+sampler2D\s+tDiffuse/);
  assert.match(effectSource, /uniform\s+float\s+greenThreshold/);
  assert.match(effectSource, /uniform\s+float\s+greenRange/);
  assert.match(effectSource, /uniform\s+float\s+bloomIntensity/);
});

test('GreenBloomEffect shader source contains vertex and fragment shader code', () => {
  assert.match(effectSource, /varying\s+vec2\s+vUv/);
  assert.match(effectSource, /gl_Position\s*=\s*projectionMatrix\s*\*/);
  assert.match(effectSource, /texture2D\(tDiffuse,\s*vUv\)/);
  assert.match(effectSource, /gl_FragColor\s*=\s*vec4\(finalColor,\s*texel\.a\)/);
});

test('GreenBloomEffect contains updateParam and getter method patterns', () => {
  assert.match(effectSource, /updateParams\s*\(/);
  assert.match(effectSource, /getParams\s*\(/);
  assert.match(effectSource, /this\.bloomPass\.uniforms\.greenThreshold\.value/);
  assert.match(effectSource, /this\.bloomPass\.uniforms\.greenRange\.value/);
  assert.match(effectSource, /this\.bloomPass\.uniforms\.bloomIntensity\.value/);
});

test('GreenBloom manual browser test helper exists in the expected frontend location', () => {
  assert.ok(manualTestSource.includes('export async function testGreenBloomEffect'));
  assert.match(manualTestSource, /Structure du shader est valide/);
  assert.match(manualTestSource, /Les paramètres par défaut sont corrects/);
  assert.match(manualTestSource, /updateParams modifie les paramètres/);
});

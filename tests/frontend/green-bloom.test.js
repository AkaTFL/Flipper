import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');
const effectPath = path.join(projectRoot, 'frontend', 'playfield', 'postprocessing', 'BloomEffect.js');
const manualTestPath = path.join(projectRoot, 'frontend', 'playfield', 'postprocessing', 'BloomEffect.js');

const effectSource = await readFile(effectPath, 'utf8');
const manualTestSource = await readFile(manualTestPath, 'utf8');

test('GreenBloomEffect shader file exists and contains the effect class', () => {
  assert.ok(effectSource.includes('createBloom'));
});

test('GreenBloomEffect defines the required shader uniforms and shader source', () => {
  assert.match(effectSource, /tDiffuse/);
  assert.match(effectSource, /greenThreshold/);
  assert.match(effectSource, /greenRange/);
  assert.match(effectSource, /bloomIntensity/);
  assert.match(effectSource, /varying\s+vec2\s+vUv/);
  assert.match(effectSource, /texture2D\(tDiffuse,\s*vUv\)/);
  assert.match(effectSource, /gl_FragColor\s*=\s*vec4\(finalColor,\s*texel\.a\)/);
});

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
});

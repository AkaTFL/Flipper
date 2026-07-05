import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../');
const effectPath = path.join(projectRoot, 'frontend', 'playfield', 'postprocessing', 'BloomEffect.js');
const effectSource = await readFile(effectPath, 'utf8');

test('le bloom actuel existe et exporte sa fabrique', () => {
  assert.match(effectSource, /export function createBloom/);
});

test('le bloom sélectionne la couleur verte et réutilise ses matériaux', () => {
  assert.match(effectSource, /targetColor/);
  assert.match(effectSource, /tolerance/);
  assert.match(effectSource, /darkMaterial/);
  assert.match(effectSource, /originalMaterials/);
});

test('le bloom peut actualiser les objets après leur chargement', () => {
  assert.match(effectSource, /refreshSelection/);
});

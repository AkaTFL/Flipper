import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readObject = (name) => readFile(path.join(root, 'frontend', 'playfield', 'objects', `${name}.js`), 'utf8');

test('les objets physiques principaux existent dans la structure playfield', async () => {
  for (const name of ['Bumper', 'LaunchingRamp', 'Palles', 'Repulse', 'StaticMesh', 'Wall']) {
    const source = await readObject(name);
    assert.match(source, new RegExp(`export class ${name}`));
  }
});

test('les palettes utilisent toujours une articulation et un moteur Rapier', async () => {
  const source = await readObject('Palles');
  assert.match(source, /JointData\.revolute/);
  assert.match(source, /configureMotorPosition/);
});

test('les objets statiques construisent leurs collisions trimesh', async () => {
  const source = await readObject('StaticMesh');
  assert.match(source, /build(?:Local)?TrimeshCollider/);
});

test('la rampe de lancement aligne ses collisions sur chaque mesh local', async () => {
  const rampSource = await readObject('LaunchingRamp');
  const ballSource = await readObject('Ball');

  assert.match(rampSource, /buildLocalTrimeshCollider\(child\)/);
  assert.doesNotMatch(rampSource, /this\.buildTrimeshCollider\(modelRoot\)/);
  assert.match(rampSource, /createInvisibleLaunchGuides\(\)/);
  assert.match(rampSource, /ColliderDesc\s*\.cuboid/);
  assert.match(ballSource, /setCcdEnabled\(true\)/);
});

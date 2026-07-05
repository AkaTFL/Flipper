import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('le manifeste Fliphetic cible les trois écrans sans mode démo', () => {
  const manifest = read('fliphetic.toml');

  assert.match(manifest, /playfield\s*=.*\/playfield\/\?cabinet=1/);
  assert.match(manifest, /backglass\s*=.*\/backglass\//);
  assert.match(manifest, /dmd\s*=.*\/dmd\//);
  assert.doesNotMatch(manifest, /demo=1/);
});

test('le déploiement publie le service écran et connecte le bridge série', () => {
  const compose = read('deploy/docker-compose.yml');

  assert.match(compose, /- "0:80"/);
  assert.match(compose, /\/dev\/ttyUSB0:\/dev\/esp/);
  assert.match(compose, /condition: service_healthy/);
});

test('nginx relaie les WebSockets et les événements des boutons', () => {
  const nginx = read('deploy/nginx.conf');

  assert.match(nginx, /location \/ws/);
  assert.match(nginx, /proxy_set_header Upgrade/);
  assert.match(nginx, /location = \/events/);
  assert.match(nginx, /proxy_buffering off/);
});

test('les trois frontends locaux utilisent le proxy WebSocket de développement', () => {
  const compose = read('docker-compose.yml');
  const nginx = read('deploy/nginx.dev.conf');
  const proxyMounts = compose.match(/\.\/deploy\/nginx\.dev\.conf:\/etc\/nginx\/conf\.d\/default\.conf:ro/g) ?? [];

  assert.equal(proxyMounts.length, 3);
  assert.match(nginx, /location \/ws/);
  assert.match(nginx, /proxy_pass http:\/\/backend:8080\/ws/);
  assert.match(nginx, /proxy_set_header Upgrade/);
  assert.match(nginx, /proxy_set_header Connection "upgrade"/);
});

test('le firmware final existe et reste facultatif pour le chargement', () => {
  const manifest = read('fliphetic.toml');
  const firmwareUrl = new URL('../../firmware/build/firmware.bin', import.meta.url);

  assert.equal(existsSync(firmwareUrl), true);
  assert.match(manifest, /firmware\s*=\s*"firmware\/build\/firmware\.bin"/);
  assert.match(manifest, /required\s*=\s*false/);
});

test('le Playfield se lance automatiquement uniquement en mode cabinet', () => {
  const playfield = read('frontend/playfield/index.html');

  assert.match(playfield, /get\('cabinet'\) === '1'/);
  assert.match(playfield, /launchGame\(1, 'new', 1, null\)/);
});

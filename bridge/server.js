// bridge/server.js
// Serial-to-HTTP bridge for the ESP32 button/LED tester. Reads the ESP's
// JSON-line output from the serial device and:
//   GET /events  — Server-Sent Events: each ESP line is pushed instantly
//                  (low latency; the debug screen uses this).
//   GET /state   — the most recent line as a one-shot snapshot.
//   GET /env     — this container's environment (the DMD env-var test block).
// Dependency-free: pure Node, plus busybox `stty` to set the line mode.
//
// If the device is absent (ESP not flashed or not plugged in) the bridge
// still runs and serves {} — the screen just shows "no device".

const http = require('http');
const fs = require('fs');
const { execFileSync } = require('child_process');

const DEVICE = process.env.ESP_DEVICE || '/dev/esp';
const BAUD = process.env.ESP_BAUD || '115200';
const PORT = 8091;

let state = '{}';            // latest valid JSON line from the ESP
let connected = false;
const clients = new Set();   // open SSE responses

function broadcast(line) {
  const frame = 'data: ' + line + '\n\n';
  for (const res of clients) {
    try { res.write(frame); } catch (e) { clients.delete(res); }
  }
}

function openSerial() {
  // put the tty in raw mode at the firmware's baud
  try {
    execFileSync('stty', [
      '-F', DEVICE, BAUD, 'raw', '-echo', 'cs8', '-parenb', '-cstopb',
    ]);
  } catch (e) {
    connected = false;       // device not present yet — retry
    setTimeout(openSerial, 3000);
    return;
  }

  const stream = fs.createReadStream(DEVICE);
  let buf = '';
  connected = true;

  stream.on('data', (chunk) => {
    buf += chunk.toString('utf8');
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line.startsWith('{') && line.endsWith('}')) {
        try {
          JSON.parse(line);   // validate — skips ESP boot-log noise
          state = line;
          broadcast(line);    // push to every SSE client immediately
        } catch (e) { /* not our JSON */ }
      }
    }
    if (buf.length > 8192) buf = '';   // guard against a stuck line
  });

  const reopen = () => {
    connected = false;
    stream.destroy();
    setTimeout(openSerial, 3000);
  };
  stream.once('error', reopen);
  stream.once('close', reopen);
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'GET' && req.url === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.write('retry: 2000\n\n');
    res.write('data: ' + state + '\n\n');   // current snapshot right away
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  if (req.method === 'GET' && req.url === '/state') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(state);
    return;
  }

  if (req.method === 'GET' && req.url === '/env') {
    // This container's own environment, so the debug DMD screen can show what
    // the dashboard's per-app env vars actually injected. Sorted for a stable
    // view across refreshes.
    const env = {};
    for (const k of Object.keys(process.env).sort()) env[k] = process.env[k];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(env));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(connected ? 'esp bridge: connected' : 'esp bridge: waiting for device');
});

server.listen(PORT, () => console.log('esp bridge listening on :' + PORT));
openSerial();

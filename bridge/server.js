const http = require('http');
const fs = require('fs');
const { execFileSync } = require('child_process');

const DEVICE = process.env.ESP_DEVICE || '/dev/esp';
const BAUD = process.env.ESP_BAUD || '115200';
const PORT = 8091;

let state = '{}';
let connected = false;
const clients = new Set();

function broadcast(line) {
  const frame = `data: ${line}\n\n`;
  for (const response of clients) {
    try {
      response.write(frame);
    } catch {
      clients.delete(response);
    }
  }
}

function openSerial() {
  try {
    execFileSync('stty', ['-F', DEVICE, BAUD, 'raw', '-echo', 'cs8', '-parenb', '-cstopb']);
  } catch {
    connected = false;
    setTimeout(openSerial, 3000);
    return;
  }

  const stream = fs.createReadStream(DEVICE);
  let buffer = '';
  connected = true;

  stream.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    let newline;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line.startsWith('{') && line.endsWith('}')) {
        try {
          JSON.parse(line);
          state = line;
          broadcast(line);
        } catch {
          // Ignore les messages de démarrage qui ne sont pas du JSON valide.
        }
      }
    }
    if (buffer.length > 8192) buffer = '';
  });

  const reopen = () => {
    connected = false;
    stream.destroy();
    setTimeout(openSerial, 3000);
  };
  stream.once('error', reopen);
  stream.once('close', reopen);
}

const server = http.createServer((request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*');

  if (request.method === 'GET' && request.url === '/events') {
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });
    response.write('retry: 2000\n\n');
    response.write(`data: ${state}\n\n`);
    clients.add(response);
    request.on('close', () => clients.delete(response));
    return;
  }

  if (request.method === 'GET' && request.url === '/state') {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(state);
    return;
  }

  response.writeHead(200, { 'Content-Type': 'text/plain' });
  response.end(connected ? 'esp bridge: connected' : 'esp bridge: waiting for device');
});

server.listen(PORT, () => console.log(`esp bridge listening on :${PORT}`));
openSerial();

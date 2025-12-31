/*
  FILE: server.js

  PURPOSE:
  - Serve GUI
  - Handle Socket.IO
  - Motor control
  - Snapshot capture
  - MJPEG recording
  - Xbox controller enable/disable
  - System stats (CPU / RAM / Temp / Uptime / Age)
*/

const path = require('path');
const os = require('os');
const fs = require('fs');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

/* ============================================================
   CONSTANTS
   ============================================================ */

const CAMERA_HOST = '127.0.0.1';
const CAMERA_PORT = 8888;
const SNAPSHOT_DIR = '/opt/jarvis/snapshot';
const RECORDING_DIR = '/opt/jarvis/recording';
const LEO_BIRTH = new Date('2025-12-22T11:00:00');

/* ============================================================
   PATHS
   ============================================================ */

const PROJECT_ROOT = '/opt/jarvis';
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const INDEX_FILE = path.join(PUBLIC_DIR, 'index.html');

/* ============================================================
   SUBSYSTEMS
   ============================================================ */

const motor = require('/opt/jarvis/motor.js');

/* ============================================================
   EXPRESS + SOCKET.IO
   ============================================================ */

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(PUBLIC_DIR));
app.get('/', (_, res) => res.sendFile(INDEX_FILE));

/* ============================================================
   STATE
   ============================================================ */

let controllerEnabled = true;
let recording = false;
let recordStream = null;
let recordRequest = null;

/* ============================================================
   SYSTEM STATS HELPERS
   ============================================================ */

const startTime = Date.now();

function getCpuUsage() {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;

  cpus.forEach(cpu => {
    for (const t in cpu.times) total += cpu.times[t];
    idle += cpu.times.idle;
  });

  return Math.round(100 - (idle / total) * 100);
}

function getRamUsage() {
  return Math.round(
      ((os.totalmem() - os.freemem()) / os.totalmem()) * 100
  );
}

function getTemperature() {
  try {
    return Math.round(
        parseInt(fs.readFileSync('/sys/class/thermal/thermal_zone0/temp')) / 1000
    );
  } catch {
    return null;
  }
}

/* ============================================================
   SNAPSHOT
   ============================================================ */

function captureSnapshot() {
  const name = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = `${SNAPSHOT_DIR}/${name}.jpg`;

  return new Promise((resolve, reject) => {
    const req = http.get(
        { host: CAMERA_HOST, port: CAMERA_PORT, path: '/' },
        res => {
          let buffer = Buffer.alloc(0);

          res.on('data', chunk => {
            buffer = Buffer.concat([buffer, chunk]);
            if (buffer.includes(Buffer.from([0xff, 0xd9]))) {
              fs.writeFile(filePath, buffer, err =>
                  err ? reject(err) : resolve(filePath)
              );
              req.destroy();
            }
          });
        }
    );

    req.on('error', reject);
  });
}

/* ============================================================
   RECORDING
   ============================================================ */

function startRecording() {
  const name = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = `${RECORDING_DIR}/${name}.mjpeg`;

  recordStream = fs.createWriteStream(filePath);
  recording = true;

  recordRequest = http.get(
      { host: CAMERA_HOST, port: CAMERA_PORT, path: '/' },
      res => res.on('data', chunk => recordStream.write(chunk))
  );

  console.log('Recording started:', filePath);
}

function stopRecording() {
  recording = false;

  if (recordRequest) {
    recordRequest.destroy();
    recordRequest = null;
  }

  if (recordStream) {
    recordStream.end();
    recordStream = null;
  }

  console.log('Recording stopped');
}

/* ============================================================
   SOCKET.IO HANDLERS
   ============================================================ */

io.on('connection', socket => {
  console.log('Client connected:', socket.id);

  socket.on('controller:toggle', enabled => {
    controllerEnabled = !!enabled;
    console.log('Controller enabled:', controllerEnabled);
  });

  socket.on('move', dir => {
    if (!controllerEnabled) return;
    if (dir === 'forward') motor.forward();
    if (dir === 'backward') motor.backward();
    if (dir === 'left') motor.left();
    if (dir === 'right') motor.right();
  });

  socket.on('stopAll', () => motor.stopAll());

  socket.on('snapshot', async () => {
    try {
      await captureSnapshot();
      io.emit('snapshot');
    } catch (e) {
      console.error('Snapshot failed:', e.message);
    }
  });

  socket.on('record', () => {
    if (!recording) {
      startRecording();
      io.emit('record:start');
    } else {
      stopRecording();
      io.emit('record:stop');
    }
  });

  socket.on('disconnect', () => {
    motor.stopAll();
    console.log('Client disconnected:', socket.id);
  });
});

/* ============================================================
   STATS LOOP (THIS FIXES YOUR ISSUE)
   ============================================================ */

setInterval(() => {
  io.emit('stats', {
    cpu: getCpuUsage(),
    ram: getRamUsage(),
    temp: getTemperature(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    age: Math.floor((Date.now() - LEO_BIRTH.getTime()) / 1000)
  });
}, 1000);

/* ============================================================
   START SERVER
   ============================================================ */

server.listen(3000, () => {
  console.log('Leo server listening on port 3000');
});

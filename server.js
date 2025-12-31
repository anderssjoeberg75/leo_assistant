/*
  FILE: server.js

  PURPOSE:
  - Serve GUI
  - Handle Socket.IO
  - Own motor + speed state
  - Emit real system stats
  - Capture snapshots
  - Record MJPEG streams reliably
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

const LEO_BIRTH = new Date('2025-12-22T11:00:00');
const CAMERA_HOST = '127.0.0.1';
const CAMERA_PORT = 8888;
const SNAPSHOT_DIR = '/opt/jarvis/snapshot';
const RECORDING_DIR = '/opt/jarvis/recording';

/* ============================================================
   PATHS
   ============================================================ */

const PROJECT_ROOT = '/opt/jarvis';
const PUBLIC_DIR   = path.join(PROJECT_ROOT, 'public');
const INDEX_FILE   = path.join(PUBLIC_DIR, 'index.html');

/* ============================================================
   SUBSYSTEMS
   ============================================================ */

const motor = require('/opt/jarvis/motor.js');

/* ============================================================
   EXPRESS + HTTP
   ============================================================ */

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(PUBLIC_DIR));

app.get('/', (req, res) => {
  res.sendFile(INDEX_FILE);
});

/* ============================================================
   SPEED STATE
   ============================================================ */

let currentSpeed = 50;
motor.setSpeed(currentSpeed);

/* ============================================================
   SYSTEM STATS
   ============================================================ */

const startTime = Date.now();

function getCpuUsage() {
  const cpus = os.cpus();
  let idle = 0, total = 0;
  cpus.forEach(cpu => {
    for (const t in cpu.times) total += cpu.times[t];
    idle += cpu.times.idle;
  });
  return Math.round(100 - (idle / total) * 100);
}

function getRamUsage() {
  return Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100);
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
  return new Promise((resolve, reject) => {
    const name = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(SNAPSHOT_DIR, `${name}.jpg`);

    const req = http.get(
        { host: CAMERA_HOST, port: CAMERA_PORT, path: '/' },
        res => {
          let buffer = Buffer.alloc(0);

          res.on('data', chunk => {
            buffer = Buffer.concat([buffer, chunk]);
            const end = buffer.indexOf(Buffer.from([0xff, 0xd9]));
            if (end !== -1) {
              fs.writeFile(filePath, buffer.slice(0, end + 2), err =>
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
   RECORDING STATE
   ============================================================ */

let recording = false;
let recordStream = null;
let recordRequest = null;
let recordStart = null;

/* ============================================================
   START RECORDING (FIXED)
   ============================================================ */

function startRecording() {
  const name = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(RECORDING_DIR, `${name}.mjpeg`);

  recordStream = fs.createWriteStream(filePath);
  recordStart = Date.now();
  recording = true; // ✅ MUST BE SET FIRST

  recordRequest = http.get(
      { host: CAMERA_HOST, port: CAMERA_PORT, path: '/' },
      res => {
        res.on('data', chunk => {
          if (recordStream) {
            recordStream.write(chunk);
          }
        });
      }
  );

  console.log('Recording started:', filePath);
  return recordStart;
}

/* ============================================================
   STOP RECORDING
   ============================================================ */

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

  recordStart = null;
  console.log('Recording stopped');
}

/* ============================================================
   SOCKET.IO
   ============================================================ */

io.on('connection', socket => {
  console.log('SOCKET CONNECTED:', socket.id);

  socket.emit('speed:update', currentSpeed);

  socket.on('move', cmd => {
    switch (cmd) {
      case 'forward':  motor.forward();  break;
      case 'backward': motor.backward(); break;
      case 'left':     motor.left();     break;
      case 'right':    motor.right();    break;
    }
  });

  socket.on('speed', value => {
    currentSpeed = Number(value);
    motor.setSpeed(currentSpeed);
    io.emit('speed:update', currentSpeed);
  });

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
      const ts = startRecording();
      io.emit('record:start', ts);
    } else {
      stopRecording();
      io.emit('record:stop');
    }
  });

  socket.on('stopAll', () => motor.stopAll());
  socket.on('disconnect', () => motor.stopAll());
});

/* ============================================================
   STATS LOOP
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

/*
  server.js
  ---------
  Main control server.
*/

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');
const fs = require('fs');

const motor = require('./motor');
const ai = require('./ai');
const sensors = require('./sensors');

/* ============================================================
   SERVER SETUP
   ============================================================ */

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const CAMERA_URL = 'http://127.0.0.1:8888';

/* ============================================================
   SYSTEM CONSTANTS
   ============================================================ */

const STATS_INTERVAL_MS = 2000;
const LEO_BIRTH = new Date('2025-12-22T11:00:00');

let lastIdle = 0;
let lastTotal = 0;

/* ============================================================
   OBSTACLE STATE (TRANSIENT)
   ============================================================ */

let frontBlocked = false;
let backBlocked = false;

/* ============================================================
   SENSOR CALLBACK
   ============================================================ */

function handleObstacle(position) {
  if (position === 'front') frontBlocked = true;
  if (position === 'back') backBlocked = true;
}

/* ============================================================
   SYSTEM METRICS
   ============================================================ */

function getCpuUsagePercent() {
  const cpus = os.cpus();
  let idle = 0, total = 0;

  for (const cpu of cpus) {
    for (const t in cpu.times) total += cpu.times[t];
    idle += cpu.times.idle;
  }

  const idleDiff = idle - lastIdle;
  const totalDiff = total - lastTotal;
  lastIdle = idle;
  lastTotal = total;

  if (totalDiff === 0) return 0;
  return Math.round(100 - (idleDiff / totalDiff) * 100);
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
   CAMERA PROXY
   ============================================================ */

function camCall(path) {
  http.get(CAMERA_URL + path).on('error', () => {});
}

/* ============================================================
   SOCKET.IO EVENTS
   ============================================================ */

io.on('connection', socket => {

  socket.on('move', dir => {

    // Direction-aware blocking
    if (dir === 'forward' && frontBlocked) return;
    if (dir === 'backward' && backBlocked) return;

    // ✅ CLEAR BLOCKS WHEN ESCAPING
    if (dir === 'backward') frontBlocked = false;
    if (dir === 'forward') backBlocked = false;
    if (dir === 'left' || dir === 'right') {
      frontBlocked = false;
      backBlocked = false;
    }

    if (typeof motor[dir] === 'function') {
      motor[dir]();
    }
  });

  socket.on('stopAll', () => {
    motor.stopAll();
    frontBlocked = false;
    backBlocked = false;
  });

  socket.on('snapshot', () => camCall('/snapshot'));

  socket.on('rec_start', () => {
    camCall('/rec/start');
    socket.emit('rec_state', true);
  });

  socket.on('rec_stop', () => {
    camCall('/rec/stop');
    socket.emit('rec_state', false);
  });

  socket.on('ai_prompt', async prompt => {
    try {
      const reply = await ai.ask(prompt);
      socket.emit('ai_reply', reply);
    } catch {
      socket.emit('ai_reply', 'AI error');
    }
  });

  const statsInterval = setInterval(() => {
    socket.emit('stats', {
      cpu: getCpuUsagePercent(),
      ram: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100),
      temp: getTemperature(),
      uptime: Math.floor(os.uptime()),
      age: Math.floor((Date.now() - LEO_BIRTH) / 1000)
    });
  }, STATS_INTERVAL_MS);

  socket.on('disconnect', () => {
    motor.stopAll();
    frontBlocked = false;
    backBlocked = false;
    clearInterval(statsInterval);
  });
});

/* ============================================================
   SENSOR INIT
   ============================================================ */

sensors.init(motor, io, handleObstacle);

/* ============================================================
   START SERVER
   ============================================================ */

server.listen(3000, () => {
  console.log('Leo server listening on port 3000');
});

/* ============================================================
   GRACEFUL SHUTDOWN
   ============================================================ */

function shutdown() {
  console.log('Leo server shutting down');

  try {
    motor.stopAll();
  } catch {}

  io.close(() => {
    server.close(() => process.exit(0));
  });

  setTimeout(() => process.exit(1), 3000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

/*
  FILE: server.js
  PURPOSE:
  - Serve GUI
  - Handle Socket.IO
  - Control motors with PWM
  - Emit system stats
*/

const path = require('path');
const os = require('os');
const fs = require('fs');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

/* ============================================================
   CONSTANTS
   ============================================================ */

const LEO_BIRTH = new Date('2025-12-22T11:00:00');

/* ============================================================
   PATHS
   ============================================================ */

const PROJECT_ROOT = '/opt/jarvis';
const PUBLIC_DIR   = path.join(PROJECT_ROOT, 'public');
const INDEX_FILE   = path.join(PUBLIC_DIR, 'index.html');

/* ============================================================
   SUBSYSTEMS
   ============================================================ */

const motor   = require('/opt/jarvis/motor.js');
//const sensors = require('/opt/jarvis/sensors.js');

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
   SOCKET.IO HANDLERS
   ============================================================ */

io.on('connection', socket => {
  console.log('SOCKET CONNECTED:', socket.id);

  socket.on('move', cmd => {
    switch (cmd) {
      case 'forward':  motor.forward();  break;
      case 'backward': motor.backward(); break;
      case 'left':     motor.left();     break;
      case 'right':    motor.right();    break;
    }
  });

  socket.on('speed', value => {
    motor.setSpeed(Number(value));
  });

  socket.on('stopAll', () => {
    motor.stopAll();
  });

  socket.on('disconnect', () => {
    motor.stopAll();
  });
});

/* ============================================================
   STATS EMIT LOOP
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

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Leo server listening on port ${PORT}`);
});

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');
const fs = require('fs');

const motor = require('./motor');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const STATS_INTERVAL_MS = 2000;
const LEO_BIRTH = new Date('2025-12-22T11:00:00');

let lastIdle = 0;
let lastTotal = 0;

/* ---------- CPU ---------- */
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

/* ---------- TEMP ---------- */
function getTemperature() {
  try {
    return Math.round(
        parseInt(fs.readFileSync('/sys/class/thermal/thermal_zone0/temp')) / 1000
    );
  } catch {
    return null;
  }
}

/* ---------- SOCKET.IO ---------- */
io.on('connection', socket => {

  socket.on('move', dir => {
    if (typeof motor[dir] !== 'function') return;
    motor[dir]();
  });

  socket.on('stopAll', () => {
    motor.stopAll();
  });

  socket.on('disconnect', () => {
    motor.stopAll(); // safety
  });

  const statsInterval = setInterval(() => {
    socket.emit('stats', {
      cpu: getCpuUsagePercent(),
      ram: Math.round(
          ((os.totalmem() - os.freemem()) / os.totalmem()) * 100
      ),
      temp: getTemperature(),
      uptime: Math.floor(os.uptime()),
      age: Math.floor((Date.now() - LEO_BIRTH) / 1000)
    });
  }, STATS_INTERVAL_MS);

  socket.on('disconnect', () => {
    clearInterval(statsInterval);
  });
});

/* ---------- START ---------- */
server.listen(3000, () => {
  console.log('Leo server listening on port 3000');
});

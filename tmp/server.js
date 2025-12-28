/**
 * server.js
 * - Web UI
 * - Socket.IO control
 * - System stats + distance
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');
const fs = require('fs');
const { execSync } = require('child_process');

const motor = require('./motor');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const STATS_INTERVAL_MS = 1000;
const LEO_BIRTH = new Date('2025-12-22T11:00:00');

/* ---------- CAMERA ---------- */

function camCmd(path) {
  http.get({ host: '127.0.0.1', port: 8890, path }, () => {})
      .on('error', () => {});
}

function getFps() {
  try {
    return parseInt(fs.readFileSync('/tmp/leo_camera_fps', 'utf8'));
  } catch {
    return '--';
  }
}

function isRecording() {
  try {
    return fs.readFileSync('/tmp/leo_recording_state', 'utf8').trim() === '1';
  } catch {
    return false;
  }
}

/* ---------- SYSTEM ---------- */

let lastIdle = 0;
let lastTotal = 0;

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

  return totalDiff === 0 ? 0 :
      Math.round(100 - (idleDiff / totalDiff) * 100);
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

function getWifiSignal() {
  try {
    const out = execSync('iw dev wlan0 link', { encoding: 'utf8' });
    const match = out.match(/signal:\s+(-\d+)\s+dBm/);
    if (!match) return null;

    const dbm = parseInt(match[1], 10);
    return { dbm, quality: Math.min(100, Math.max(0, 2 * (dbm + 100))) };
  } catch {
    return null;
  }
}

/* ---------- SOCKET ---------- */

io.on('connection', socket => {

  socket.on('move', dir => motor[dir]?.());
  socket.on('stopAll', () => motor.stopAll());
  socket.on('disconnect', () => motor.stopAll());

  socket.on('snapshot', () => camCmd('/snapshot'));
  socket.on('record:start', () => camCmd('/record/start'));
  socket.on('record:stop', () => camCmd('/record/stop'));

  const statsInterval = setInterval(async () => {
    const distance = await motor.getDistance();

    socket.emit('stats', {
      cpu: getCpuUsagePercent(),
      ram: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100),
      temp: getTemperature(),
      wifi: getWifiSignal(),
      fps: getFps(),
      distance,
      uptime: Math.floor(os.uptime()),
      age: Math.floor((Date.now() - LEO_BIRTH) / 1000),
      recording: isRecording()
    });
  }, STATS_INTERVAL_MS);

  socket.on('disconnect', () => clearInterval(statsInterval));
});

server.listen(3000, () => {
  console.log('Leo server listening on port 3000');
});

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const motor = require('./motor');
const { exec } = require('child_process');
const si = require('systeminformation');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let failsafeTimer;
let batteryVoltage = 0;
let lowBattery = false;

const LOW_BATTERY_VOLTAGE = 10.5; // adjust for your battery pack

function resetFailsafe() {
  clearTimeout(failsafeTimer);
  failsafeTimer = setTimeout(() => {
    motor.stop();
  }, 1000);
}

async function updateStats() {
  const cpu = await si.currentLoad();
  const mem = await si.mem();
  return {
    cpu: cpu.currentLoad.toFixed(1),
    ram: ((mem.active / mem.total) * 100).toFixed(1)
  };
}

app.use(express.static('public'));

app.post('/restart', (req, res) => {
  res.sendStatus(200);
  exec('systemctl restart jarvis', () => {});
});

app.post('/reboot', (req, res) => {
  res.sendStatus(200);
  exec('reboot', () => {});
});

app.post('/shutdown', (req, res) => {
  res.sendStatus(200);
  exec('poweroff', () => {});
});

app.post('/camera-restart', (req, res) => {
  res.sendStatus(200);
  exec('systemctl restart jarvis-camera', () => {});
});

io.on('connection', socket => {
  resetFailsafe();

  socket.on('drive', data => {
    if (lowBattery) {
      motor.stop();
      return;
    }
    resetFailsafe();
    motor.setTank(data.speed, data.steering);
  });

  socket.on('getStats', async () => {
    const stats = await updateStats();
    socket.emit('stats', stats);
  });

  socket.on('disconnect', () => {
    motor.stop();
  });
});

server.listen(3000, () => {
  console.log('Robot control running on port 3000');
});

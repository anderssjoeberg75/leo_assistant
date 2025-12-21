// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const os = require('os');
const { exec } = require('child_process');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
  socket.on('reboot', () => exec('sudo reboot'));
  socket.on('shutdown', () => exec('sudo shutdown now'));
  socket.on('restartCamera', () => exec('sudo systemctl restart jarvis-camera.service'));

  setInterval(() => {
    socket.emit('system', {
      cpu: os.loadavg()[0].toFixed(2),
      ram: ((1 - os.freemem()/os.totalmem())*100).toFixed(1)
    });
  }, 1000);
});

server.listen(3000, () => console.log('Jarvis running on port 3000'));

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const motor = require('./motor');
const { exec } = require('child_process');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let failsafeTimer;

function resetFailsafe() {
  clearTimeout(failsafeTimer);
  failsafeTimer = setTimeout(() => {
    motor.stop();
  }, 1000);
}

app.use(express.static('public'));

app.post('/restart', (req, res) => {
  res.sendStatus(200);
  setTimeout(() => {
    exec('systemctl restart jarvis', () => {});
  }, 500);
});

io.on('connection', socket => {
  resetFailsafe();

  socket.on('drive', data => {
    resetFailsafe();
    motor.setTank(data.speed, data.steering);
  });

  socket.on('disconnect', () => {
    motor.stop();
  });
});

server.listen(3000, () => {
  console.log('Robot control running on port 3000');
});

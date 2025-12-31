/*
  FILE: server.js

  PURPOSE:
  - Serve GUI
  - Handle Socket.IO
  - Own motor + speed state
  - Emit system stats
  - Snapshot + recording
  - Enable / disable Xbox controller input
*/

const path = require('path');
const os = require('os');
const fs = require('fs');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const motor = require('/opt/jarvis/motor.js');

const CAMERA_HOST = '127.0.0.1';
const CAMERA_PORT = 8888;
const SNAPSHOT_DIR = '/opt/jarvis/snapshot';
const RECORDING_DIR = '/opt/jarvis/recording';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('/opt/jarvis/public'));
app.get('/', (_, res) => res.sendFile('/opt/jarvis/public/index.html'));

let controllerEnabled = true;
let recording = false;
let recordStream = null;
let recordRequest = null;

io.on('connection', socket => {

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

  socket.on('snapshot', () => {
    const name = new Date().toISOString().replace(/[:.]/g, '-');
    const file = `${SNAPSHOT_DIR}/${name}.jpg`;

    http.get({ host: CAMERA_HOST, port: CAMERA_PORT, path: '/' }, res => {
      let buf = Buffer.alloc(0);
      res.on('data', c => {
        buf = Buffer.concat([buf, c]);
        if (buf.includes(Buffer.from([0xff, 0xd9]))) {
          fs.writeFileSync(file, buf);
          io.emit('snapshot');
        }
      });
    });
  });

  socket.on('record', () => {
    if (!recording) {
      recording = true;
      const name = new Date().toISOString().replace(/[:.]/g, '-');
      recordStream = fs.createWriteStream(`${RECORDING_DIR}/${name}.mjpeg`);

      recordRequest = http.get(
          { host: CAMERA_HOST, port: CAMERA_PORT, path: '/' },
          res => res.on('data', c => recordStream.write(c))
      );

      io.emit('record:start');
    } else {
      recording = false;
      recordRequest.destroy();
      recordStream.end();
      recordStream = null;
      recordRequest = null;
      io.emit('record:stop');
    }
  });

  socket.on('disconnect', () => motor.stopAll());
});

server.listen(3000, () => {
  console.log('Leo server running on port 3000');
});

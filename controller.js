/*
  FILE: controller.js

  PURPOSE:
  - Read Xbox controller over Bluetooth
  - Send movement and speed commands to server
  - A button  -> Snapshot
  - B button  -> Record start/stop
*/

const Joystick = require('joystick');
const io = require('socket.io-client');

/* ============================================================
   SOCKET.IO CLIENT
   ============================================================ */

const socket = io('http://127.0.0.1:3000', {
    reconnection: true
});

/* ============================================================
   CONTROLLER SETUP
   ============================================================ */

const joystick = new Joystick(0, 3500, 350);

/* ============================================================
   STATE
   ============================================================ */

let currentSpeed = 50;
let aPressed = false;
let bPressed = false;

/* ============================================================
   AXIS HANDLING (MOVEMENT + SPEED)
   ============================================================ */

joystick.on('axis', event => {
    // Left stick vertical (forward / backward)
    if (event.number === 1) {
        if (event.value < -20000) socket.emit('move', 'forward');
        else if (event.value > 20000) socket.emit('move', 'backward');
        else socket.emit('stopAll');
    }

    // Left stick horizontal (left / right)
    if (event.number === 0) {
        if (event.value < -20000) socket.emit('move', 'left');
        else if (event.value > 20000) socket.emit('move', 'right');
        else socket.emit('stopAll');
    }

    // Right trigger (RT) -> increase speed
    if (event.number === 5 && event.value > 0) {
        currentSpeed = Math.min(100, currentSpeed + 1);
        socket.emit('speed', currentSpeed);
    }

    // Left trigger (LT) -> decrease speed
    if (event.number === 2 && event.value > 0) {
        currentSpeed = Math.max(0, currentSpeed - 1);
        socket.emit('speed', currentSpeed);
    }
});

/* ============================================================
   BUTTON HANDLING
   ============================================================ */

joystick.on('button', event => {
    /* ---------- A BUTTON (Snapshot) ---------- */
    if (event.number === 0) {
        if (event.value === 1 && !aPressed) {
            aPressed = true;
            socket.emit('snapshot');
        }
        if (event.value === 0) {
            aPressed = false;
        }
    }

    /* ---------- B BUTTON (Record toggle) ---------- */
    if (event.number === 1) {
        if (event.value === 1 && !bPressed) {
            bPressed = true;
            socket.emit('record');
        }
        if (event.value === 0) {
            bPressed = false;
        }
    }
});

/* ============================================================
   CONNECTION LOGGING
   ============================================================ */

socket.on('connect', () => {
    console.log('Xbox controller connected to Leo server');
});

socket.on('disconnect', () => {
    console.log('Xbox controller disconnected');
});

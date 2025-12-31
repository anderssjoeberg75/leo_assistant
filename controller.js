/*
  FILE: controller.js

  PURPOSE:
  - Read Xbox controller via Linux joystick (/dev/input/js0)
  - Connect to Leo server as a Socket.IO CLIENT
  - Send movement, speed, snapshot and record commands
  - Never touch GPIO or pigpio
*/

const io = require('socket.io-client');

/* ============================================================
   SOCKET.IO CLIENT
   ============================================================ */

// Connect to local Leo server
const socket = io('http://127.0.0.1:3000', {
    reconnection: true,
    reconnectionDelay: 1000,
    transports: ['websocket']
});

/* ============================================================
   CONFIGURATION
   ============================================================ */

const DEVICE_NUMBER = 0;
const DEADZONE = 0.15;
const RETRY_INTERVAL = 2000;

let speed = 50;
let isRecording = false;
let joystick = null;

/* ============================================================
   SPEED UPDATE
   ============================================================ */

function updateSpeed(newSpeed) {
    speed = newSpeed;
    socket.emit('speed', speed);
}

/* ============================================================
   CONTROLLER INITIALIZATION
   ============================================================ */

function initController() {
    let Joystick;

    try {
        Joystick = require('joystick');
    } catch {
        console.log('Joystick module not ready, retrying...');
        return setTimeout(initController, RETRY_INTERVAL);
    }

    try {
        joystick = new Joystick(DEVICE_NUMBER);
        console.log('Xbox controller connected on /dev/input/js0');
        bindEvents();
    } catch {
        console.log('Waiting for Xbox controller device...');
        setTimeout(initController, RETRY_INTERVAL);
    }
}

/* ============================================================
   EVENT BINDINGS
   ============================================================ */

function bindEvents() {
    let axisX = 0;
    let axisY = 0;

    /* ================= AXIS ================= */

    joystick.on('axis', event => {
        const value = event.value / 32767;

        if (event.number === 0) axisX = value;
        if (event.number === 1) axisY = value;

        if (Math.abs(axisX) < DEADZONE && Math.abs(axisY) < DEADZONE) {
            socket.emit('stopAll');
            return;
        }

        if (axisY < -DEADZONE) socket.emit('move', 'forward');
        if (axisY >  DEADZONE) socket.emit('move', 'backward');
        if (axisX < -DEADZONE) socket.emit('move', 'left');
        if (axisX >  DEADZONE) socket.emit('move', 'right');
    });

    /* ================= BUTTONS ================= */

    joystick.on('button', event => {
        if (!event.value) return;

        switch (event.number) {
            case 0: // A
                console.log('Controller: Snapshot');
                socket.emit('snapshot');
                break;

            case 1: // B
                isRecording = !isRecording;
                socket.emit(isRecording ? 'record:start' : 'record:stop');
                console.log(`Controller: Record ${isRecording ? 'START' : 'STOP'}`);
                break;

            case 6: // LB
                updateSpeed(Math.max(5, speed - 5));
                break;

            case 7: // RB
                updateSpeed(Math.min(100, speed + 5));
                break;
        }
    });

    /* ================= DISCONNECT ================= */

    joystick.on('error', () => {
        console.log('Joystick disconnected');
        socket.emit('stopAll');
        joystick = null;
        setTimeout(initController, RETRY_INTERVAL);
    });
}

/* ============================================================
   STARTUP
   ============================================================ */

initController();

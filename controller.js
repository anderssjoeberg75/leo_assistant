/*
  FILE: controller.js

  PURPOSE:
  - Xbox controller input (Bluetooth)
  - Send movement + speed commands to server
  - Never touch GPIO or motor directly
*/

const io = require('socket.io-client');
const socket = io('http://127.0.0.1:3000');

const DEVICE_NUMBER = 0;
const DEADZONE = 0.15;
const RETRY_INTERVAL = 2000;

let speed = 50;
let joystick = null;

/* ============================================================
   SPEED UPDATE
   ============================================================ */

function updateSpeed(newSpeed) {
    speed = newSpeed;
    socket.emit('speed', speed);
    console.log(`Controller speed ${speed}%`);
}

/* ============================================================
   CONTROLLER INITIALIZATION
   ============================================================ */

function initController() {
    let Joystick;

    try {
        Joystick = require('joystick');
    } catch {
        return setTimeout(initController, RETRY_INTERVAL);
    }

    try {
        joystick = new Joystick(DEVICE_NUMBER);
        console.log('Xbox controller connected on /dev/input/js0');
        bindEvents();
    } catch {
        setTimeout(initController, RETRY_INTERVAL);
    }
}

/* ============================================================
   EVENT BINDINGS
   ============================================================ */

function bindEvents() {
    let axisX = 0;
    let axisY = 0;

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

    joystick.on('button', event => {
        if (!event.value) return;

        if (event.number === 6) updateSpeed(Math.max(5, speed - 5));   // LB
        if (event.number === 7) updateSpeed(Math.min(100, speed + 5)); // RB
    });

    joystick.on('error', () => {
        socket.emit('stopAll');
        joystick = null;
        setTimeout(initController, RETRY_INTERVAL);
    });
}

/* ============================================================
   STARTUP
   ============================================================ */

initController();

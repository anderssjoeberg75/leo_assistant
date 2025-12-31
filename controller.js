/*
  FILE: controller.js

  PURPOSE:
  - Read Xbox controller via Linux joystick (/dev/input/js0)
  - Control motors
  - Update UI speed slider when speed changes on controller
  - Mapping based on actual jstest output
*/

const Joystick = require('joystick');
const motor = require('./motor');
const socketHelper = require('./socket');

/* ============================================================
   CONFIGURATION
   ============================================================ */

// Linux joystick device number (js0)
const DEVICE_NUMBER = 0;

// Deadzone to prevent stick drift
const DEADZONE = 0.15;

// Current speed (0–100)
let speed = 50;

/* ============================================================
   INITIALIZATION
   ============================================================ */

let joystick;

try {
    joystick = new Joystick(DEVICE_NUMBER);
    console.log('Xbox controller connected via /dev/input/js0');
} catch (err) {
    console.error('Failed to open joystick:', err);
    process.exit(1);
}

/* ============================================================
   HELPER: UPDATE SPEED
   PURPOSE:
   - Update motor speed
   - Notify all UI clients so slider moves
   ============================================================ */

function updateSpeed(newSpeed) {
    speed = newSpeed;
    motor.setSpeed(speed);

    try {
        socketHelper.io.emit('speed:update', speed);
    } catch {
        // Socket.IO may not be ready during early startup
    }
}

/* ============================================================
   AXIS HANDLING
   AXIS MAP (VERIFIED):
   0 = Left stick X
   1 = Left stick Y
   ============================================================ */

let axisX = 0;
let axisY = 0;

joystick.on('axis', event => {
    const value = event.value / 32767;

    if (event.number === 0) axisX = value;
    if (event.number === 1) axisY = value;

    // Deadzone → stop
    if (Math.abs(axisX) < DEADZONE && Math.abs(axisY) < DEADZONE) {
        motor.stopAll();
        return;
    }

    if (axisY < -DEADZONE) motor.forward();
    if (axisY >  DEADZONE) motor.backward();

    if (axisX < -DEADZONE) motor.left();
    if (axisX >  DEADZONE) motor.right();
});

/* ============================================================
   BUTTON HANDLING
   BUTTON MAP (VERIFIED VIA jstest):
   0 = A
   6 = LB
   7 = RB
   ============================================================ */

joystick.on('button', event => {
    if (!event.value) return;

    switch (event.number) {
        case 0: // SNAPSHOT
            console.log('Controller: Snapshot');
            socketHelper.io.emit('snapshot');
            break;

        /* ================= RECORD TOGGLE ================= */
        case 1: // B = RECORD TOGGLE
            isRecording = !isRecording;

            if (isRecording) {
                console.log('Controller: Record START');
                socketHelper.io.emit('record:start');
            } else {
                console.log('Controller: Record STOP');
                socketHelper.io.emit('record:stop');
            }
            break;
        /* ================= SPEED CONTROL ================= */
        case 6: // LB = speed down
            updateSpeed(Math.max(5, speed - 5));
            break;

        case 7: // RB = speed up
            updateSpeed(Math.min(100, speed + 5));
            break;
    }
});

/* ============================================================
   SAFETY
   ============================================================ */

joystick.on('error', err => {
    console.error('Joystick error:', err);
    motor.stopAll();
});

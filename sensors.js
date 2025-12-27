/*
  sensors.js
  ----------
  Central sensor manager for Leo

  Current responsibilities:
  - Monitor Flying Fish IR obstacle sensors
  - Immediately stop motors when any sensor triggers

  Sensors:
  - FRONT sensor -> GPIO 24
  - BACK  sensor -> GPIO 23

  This file is designed to be extended with
  additional sensors later (ToF, bumpers, etc).
*/

const pigpio = require('pigpio-client');

const pi = pigpio.pigpio({
    host: '127.0.0.1',
    port: 8887
});

let motor = null;

/* ============================================================
   INITIALIZATION
   ============================================================ */

function init(motorModule) {
    motor = motorModule;

    pi.on('connected', () => {
        console.log('Sensors subsystem connected');

        setupObstacleSensor('FRONT', 24);
        setupObstacleSensor('BACK', 23);
    });
}

/* ============================================================
   OBSTACLE SENSOR SETUP
   ============================================================ */

function setupObstacleSensor(label, gpio) {
    const sensor = pi.gpio(gpio);

    sensor.modeSet('input');

    // Flying Fish sensors are push-pull
    sensor.pullUpDown(0);

    sensor.notify((level) => {
        if (level === 0) {
            console.log(`[${label} SENSOR] OBSTACLE DETECTED → STOP MOTORS`);
            if (motor) motor.stopAll();
        }
    });
}

/* ============================================================
   EXPORTS
   ============================================================ */

module.exports = {
    init
};

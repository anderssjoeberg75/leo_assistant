/*
  FILE: sensors.js
  PURPOSE:
  This file is part of the Leo robot system.
  The code below is unchanged in behavior.
  Additional comments explain what each section does.
*/

/*
  sensors.js
  ----------
  Central sensor manager for Leo
  Code-only mitigation against false obstacle triggers
  using LOW-level time qualification.
*/

const pigpio = require('pigpio-client');

const pi = pigpio.pigpio({
  host: '127.0.0.1',
  port: 8887
});

let motor = null;
let io = null;
let onObstacle = null;

/* ============================================================
   CONFIGURATION (CODE-ONLY MITIGATION)
   ============================================================ */

// Minimum time (ms) the signal must stay LOW
// to be considered a real obstacle
const LOW_CONFIRM_MS = 5;

/* ============================================================
   INITIALIZATION
   ============================================================ */

function init(motorModule, ioInstance, obstacleCallback) {
  motor = motorModule;
  io = ioInstance;
  onObstacle = obstacleCallback;

  pi.on('connected', () => {
    console.log('Sensors subsystem connected');
    setupObstacleSensor('front', 24);
    setupObstacleSensor('back', 23);
  });
}

/* ============================================================
   OBSTACLE SENSOR SETUP (FILTERED)
   ============================================================ */

function setupObstacleSensor(position, gpio) {
  const sensor = pi.gpio(gpio);

  sensor.modeSet('input');

  // LM393 output is open-collector (active LOW)
  sensor.pullUpDown(2); // PUD_UP

  let lastLevel = 1;
  let confirmTimer = null;
  let confirmed = false;

  sensor.notify(level => {

    /* HIGH -> LOW edge detected */
    if (lastLevel === 1 && level === 0) {

      // Start LOW qualification timer
      confirmTimer = setTimeout(() => {

        // Re-read GPIO level after delay
        sensor.read((err, currentLevel) => {
          if (err) return;

          // Confirmed LOW = real obstacle
          if (currentLevel === 0 && !confirmed) {
            confirmed = true;

            console.log(
              `[${position.toUpperCase()} SENSOR] OBSTACLE CONFIRMED`
            );

            if (motor) motor.stopAll();
            if (onObstacle) onObstacle(position);
            if (io) io.emit('obstacle', { position });
          }
        });

      }, LOW_CONFIRM_MS);
    }

    /* LOW -> HIGH : reset state */
    if (lastLevel === 0 && level === 1) {
      confirmed = false;
      if (confirmTimer) {
        clearTimeout(confirmTimer);
        confirmTimer = null;
      }
    }

    lastLevel = level;
  });
}

/* ============================================================
   EXPORTS
   ============================================================ */

module.exports = {
  init
};

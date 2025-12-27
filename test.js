/*
  test.js
  -------
  Flying Fish IR obstacle sensor test (dual sensor)

  Sensors:
  - FRONT sensor -> GPIO 24
  - BACK  sensor -> GPIO 23

  Wiring (both sensors):
  - VCC -> 3.3V
  - GND -> GND
  - DO  -> GPIO pin

  Output:
  - Clearly states FRONT or BACK
  - Clearly states OBSTACLE or CLEAR
*/

const pigpio = require('pigpio-client');

/* ============================================================
   PIGPIO CONNECTION
   ============================================================ */

const pi = pigpio.pigpio({
    host: '127.0.0.1',
    port: 8887
});

/* ============================================================
   INIT
   ============================================================ */

pi.on('connected', () => {
    console.log('pigpio connected');
    console.log('Monitoring FRONT and BACK obstacle sensors...');

    setupSensor('FRONT', 24);
    setupSensor('BACK ', 23);
});

/* ============================================================
   SENSOR SETUP
   ============================================================ */

function setupSensor(label, gpio) {
    const sensor = pi.gpio(gpio);

    sensor.modeSet('input');

    // Flying Fish sensors are push-pull → no pull-up/down needed
    sensor.pullUpDown(0);

    /*
      pigpio-client requires callback directly in notify()
    */
    sensor.notify((level) => {
        const obstacle = level === 0;

        console.log(
            `[${label} SENSOR] ${obstacle ? 'OBSTACLE DETECTED' : 'CLEAR'}`
        );
    });
}

/* ============================================================
   CLEAN EXIT
   ============================================================ */

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function shutdown() {
    console.log('Stopping obstacle sensor test');
    process.exit(0);
}

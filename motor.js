/*
  FILE: motor.js
  PURPOSE:
  L298N motor and light controller for Leo.
  This version uses ENA / ENB as simple ON/OFF enables (no PWM).
  Motors always run at full speed when enabled.
*/

const pigpio = require('pigpio-client');

/* ============================================================
   PIGPIO CONNECTION
   - Connects to pigpiod daemon
   ============================================================ */

const pi = pigpio.pigpio({
  host: '127.0.0.1',
  port: 8887
});

/* ============================================================
   GPIO DECLARATIONS
   ============================================================ */

let IN1, IN2, IN3, IN4;   // Direction pins
let ENA, ENB;             // Motor enable pins (NO PWM)
let LIGHT;                // Auxiliary light output
let ready = false;

/* ============================================================
   INITIALIZATION
   - Runs once pigpio connects
   - Sets GPIO modes
   - Enables motors
   ============================================================ */

pi.on('connected', () => {
  // Direction pins (L298N IN1–IN4)
  IN1 = pi.gpio(5);
  IN2 = pi.gpio(12);
  IN3 = pi.gpio(16);
  IN4 = pi.gpio(20);

  // Enable pins (L298N ENA / ENB)
  ENA = pi.gpio(18);
  ENB = pi.gpio(13);

  // Optional light output
  LIGHT = pi.gpio(27);

  // Configure all pins as outputs
  [IN1, IN2, IN3, IN4, ENA, ENB, LIGHT].forEach(p =>
      p.modeSet('output')
  );

  // Enable motors permanently (full speed, no PWM)
  ENA.write(1);
  ENB.write(1);

  // Ensure motors are stopped on startup
  stopAll();
  lightOff();

  ready = true;
  console.log('Motor controller ready (ENA/ENB enabled, no PWM)');
});

/* ============================================================
   MOTOR CONTROL FUNCTIONS
   - Direction only
   - Full speed operation
   ============================================================ */

function stopAll() {
  if (!ready) return;

  // Brake both motors
  IN1.write(0); IN2.write(0);
  IN3.write(0); IN4.write(0);
}

function forward() {
  if (!ready) return;

  IN1.write(1); IN2.write(0);
  IN3.write(1); IN4.write(0);
}

function backward() {
  if (!ready) return;

  IN1.write(0); IN2.write(1);
  IN3.write(0); IN4.write(1);
}

function left() {
  if (!ready) return;

  IN1.write(0); IN2.write(1);
  IN3.write(1); IN4.write(0);
}

function right() {
  if (!ready) return;

  IN1.write(1); IN2.write(0);
  IN3.write(0); IN4.write(1);
}

/* ============================================================
   LIGHT CONTROL
   ============================================================ */

function lightOn() {
  if (ready) LIGHT.write(1);
}

function lightOff() {
  if (ready) LIGHT.write(0);
}

/* ============================================================
   SAFETY HANDLERS
   - Ensure motors stop on exit
   ============================================================ */

process.on('SIGINT', () => {
  stopAll();
  lightOff();
});

process.on('SIGTERM', () => {
  stopAll();
  lightOff();
});

/* ============================================================
   EXPORTS
   ============================================================ */

module.exports = {
  forward,
  backward,
  left,
  right,
  stopAll,
  lightOn,
  lightOff
};

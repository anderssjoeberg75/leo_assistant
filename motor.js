/*
  motor.js
  --------
  L298N motor and light controller.
  Provides full-speed directional control using pigpio-client.
*/

const pigpio = require('pigpio-client');

/* ============================================================
   PIGPIO CONNECTION
   ============================================================ */

const pi = pigpio.pigpio({
  host: '127.0.0.1',
  port: 8887
});

let IN1, IN2, IN3, IN4, ENA, ENB, LIGHT;
let ready = false;

/* ============================================================
   GPIO INITIALIZATION
   ============================================================ */

pi.on('connected', () => {
  IN1 = pi.gpio(5);
  IN2 = pi.gpio(12);
  IN3 = pi.gpio(16);
  IN4 = pi.gpio(20);

  ENA = pi.gpio(18);
  ENB = pi.gpio(13);

  LIGHT = pi.gpio(27);

  [IN1, IN2, IN3, IN4, ENA, ENB, LIGHT].forEach(p =>
      p.modeSet('output')
  );

  stopAll();
  lightOff();

  ready = true;
  console.log('pigpio connected, full-speed mode ready');
});

/* ============================================================
   MOTOR COMMANDS
   ============================================================ */

function stopAll() {
  if (!ready) return;

  IN1.write(0); IN2.write(0);
  IN3.write(0); IN4.write(0);
  ENA.write(0); ENB.write(0);
}

function forward() {
  if (!ready) return;
  ENA.write(1); ENB.write(1);
  IN1.write(1); IN2.write(0);
  IN3.write(1); IN4.write(0);
}

function backward() {
  if (!ready) return;
  ENA.write(1); ENB.write(1);
  IN1.write(0); IN2.write(1);
  IN3.write(0); IN4.write(1);
}

function left() {
  if (!ready) return;
  ENA.write(1); ENB.write(1);
  IN1.write(0); IN2.write(1);
  IN3.write(1); IN4.write(0);
}

function right() {
  if (!ready) return;
  ENA.write(1); ENB.write(1);
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
   SAFETY SHUTDOWN
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

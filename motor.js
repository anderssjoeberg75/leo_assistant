/*
  motor.js
  --------
  L298N motor control + light
  Full-speed only (NO PWM)
  Compatible with minimal pigpio-client
*/

const pigpio = require('pigpio-client');

const pi = pigpio.pigpio({
  host: '127.0.0.1',
  port: 8887
});

let IN1, IN2, IN3, IN4, ENA, ENB, LIGHT;
let ready = false;

pi.on('connected', () => {
  IN1 = pi.gpio(5);
  IN2 = pi.gpio(12);
  IN3 = pi.gpio(16);
  IN4 = pi.gpio(20);

  ENA = pi.gpio(18); // Enable Motor A
  ENB = pi.gpio(13); // Enable Motor B

  LIGHT = pi.gpio(27);

  [IN1, IN2, IN3, IN4, ENA, ENB, LIGHT].forEach(p =>
      p.modeSet('output')
  );

  stopAll();
  lightOff();

  ready = true;
  console.log('pigpio connected, full-speed mode ready');
});

/* ---------- MOTORS ---------- */

function stopAll() {
  if (!ready) return;

  IN1.write(0);
  IN2.write(0);
  IN3.write(0);
  IN4.write(0);

  ENA.write(0);
  ENB.write(0);
}

function forward() {
  if (!ready) return;

  ENA.write(1);
  ENB.write(1);

  IN1.write(1); IN2.write(0);
  IN3.write(1); IN4.write(0);
}

function backward() {
  if (!ready) return;

  ENA.write(1);
  ENB.write(1);

  IN1.write(0); IN2.write(1);
  IN3.write(0); IN4.write(1);
}

function left() {
  if (!ready) return;

  ENA.write(1);
  ENB.write(1);

  IN1.write(0); IN2.write(1);
  IN3.write(1); IN4.write(0);
}

function right() {
  if (!ready) return;

  ENA.write(1);
  ENB.write(1);

  IN1.write(1); IN2.write(0);
  IN3.write(0); IN4.write(1);
}

/* ---------- LIGHT ---------- */

function lightOn() {
  if (ready) LIGHT.write(1);
}

function lightOff() {
  if (ready) LIGHT.write(0);
}

/* ---------- SAFETY ---------- */

process.on('SIGINT', () => {
  stopAll();
  lightOff();
});

process.on('SIGTERM', () => {
  stopAll();
  lightOff();
});

module.exports = {
  forward,
  backward,
  left,
  right,
  stopAll,
  lightOn,
  lightOff
};

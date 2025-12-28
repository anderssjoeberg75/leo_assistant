/**
 * motor.js
 * Native pigpio implementation (NO pigpiod)
 */

const { Gpio } = require('pigpio');

console.log('pigpio initialised');

/* =========================
   MOTOR GPIO
   ========================= */

const IN1 = new Gpio(5,  { mode: Gpio.OUTPUT });
const IN2 = new Gpio(6,  { mode: Gpio.OUTPUT });
const IN3 = new Gpio(13, { mode: Gpio.OUTPUT });
const IN4 = new Gpio(19, { mode: Gpio.OUTPUT });

function stopAll() {
  IN1.digitalWrite(0);
  IN2.digitalWrite(0);
  IN3.digitalWrite(0);
  IN4.digitalWrite(0);
}

function forward() {
  IN1.digitalWrite(1); IN2.digitalWrite(0);
  IN3.digitalWrite(1); IN4.digitalWrite(0);
}

function backward() {
  IN1.digitalWrite(0); IN2.digitalWrite(1);
  IN3.digitalWrite(0); IN4.digitalWrite(1);
}

function left() {
  IN1.digitalWrite(0); IN2.digitalWrite(1);
  IN3.digitalWrite(1); IN4.digitalWrite(0);
}

function right() {
  IN1.digitalWrite(1); IN2.digitalWrite(0);
  IN3.digitalWrite(0); IN4.digitalWrite(1);
}

/* =========================
   DISTANCE (DISABLED)
   ========================= */

async function getDistance() {
  return null;
}

module.exports = {
  forward,
  backward,
  left,
  right,
  stopAll,
  getDistance
};

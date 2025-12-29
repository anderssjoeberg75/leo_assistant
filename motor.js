/*
  FILE: motor.js
  PURPOSE:
  Motor control using L298N with PWM speed control (native pigpio).

  DESIGN:
  - ENA / ENB use real PWM via pigpio
  - IN1–IN4 control direction only
  - PWM reapplied live when speed changes
*/

const { Gpio } = require('pigpio');

/* ============================================================
   GPIO HANDLES
   ============================================================ */

const ENA = new Gpio(18, { mode: Gpio.OUTPUT });
const ENB = new Gpio(13, { mode: Gpio.OUTPUT });

const IN1 = new Gpio(5,  { mode: Gpio.OUTPUT });
const IN2 = new Gpio(12, { mode: Gpio.OUTPUT });
const IN3 = new Gpio(16, { mode: Gpio.OUTPUT });
const IN4 = new Gpio(20, { mode: Gpio.OUTPUT });

const LIGHT = new Gpio(27, { mode: Gpio.OUTPUT });

/* ============================================================
   STATE
   ============================================================ */

// PWM range 0–255
let pwmValue = 128; // ≈ 50%

// Track whether motors are currently active
let motorsActive = false;

/* ============================================================
   INITIALIZATION
   ============================================================ */

stopAll();
LIGHT.digitalWrite(0);

console.log('Motor controller ready (native pigpio PWM)');

/* ============================================================
   SPEED CONTROL
   ============================================================ */

function setSpeed(percent) {
  if (percent < 0) percent = 0;
  if (percent > 100) percent = 100;

  pwmValue = Math.round((percent / 100) * 255);

  // 🔑 Re-apply PWM immediately if motors are running
  if (motorsActive) {
    ENA.pwmWrite(pwmValue);
    ENB.pwmWrite(pwmValue);
  }

  console.log(`PWM speed set to ${percent}% (${pwmValue}/255)`);
}

/* ============================================================
   INTERNAL HELPERS
   ============================================================ */

function applyPwm() {
  ENA.pwmWrite(pwmValue);
  ENB.pwmWrite(pwmValue);
}

/* ============================================================
   MOTOR CONTROL
   ============================================================ */

function stopAll() {
  motorsActive = false;

  IN1.digitalWrite(0); IN2.digitalWrite(0);
  IN3.digitalWrite(0); IN4.digitalWrite(0);

  ENA.pwmWrite(0);
  ENB.pwmWrite(0);
}

function forward() {
  motorsActive = true;

  IN1.digitalWrite(1); IN2.digitalWrite(0);
  IN3.digitalWrite(1); IN4.digitalWrite(0);

  applyPwm();
}

function backward() {
  motorsActive = true;

  IN1.digitalWrite(0); IN2.digitalWrite(1);
  IN3.digitalWrite(0); IN4.digitalWrite(1);

  applyPwm();
}

function left() {
  motorsActive = true;

  IN1.digitalWrite(0); IN2.digitalWrite(1);
  IN3.digitalWrite(1); IN4.digitalWrite(0);

  applyPwm();
}

function right() {
  motorsActive = true;

  IN1.digitalWrite(1); IN2.digitalWrite(0);
  IN3.digitalWrite(0); IN4.digitalWrite(1);

  applyPwm();
}

/* ============================================================
   LIGHT CONTROL
   ============================================================ */

function lightOn() {
  LIGHT.digitalWrite(1);
}

function lightOff() {
  LIGHT.digitalWrite(0);
}

/* ============================================================
   EXPORTS
   ============================================================ */

module.exports = {
  forward,
  backward,
  left,
  right,
  stopAll,
  setSpeed,
  lightOn,
  lightOff
};

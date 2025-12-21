const { Gpio } = require('pigpio');

const IN1 = new Gpio(23, { mode: Gpio.OUTPUT });
const IN2 = new Gpio(24, { mode: Gpio.OUTPUT });
const ENA = new Gpio(18, { mode: Gpio.OUTPUT });

const IN3 = new Gpio(27, { mode: Gpio.OUTPUT });
const IN4 = new Gpio(22, { mode: Gpio.OUTPUT });
const ENB = new Gpio(19, { mode: Gpio.OUTPUT });

ENA.pwmFrequency(1000);
ENB.pwmFrequency(1000);
ENA.pwmWrite(0);
ENB.pwmWrite(0);

let currentLeft = 0;
let currentRight = 0;
let targetLeft = 0;
let targetRight = 0;

const RAMP_STEP = 5;
const RAMP_INTERVAL = 20;
const MAX_PWM = 200;

function clampPWM(v) {
  return Math.max(0, Math.min(255, Math.round(v || 0)));
}

setInterval(() => {
  currentLeft += Math.sign(targetLeft - currentLeft) *
    Math.min(Math.abs(targetLeft - currentLeft), RAMP_STEP);

  currentRight += Math.sign(targetRight - currentRight) *
    Math.min(Math.abs(targetRight - currentRight), RAMP_STEP);

  ENA.pwmWrite(clampPWM(currentLeft));
  ENB.pwmWrite(clampPWM(currentRight));
}, RAMP_INTERVAL);

function stop() {
  targetLeft = 0;
  targetRight = 0;
}

function setTank(speed, steering) {
  let left = Math.max(-1, Math.min(1, speed + steering));
  let right = Math.max(-1, Math.min(1, speed - steering));

  IN1.digitalWrite(left >= 0 ? 1 : 0);
  IN2.digitalWrite(left >= 0 ? 0 : 1);
  IN3.digitalWrite(right >= 0 ? 1 : 0);
  IN4.digitalWrite(right >= 0 ? 0 : 1);

  targetLeft = Math.abs(left) * MAX_PWM;
  targetRight = Math.abs(right) * MAX_PWM;
}

module.exports = { setTank, stop };

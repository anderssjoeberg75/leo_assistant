const { Gpio } = require('pigpio');

const IN1 = new Gpio(23, { mode: Gpio.OUTPUT });
const IN2 = new Gpio(24, { mode: Gpio.OUTPUT });
const ENA = new Gpio(18, { mode: Gpio.OUTPUT });

const IN3 = new Gpio(27, { mode: Gpio.OUTPUT });
const IN4 = new Gpio(22, { mode: Gpio.OUTPUT });
const ENB = new Gpio(19, { mode: Gpio.OUTPUT });

ENA.pwmFrequency(1000);
ENB.pwmFrequency(1000);

function stop() {
  ENA.pwmWrite(0);
  ENB.pwmWrite(0);
}

function setTank(speed, steering) {
  const left = Math.max(-1, Math.min(1, speed + steering));
  const right = Math.max(-1, Math.min(1, speed - steering));

  IN1.digitalWrite(left >= 0);
  IN2.digitalWrite(left < 0);
  IN3.digitalWrite(right >= 0);
  IN4.digitalWrite(right < 0);

  ENA.pwmWrite(Math.abs(left) * 200);
  ENB.pwmWrite(Math.abs(right) * 200);
}

module.exports = { setTank, stop };

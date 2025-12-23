const { Gpio } = require('pigpio');

// GPIO 19 – LED PWM
const LED = new Gpio(19, { mode: Gpio.OUTPUT });

LED.pwmFrequency(800); // LED-friendly frequency

function setLed(value) {
    const pwm = Math.max(0, Math.min(1, value)) * 255;
    LED.pwmWrite(Math.round(pwm));
}

function off() {
    LED.pwmWrite(0);
}

module.exports = { setLed, off };

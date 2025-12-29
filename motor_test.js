/*
  FILE: motor_test.js
  PURPOSE:
  Absolute minimal motor test.
  - No server
  - No exports
  - No state
  - Proves pin mapping and pigpio-client operation
*/

const pigpio = require('pigpio-client');

const pi = pigpio.pigpio({
    host: '127.0.0.1',
    port: 8887
});

pi.on('connected', () => {
    console.log('pigpio connected');

    const ENA = pi.gpio(18);
    const ENB = pi.gpio(13);

    const IN1 = pi.gpio(5);
    const IN2 = pi.gpio(12);
    const IN3 = pi.gpio(16);
    const IN4 = pi.gpio(20);

    [ENA, ENB, IN1, IN2, IN3, IN4].forEach(p =>
        p.modeSet('output')
    );

    console.log('Enabling motors');
    ENA.write(1);
    ENB.write(1);

    console.log('Driving forward');
    IN1.write(1); IN2.write(0);
    IN3.write(1); IN4.write(0);

    // Stop after 5 seconds
    setTimeout(() => {
        console.log('Stopping');
        IN1.write(0); IN2.write(0);
        IN3.write(0); IN4.write(0);
    }, 5000);
});

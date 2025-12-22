const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const motor = require('./motor');
const { exec, execSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const i2c = require('i2c-bus');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let failsafeTimer;

/* ================= FAILSAFE ================= */
function resetFailsafe() {
  clearTimeout(failsafeTimer);
  failsafeTimer = setTimeout(() => motor.stop(), 1000);
}

app.use(express.static('public'));

/* ================= SYSTEM ACTIONS ================= */
app.post('/restart', (req, res) => {
  res.sendStatus(200);
  setTimeout(() => exec('systemctl restart jarvis', () => {}), 500);
});

app.post('/reboot', (req, res) => {
  res.sendStatus(200);
  setTimeout(() => exec('reboot', () => {}), 500);
});

/* ================= ADS1115 SETUP ================= */
const ADS1115_ADDR = 0x48;
const ADS_CONFIG = 0x01;
const ADS_CONVERT = 0x00;

/*
  Voltage divider ratio:
  Example: 100k + 20k → ratio = (100 + 20) / 20 = 6
  ADJUST THIS TO MATCH YOUR HARDWARE
*/
const VOLTAGE_DIVIDER_RATIO = 6.0;

// Open I2C bus
let i2cBus;
try {
  i2cBus = i2c.openSync(1);
} catch {
  i2cBus = null;
}

/* Read battery voltage from ADS1115 AIN0 */
function readBatteryVoltageADS() {
  if (!i2cBus) return 'N/A';

  try {
    // Configure ADS1115:
    // AIN0 single-ended, ±4.096V, single-shot, 128 SPS
    const config =
      0x8000 | // Start conversion
      0x4000 | // AIN0
      0x0200 | // ±4.096V
      0x0100 | // Single-shot
      0x0080 | // 128 SPS
      0x0003;  // Disable comparator

    const buf = Buffer.alloc(2);
    buf.writeUInt16BE(config);
    i2cBus.writeI2cBlockSync(ADS1115_ADDR, ADS_CONFIG, 2, buf);

    // Wait for conversion
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 9);

    // Read result
    i2cBus.readI2cBlockSync(ADS1115_ADDR, ADS_CONVERT, 2, buf);
    const raw = buf.readInt16BE();

    // ADS1115 LSB = 125µV at ±4.096V
    const voltage = raw * 0.000125 * VOLTAGE_DIVIDER_RATIO;
    return voltage.toFixed(2);
  } catch {
    return 'N/A';
  }
}

/* ================= STATS ENDPOINT ================= */
app.get('/stats', (req, res) => {
  const load = os.loadavg()[0];
  const cpuCount = os.cpus().length;
  const cpu = Math.min(100, Math.round((load / cpuCount) * 100));

  const ram = Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100);

  let temp = 'N/A';
  try {
    temp = (fs.readFileSync('/sys/class/thermal/thermal_zone0/temp') / 1000).toFixed(1);
  } catch {}

  let disk = 'N/A';
  try {
    disk = parseInt(execSync("df / | tail -1 | awk '{print $5}'").toString(), 10);
  } catch {}

  const battery = readBatteryVoltageADS();

  res.json({ cpu, ram, temp, disk, battery });
});

/* ================= SOCKET.IO ================= */
io.on('connection', socket => {
  resetFailsafe();

  socket.on('drive', data => {
    resetFailsafe();
    motor.setTank(data.speed, data.steering);
  });

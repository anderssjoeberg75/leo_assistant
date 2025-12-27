/*
  camera_stream.js
  ----------------
  MJPEG camera streaming service for Raspberry Pi.
  Provides:
  - Live MJPEG stream
  - Snapshot capture
  - Start/stop video recording
  - Disk and WiFi safety watchdogs
  - Fast systemd shutdown handling
*/

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');

/* ============================================================
   CONFIGURATION
   ============================================================ */

const PORT = 8888;
const BOUNDARY = '--frame';
const MIN_FREE_MB = 300;

/* ============================================================
   RUNTIME STATE
   ============================================================ */

let clients = [];
let lastFrame = null;
let recordProcess = null;
let camProcess = null;
let server = null;

/* ============================================================
   HTTP SERVER
   ============================================================ */

server = http.createServer((req, res) => {

    /* Snapshot endpoint */
    if (req.url === '/snapshot') {
        if (!lastFrame) {
            res.writeHead(500);
            return res.end('NO_FRAME');
        }

        const file = `/opt/jarvis/snapshot/snap_${Date.now()}.jpg`;
        fs.writeFileSync(file, lastFrame);

        res.writeHead(200);
        return res.end('OK');
    }

    /* Start recording */
    if (req.url === '/rec/start') {
        startRecording();
        res.writeHead(200);
        return res.end('OK');
    }

    /* Stop recording */
    if (req.url === '/rec/stop') {
        stopRecording();
        res.writeHead(200);
        return res.end('OK');
    }

    /* MJPEG stream */
    res.writeHead(200, {
        'Cache-Control': 'no-cache',
        'Connection': 'close',
        'Content-Type': `multipart/x-mixed-replace; boundary=${BOUNDARY}`
    });

    clients.push(res);

    req.on('close', () => {
        clients = clients.filter(c => c !== res);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`MJPEG stream listening on :${PORT}`);
});

/* ============================================================
   CAMERA PROCESS (rpicam-vid)
   ============================================================ */

camProcess = spawn('/usr/bin/rpicam-vid', [
    '--codec', 'mjpeg',
    '--width', '640',
    '--height', '360',
    '--framerate', '25',
    '--quality', '75',
    '--inline',
    '--flush',
    '--hflip',
    '--vflip',
    '--timeout', '0',
    '--nopreview',
    '--output', '-'
]);

/* ============================================================
   FRAME PARSING
   ============================================================ */

let buffer = Buffer.alloc(0);

camProcess.stdout.on('data', chunk => {
    buffer = Buffer.concat([buffer, chunk]);

    while (true) {
        const start = buffer.indexOf(Buffer.from([0xff, 0xd8]));
        const end = buffer.indexOf(Buffer.from([0xff, 0xd9]), start + 2);
        if (start === -1 || end === -1) break;

        const frame = buffer.slice(start, end + 2);
        buffer = buffer.slice(end + 2);

        lastFrame = frame;

        for (const c of clients) {
            c.write(
                `${BOUNDARY}\r\nContent-Type: image/jpeg\r\nContent-Length: ${frame.length}\r\n\r\n`
            );
            c.write(frame);
            c.write('\r\n');
        }
    }
});

/* ============================================================
   RECORDING CONTROL
   ============================================================ */

function startRecording() {
    if (recordProcess) return;
    if (getFreeDiskMB() < MIN_FREE_MB) return;

    const file = `/opt/jarvis/recording/rec_${Date.now()}.mp4`;

    recordProcess = spawn('ffmpeg', [
        '-y',
        '-f', 'mjpeg',
        '-i', 'http://127.0.0.1:8888',
        '-vcodec', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-preset', 'veryfast',
        file
    ], { stdio: 'ignore' });

    recordProcess.on('exit', () => {
        recordProcess = null;
    });
}

function stopRecording() {
    if (recordProcess) {
        recordProcess.kill('SIGINT');
        recordProcess = null;
    }
}

/* ============================================================
   SAFETY WATCHDOGS
   ============================================================ */

function getFreeDiskMB() {
    try {
        const stat = fs.statfsSync('/opt/jarvis/recording');
        return Math.round((stat.bavail * stat.bsize) / 1024 / 1024);
    } catch {
        return 0;
    }
}

setInterval(() => {
    if (recordProcess && getFreeDiskMB() < MIN_FREE_MB) {
        stopRecording();
    }
}, 5000);

setInterval(() => {
    const wlan = os.networkInterfaces().wlan0;
    if (recordProcess && (!wlan || wlan.length === 0)) {
        stopRecording();
    }
}, 3000);

/* ============================================================
   GRACEFUL SHUTDOWN (SYSTEMD FIX)
   ============================================================ */

function shutdown() {
    console.log('Camera service shutting down');

    // Stop recording if active
    stopRecording();

    // Kill camera process
    if (camProcess) {
        camProcess.kill('SIGTERM');
        camProcess = null;
    }

    // Close all MJPEG client connections
    for (const c of clients) {
        try { c.end(); } catch {}
    }
    clients = [];

    // Close HTTP server
    if (server) {
        server.close(() => {
            process.exit(0);
        });
    }

    // Failsafe exit
    setTimeout(() => {
        process.exit(1);
    }, 3000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

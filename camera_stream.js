/*
  FILE: camera_stream.js
  PURPOSE:
  Optimized MJPEG camera streaming for Leo.
  Keeps browser compatibility while significantly reducing CPU usage.
*/

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

/* ============================================================
   CONFIGURATION
   ============================================================ */

const PORT = 8888;
const BOUNDARY = '--frame';

// Tuned for low CPU on Raspberry Pi 3B
const WIDTH = 480;
const HEIGHT = 270;
const FRAMERATE = 20;
const QUALITY = 60;

/* ============================================================
   RUNTIME STATE
   ============================================================ */

let clients = [];
let lastFrame = null;
let server = null;
let camProcess = null;

/* ============================================================
   FPS STATE
   ============================================================ */

let frameCounter = 0;
let currentFps = 0;
let lastFpsTime = Date.now();

/* ============================================================
   HTTP SERVER
   ============================================================ */

server = http.createServer((req, res) => {

    /* === FPS ENDPOINT (USED BY GUI) === */
    if (req.url === '/fps') {
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache'
        });
        return res.end(JSON.stringify({ fps: currentFps }));
    }

    /* === MJPEG STREAM === */
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
    console.log(`MJPEG stream listening on port ${PORT}`);
});

/* ============================================================
   CAMERA PROCESS (MJPEG, CPU-OPTIMIZED)
   ============================================================ */

camProcess = spawn('/usr/bin/rpicam-vid', [
    '--codec', 'mjpeg',
    '--width', String(WIDTH),
    '--height', String(HEIGHT),
    '--framerate', String(FRAMERATE),
    '--quality', String(QUALITY),
    '--inline',
    '--flush',
    '--timeout', '0',
    '--nopreview',
    '--output', '-'
]);

/* ============================================================
   FRAME PARSING + FPS
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

        frameCounter++;
        const now = Date.now();
        const elapsed = now - lastFpsTime;

        // FPS update every 2 seconds (lower CPU)
        if (elapsed >= 2000) {
            currentFps = Math.round((frameCounter * 1000) / elapsed);
            frameCounter = 0;
            lastFpsTime = now;
        }

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
   SHUTDOWN HANDLING
   ============================================================ */

function shutdown() {
    if (camProcess) camProcess.kill('SIGTERM');
    for (const c of clients) try { c.end(); } catch {}
    if (server) server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 3000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

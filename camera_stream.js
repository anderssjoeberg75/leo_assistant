/*
  FILE: camera_stream.js

  PURPOSE:
  - Provide MJPEG camera streaming for Leo
  - Broadcast frames to all connected HTTP clients
  - Expose FPS endpoint for GUI overlay

  OPTIMIZATION 1.1 (APPLIED):
  - When NO clients are connected:
      * Do NOT parse MJPEG frames
      * Do NOT calculate FPS
      * Do NOT broadcast data
  - Camera process continues running (safe)
  - Reduces CPU and memory usage when idle
*/

const http = require('http');
const { spawn } = require('child_process');

/* ============================================================
   CONFIGURATION
   ============================================================ */

const PORT = 8888;
const BOUNDARY = '--frame';

/* Camera tuning for Raspberry Pi */
const WIDTH = 480;
const HEIGHT = 270;
const FRAMERATE = 20;
const QUALITY = 60;

/* ============================================================
   RUNTIME STATE
   ============================================================ */

/* Connected MJPEG clients (HTTP responses) */
let clients = [];

/* HTTP server instance */
let server = null;

/* rpicam-vid process */
let camProcess = null;

/* ============================================================
   FPS STATE
   ============================================================ */

/* Frame counter for FPS calculation */
let frameCounter = 0;
let currentFps = 0;
let lastFpsTime = Date.now();

/* ============================================================
   HTTP SERVER
   ============================================================ */

server = http.createServer((req, res) => {

    /* ============================================================
       FPS ENDPOINT
       PURPOSE:
       - Used by GUI to display real camera FPS
       ============================================================ */
    if (req.url === '/fps') {
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
        });
        return res.end(JSON.stringify({ fps: currentFps }));
    }

    /* ============================================================
       MJPEG STREAM ENDPOINT
       PURPOSE:
       - Add client to broadcast list
       - Send multipart MJPEG stream
       ============================================================ */
    res.writeHead(200, {
        'Cache-Control': 'no-cache',
        'Connection': 'close',
        'Content-Type': `multipart/x-mixed-replace; boundary=${BOUNDARY}`
    });

    clients.push(res);

    /* Remove client on disconnect */
    req.on('close', () => {
        clients = clients.filter(c => c !== res);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`MJPEG stream listening on port ${PORT}`);
});

/* ============================================================
   CAMERA PROCESS (MJPEG OUTPUT)
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
   MJPEG FRAME PARSING
   ============================================================ */

/*
  Buffer holding partial MJPEG data.
  Frames are identified by JPEG SOI/EOI markers.
*/
let buffer = Buffer.alloc(0);

camProcess.stdout.on('data', chunk => {

    /* ============================================================
       OPTIMIZATION 1.1:
       If no clients are connected, skip ALL processing.
       ============================================================ */
    if (clients.length === 0) {
        buffer = Buffer.alloc(0);   // Drop buffered data immediately
        frameCounter = 0;           // Reset FPS counters
        lastFpsTime = Date.now();
        return;
    }

    /* Append new camera data */
    buffer = Buffer.concat([buffer, chunk]);

    /* Attempt to extract complete JPEG frames */
    while (true) {
        const start = buffer.indexOf(Buffer.from([0xff, 0xd8]));
        const end   = buffer.indexOf(Buffer.from([0xff, 0xd9]), start + 2);

        if (start === -1 || end === -1) break;

        const frame = buffer.slice(start, end + 2);
        buffer = buffer.slice(end + 2);

        /* ============================================================
           FPS CALCULATION
           ============================================================ */
        frameCounter++;
        const now = Date.now();
        const elapsed = now - lastFpsTime;

        if (elapsed >= 2000) {
            currentFps = Math.round((frameCounter * 1000) / elapsed);
            frameCounter = 0;
            lastFpsTime = now;
        }

        /* ============================================================
           BROADCAST FRAME TO ALL CLIENTS
           ============================================================ */
        for (const c of clients) {
            c.write(
                `${BOUNDARY}\r\n` +
                `Content-Type: image/jpeg\r\n` +
                `Content-Length: ${frame.length}\r\n\r\n`
            );
            c.write(frame);
            c.write('\r\n');
        }
    }
});

/* ============================================================
   CLEAN SHUTDOWN
   ============================================================ */

function shutdown() {
    if (camProcess) camProcess.kill('SIGTERM');
    for (const c of clients) {
        try { c.end(); } catch {}
    }
    if (server) server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 3000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

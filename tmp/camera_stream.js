/*
  MJPEG Camera Stream
  + Snapshot
  + Recording
  + MJPEG → MP4
  + Disk protection
  + HTTP control API
*/

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const url = require('url');

const STREAM_PORT = 8888;
const CTRL_PORT   = 8890;
const BOUNDARY = '--frame';

const SNAP_DIR = '/opt/jarvis/snapshots';
const REC_DIR  = '/opt/jarvis/recordings';
const FPS_FILE = '/tmp/leo_camera_fps';
const REC_STATE_FILE = '/tmp/leo_recording_state';

fs.mkdirSync(SNAP_DIR, { recursive: true });
fs.mkdirSync(REC_DIR,  { recursive: true });
fs.writeFileSync(FPS_FILE, '0');
fs.writeFileSync(REC_STATE_FILE, '0');

let clients = [];
let lastFrame = null;

/* ---------- RECORDING STATE ---------- */
let recording = false;
let recordStream = null;
let currentRecFile = null;

/* ---------- FPS ---------- */
let frameCount = 0;
let lastFpsTime = Date.now();

/* ---------- STREAM SERVER ---------- */
const streamServer = http.createServer((req, res) => {
    res.writeHead(200, {
        'Cache-Control': 'no-cache',
        'Connection': 'close',
        'Content-Type': `multipart/x-mixed-replace; boundary=${BOUNDARY}`
    });
    clients.push(res);
    req.on('close', () => clients = clients.filter(c => c !== res));
});

streamServer.listen(STREAM_PORT, '0.0.0.0');

/* ---------- CAMERA ---------- */
const cam = spawn('/usr/bin/rpicam-vid', [
    '--codec', 'mjpeg',
    '--width', '640',
    '--height', '480',
    '--framerate', '30',
    '--timeout', '0',
    '--nopreview',
    '--vflip',
    '--output', '-'
]);

let buffer = Buffer.alloc(0);

cam.stdout.on('data', chunk => {
    buffer = Buffer.concat([buffer, chunk]);

    while (true) {
        const start = buffer.indexOf(Buffer.from([0xff, 0xd8]));
        const end   = buffer.indexOf(Buffer.from([0xff, 0xd9]), start + 2);
        if (start === -1 || end === -1) break;

        const frame = buffer.slice(start, end + 2);
        buffer = buffer.slice(end + 2);
        lastFrame = frame;

        frameCount++;
        const now = Date.now();
        if (now - lastFpsTime >= 1000) {
            fs.writeFileSync(FPS_FILE, String(frameCount));
            frameCount = 0;
            lastFpsTime = now;
        }

        if (recording && recordStream) {
            recordStream.write(frame);
        }

        for (const c of clients) {
            c.write(`${BOUNDARY}\r\nContent-Type: image/jpeg\r\nContent-Length: ${frame.length}\r\n\r\n`);
            c.write(frame);
            c.write('\r\n');
        }
    }
});

/* ---------- SNAPSHOT ---------- */
function takeSnapshot() {
    if (!lastFrame) return false;
    const file = path.join(SNAP_DIR, `${Date.now()}.jpg`);
    fs.writeFileSync(file, lastFrame);
    return true;
}

/* ---------- RECORDING ---------- */
function startRecording() {
    if (recording) return;
    currentRecFile = path.join(REC_DIR, `${Date.now()}.mjpg`);
    recordStream = fs.createWriteStream(currentRecFile);
    recording = true;
    fs.writeFileSync(REC_STATE_FILE, '1');
}

function stopRecording() {
    if (!recording) return;
    recordStream.end();
    recording = false;
    fs.writeFileSync(REC_STATE_FILE, '0');

    const mp4 = currentRecFile.replace('.mjpg', '.mp4');
    spawn('ffmpeg', [
        '-y', '-f', 'mjpeg', '-i', currentRecFile,
        '-movflags', '+faststart',
        '-pix_fmt', 'yuv420p',
        mp4
    ]).on('exit', () => fs.unlinkSync(currentRecFile));
}

/* ---------- CONTROL SERVER ---------- */
const ctrlServer = http.createServer((req, res) => {
    const p = url.parse(req.url).pathname;

    if (p === '/snapshot') {
        takeSnapshot();
        res.end('OK');
        return;
    }
    if (p === '/record/start') {
        startRecording();
        res.end('OK');
        return;
    }
    if (p === '/record/stop') {
        stopRecording();
        res.end('OK');
        return;
    }

    res.statusCode = 404;
    res.end('Not found');
});

ctrlServer.listen(CTRL_PORT, '127.0.0.1');

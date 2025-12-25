/*
  MJPEG Camera Stream
  -------------------
  Compatible with Raspberry Pi Zero (ARMv6)
*/

const http = require('http');
const { spawn } = require('child_process');

const PORT = 8888;
const BOUNDARY = '--frame';

let clients = [];

/* ---------- HTTP SERVER ---------- */
const server = http.createServer((req, res) => {
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

/* ---------- CAMERA PROCESS (LEGACY STACK) ---------- */
const cam = spawn('/usr/bin/rpicam-vid', [
    '--codec', 'mjpeg',
    '--width', '480',        // optimized for Pi Zero
    '--height', '360',
    '--framerate', '20',
    '--timeout', '0',
    '--nopreview',
    '--output', '-'
]);

let buffer = Buffer.alloc(0);

/* ---------- FRAME PARSING ---------- */
cam.stdout.on('data', chunk => {
    buffer = Buffer.concat([buffer, chunk]);

    while (true) {
        const start = buffer.indexOf(Buffer.from([0xff, 0xd8])); // JPEG SOI
        const end = buffer.indexOf(Buffer.from([0xff, 0xd9]), start + 2); // JPEG EOI
        if (start === -1 || end === -1) break;

        const frame = buffer.slice(start, end + 2);
        buffer = buffer.slice(end + 2);

        for (const client of clients) {
            client.write(
                `${BOUNDARY}\r\n` +
                `Content-Type: image/jpeg\r\n` +
                `Content-Length: ${frame.length}\r\n\r\n`
            );
            client.write(frame);
            client.write('\r\n');
        }
    }
});

cam.stderr.on('data', d => {
    console.error('[CAMERA]', d.toString());
});

cam.on('exit', code => {
    console.error('Camera exited with code', code);
});

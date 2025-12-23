const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const motor = require('./motor');
const led = require('./led');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static('public'));

// ================= SOCKET.IO =================

io.on('connection', socket => {
  console.log('Client connected');

  socket.on('drive', ({ speed, steering }) => {
    motor.setTank(speed, steering);
  });

  socket.on('led', ({ value }) => {
    led.setLed(value);
  });

  socket.on('disconnect', () => {
    motor.stop();
    led.off();
  });
});

// ================= AI (UNCHANGED) =================

const OLLAMA_HOST = '192.168.107.169';
const OLLAMA_PORT = 11434;
const MODEL = 'gemma2:2b';

function askOllama(prompt) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: MODEL,
      prompt,
      stream: false
    });

    const req = http.request(
        {
          hostname: OLLAMA_HOST,
          port: OLLAMA_PORT,
          path: '/api/generate',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          }
        },
        res => {
          let body = '';
          res.on('data', d => body += d);
          res.on('end', () => {
            try {
              resolve(JSON.parse(body).response || 'No answer.');
            } catch {
              reject();
            }
          });
        }
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

app.post('/ai/command', async (req, res) => {
  if (!req.body.prompt) {
    return res.json({ message: 'Please ask something.' });
  }

  try {
    const answer = await askOllama(req.body.prompt);
    res.json({ message: answer });
  } catch {
    res.json({ message: 'Leo is having trouble answering.' });
  }
});

// ================= START =================

server.listen(3000, () => {
  console.log('Leo server running');
});

const express = require('express');
const http = require('http');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const OLLAMA_HOST = '192.168.107.169';
const OLLAMA_PORT = 11434;
const MODEL = 'gemma2:2b';

function askOllama(prompt, timeoutMs = 15000) {
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
              const parsed = JSON.parse(body);
              resolve(parsed.response || 'No answer.');
            } catch {
              reject(new Error('Invalid Ollama response'));
            }
          });
        }
    );

    req.on('error', reject);
    req.write(payload);
    req.end();

    setTimeout(() => {
      req.destroy();
      reject(new Error('Ollama timeout'));
    }, timeoutMs);
  });
}

app.post('/ai/command', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || !prompt.trim()) {
    return res.json({ message: 'Please ask something.' });
  }

  try {
    const answer = await askOllama(prompt);
    return res.json({ message: answer });
  } catch (err) {
    return res.json({
      message: 'Leo is having trouble answering right now.'
    });
  }
});

app.listen(3000, () => {
  console.log('Leo AI server running (stable mode)');
});
             
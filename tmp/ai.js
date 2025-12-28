const http = require('http');

const OLLAMA_HOST = '192.168.107.169';
const OLLAMA_PORT = 11434;
const MODEL = 'gemma2:2b';

function chat(prompt) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            model: MODEL,
            prompt,
            stream: true
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
                let buffer = '';
                let answered = false;

                res.on('data', chunk => {
                    const lines = chunk.toString().split('\n').filter(Boolean);

                    for (const line of lines) {
                        try {
                            const json = JSON.parse(line);

                            if (json.response) {
                                buffer += json.response;

                                // ✅ RESPOND AS SOON AS WE HAVE TEXT
                                if (!answered && buffer.trim().length > 20) {
                                    answered = true;
                                    req.destroy();      // stop Ollama stream
                                    return resolve(buffer.trim());
                                }
                            }

                            if (json.done && !answered) {
                                answered = true;
                                return resolve(buffer.trim());
                            }
                        } catch {
                            // ignore partial JSON
                        }
                    }
                });

                res.on('error', reject);
            }
        );

        req.on('error', reject);
        req.write(payload);
        req.end();

        // ⏱️ HARD SAFETY TIMEOUT
        setTimeout(() => {
            try { req.destroy(); } catch {}
            reject(new Error('AI_TIMEOUT'));
        }, 8000);
    });
}

module.exports = { chat };

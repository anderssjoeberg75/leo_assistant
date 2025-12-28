/*
  FILE: ai.js
  PURPOSE:
  This file is part of the Leo robot system.
  The code below is unchanged in behavior.
  Additional comments explain what each section does.
*/

/*
  ai.js
  -----
  Backend AI integration using Ollama.
  Responsible only for sending prompts to the LLM
  and returning generated text responses.
*/

const http = require('http');

/* ============================================================
   OLLAMA CONFIGURATION
   - Connection details for the Ollama instance
   - Model selection
   ============================================================ */

const OLLAMA_HOST = '192.168.107.135'; // Ollama server IP
const OLLAMA_PORT = 11434;             // Default Ollama API port
const MODEL = 'gemma2:2b';             // LLM model to use

/* ============================================================
   AI REQUEST FUNCTION
   - Sends a prompt to Ollama
   - Returns the generated response as a Promise
   ============================================================ */

function ask(prompt, options = {}) {
    return new Promise((resolve, reject) => {

        /* Build request payload for Ollama API */
        const payload = JSON.stringify({
            model: MODEL,
            prompt: prompt,
            stream: false,
            options: options
        });

        /* Create HTTP request to Ollama */
        const req = http.request(
            {
                host: OLLAMA_HOST,
                port: OLLAMA_PORT,
                path: '/api/generate',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload)
                }
            },

            /* Handle response from Ollama */
            res => {
                let data = '';

                /* Collect response data */
                res.on('data', chunk => {
                    data += chunk;
                });

                /* Parse and return final response */
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        resolve(json.response);
                    } catch (err) {
                        reject(err);
                    }
                });
            }
        );

        /* Handle connection or network errors */
        req.on('error', err => {
            reject(err);
        });

        /* Send request payload */
        req.write(payload);
        req.end();
    });
}

/* ============================================================
   MODULE EXPORTS
   - Public API used by server.js
   ============================================================ */

module.exports = {
    ask
};

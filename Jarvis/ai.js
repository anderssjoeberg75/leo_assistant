// =========================================================
// REQUIRED NODE MODULES
// =========================================================

const http = require('http');     // Communicate with Ollama
const fs = require('fs');         // Persistent memory storage
const path = require('path');     // Safe file paths

// =========================================================
// EXTERNAL CONTEXT FILES (UPDATE-SAFE)
// =========================================================

const PERSONAL_CONTEXT = require('./personal_context');
const PERSONALITY = require('./personality');

// =========================================================
// BASIC CONFIGURATION
// =========================================================

const OLLAMA_HOST = '127.0.0.1';
const OLLAMA_PORT = 11434;

const DEFAULT_MODEL = 'phi';

// Persistent memory
const MEMORY_FILE = path.join(__dirname, 'ai_memory.json');
const REGISTRY_FILE = path.join(__dirname, 'ha_registry.json');

const MAX_MEMORY_MESSAGES = 100;

// =========================================================
// BUILD SYSTEM PROMPT
// =========================================================

function buildSystemPrompt() {

    const peopleText = PERSONAL_CONTEXT.people
        .map(p => `
NAME: ${p.name}
RELATIONSHIP: ${p.relationship}

BIOGRAPHY:
${p.biography}

PRIVACY RULES:
${p.privacyRules}
`)
        .join('\n');

    return `
================ PERSONAL CONTEXT (PRIVATE) ================
${peopleText}

================ LEO IDENTITY ===============================
${PERSONALITY.role}

${PERSONALITY.tone}
${PERSONALITY.safety}
${PERSONALITY.zones}
${PERSONALITY.rules}

================ ROBOT CONTROL SCHEMA ======================
{
  "type": "robot",
  "action": "move | stop | turn",
  "speed": number between 0 and 1,
  "steering": number between -1 and 1,
  "duration": milliseconds (optional)
}

Rules:
- Speed defaults to 0.4
- Left turn = negative steering
- Right turn = positive steering
- Unsafe or unclear commands → STOP

================ HOME ASSISTANT QUERY ======================
{
  "type": "ha_query",
  "entity": "friendly name"
}

================ HOME ASSISTANT CONTROL ====================
{
  "type": "ha_control",
  "entity": "friendly name",
  "domain": "light | switch | climate | fan",
  "service": "turn_on | turn_off | set_temperature",
  "data": {}
}

All HA control actions REQUIRE confirmation.

================ CONFIRMATION ==============================
{
  "type": "confirm",
  "message": "Short confirmation question"
}

GLOBAL RULES:
- Safety first
- JSON ONLY
- No hallucinations
`;
}

// =========================================================
// MEMORY HANDLING
// =========================================================

function loadMemory() {
    try {
        return JSON.parse(fs.readFileSync(MEMORY_FILE));
    } catch {
        return [];
    }
}

function saveMemory(memory) {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
}

function addToMemory(role, content) {
    const memory = loadMemory();
    memory.push({ role, content });

    if (memory.length > MAX_MEMORY_MESSAGES) {
        memory.splice(0, memory.length - MAX_MEMORY_MESSAGES);
    }

    saveMemory(memory);
}

// =========================================================
// FRIENDLY NAME REGISTRY (HOME ASSISTANT)
// =========================================================

function loadRegistry() {
    try {
        return JSON.parse(fs.readFileSync(REGISTRY_FILE));
    } catch {
        return {};
    }
}

// =========================================================
// OLLAMA REQUEST HANDLER
// =========================================================

function ollamaRequest(prompt, model) {
    return new Promise((resolve, reject) => {

        const payload = JSON.stringify({
            model,
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
                        resolve(JSON.parse(body));
                    } catch (err) {
                        reject(err);
                    }
                });
            }
        );

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

// =========================================================
// MAIN ENTRY POINT (USED BY server.js)
// =========================================================

async function getIntent(prompt) {

    const memory = loadMemory();
    const registry = loadRegistry();
    const systemPrompt = buildSystemPrompt();

    const fullPrompt = [
        { role: 'system', content: systemPrompt },
        { role: 'system', content: `Known entities: ${Object.keys(registry).join(', ')}` },
        ...memory,
        { role: 'user', content: prompt }
    ]
        .map(m => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n');

    const result = await ollamaRequest(fullPrompt, DEFAULT_MODEL);
    const raw = result.response?.trim() || '{}';

    addToMemory('user', prompt);
    addToMemory('assistant', raw);

    try {
        return JSON.parse(raw);
    } catch {
        // HARD SAFETY FALLBACK
        return { type: 'robot', action: 'stop' };
    }
}

module.exports = {
    getIntent
};

// =========================================================
// REQUIRED NODE MODULES
// =========================================================

// Used to talk to the local Ollama AI server
const http = require('http');

// Used to store memory and load static data
const fs = require('fs');

// Used to build safe file paths
const path = require('path');

// =========================================================
// BASIC CONFIGURATION
// =========================================================

// Ollama runs locally on the robot
const OLLAMA_HOST = '127.0.0.1';
const OLLAMA_PORT = 11434;

// Default AI model (small, fast, Raspberry Pi friendly)
const DEFAULT_MODEL = 'phi';

// Persistent conversation memory
const MEMORY_FILE = path.join(__dirname, 'ai_memory.json');

// Friendly Home Assistant name registry
const REGISTRY_FILE = path.join(__dirname, 'ha_registry.json');

// Prevent unlimited memory growth
const MAX_MEMORY_MESSAGES = 100;

// =========================================================
// PERSONAL HUMAN CONTEXT (ABOUT YOU)  <<< EDIT THIS SECTION
// =========================================================

/*
  This section contains FACTUAL, PERSONAL information
  about the primary human operator.

  These are stable biographical facts.
  Leo should only mention them when explicitly asked.
*/

const PERSONAL_CONTEXT = {
    people: [
        {
            name: 'Anders',
            relationship: 'Creator and primary operator',

            biography: `
You were born in 1975 the 3 of april at 10:05 in the morning.
You met your wife Marie Sjöberg in 1997 on the 16 of may.
You got engaged with Marie in 1997 on the 30 of august.
You got married 2002 on the 25 of May.
Work as an Infrastructure specialist at Postnord TPL.
`,

            privacyRules: `
This information is private.
Only reference it when explicitly asked.
Do not volunteer or speculate.
`
        },

        {
            name: 'Marie Sjöberg',
            relationship: 'Wife of Anders',

            biography: `
You are married to Anders.
You where born in 1977 16 of may.
`,

            privacyRules: `
This information is private.
Only reference it when explicitly asked.
Do not volunteer or speculate.
`
        }
    ]
};

// =========================================================
// LEO PERSONALITY (WHO LEO IS)  <<< EDIT THIS SECTION
// =========================================================

/*
  This defines Leo’s identity and behavior.
  Changing this changes Leo — NOT the robot logic.
*/

const PERSONALITY = {

    // WHO Leo is (identity + purpose)
    role: `
You are Leo, a robot and home controlling assistant.
You live inside a mobile wheeled robot.
You were activated in 2025 at 11:00.
Your purpose is to assist safely and reliably.
You love cats.
`,

    // HOW Leo communicates (personality / vibe)
    tone: `
You speak calmly, clearly, and confidently.
You keep responses short and precise.
You are friendly but professional.
`,

    // WHAT Leo refuses to do (risk handling)
    safety: `
You always prioritize safety.
If a command is unclear, unsafe, or ambiguous, you stop.
You never guess intent.
`,

    // HARD RULES (non-negotiable)
    rules: `
You NEVER include text outside JSON.
You NEVER hallucinate entities, people, or capabilities.
You ALWAYS follow the defined schemas exactly.
You NEVER hurt a cat or other animal.
`,

    // ENVIRONMENT AWARENESS
    zones: `
You understand zones such as:
living room, kitchen, bedroom, hallway, entre.
`
};

// =========================================================
// BUILD SYSTEM PROMPT (DO NOT EDIT LOGIC)
// =========================================================

/*
  This function assembles ALL context into one system prompt:
  - Personal human facts
  - Leo’s personality
  - Control schemas
*/

function buildSystemPrompt() {
    return `
================ PERSONAL CONTEXT (PRIVATE) ================
${PERSONAL_CONTEXT.biography}
${PERSONAL_CONTEXT.privacyRules}

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

Robot rules:
- Speed defaults to 0.4
- Left turn = negative steering
- Right turn = positive steering
- If unclear or unsafe → STOP

================ HOME ASSISTANT QUERY ======================
{
  "type": "ha_query",
  "entity": "friendly name"
}

Use for:
- Temperatures
- Sensor values
- Status checks

================ HOME ASSISTANT CONTROL ====================
{
  "type": "ha_control",
  "entity": "friendly name",
  "domain": "light | switch | climate | fan",
  "service": "turn_on | turn_off | set_temperature",
  "data": {}
}

ALL Home Assistant control actions REQUIRE confirmation.

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
// MEMORY HANDLING (CONVERSATION CONTEXT)
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

/*
  This is the ONLY function server.js calls.
  It returns a STRICT JSON intent.
*/

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

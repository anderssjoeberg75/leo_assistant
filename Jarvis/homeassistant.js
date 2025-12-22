// HTTPS is required because Home Assistant is accessed without a port
const https = require('https');

/* =========================================================
   HOME ASSISTANT CONFIGURATION
   ========================================================= */

const HA_HOST = 'home.andrix.local';

// Long-Lived Access Token from Home Assistant
const HA_TOKEN = 'PASTE_LONG_LIVED_ACCESS_TOKEN_HERE';

// Safety switch: if true, NO state changes are allowed
const READ_ONLY_MODE = false;

/* =========================================================
   INTERNAL REQUEST FUNCTION
   ========================================================= */

function haRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;

        const req = https.request(
            {
                hostname: HA_HOST,
                path,
                method,
                headers: {
                    'Authorization': `Bearer ${HA_TOKEN}`,
                    'Content-Type': 'application/json',
                    'Content-Length': data ? Buffer.byteLength(data) : 0
                }
            },
            res => {
                let response = '';
                res.on('data', d => response += d);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(response));
                    } catch {
                        resolve(response);
                    }
                });
            }
        );

        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

/* =========================================================
   PUBLIC HOME ASSISTANT API
   ========================================================= */

// Fetch ALL entities (discovery)
async function getAllStates() {
    return haRequest('GET', '/api/states');
}

// Fetch one entity
async function getState(entityId) {
    return haRequest('GET', `/api/states/${entityId}`);
}

// Call service (blocked if read-only)
async function callService(domain, service, data) {
    if (READ_ONLY_MODE) {
        throw new Error('Home Assistant is in READ-ONLY mode');
    }

    return haRequest(
        'POST',
        `/api/services/${domain}/${service}`,
        data
    );
}

module.exports = {
    getAllStates,
    getState,
    callService
};

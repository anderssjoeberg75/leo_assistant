const https = require('https');

const HA_HOST = 'home.andrix.local';
const HA_TOKEN = 'PASTE_LONG_LIVED_ACCESS_TOKEN_HERE';

function haRequest(method, path, body) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;

        const req = https.request({
            hostname: HA_HOST,
            path,
            method,
            headers: {
                Authorization: `Bearer ${HA_TOKEN}`,
                'Content-Type': 'application/json',
                'Content-Length': data ? Buffer.byteLength(data) : 0
            }
        }, res => {
            let out = '';
            res.on('data', d => out += d);
            res.on('end', () => resolve(JSON.parse(out)));
        });

        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

module.exports = {
    getState: id => haRequest('GET', `/api/states/${id}`),
    callService: (d, s, data) =>
        haRequest('POST', `/api/services/${d}/${s}`, data)
};

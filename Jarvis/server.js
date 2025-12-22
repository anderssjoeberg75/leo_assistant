const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const motor = require('./motor');
const ai = require('./ai');
const ha = require('./homeassistant');
const registry = require('./ha_registry.json');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Parse JSON bodies
app.use(express.json());
app.use(express.static('public'));

// Store pending HA action awaiting confirmation
let pendingHAAction = null;

/* =========================================================
   AI → ROBOT / HOME ASSISTANT ENDPOINT
   ========================================================= */

app.post('/ai/command', async (req, res) => {
  try {
    const { prompt, confirm } = req.body;

    // Handle confirmation
    if (confirm && pendingHAAction) {
      const action = pendingHAAction;
      pendingHAAction = null;

      await ha.callService(
          action.domain,
          action.service,
          { entity_id: action.entity_id, ...action.data }
      );

      return res.json({ status: 'executed' });
    }

    // Get AI intent
    const intent = await ai.getIntent(prompt);

    /* ---------------- ROBOT CONTROL ---------------- */
    if (intent.type === 'robot') {
      if (intent.action === 'stop') {
        motor.stop();
        return res.json({ status: 'robot stopped' });
      }

      motor.setTank(
          Math.max(0, Math.min(1, intent.speed ?? 0.4)),
          Math.max(-1, Math.min(1, intent.steering ?? 0))
      );

      if (intent.duration) {
        setTimeout(() => motor.stop(), Math.min(intent.duration, 5000));
      }

      return res.json({ status: 'robot command executed' });
    }

    /* ---------------- HOME ASSISTANT QUERY ---------------- */
    if (intent.type === 'ha_query') {
      const entityId = registry[intent.entity];
      if (!entityId) {
        return res.json({ error: 'Unknown entity' });
      }

      const state = await ha.getState(entityId);
      return res.json({ result: state });
    }

    /* ---------------- HOME ASSISTANT CONTROL ---------------- */
    if (intent.type === 'ha_control') {
      const entityId = registry[intent.entity];
      if (!entityId) {
        return res.json({ error: 'Unknown entity' });
      }

      pendingHAAction = {
        domain: intent.domain,
        service: intent.service,
        entity_id: entityId,
        data: intent.data || {}
      };

      return res.json({
        confirm: true,
        message: `Do you want me to ${intent.service.replace('_', ' ')} ${intent.entity}?`
      });
    }

    res.json({ status: 'no action' });
  } catch (err) {
    motor.stop(); // safety fallback
    res.status(500).json({ error: err.message });
  }
});

/* =========================================================
   MANUAL ROBOT CONTROL (UI OVERRIDE)
   ========================================================= */

io.on('connection', socket => {
  socket.on('drive', d => {
    motor.setTank(d.speed, d.steering);
  });

  socket.on('disconnect', () => motor.stop());
});

/* =========================================================
   START SERVER
   ========================================================= */

server.listen(3000, () => {
  console.log('Leo robot + Home Assistant control running');
});

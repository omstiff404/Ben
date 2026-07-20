/**
 * BENIMARU — Local/VPS Proxy Server (Node.js + Express)
 * ---------------------------------------------------------
 * Server ini menyimpan API key Groq di config.js (server-side),
 * jadi tidak pernah terkirim ke browser pengunjung.
 *
 * CARA PAKAI:
 * 1. Install Node.js (v18 ke atas) dari https://nodejs.org kalau belum ada.
 * 2. Buka folder ini di terminal, jalankan:  npm install
 * 3. Edit file config.js, isi GROQ_API_KEY dengan key asli kamu.
 * 4. Jalankan:  npm start
 * 5. Buka http://localhost:3000 di browser -> Benimaru langsung jalan.
 *
 * KALAU MAU PUBLIK (bukan cuma di komputer sendiri):
 * Jalankan kode ini di server/VPS yang punya IP publik atau domain
 * (mis. lewat pm2 / systemd biar tetap nyala), lalu pengunjung akses
 * lewat domain/IP server itu — bukan localhost. localhost cuma bisa
 * diakses dari komputer yang menjalankannya sendiri.
 */

const express = require('express');
const path = require('path');
const config = require('./config.js');

const app = express();
app.use(express.json());

// Sajikan file index.html + folder asset langsung dari server ini
app.use(express.static(path.join(__dirname)));

// Batasi request sederhana per-IP (pengurang risiko spam ke API key kamu)
const hits = new Map(); // ip -> [timestamps]
const RATE_LIMIT = config.RATE_LIMIT_PER_MINUTE || 15;

function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60_000;
  const arr = (hits.get(ip) || []).filter(t => now - t < windowMs);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > RATE_LIMIT;
}

const ALLOWED_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'deepseek-r1-distill-llama-70b',
  'gemma2-9b-it'
];

app.post('/api/chat', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Terlalu banyak permintaan, coba lagi sebentar.' });
  }

  if (!config.GROQ_API_KEY || config.GROQ_API_KEY.includes('GANTI')) {
    return res.status(500).json({ error: 'GROQ_API_KEY belum diisi di config.js' });
  }

  const body = req.body || {};
  const model = ALLOWED_MODELS.includes(body.model) ? body.model : 'llama-3.3-70b-versatile';
  const temperature = typeof body.temperature === 'number' ? Math.min(Math.max(body.temperature, 0), 1.5) : 0.7;
  const messages = Array.isArray(body.messages) ? body.messages.slice(-40) : [];

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + config.GROQ_API_KEY
      },
      body: JSON.stringify({ model, temperature, stream: true, messages })
    });

    res.status(groqRes.status);
    res.setHeader('Content-Type', 'text/event-stream');
    // Teruskan stream SSE dari Groq langsung ke browser
    for await (const chunk of groqRes.body) {
      res.write(chunk);
    }
    res.end();
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghubungi Groq: ' + err.message });
  }
});

const PORT = config.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ Benimaru proxy jalan di http://localhost:${PORT}`);
});

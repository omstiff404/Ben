// Isi API key Groq kamu di sini secara manual.
// File ini hanya dibaca oleh server (Node.js), TIDAK pernah dikirim ke browser pengunjung.
// Dapatkan API key gratis di https://console.groq.com

module.exports = {
  GROQ_API_KEY: 'GANTI-DENGAN-API-KEY-GROQ-KAMU',
  PORT: 3000,
  RATE_LIMIT_PER_MINUTE: 15 // maksimal request per IP per menit, ubah sesuai kebutuhan
};

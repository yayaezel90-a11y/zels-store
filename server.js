const http = require('http');
const fs = require('fs');
const path = require('path');

loadEnvFile();

const PORT = process.env.PORT || 3000;
const DEFAULT_MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
const PUBLIC_DIR = path.join(__dirname, 'public');
const modelCatalog = {
  'flash-lite': { provider: 'gemini-3.1-flash-lite', label: 'Flash Lite', minPlan: 'free' },
  balanced: { provider: DEFAULT_MODEL_NAME, label: 'Balanced', minPlan: 'free' },
  'creative-pro': { provider: DEFAULT_MODEL_NAME, label: 'Creative Pro', minPlan: 'pro' },
  'code-pro': { provider: DEFAULT_MODEL_NAME, label: 'Code Pro', minPlan: 'pro' },
  'reasoning-pro': { provider: DEFAULT_MODEL_NAME, label: 'Reasoning Pro', minPlan: 'pro' },
  promax: { provider: DEFAULT_MODEL_NAME, label: 'Pro Max', minPlan: 'promax' }
};
const planRank = { free: 0, pro: 1, promax: 2 };
const personaPrompts = {
  general: 'asisten general yang seimbang',
  coder: 'senior software engineer yang detail, aman, dan memberi kode siap pakai',
  marketer: 'digital marketer yang fokus conversion, positioning, dan funnel',
  teacher: 'guru sabar yang menjelaskan bertahap dengan analogi sederhana',
  researcher: 'research analyst yang kritis, rapi, dan membedakan fakta vs asumsi',
  business: 'business coach yang fokus strategi, monetisasi, dan eksekusi'
};
const baseInstruction = 'Kamu adalah Alfarez AI, asisten AI online berbahasa Indonesia yang ramah, canggih, cepat, dan membantu. Jawab jelas, terstruktur, aman, praktis, dan terasa seperti produk AI premium.';

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/i);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(payload));
}

function fallbackAnswer(message, options = {}) {
  const plan = normalizePlan(options.plan);
  const model = pickModel(options.model, plan);
  const persona = personaPrompts[options.persona] || personaPrompts.general;
  return [
    `Halo! Saya Alfarez AI mode demo lokal (${model.label} / ${plan.toUpperCase()}).`,
    '',
    `Persona aktif: ${persona}.`,
    `Pesan kamu: "${String(message || '').trim()}"`,
    '',
    'Agar benar-benar online dan menjawab memakai AI Gemini, isi GEMINI_API_KEY di .env lalu jalankan npm start.',
    'Fitur UI seperti model picker, Pro, Pro Max, prompt enhancer, export chat, voice input, dan AI tools tetap bisa dicoba di mode demo.'
  ].join('\n');
}

function normalizePlan(plan) {
  return ['free', 'pro', 'promax'].includes(plan) ? plan : 'free';
}

function pickModel(modelKey, plan) {
  const requested = modelCatalog[modelKey] ? modelKey : 'balanced';
  const model = modelCatalog[requested];
  return planRank[plan] >= planRank[model.minPlan] ? model : modelCatalog.balanced;
}

function buildInstruction(persona, modelKey) {
  const personaText = personaPrompts[persona] || personaPrompts.general;
  const mode = modelCatalog[modelKey]?.label || 'Balanced';
  return `${baseInstruction} Bertindak sebagai ${personaText}. Mode model: ${mode}. Selalu berikan jawaban dengan struktur yang enak dibaca, insight cerdas, contoh konkret, dan langkah lanjut jika relevan.`;
}

function createGoalPilot(goal = '', horizon = '7 hari') {
  const cleaned = String(goal).trim().slice(0, 280) || 'mencapai target utama';
  const words = cleaned.toLowerCase();
  const domain = words.match(/app|web|coding|kode|software|website/) ? 'produk digital' : words.match(/jualan|bisnis|brand|konten|marketing/) ? 'bisnis & marketing' : words.match(/belajar|skill|ujian|kursus/) ? 'belajar & skill' : 'produktif umum';
  const verbs = domain === 'produk digital'
    ? ['Validasi fitur inti', 'Buat prototype', 'Uji ke 3 pengguna', 'Rapikan deploy']
    : domain === 'bisnis & marketing'
      ? ['Tentukan niche', 'Buat penawaran', 'Rilis konten uji', 'Follow up prospek']
      : domain === 'belajar & skill'
        ? ['Petakan materi', 'Latihan terarah', 'Buat rangkuman', 'Tes pemahaman']
        : ['Pecah target', 'Kerjakan prioritas', 'Review hasil', 'Kunci kebiasaan'];
  const tasks = verbs.map((title, index) => ({
    id: `task-${index + 1}`,
    title,
    detail: `${title} untuk tujuan: ${cleaned}.`,
    minutes: [25, 45, 35, 30][index],
    done: false
  }));
  const risks = [
    'Target terlalu besar tanpa batas waktu yang jelas.',
    'Terlalu lama merencanakan tanpa rilis versi kecil.',
    'Tidak ada metrik untuk membuktikan kemajuan.'
  ];
  const metrics = domain === 'produk digital'
    ? ['1 prototype bisa dicoba', '3 feedback pengguna', '1 URL deploy aktif']
    : domain === 'bisnis & marketing'
      ? ['10 prospek valid', '3 konten uji', '1 penawaran jelas']
      : ['4 sesi fokus selesai', '1 rangkuman final', '1 tes evaluasi'];
  return {
    goal: cleaned,
    horizon,
    domain,
    score: Math.min(98, 62 + cleaned.length % 27 + tasks.length),
    headline: `GoalPilot membuat rencana eksekusi ${horizon} untuk ${domain}.`,
    tasks,
    risks,
    metrics,
    nextPrompt: `Bantu saya mengeksekusi rencana ini langkah demi langkah: ${cleaned}`,
    generatedAt: new Date().toISOString()
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; if (data.length > 1_000_000) req.destroy(); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function askGemini(message, history = [], options = {}) {
  const plan = normalizePlan(options.plan);
  const model = pickModel(options.model, plan);
  const modelKey = Object.keys(modelCatalog).find(key => modelCatalog[key] === model) || 'balanced';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model.provider}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const contents = [
    ...history.slice(-12).map(item => ({ role: item.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(item.content || '') }] })),
    { role: 'user', parts: [{ text: message }] }
  ];
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: buildInstruction(options.persona, modelKey) }] }, contents, generationConfig: { temperature: Number(options.temperature) || 0.65 } })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Gemini API error');
  return { reply: data.candidates?.[0]?.content?.parts?.map(part => part.text).join('\n') || 'Maaf, belum ada jawaban.', model: model.label, plan: plan.toUpperCase() };
}

async function handleApi(req, res) {
  if (req.method === 'GET' && req.url === '/api/health') {
    return sendJson(res, 200, { ok: true, app: 'Alfarez AI', defaultModel: DEFAULT_MODEL_NAME, models: Object.keys(modelCatalog), plans: Object.keys(planRank), uniqueFeatures: ['goalpilot'], online: Boolean(process.env.GEMINI_API_KEY) });
  }
  if (req.method === 'POST' && req.url === '/api/goalpilot') {
    try {
      const body = JSON.parse(await readBody(req) || '{}');
      return sendJson(res, 200, { ok: true, plan: createGoalPilot(body.goal, body.horizon) });
    } catch (error) {
      return sendJson(res, 500, { error: 'GoalPilot gagal membuat rencana.', detail: error.message });
    }
  }
  if (req.method === 'POST' && req.url === '/api/chat') {
    try {
      const body = JSON.parse(await readBody(req) || '{}');
      if (!body.message || typeof body.message !== 'string') return sendJson(res, 400, { error: 'Message wajib diisi.' });
      const plan = normalizePlan(body.plan);
      const model = pickModel(body.model, plan);
      if (!process.env.GEMINI_API_KEY) return sendJson(res, 200, { reply: fallbackAnswer(body.message, body), offline: true, model: model.label, plan: plan.toUpperCase() });
      const answer = await askGemini(body.message, body.history || [], body);
      return sendJson(res, 200, { ...answer, offline: false });
    } catch (error) {
      return sendJson(res, 500, { error: 'AI sedang sibuk. Coba lagi sebentar.', detail: error.message });
    }
  }
  return false;
}

function serveStatic(req, res) {
  const safePath = path.normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^\.\.(\/|\\|$)/, '');
  let filePath = path.join(PUBLIC_DIR, safePath === '/' ? 'index.html' : safePath);
  if (!filePath.startsWith(PUBLIC_DIR)) filePath = path.join(PUBLIC_DIR, 'index.html');
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) filePath = path.join(PUBLIC_DIR, 'index.html');
  const ext = path.extname(filePath);
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8' };
  res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

const app = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'OPTIONS') return sendJson(res, 204, {});
  if (req.url.startsWith('/api/')) {
    const handled = await handleApi(req, res);
    if (handled === false) return sendJson(res, 404, { error: 'Endpoint tidak ditemukan.' });
    return;
  }
  serveStatic(req, res);
});

if (require.main === module) app.listen(PORT, () => console.log(`Alfarez AI berjalan di http://localhost:${PORT}`));

module.exports = app;

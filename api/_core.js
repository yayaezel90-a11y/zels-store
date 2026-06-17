const DEFAULT_MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
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
    'Agar benar-benar online dan menjawab memakai AI Gemini, isi GEMINI_API_KEY di environment variables.',
    'Fitur UI seperti model picker, Pro, Pro Max, prompt enhancer, export chat, voice input, dan GoalPilot tetap bisa dicoba di mode demo.'
  ].join('\n');
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
  const tasks = verbs.map((title, index) => ({ id: `task-${index + 1}`, title, detail: `${title} untuk tujuan: ${cleaned}.`, minutes: [25, 45, 35, 30][index], done: false }));
  const metrics = domain === 'produk digital' ? ['1 prototype bisa dicoba', '3 feedback pengguna', '1 URL deploy aktif'] : domain === 'bisnis & marketing' ? ['10 prospek valid', '3 konten uji', '1 penawaran jelas'] : ['4 sesi fokus selesai', '1 rangkuman final', '1 tes evaluasi'];
  return { goal: cleaned, horizon, domain, score: Math.min(98, 62 + cleaned.length % 27 + tasks.length), headline: `GoalPilot membuat rencana eksekusi ${horizon} untuk ${domain}.`, tasks, risks: ['Target terlalu besar tanpa batas waktu yang jelas.', 'Terlalu lama merencanakan tanpa rilis versi kecil.', 'Tidak ada metrik untuk membuktikan kemajuan.'], metrics, nextPrompt: `Bantu saya mengeksekusi rencana ini langkah demi langkah: ${cleaned}`, generatedAt: new Date().toISOString() };
}

async function askGemini(message, history = [], options = {}) {
  const plan = normalizePlan(options.plan);
  const model = pickModel(options.model, plan);
  const modelKey = Object.keys(modelCatalog).find((key) => modelCatalog[key] === model) || 'balanced';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model.provider}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const contents = [
    ...history.slice(-12).map((item) => ({ role: item.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(item.content || '') }] })),
    { role: 'user', parts: [{ text: message }] }
  ];
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ systemInstruction: { parts: [{ text: buildInstruction(options.persona, modelKey) }] }, contents, generationConfig: { temperature: Number(options.temperature) || 0.65 } }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Gemini API error');
  return { reply: data.candidates?.[0]?.content?.parts?.map((part) => part.text).join('\n') || 'Maaf, belum ada jawaban.', model: model.label, plan: plan.toUpperCase() };
}

module.exports = { DEFAULT_MODEL_NAME, modelCatalog, planRank, normalizePlan, pickModel, fallbackAnswer, createGoalPilot, askGemini };

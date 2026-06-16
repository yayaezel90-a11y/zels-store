const { normalizePlan, pickModel, fallbackAnswer, askGemini } = require('./_core');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const body = req.body || {};
    if (!body.message || typeof body.message !== 'string') return res.status(400).json({ error: 'Message wajib diisi.' });
    const plan = normalizePlan(body.plan);
    const model = pickModel(body.model, plan);
    if (!process.env.GEMINI_API_KEY) return res.status(200).json({ reply: fallbackAnswer(body.message, body), offline: true, model: model.label, plan: plan.toUpperCase() });
    const answer = await askGemini(body.message, body.history || [], body);
    return res.status(200).json({ ...answer, offline: false });
  } catch (error) {
    return res.status(500).json({ error: 'AI sedang sibuk. Coba lagi sebentar.', detail: error.message });
  }
};

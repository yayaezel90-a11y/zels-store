const { DEFAULT_MODEL_NAME, modelCatalog, planRank } = require('./_core');

module.exports = (_req, res) => {
  res.status(200).json({ ok: true, app: 'Alfarez AI', defaultModel: DEFAULT_MODEL_NAME, models: Object.keys(modelCatalog), plans: Object.keys(planRank), uniqueFeatures: ['goalpilot'], online: Boolean(process.env.GEMINI_API_KEY), platform: 'vercel' });
};

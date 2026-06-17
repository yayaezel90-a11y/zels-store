const { createGoalPilot } = require('./_core');

module.exports = (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  return res.status(200).json({ ok: true, plan: createGoalPilot(req.body?.goal, req.body?.horizon) });
};

const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server');

test('GET /api/health returns Alfarez AI status and model catalog', async () => {
  app.listen(0);
  try {
    const { port } = app.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/health`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.app, 'Alfarez AI');
    assert.ok(body.models.includes('promax'));
    assert.ok(body.plans.includes('pro'));
  } finally {
    app.close();
  }
});

test('POST /api/chat returns offline fallback with selected plan metadata', async () => {
  app.listen(0);
  try {
    const { port } = app.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Halo', plan: 'promax', model: 'promax', persona: 'coder' })
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.offline, true);
    assert.equal(body.model, 'Pro Max');
    assert.equal(body.plan, 'PROMAX');
  } finally {
    app.close();
  }
});


test('POST /api/goalpilot creates an actionable execution board without an API key', async () => {
  app.listen(0);
  try {
    const { port } = app.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/goalpilot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal: 'deploy website AI dan dapat 100 user pertama', horizon: '7 hari' })
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.plan.domain, 'produk digital');
    assert.equal(body.plan.tasks.length, 4);
    assert.ok(body.plan.metrics.includes('1 URL deploy aktif'));
  } finally {
    app.close();
  }
});

test('Vercel health function returns the same model catalog', async () => {
  const health = require('../api/health');
  const response = await new Promise((resolve) => {
    health({}, { status: (statusCode) => ({ json: (body) => resolve({ statusCode, body }) }) });
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.app, 'Alfarez AI');
  assert.equal(response.body.platform, 'vercel');
  assert.ok(response.body.models.includes('balanced'));
});

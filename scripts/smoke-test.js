const assert = require('node:assert/strict');
const app = require('../server');

async function main() {
  app.listen(0);
  const { port } = app.address();
  const base = `http://127.0.0.1:${port}`;
  try {
    for (const route of ['/', '/styles.css', '/app.js', '/api/health']) {
      const response = await fetch(base + route);
      assert.equal(response.status, 200, `${route} should return 200`);
    }

    const health = await fetch(base + '/api/health').then((response) => response.json());
    assert.equal(health.ok, true);
    assert.ok(health.uniqueFeatures.includes('goalpilot'));

    const goalPilot = await fetch(base + '/api/goalpilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal: 'deploy web AI dan dapat 100 user pertama', horizon: '7 hari' })
    }).then((response) => response.json());
    assert.equal(goalPilot.ok, true);
    assert.equal(goalPilot.plan.tasks.length, 4);

    console.log('Smoke test passed: static assets, health, and GoalPilot are ready.');
  } finally {
    app.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    app.close();
    process.exit(1);
  });
}

module.exports = main;

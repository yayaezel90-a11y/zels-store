const { spawnSync } = require('node:child_process');

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) process.exit(result.status || 1);
}

async function main() {
  console.log('Running pre-deploy checks...');
  run('npm', ['run', 'check']);

  const hookUrl = process.env.RENDER_DEPLOY_HOOK_URL;
  if (!hookUrl) {
    console.log('\nPre-deploy checks passed.');
    console.log('Set RENDER_DEPLOY_HOOK_URL to trigger a real Render deploy from this command.');
    console.log('Example: RENDER_DEPLOY_HOOK_URL=https://api.render.com/deploy/srv_xxx?key=yyy npm run deploy:render');
    return;
  }

  console.log('\nTriggering Render deploy hook...');
  const response = await fetch(hookUrl, { method: 'POST' });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Render deploy hook failed (${response.status}): ${text}`);
  }
  console.log('Render deploy triggered successfully.');
  if (text) console.log(text);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

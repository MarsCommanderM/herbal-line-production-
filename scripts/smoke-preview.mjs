import { spawn } from 'node:child_process';

const port = 4173;
const origin = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  stdio: 'ignore',
  windowsHide: true,
});
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForServer() {
  let lastError;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (server.exitCode !== null) throw new Error('Vite preview exited early with code ' + server.exitCode);
    try {
      const response = await fetch(origin);
      if (response.ok) return response;
      lastError = new Error('Preview returned HTTP ' + response.status);
    } catch (error) { lastError = error; }
    await sleep(250);
  }
  throw new Error('Preview did not become ready: ' + String(lastError));
}

try {
  const response = await waitForServer();
  const html = await response.text();
  for (const id of ['save-game', 'load-game', 'export-game', 'import-game', 'game-actions', 'game-feedback']) {
    if (!html.includes('id="' + id + '"')) throw new Error('Production HTML is missing #' + id);
  }
  const scriptPath = html.match(/<script[^>]+src="([^"]+)"/)?.[1];
  if (!scriptPath) throw new Error('Production HTML has no module script.');
  const scriptResponse = await fetch(new URL(scriptPath, origin));
  if (!scriptResponse.ok) throw new Error('Production module returned HTTP ' + scriptResponse.status);
  const script = await scriptResponse.text();
  if (!script.includes('Autosave gespeichert')) throw new Error('Production bundle is missing autosave code.');
  const cssPath = html.match(/<link[^>]+href="([^"]+\.css)"/)?.[1];
  if (!cssPath) throw new Error('Production HTML has no CSS asset.');
  const cssResponse = await fetch(new URL(cssPath, origin));
  if (!cssResponse.ok) throw new Error('Production stylesheet returned HTTP ' + cssResponse.status);
  if (!(await cssResponse.text()).includes('#save-status')) throw new Error('Production CSS is missing save status styles.');
  console.log('PREVIEW SMOKE: PASS (production HTML, JavaScript, persistence controls and CSS served with HTTP 200)');
} catch (error) {
  console.error('PREVIEW SMOKE: FAIL');
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
} finally {
  server.kill('SIGTERM');
}

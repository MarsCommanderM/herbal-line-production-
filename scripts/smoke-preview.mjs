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
    } catch (error) {
      lastError = error;
    }
    await sleep(250);
  }
  throw new Error('Preview did not become ready: ' + String(lastError));
}

try {
  const pageResponse = await waitForServer();
  const html = await pageResponse.text();
  for (const id of ['save-campaign', 'load-campaign', 'export-campaign', 'import-campaign', 'game-actions', 'game-feedback']) {
    if (!html.includes('id="' + id + '"')) throw new Error('Production HTML is missing #' + id);
  }
  const scriptPath = html.match(/<script[^>]+src="([^"]+)"/)?.[1];
  if (!scriptPath) throw new Error('Production HTML has no module script.');
  const scriptResponse = await fetch(new URL(scriptPath, origin));
  if (!scriptResponse.ok) throw new Error('Production module returned HTTP ' + scriptResponse.status);
  const script = await scriptResponse.text();
  for (const marker of ['herbal-line-saves', 'Autosave wiederhergestellt', 'Spielstandexport gestartet']) {
    if (!script.includes(marker)) throw new Error('Production bundle is missing persistence marker: ' + marker);
  }
  const cssPath = html.match(/<link[^>]+href="([^"]+\.css)"/)?.[1];
  if (!cssPath) throw new Error('Production HTML has no CSS asset.');
  const cssResponse = await fetch(new URL(cssPath, origin));
  if (!cssResponse.ok) throw new Error('Production stylesheet returned HTTP ' + cssResponse.status);
  const css = await cssResponse.text();
  if (!css.includes('.save-controls')) throw new Error('Production CSS is missing save control styles.');
  console.log('PREVIEW SMOKE: PASS (HTML, JS bundle, save controls, CSS all served with HTTP 200)');
} catch (error) {
  console.error('PREVIEW SMOKE: FAIL');
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
} finally {
  server.kill('SIGTERM');
}

/**
 * Real-browser smoke test using the Chrome DevTools Protocol (CDP).
 *
 * No new dependency: launches the already-installed Chrome in headless mode
 * with a temp profile, connects over the WebSocket that Node 24 provides
 * natively, drives the real Elunè frontend (http://127.0.0.1:5173) against the
 * real backend, and reports what actually rendered.
 *
 * Usage (from frontend/):  node tests/browser-smoke.mjs
 * Requires the dev servers to be running already.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';

const FRONTEND = process.env.ELUNE_URL || 'http://127.0.0.1:5173';
const EMAIL = process.env.ELUNE_EMAIL || 'demo@elune.read';
const PASSWORD = process.env.ELUNE_PASSWORD || 'password123';
const BOOK_ID = process.env.ELUNE_BOOK_ID || 'cmvey7pr3000eawvczwoswom2'; // "Sejarah Rahasia Kuno" (text-based)

const CHROME_PATHS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];
const chromePath = CHROME_PATHS.find((p) => existsSync(p));
if (!chromePath) { console.error('NO_BROWSER'); process.exit(3); }

const results = [];
const record = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); };

const getJson = (port, path) => new Promise((resolve, reject) => {
  http.get({ host: '127.0.0.1', port, path }, (res) => {
    let d = ''; res.on('data', (c) => (d += c)); res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
  }).on('error', reject);
});

const userDir = mkdtempSync(join(tmpdir(), 'elune-cdp-'));
const port = 9222 + Math.floor(Math.random() * 500);
const chrome = spawn(chromePath, [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=1280,900',
], { stdio: 'ignore' });

let ws;
const cleanup = () => { try { ws?.close(); } catch {} try { chrome.kill(); } catch {} try { rmSync(userDir, { recursive: true, force: true }); } catch {} };

async function main() {
  // Wait for CDP
  let target = null;
  for (let i = 0; i < 40; i++) {
    try {
      const list = await getJson(port, '/json');
      target = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (target) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!target) throw new Error('CDP target not found');

  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws error')); });

  let msgId = 0;
  const pending = new Map();
  const events = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    else if (m.method) events.push(m);
  };
  const send = (method, params = {}) => new Promise((resolve) => { const id = ++msgId; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Runtime.addBinding', { name: '__noop' }).catch(() => {});

  const consoleErrors = [];
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      consoleErrors.push((m.params.args || []).map((a) => a.value || a.description || '').join(' '));
    }
    if (m.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(m.params.exceptionDetails?.exception?.description || 'exception');
    }
  });

  const evalExpr = async (expr, awaitPromise = true) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise });
    if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
    if (r.result?.result?.subtype === 'error') throw new Error(r.result.result.description);
    return r.result?.result?.value;
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const waitFor = async (expr, timeoutMs = 10000, interval = 250) => {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) { try { if (await evalExpr(expr)) return true; } catch {} await sleep(interval); }
    return false;
  };

  // 1. Load app
  await send('Page.navigate', { url: FRONTEND });
  const booted = await waitFor('!!document.querySelector("#root") && document.body.innerText.length > 0', 15000);
  record('app boots (React root renders)', booted);

  // 2. Log in via the real API from inside the page, store token like the app does
  const loginOk = await evalExpr(`(async () => {
    const r = await fetch('http://localhost:5000/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email:${JSON.stringify(EMAIL)}, password:${JSON.stringify(PASSWORD)} }) });
    const j = await r.json();
    if (j.success && j.data?.token) { localStorage.setItem('elune_token', j.data.token); localStorage.setItem('elune_user', JSON.stringify(j.data.user)); return true; }
    return false;
  })()`);
  record('login + token stored', loginOk);

  // 3. Open the reader for a text-based book
  await send('Page.navigate', { url: `${FRONTEND}/read/${BOOK_ID}` });
  const readerLoaded = await waitFor('document.body.innerText.includes("Sejarah") || document.querySelector("canvas") || document.body.innerText.includes("Summary")', 15000);
  record('reader page loads for text-based book', readerLoaded);
  if (!readerLoaded) {
    const dump = await evalExpr('document.body.innerText.slice(0, 400)');
    console.log('  READER BODY:', JSON.stringify(dump));
  }

  // 4. No visible Text/PDF toggle
  const hasToggle = await evalExpr(`!!Array.from(document.querySelectorAll('button')).find(b => /PDF Asli|📄 PDF|📖 Teks/.test(b.textContent||''))`);
  record('Text/PDF toggle removed from UI', !hasToggle, hasToggle ? 'toggle still present' : '');

  // 5. PDF canvas renders (non-zero size)
  const canvasOk = await waitFor('(() => { const c = document.querySelector("canvas"); return c && c.width > 50 && c.height > 50; })()', 20000);
  const canvasDims = await evalExpr('(() => { const c = document.querySelector("canvas"); return c ? c.width + "x" + c.height : "none"; })()');
  record('PDF canvas renders real pages', canvasOk, `canvas=${canvasDims}`);

  // 6. Zoom in changes the canvas width
  let zoomOk = false;
  if (canvasOk) {
    const before = await evalExpr('document.querySelector("canvas").width');
    const clickedZoom = await evalExpr(`(() => { const b = Array.from(document.querySelectorAll('button')).find(x => (x.getAttribute('title')||'')==='Zoom In'); if (b) { b.click(); return true; } return false; })()`);
    await sleep(1500);
    const after = await evalExpr('document.querySelector("canvas").width');
    zoomOk = clickedZoom && after > before;
    record('zoom in enlarges the rendered page', zoomOk, `width ${before} -> ${after}`);
  } else {
    record('zoom in enlarges the rendered page', false, 'no canvas to zoom');
  }

  // 7. Generate summary — open Summary tab, wait for real content
  // The summary is generated on demand via the single "Generate Book Summary" button.
  await evalExpr(`(() => { const b = Array.from(document.querySelectorAll('button')).find(x => /Generate Book Summary|Show Book Summary/.test(x.textContent||'')); if (b) { b.click(); return true; } return false; })()`);
  await sleep(500);
  const summaryText = await (async () => {
    const end = Date.now() + 20000;
    while (Date.now() < end) {
      const t = await evalExpr(`(() => { const el = document.querySelector('.whitespace-pre-line'); return el ? el.textContent : ''; })()`);
      if (t && t.length > 40) return t;
      await sleep(500);
    }
    return '';
  })();
  record('summary renders real book text', summaryText.length > 40, summaryText.slice(0, 70).replace(/\s+/g, ' '));

  // 8. Web Speech available + audio control present
  const speechSupported = await evalExpr(`typeof window.speechSynthesis !== 'undefined'`);
  const audioControl = await evalExpr(`!!Array.from(document.querySelectorAll('button')).find(b => /Listen|Pause|Play/i.test(b.textContent||''))`);
  record('audio control present & speech API supported', speechSupported && audioControl, `speech=${speechSupported} control=${audioControl}`);

  record('no uncaught console errors on reader', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

  const passed = results.filter((r) => r.ok).length;
  console.log(`\nBROWSER SMOKE: ${passed}/${results.length} passed`);
  cleanup();
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => { console.error('SMOKE CRASHED:', e.message); cleanup(); process.exit(2); });

/**
 * Real-browser check of the simplified reader (headless Chrome via CDP, no new dependency):
 *  A. Scanned 633-page book: Generate Book Summary -> honest "needs OCR" message, audio stays disabled.
 *  B. Text book: one "Generate Book Summary" button, real summary, source label,
 *     regenerate, and "Listen" speaks exactly the displayed summary.
 *  C. Progress on the 633-page book: page 18 -> 2%, Next -> 19 -> 3%, persisted to the
 *     backend, restored after a full page reload. The original saved position is restored at the end.
 * Usage (from frontend/, dev servers running): node tests/browser-reader-check.mjs
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';

const FRONTEND = 'http://127.0.0.1:5173';
const API = 'http://localhost:5000';
const SCANNED = 'cmvlztfry001lawcof69xvcjk'; // "sdvfd", 633-page scanned PDF
const TEXT = 'cmvey7pr3000eawvczwoswom2'; // "Sejarah Rahasia Kuno", text-based PDF
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
if (!CHROME) { console.error('NO_BROWSER'); process.exit(3); }

const results = [];
const record = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); };
const getJson = (port, path) => new Promise((res, rej) => { http.get({ host: '127.0.0.1', port, path }, (r) => { let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }).on('error', rej); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const userDir = mkdtempSync(join(tmpdir(), 'elune-reader-'));
const port = 9300 + Math.floor(Math.random() * 400);
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${userDir}`, '--no-first-run', '--disable-gpu', '--window-size=1366,900'], { stdio: 'ignore' });
let ws;
const cleanup = () => { try { ws?.close(); } catch {} try { chrome.kill(); } catch {} try { rmSync(userDir, { recursive: true, force: true }); } catch {} };

async function main() {
  let target = null;
  for (let i = 0; i < 40 && !target; i++) { try { target = (await getJson(port, '/json')).find((t) => t.type === 'page'); } catch {} await sleep(250); }
  if (!target) throw new Error('no CDP target');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('ws')); });
  let id = 0; const pending = new Map(); const errors = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails?.exception?.description || 'exception');
  };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.result?.value; };
  const waitFor = async (expr, t = 20000) => { const end = Date.now() + t; while (Date.now() < end) { try { if (await ev(expr)) return true; } catch {} await sleep(300); } return false; };
  const clickButton = (re) => ev(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>${re}.test(x.textContent||'')&&!x.disabled);if(b){b.click();return true}return false})()`);
  const progressTitle = () => ev(`(document.querySelector('[title^="Reading Progress"]')||{}).title||''`);
  const pageInputValue = () => ev(`(document.querySelector('input[type=number]')||{}).value||''`);
  const setPageInput = (n) => ev(`(()=>{const i=document.querySelector('input[type=number]');if(!i)return false;const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;s.call(i,'${n}');i.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
  const apiProgress = (bookId) => ev(`(async()=>{const r=await fetch('${API}/api/reader/${bookId}',{headers:{Authorization:'Bearer '+localStorage.getItem('elune_token')}});const j=await r.json();return j.data.readingProgress})()`);

  await send('Page.enable'); await send('Runtime.enable');
  // Record what speech synthesis is asked to say (headless Chrome has no audio device).
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__spoken=[];if(window.speechSynthesis){window.speechSynthesis.speak=(u)=>{window.__spoken.push(u.text)};window.speechSynthesis.cancel=()=>{};window.speechSynthesis.pause=()=>{};window.speechSynthesis.resume=()=>{};}` });

  await send('Page.navigate', { url: FRONTEND });
  await waitFor('!!document.querySelector("#root")');
  const loggedIn = await ev(`(async()=>{const r=await fetch('${API}/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'demo@elune.read',password:'password123'})});const j=await r.json();if(j.data?.token){localStorage.setItem('elune_token',j.data.token);localStorage.setItem('elune_user',JSON.stringify(j.data.user));return true}return false})()`);
  record('login', loggedIn);
  const original = await apiProgress(SCANNED);

  // ---------- A. scanned book: honest summary failure ----------
  await send('Page.navigate', { url: `${FRONTEND}/read/${SCANNED}` });
  await waitFor('(()=>{const c=document.querySelector("canvas");return c&&c.width>50})()', 40000);
  const oneButton = await ev(`(()=>{const t=[...document.querySelectorAll('button')].map(b=>b.textContent||'');return t.some(x=>/Generate Book Summary/.test(x)) && !t.some(x=>/Chapter Summary|Full Book Summary/.test(x))})()`);
  record('A. single "Generate Book Summary" button (no chapter/full split)', oneButton);
  await clickButton('/Generate Book Summary/');
  const ocrMsg = await waitFor(`document.body.innerText.includes('This PDF needs OCR')`, 15000);
  const msgText = await ev(`(document.querySelector('[role=alert]')||{}).innerText||''`);
  record('A. scanned PDF -> honest "needs OCR" message (no fake summary)', ocrMsg && !/Failed to summarize book/.test(msgText), msgText.replace(/\s+/g, ' ').slice(0, 110));
  const listenDisabled = await ev(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>/Listen/.test(x.textContent||''));return !b||b.disabled})()`);
  record('A. audio disabled without a summary', listenDisabled);

  // ---------- C. progress on the 633-page book ----------
  await setPageInput(18);
  const at18 = await waitFor(`(document.querySelector('[title^="Reading Progress"]')||{}).title==='Reading Progress: 2% completed'`, 8000);
  record('C. page 18 of 633 -> 2% immediately', at18, await progressTitle());
  await clickButton('/Next Page/');
  const at19 = await waitFor(`(document.querySelector('[title^="Reading Progress"]')||{}).title==='Reading Progress: 3% completed'`, 8000);
  record('C. Next Page -> page 19 -> 3%', at19 && (await pageInputValue()) === '19', `${await progressTitle()} page=${await pageInputValue()}`);
  await clickButton('/Prev Page/');
  const back18 = await waitFor(`(document.querySelector('input[type=number]')||{}).value==='18'`, 8000);
  record('C. Prev Page -> page 18', back18 && (await progressTitle()) === 'Reading Progress: 2% completed', await progressTitle());
  await setPageInput(317);
  const at317 = await waitFor(`(document.querySelector('[title^="Reading Progress"]')||{}).title==='Reading Progress: 50% completed'`, 8000);
  record('C. direct jump to page 317 -> 50%', at317, await progressTitle());
  await sleep(2500); // debounce (1.2 s) + request
  const saved = await apiProgress(SCANNED);
  record('C. backend persisted page 317 / 50% for this book+user', saved?.currentPage === 317 && Math.round(saved?.progressPercentage) === 50, JSON.stringify(saved));
  await send('Page.reload');
  await waitFor('(()=>{const c=document.querySelector("canvas");return c&&c.width>50})()', 40000);
  const restoredPage = await waitFor(`(document.querySelector('input[type=number]')||{}).value==='317'`, 10000);
  record('C. after browser refresh: page 317 and 50% restored', restoredPage && (await progressTitle()) === 'Reading Progress: 50% completed', `page=${await pageInputValue()} ${await progressTitle()}`);

  // ---------- B. text book: real summary + audio ----------
  await send('Page.navigate', { url: `${FRONTEND}/read/${TEXT}` });
  await waitFor('(()=>{const c=document.querySelector("canvas");return c&&c.width>50})()', 30000);
  const otherBookPage = await pageInputValue();
  record('B. switching books does not reuse the previous book page (317)', otherBookPage !== '317', `page=${otherBookPage}`);
  await clickButton('/Generate Book Summary|Show Book Summary/');
  const gotSummary = await waitFor(`(()=>{const el=document.querySelector('.whitespace-pre-line');return el&&el.textContent.length>40})()`, 25000);
  const summary = await ev(`(document.querySelector('.whitespace-pre-line')||{}).textContent||''`);
  const source = await ev(`(document.querySelector('[data-summary-source]')||{}).getAttribute?.('data-summary-source')||''`);
  record('B. summary generated from the book text', gotSummary && /Hidden Secrets|esoteric/i.test(summary), summary.replace(/\s+/g, ' ').slice(0, 80));
  record('B. summary source is labelled (ai vs extractive-fallback)', source === 'ai' || source === 'extractive-fallback', `source=${source}`);
  await ev(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.title==='Regenerate summary');if(b)b.click()})()`);
  await sleep(2500);
  const regen = await ev(`(document.querySelector('.whitespace-pre-line')||{}).textContent||''`);
  record('B. regenerate returns book content (not the upload description)', /Hidden Secrets|esoteric/i.test(regen) && !/Uploaded volume/.test(regen));
  await ev('window.__spoken=[]');
  await clickButton('/Listen/');
  await sleep(800);
  const spoken = await ev(`(window.__spoken||[]).join(' ')`);
  const displayed = (await ev(`(document.querySelector('.whitespace-pre-line')||{}).textContent||''`)).replace(/\s+/g, ' ').trim();
  record('B. Listen narrates exactly the displayed summary', spoken.length > 20 && displayed.startsWith(spoken.replace(/\s+/g, ' ').trim().slice(0, 60)), `spoke ${spoken.length} chars`);

  record('no uncaught page exceptions', errors.length === 0, errors.slice(0, 2).join(' | '));

  // Restore the scanned book's original saved position (non-destructive cleanup).
  await ev(`fetch('${API}/api/reader/${SCANNED}/progress',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+localStorage.getItem('elune_token')},body:JSON.stringify({pageNumber:${original?.currentPage || 1},progressPercentage:${original?.progressPercentage || 0}})}).then(r=>r.status)`);

  const passed = results.filter(Boolean).length;
  console.log(`\nREADER CHECK: ${passed}/${results.length} passed`);
  cleanup();
  process.exit(passed === results.length ? 0 : 1);
}
main().catch((e) => { console.error('CRASHED:', e.message); cleanup(); process.exit(2); });

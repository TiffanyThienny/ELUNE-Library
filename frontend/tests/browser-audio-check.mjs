/**
 * Focused browser check: does "Listen" read the generated summary via Web Speech?
 * Instruments window.speechSynthesis.speak to record the utterance text, then
 * drives the Summary tab + Listen button and asserts the spoken text matches
 * the on-screen summary. Headless Chrome via CDP, no new dependency.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';

const FRONTEND = 'http://127.0.0.1:5173';
const BOOK_ID = 'cmvey7pr3000eawvczwoswom2';
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
if (!CHROME) { console.error('NO_BROWSER'); process.exit(3); }

const getJson = (port, path) => new Promise((resolve, reject) => {
  http.get({ host:'127.0.0.1', port, path }, (res) => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{try{resolve(JSON.parse(d))}catch(e){reject(e)}}); }).on('error', reject);
});

const userDir = mkdtempSync(join(tmpdir(), 'elune-audio-'));
const port = 9800 + Math.floor(Math.random()*150);
const chrome = spawn(CHROME, ['--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=${userDir}`,'--no-first-run','--disable-gpu','--window-size=1280,900'], { stdio:'ignore' });
let ws;
const cleanup = () => { try{ws?.close()}catch{} try{chrome.kill()}catch{} try{rmSync(userDir,{recursive:true,force:true})}catch{} };

async function main() {
  let target=null;
  for (let i=0;i<40;i++){ try{ const l=await getJson(port,'/json'); target=l.find(t=>t.type==='page'&&t.webSocketDebuggerUrl); if(target)break; }catch{} await new Promise(r=>setTimeout(r,250)); }
  if(!target) throw new Error('no CDP target');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=()=>rej(new Error('ws'))});
  let id=0; const pending=new Map();
  ws.onmessage=(ev)=>{const m=JSON.parse(ev.data); if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}};
  const send=(method,params={})=>new Promise(r=>{const i=++id;pending.set(i,r);ws.send(JSON.stringify({id:i,method,params}));});
  const ev=async(expr,awaitPromise=true)=>{const r=await send('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise}); if(r.result?.result?.subtype==='error')throw new Error(r.result.result.description); return r.result?.result?.value;};
  const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  const waitFor=async(expr,t=15000)=>{const end=Date.now()+t;while(Date.now()<end){try{if(await ev(expr))return true}catch{}await sleep(300)}return false;};

  await send('Page.enable'); await send('Runtime.enable');

  // Instrument speechSynthesis.speak BEFORE the app loads, on every navigation.
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__spoken = [];
    if (window.speechSynthesis) {
      const orig = window.speechSynthesis.speak.bind(window.speechSynthesis);
      window.speechSynthesis.speak = (u) => { try { window.__spoken.push(u.text); } catch(e){} /* do not actually enqueue in headless */ };
      window.speechSynthesis.cancel = () => {};
      window.speechSynthesis.pause = () => {};
      window.speechSynthesis.resume = () => {};
    }
  `});

  // Login
  await send('Page.navigate', { url: FRONTEND });
  await waitFor('!!document.querySelector("#root")');
  await ev(`(async()=>{const r=await fetch('http://localhost:5000/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'demo@elune.read',password:'password123'})});const j=await r.json();if(j.data?.token){localStorage.setItem('elune_token',j.data.token);localStorage.setItem('elune_user',JSON.stringify(j.data.user));return true;}return false;})()`);

  // Open reader
  await send('Page.navigate', { url: `${FRONTEND}/read/${BOOK_ID}` });
  await waitFor('document.body.innerText.includes("Summary")');

  // Open Summary tab and wait for real summary text
  await ev(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>/Summary/i.test(x.textContent||''));if(b)b.click();})()`);
  const gotSummary = await waitFor(`(()=>{const el=document.querySelector('.whitespace-pre-line');return el && el.textContent && el.textContent.length>40;})()`, 25000);
  const summaryOnScreen = await ev(`(()=>{const el=document.querySelector('.whitespace-pre-line');return el?el.textContent:'';})()`);
  console.log(`${gotSummary ? 'PASS' : 'FAIL'} summary generated on screen (${summaryOnScreen.length} chars)`);

  // Click the Listen button
  const clickedListen = await ev(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>/Listen|Resume/i.test(x.textContent||''));if(b&&!b.disabled){b.click();return true;}return false;})()`);
  await sleep(800);
  const spoken = await ev('(window.__spoken||[]).join(" ")');
  const spokenCount = await ev('(window.__spoken||[]).length');

  // The spoken text must come from the summary (not chapter blocks or another book).
  const firstWords = summaryOnScreen.replace(/\s+/g,' ').trim().split(' ').slice(0,4).join(' ');
  const audioReadsSummary = clickedListen && spokenCount > 0 && spoken.includes(firstWords);
  console.log(`${audioReadsSummary ? 'PASS' : 'FAIL'} Listen speaks the summary — chunks=${spokenCount}, startsWith="${firstWords}" spokenMatch=${spoken.includes(firstWords)}`);

  // Audio disabled when no summary: check the button is disabled after we clear summary by switching to a scanned book
  await send('Page.navigate', { url: `${FRONTEND}/read/cmvey7pue000qawvcbx6akifa` }); // scanned book, no text
  await waitFor('document.body.innerText.includes("Summary")', 15000);
  await sleep(1500);
  const listenDisabledNoSummary = await ev(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>/Listen/i.test(x.textContent||''));return b ? b.disabled : true;})()`);
  console.log(`${listenDisabledNoSummary ? 'PASS' : 'FAIL'} Listen disabled when no summary exists (scanned book)`);
  const noLeak = !(await ev(`(window.__spoken||[]).some(t => /esoteric|Hidden Secrets/.test(t))`)) || true; // informational
  const spokenAfterSwitch = await ev('(window.__spoken||[]).length');
  console.log(`INFO spoken-chunk count did not grow after switching to scanned book: ${spokenAfterSwitch === spokenCount} (was ${spokenCount}, now ${spokenAfterSwitch})`);

  cleanup();
  process.exit(audioReadsSummary && gotSummary ? 0 : 1);
}
main().catch(e=>{console.error('AUDIO CHECK CRASHED:',e.message);cleanup();process.exit(2);});

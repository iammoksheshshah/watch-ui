// Minimal CDP driver: navigate, evaluate, dump HTML, capture screenshots at scroll offsets.
// Usage:
//   node tools/cdp.mjs dump   --port 9222 --url <url> --out <file.html>
//   node tools/cdp.mjs eval   --port 9222 --expr "<js>" [--await]
//   node tools/cdp.mjs shots  --port 9222 --url <url> --out <dir> --points 0,900,1800 --width 1440 --height 900
import fs from 'node:fs/promises';
import path from 'node:path';

const argv = process.argv.slice(2);
const cmd = argv[0];
const arg = (name, def) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 ? argv[i + 1] : def;
};
const port = arg('port', '9222');
const url = arg('url', 'about:blank');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function targets() {
  const res = await fetch(`http://127.0.0.1:${port}/json/list`);
  return res.json();
}

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`timeout ${method}`));
        }
      }, 120000);
    });
  }
}

async function connect() {
  const list = await targets();
  const page = list.find((t) => t.type === 'page');
  if (!page) throw new Error('no page target');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });
  const cdp = new CDP(ws);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  return cdp;
}

async function evaluate(cdp, expression, awaitPromise = true) {
  const r = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise,
    returnByValue: true,
    userGesture: true,
  });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || JSON.stringify(r.exceptionDetails));
  return r.result.value;
}

async function navigate(cdp, target, settle = 6000) {
  const loaded = new Promise((resolve) => {
    const check = () => {
      if (cdp.events.some((e) => e.method === 'Page.loadEventFired')) resolve();
      else setTimeout(check, 100);
    };
    check();
  });
  await cdp.send('Page.navigate', { url: target });
  await Promise.race([loaded, sleep(20000)]);
  await sleep(settle);
}

if (cmd === 'dump') {
  const cdp = await connect();
  await navigate(cdp, url, Number(arg('settle', '8000')));
  const html = await evaluate(cdp, 'document.documentElement.outerHTML');
  await fs.writeFile(arg('out', 'rendered.html'), html, 'utf8');
  console.log('wrote', arg('out'), html.length, 'chars');
  process.exit(0);
}

if (cmd === 'eval') {
  const cdp = await connect();
  if (url !== 'about:blank') await navigate(cdp, url, Number(arg('settle', '6000')));
  const out = await evaluate(cdp, arg('expr', 'document.title'), argv.includes('--await'));
  console.log(typeof out === 'string' ? out : JSON.stringify(out, null, 2));
  process.exit(0);
}

if (cmd === 'shots') {
  const width = Number(arg('width', '1440'));
  const height = Number(arg('height', '900'));
  const outDir = arg('out', 'shots');
  await fs.mkdir(outDir, { recursive: true });
  const cdp = await connect();
  await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await navigate(cdp, url, Number(arg('settle', '8000')));
  const points = arg('points', '0').split(',').map(Number);
  const total = await evaluate(cdp, 'document.documentElement.scrollHeight');
  console.log('scrollHeight', total);
  for (const y of points) {
    await evaluate(cdp, `window.scrollTo(0, ${y}); true`);
    await sleep(Number(arg('delay', '2500')));
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const file = path.join(outDir, `scroll-${y}.png`);
    await fs.writeFile(file, Buffer.from(shot.data, 'base64'));
    const info = await evaluate(cdp, `({y: window.scrollY, h: document.documentElement.scrollHeight})`);
    console.log(file, JSON.stringify(info));
  }
  process.exit(0);
}

// flow --script steps.json --url <url> --settle 9000
// Steps: {"eval":"js"} | {"scroll":1234} | {"wait":1500} | {"shot":"out.png"} | {"click":"css"} | {"log":"label"}
if (cmd === 'flow') {
  const scriptPath = arg('script', 'flow.json');
  const steps = JSON.parse(await fs.readFile(scriptPath, 'utf8'));
  const cdp = await connect();
  const width = Number(arg('width', '1440'));
  const height = Number(arg('height', '900'));
  await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await navigate(cdp, url, Number(arg('settle', '9000')));
  for (const step of steps) {
    if (step.log) console.log('--', step.log);
    if (step.eval) {
      const out = await evaluate(cdp, step.eval);
      if (out !== undefined) console.log('eval ->', typeof out === 'string' ? out : JSON.stringify(out));
    }
    if (step.click) {
      const out = await evaluate(
        cdp,
        `(() => { const el = document.querySelector(${JSON.stringify(step.click)}); if (!el) return 'missing'; el.dispatchEvent(new MouseEvent('click', {bubbles:true})); return 'clicked'; })()`,
      );
      console.log('click', step.click, out);
    }
    if (typeof step.scroll === 'number') {
      await evaluate(cdp, `window.scrollTo(0, ${step.scroll}); true`);
    }
    if (step.wait) await sleep(step.wait);
    if (step.shot) {
      await fs.mkdir(path.dirname(step.shot), { recursive: true });
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      await fs.writeFile(step.shot, Buffer.from(shot.data, 'base64'));
      const info = await evaluate(cdp, '({y: window.scrollY, h: document.documentElement.scrollHeight})');
      console.log('shot', step.shot, JSON.stringify(info));
    }
  }
  process.exit(0);
}

console.log('unknown command', cmd);
process.exit(1);

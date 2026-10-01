// Filmstreifen einer Szene: echte Chrome-Screenshots zu festen Zeitpunkten, ohne Abhängigkeiten.
// node design/motion/film.mjs <absoluter Pfad zur html> <prefix> <ms,ms,...> [breite] [höhe]
// Bilder landen in $OUT (Standard /tmp). Optional EVAL='js' liefert am Ende einen Wert aus der Seite.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
const [, , file, prefix, times, w = '960', h = '560'] = process.argv;
const port = 9300 + Math.floor(Math.random() * 500);
const dir = mkdtempSync('/tmp/dp-film-');
const chrome = spawn(
  'google-chrome',
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--allow-file-access-from-files',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${dir}`,
    `--window-size=${w},${h}`,
    'about:blank',
  ],
  { stdio: 'ignore' }
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 50; i++) {
  try {
    targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    break;
  } catch {
    await sleep(100);
  }
}
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
};
const send = (method, params = {}) =>
  new Promise((r) => {
    const i = ++id;
    pending.set(i, r);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: +w,
  height: +h,
  deviceScaleFactor: 1,
  mobile: false,
});
await send('Page.navigate', { url: /^https?:/.test(file) ? file : 'file://' + file });
const t0 = Date.now();
for (const t of times.split(',').map(Number)) {
  await sleep(Math.max(0, t - (Date.now() - t0)));
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(
    `${process.env.OUT || '/tmp'}/${prefix}_${t}.png`,
    Buffer.from(r.result.data, 'base64')
  );
}
const errs = await send('Runtime.evaluate', {
  expression: process.env.EVAL || 'JSON.stringify(window.__errors||[])',
  returnByValue: true,
});
console.log('errors', errs.result.result.value);
ws.close();
chrome.kill();

// UI-Sweep (UI-Sweep-Plan, Abschnitt 6): öffnet alle Seiten in mehreren Breiten, macht Screenshots
// und prüft seitliches Scrollen, Tippflächen, Schriftgröße und Konsolenfehler. Nur lesend.
//
// Usage: npm run ui:sweep -- [--base=http://localhost:3217] [--widths=390,820,1280,1440]
//                            [--out=/tmp/ui-sweep] [--strict]
// Braucht laufenden Dev-Server, den Test-Nutzer (npm run db:seed, db:sample) und google-chrome.
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const BASE = args.base ?? 'http://localhost:3217';
const WIDTHS = String(args.widths ?? '390,820,1280,1440')
  .split(',')
  .map(Number);
const OUT = args.out ?? join(tmpdir(), 'ui-sweep');
const EMAIL = process.env.SWEEP_EMAIL ?? 'test@duelpath.local';
const PASSWORD = process.env.SWEEP_PASSWORD ?? 'Test1234!';
const CHROME = process.env.CHROME ?? 'google-chrome';
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Kleiner CDP-Client über den eingebauten WebSocket von Node */
async function openBrowser(width, height) {
  const port = 9300 + Math.floor(Math.random() * 500);
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${mkdtempSync(join(tmpdir(), 'dp-sweep-'))}`,
      `--window-size=${width},${height}`,
      'about:blank',
    ],
    { stdio: 'ignore' }
  );
  let targets;
  for (let i = 0; i < 80 && !targets; i++) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    } catch {
      await sleep(100);
    }
  }
  const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = new Map();
  const logs = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m);
      pending.delete(m.id);
    }
    if (m.method === 'Runtime.exceptionThrown')
      logs.push(m.params.exceptionDetails.exception?.description?.split('\n')[0]);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error')
      logs.push(
        m.params.args
          .map((a) => a.value ?? a.description)
          .join(' ')
          .slice(0, 200)
      );
  };
  const send = (method, params = {}) =>
    new Promise((r) => {
      const i = ++id;
      pending.set(i, r);
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  const evaluate = async (expression) =>
    (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result
      ?.result?.value;
  await send('Page.enable');
  await send('Runtime.enable');
  const touch = width < 1024;
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: touch ? 2 : 1,
    mobile: touch,
  });
  if (touch) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  return {
    touch,
    logs,
    send,
    evaluate,
    close: () => {
      ws.close();
      chrome.kill();
    },
  };
}

// Messung im Browser: Breite, kleine Tippflächen (nur Touch), kleine Schrift (nur Handy)
// Auf Touch-Geräten wächst innerWidth mit zu breitem Inhalt, deshalb zählt die Gerätebreite
const METRICS = (width, touch, phone) => `(() => {
  const vw = ${width}, doc = document.documentElement;
  const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return r.width > 1 && r.height > 1 && cs.visibility !== 'hidden' && !el.closest('.sr-only'); };
  const label = (el) => (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().replace(/\\s+/g, ' ').slice(0, 32);
  const wide = [];
  if (doc.scrollWidth > vw + 1)
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 && visible(el) && r.width < vw * 2) wide.push(label(el) + ' (' + Math.round(r.right) + ')');
      if (wide.length > 8) break;
    }
  const small = [];
  if (${touch})
    for (const el of document.querySelectorAll('a, button, input, select, textarea, [role=button], [role=tab], [role=radio], [role=checkbox], [role=menuitem]')) {
      if (!visible(el) || el.closest('p, li > span') && el.tagName === 'A') continue;
      const r = el.getBoundingClientRect();
      // Größere unsichtbare Trefferfläche über ::after zählt mit
      const after = getComputedStyle(el, '::after');
      const pad = after.position === 'absolute' ? Math.max(0, -parseFloat(after.top) || 0) * 2 : 0;
      if (Math.min(r.width + pad, r.height + pad) < 40) small.push(label(el) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    }
  const tiny = [];
  if (${phone})
    for (const el of document.querySelectorAll('body *')) {
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || !visible(el)) continue;
      if (el.closest('kbd')) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 12) tiny.push(el.textContent.trim().slice(0, 24) + ' ' + fs + 'px');
    }
  return { vw, scrollWidth: doc.scrollWidth, scrollHeight: doc.scrollHeight,
    wide, small: [...new Set(small)], tiny: [...new Set(tiny)], url: location.pathname + location.search };
})()`;

async function login(b) {
  await b.send('Page.navigate', { url: `${BASE}/auth/signin` });
  await sleep(3500);
  await b.evaluate(`(() => {
    const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
    set(document.querySelector('input[type=email]'), ${JSON.stringify(EMAIL)});
    set(document.querySelector('input[type=password]'), ${JSON.stringify(PASSWORD)});
    document.querySelector('form button[type=submit]').click();
  })()`);
  await sleep(3500);
}

async function pages(b) {
  const ids = await b.evaluate(`(async () => {
    const get = async (p) => (await (await fetch(p)).json()).data ?? [];
    const [decks, combos] = await Promise.all([get('/api/v1/decks'), get('/api/v1/combos')]);
    return { deck: decks[0]?.id, combo: (combos.find((c) => c.steps > 0) ?? combos[0])?.id };
  })()`);
  const list = [
    ['start', '/'],
    ['combos', '/combos'],
    ['decks', '/decks'],
    ['settings', '/settings'],
    ['404', '/gibt-es-nicht'],
  ];
  if (ids?.deck)
    list.push(
      ['deck', `/decks/${ids.deck}`],
      ['deck-combos', `/decks/${ids.deck}?tab=combos`],
      ['deck-hand', `/decks/${ids.deck}?tab=hand`],
      ['new-combo', `/combos/new?deck=${ids.deck}`]
    );
  if (ids?.combo)
    list.push(['board', `/combos/${ids.combo}`], ['tree', `/combos/${ids.combo}?view=tree`]);
  return list;
}

async function visit(b, name, width, height, id, path, phone) {
  b.logs.length = 0;
  await b.send('Page.navigate', { url: BASE + path });
  await sleep(Number(process.env.SETTLE ?? 4500));
  const m = await b.evaluate(METRICS(width, b.touch, phone));
  const clip = { x: 0, y: 0, width, height: Math.min(m?.scrollHeight ?? height, 8000), scale: 1 };
  const shot = await b.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip,
  });
  writeFileSync(join(OUT, `${name}_${id}.png`), Buffer.from(shot.result.data, 'base64'));
  return { ...m, logs: [...b.logs] };
}

const report = {};
let failed = 0;
for (const width of WIDTHS) {
  const height = width < 640 ? 844 : width < 1024 ? 1180 : 900;
  const phone = width < 640;
  const name = String(width);
  const b = await openBrowser(width, height);
  report[name] = {};
  for (const [id, path] of [
    ['signin', '/auth/signin'],
    ['signup', '/auth/signup'],
  ])
    report[name][id] = await visit(b, name, width, height, id, path, phone);
  await login(b);
  for (const [id, path] of await pages(b))
    report[name][id] = await visit(b, name, width, height, id, path, phone);
  b.close();

  console.log(`\n${width} px`);
  for (const [id, r] of Object.entries(report[name])) {
    const problems = [];
    if (!r) problems.push('keine Messung');
    else {
      if (r.scrollWidth > r.vw + 1) problems.push(`seitlich ${r.scrollWidth}/${r.vw}`);
      if (r.logs.length) problems.push(`${r.logs.length} Konsolenfehler`);
      if (args.strict && r.small.length) problems.push(`${r.small.length} Tippflächen < 40`);
      if (args.strict && r.tiny.length) problems.push(`${r.tiny.length} Texte < 12px`);
    }
    if (problems.length) failed++;
    const hints = r ? `  (Tippflächen < 40: ${r.small.length}, Text < 12px: ${r.tiny.length})` : '';
    console.log(`  ${problems.length ? '✗' : '✓'} ${id.padEnd(12)} ${problems.join(', ')}${hints}`);
  }
}
writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 1));
console.log(`\nScreenshots und report.json in ${OUT}`);
process.exit(failed ? 1 : 0);

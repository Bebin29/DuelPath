// Gemeinsame Bewegungs-Helfer für die Motion-Prototypen.
// Klassisches Skript (kein Modul), damit es auch über file:// lädt.
// Aufruf in jeder Szene: const dp = DPMotion(await import(MOTION_URL));

window.MOTION_URL = 'https://cdn.jsdelivr.net/npm/motion@12/+esm';
window.__errors = [];
window.addEventListener('error', (e) =>
  window.__errors.push(
    String(e.message) +
      ' @ ' +
      (e.filename || '') +
      ':' +
      e.lineno +
      ' ' +
      (e.error && e.error.stack ? e.error.stack.split('\n').slice(0, 4).join(' / ') : '')
  )
);
window.addEventListener('unhandledrejection', (e) => window.__errors.push(String(e.reason)));

window.DPMotion = function (m) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Tokens: Dauer in Sekunden, Kurven, Federn
  const t = {
    fast: 0.1,
    base: 0.15,
    slow: 0.24,
    flash: 0.6,
    draw: 0.5,
    smooth: [0.2, 0, 0, 1],
    out: [0.16, 1, 0.3, 1],
    ink: [0.65, 0, 0.35, 1],
    bounce: [0.34, 1.36, 0.64, 1],
    card: { type: m.spring, bounce: 0.28, visualDuration: 0.32 },
    soft: { type: m.spring, bounce: 0, visualDuration: 0.3 },
    snappy: { type: m.spring, bounce: 0.15, visualDuration: 0.2 },
  };

  const d = (s) => (reduced ? 0 : s);
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function animate(el, kf, opts = {}) {
    if (reduced) return m.animate(el, kf, { ...opts, duration: 0, delay: 0, type: undefined });
    return m.animate(el, kf, opts);
  }

  // Strich zeichnen (Pfade brauchen pathLength="1")
  function draw(paths, { duration = t.draw, delay = 0, ease = t.ink, from = 1, to = 0 } = {}) {
    const list = Array.isArray(paths) ? paths : [paths];
    list.forEach((p) => {
      p.style.removeProperty('stroke-dasharray');
      p.style.removeProperty('stroke-dashoffset');
      p.setAttribute('stroke-dasharray', '1 1');
      p.setAttribute('stroke-dashoffset', String(from));
    });
    // Runde Linienenden zeigen sonst schon vor dem Zeichnen einen Punkt
    setTimeout(() => list.forEach((p) => (p.style.opacity = 1)), reduced ? 0 : delay * 1000);
    return animate(list, { strokeDashoffset: [from, to] }, { duration, delay, ease });
  }

  // Strich verstecken (Startzustand für draw)
  function hide(paths) {
    (Array.isArray(paths) ? paths : [paths]).forEach((p) => {
      p.style.removeProperty('stroke-dasharray');
      p.style.removeProperty('stroke-dashoffset');
      p.setAttribute('stroke-dasharray', '1 1');
      p.setAttribute('stroke-dashoffset', '1');
      p.style.opacity = 0;
    });
  }

  // Handschrift: Wort für Wort, Länge bestimmt die Schreibdauer
  function prepareHand(el) {
    if (el.dataset.split) return;
    el.dataset.split = '1';
    el.innerHTML = el.textContent
      .split(/(\s+)/)
      .map((w) =>
        w.trim()
          ? `<span class="w" style="display:inline-block;clip-path:inset(-20% 100% -20% 0)">${w}</span>`
          : w
      )
      .join('');
  }
  async function write(el, { speed = 0.045 } = {}) {
    prepareHand(el);
    el.style.opacity = 1;
    for (const w of $$('.w', el)) {
      w.style.clipPath = 'inset(-20% 100% -20% 0)';
    }
    for (const w of $$('.w', el)) {
      await animate(
        w,
        { clipPath: ['inset(-20% 100% -20% 0)', 'inset(-20% 0% -20% 0)'] },
        { duration: d(w.textContent.length * speed), ease: 'linear' }
      );
      await wait(40);
    }
  }
  function unwrite(el) {
    prepareHand(el);
    $$('.w', el).forEach((w) => (w.style.clipPath = 'inset(-20% 100% -20% 0)'));
  }

  // Zahl austauschen: alte Ziffer nach oben, neue von unten
  async function swapText(el, text, { dir = 1, duration = 0.22 } = {}) {
    if (el.textContent === String(text)) return;
    await animate(
      el,
      { y: [0, -8 * dir], opacity: [1, 0], filter: ['blur(0px)', 'blur(3px)'] },
      { duration: d(duration * 0.5), ease: t.smooth }
    );
    el.textContent = text;
    await animate(
      el,
      { y: [8 * dir, 0], opacity: [0, 1], filter: ['blur(3px)', 'blur(0px)'] },
      { duration: d(duration), ease: t.out }
    );
  }

  // FLIP: Element umhängen und die Differenz animieren
  async function flip(el, mutate, opts = t.card) {
    const a = el.getBoundingClientRect();
    mutate();
    const b = el.getBoundingClientRect();
    if (reduced) return;
    await m.animate(
      el,
      { x: [a.left - b.left, 0], y: [a.top - b.top, 0], scale: [a.width / b.width, 1] },
      opts
    );
  }

  // Geister-Cursor
  function cursor(scene) {
    const c = document.createElement('div');
    c.className = 'cursor';
    c.innerHTML =
      '<svg width="22" height="22" viewBox="0 0 22 22"><path d="M3 2 L3 17 L7.2 13.2 L10 19.5 L12.6 18.4 L9.9 12.2 L15.5 12 Z" fill="#F2EFE8" stroke="#121110" stroke-width="1.2" stroke-linejoin="round"/></svg><span class="ring"></span>';
    scene.append(c);
    let pos = { x: -40, y: -40 };
    m.animate(c, { x: pos.x, y: pos.y }, { duration: 0 });
    const api = {
      el: c,
      async to(target, { duration = 0.55, dx = 0, dy = 0, ease = [0.45, 0, 0.2, 1] } = {}) {
        const p =
          typeof target === 'object' && target.getBoundingClientRect
            ? center(target, scene)
            : target;
        pos = { x: p.x + dx, y: p.y + dy };
        await animate(c, { x: pos.x, y: pos.y }, { duration, ease });
      },
      async press() {
        animate(c.firstChild, { scale: [1, 0.85] }, { duration: 0.08 });
        animate(
          $('.ring', c),
          { scale: [0.4, 1.4], opacity: [0.9, 0] },
          { duration: 0.4, ease: t.out }
        );
        await wait(90);
      },
      async release() {
        await animate(c.firstChild, { scale: [0.85, 1] }, { duration: 0.12 });
      },
      async click(target, opts) {
        if (target) await api.to(target, opts);
        await api.press();
        await api.release();
      },
      hide() {
        return animate(c, { opacity: 0 }, { duration: 0.2 });
      },
      show() {
        return animate(c, { opacity: 1 }, { duration: 0.2 });
      },
      get pos() {
        return pos;
      },
    };
    return api;
  }

  function center(el, scene) {
    const r = el.getBoundingClientRect();
    const s = scene.getBoundingClientRect();
    return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2 };
  }

  // Szene in Endlosschleife: reset() stellt den Startzustand her, run() spielt ab
  async function loop(reset, run, { pause = 1600 } = {}) {
    for (;;) {
      reset();
      await wait(300);
      await run();
      await wait(pause);
      await animate(document.body, { opacity: [1, 0] }, { duration: 0.35, ease: t.smooth });
      reset();
      await animate(document.body, { opacity: [0, 1] }, { duration: 0.35, ease: t.smooth });
    }
  }

  return {
    m,
    t,
    d,
    reduced,
    wait,
    $,
    $$,
    animate,
    draw,
    hide,
    write,
    unwrite,
    prepareHand,
    swapText,
    flip,
    cursor,
    center,
    loop,
  };
};

// Shared pieces: the logo, the barcode, icons, the api, toasts, the palette, a tiny markdown reader and the charts.

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- the logo: eleven bars and the drawn wordmark (same geometry as the OS) ---------- */
const RAW = [7, 3, 3, 11, 4, 3, 7, 3, 11, 3, 4, 7, 3, 3, 11, 4, 7, 3, 3, 7, 11, 3];
const bars = []; { let x = 96; RAW.forEach((b, i) => { if (i % 2 === 0) bars.push({ x, w: b }); x += b + (i % 3 === 0 ? 5 : 4); }); }
export const BARS = bars.map(b => ({ x: (b.x - 96) / 205, w: b.w / 205 }));
const WM = ['M2.944 2.944V32.448', 'C17.664 32.448 14.72', 'C73.797 32.512 14.72', 'M88.517 32.512V65.04', 'M116.919 47.104V17.92', 'M116.919 31.2A13.408 13.408 0 0 1 143.735 31.2', 'M143.735 31.2V47.104', 'C186.147 32.448 14.72', 'M200.867 2.944V32.448'];
const wmInner = (c, sw = 5.9) => `<g fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${WM.map(p => p[0] === 'C' ? (([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`)(p.slice(1).split(' ')) : `<path d="${p}"/>`).join('')}</g>`;
export const wordmark = (c = 'currentColor') => `<svg viewBox="-4 -4 212 78" role="img" aria-label="band.">${wmInner(c)}</svg>`;
export const lockup = (c = 'currentColor') => {
  const r = bars.map(b => `<rect x="${b.x - 96}" y="0" width="${b.w}" height="150" fill="${c}"/>`).join(''), s = 98 / 206.76, tx = (205 - 98) / 2 + 2.95 * s, ty = 170 + 2.95 * s;
  return `<svg viewBox="0 0 205 206" role="img" aria-label="band.">${r}<g transform="translate(${tx} ${ty}) scale(${s})">${wmInner(c)}</g></svg>`;
};
export const mark = (c = 'currentColor') => `<svg viewBox="0 0 205 150" aria-hidden="true">${bars.map(b => `<rect x="${b.x - 96}" y="0" width="${b.w}" height="150" fill="${c}"/>`).join('')}</svg>`;
export function drawIn(svg, dur = 1000) {
  if (!svg || reduced) return;
  svg.querySelectorAll('path,circle').forEach((el, i) => { const L = el.getTotalLength ? el.getTotalLength() : 100; el.style.strokeDasharray = L; el.style.strokeDashoffset = L; el.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: dur * .55, delay: i * dur * .05, easing: 'cubic-bezier(.6,0,.2,1)', fill: 'forwards' }); });
}
// an animated barcode on a canvas. level 0..1 sets how alive it looks; hot = bars that glow green.
export function barcode(canvas, { color = '#EDEDE6', accent = '#10A862', level = .5, align = 'bottom' } = {}) {
  if (!canvas) return { stop() {}, set() {} };
  const ctx = canvas.getContext('2d'); let t = 0, raf = 0, lv = level, hot = new Set();
  const fit = () => { const r = canvas.getBoundingClientRect(), d = devicePixelRatio || 1; canvas.width = r.width * d; canvas.height = r.height * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
  fit(); const ro = new ResizeObserver(fit); ro.observe(canvas);
  const draw = () => {
    const W = canvas.clientWidth, H = canvas.clientHeight; ctx.clearRect(0, 0, W, H);
    BARS.forEach((b, i) => {
      const wob = reduced ? 0 : Math.sin(t * .02 + i * 1.3) * .5 + Math.sin(t * .013 + i * .7) * .5;
      const h = Math.max(.1, Math.min(1, .45 + wob * .35 * (.4 + lv) + lv * .15));
      ctx.fillStyle = hot.has(i) || (i % 5 === Math.floor(t / 90) % 5 && lv > .3) ? accent : color;
      const bh = h * H; ctx.fillRect(b.x * W, align === 'bottom' ? H - bh : (H - bh) / 2, Math.max(1.5, b.w * W), bh);
    });
    t++; raf = requestAnimationFrame(draw);
  };
  draw();
  return { stop() { cancelAnimationFrame(raf); ro.disconnect(); }, set(n) { lv = n; }, hot(a) { hot = new Set(a); } };
}

/* ---------- icons ---------- */
const P = {
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  form: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  pen: '<path d="M4 20l1-4L17 4l3 3L8 19zM14 7l3 3"/>', chart: '<path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-8"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>', link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>', lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>', users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6 6 0 0 1 3.5 5.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>', settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  out: '<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M15 8l4 4-4 4M19 12H9"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', back: '<path d="M15 5l-7 7 7 7"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', alert: '<path d="M12 3l10 18H2zM12 10v5M12 18h.01"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  down: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>', print: '<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/>', eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', send: '<path d="M4 12l16-8-6 16-3-7z"/>', refresh: '<path d="M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/>', play: '<path d="M8 5l11 7-11 7z"/>',
  ticket: '<path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z"/><path d="M9 6v12" stroke-dasharray="2 2.5"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M8 14h2M12 14h2M8 17h2"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', edit: '<path d="M4 20l1-4L16 5l3 3L8 19zM13 8l3 3"/>',
};
export const ic = n => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;

/* ---------- api ---------- */
export async function api(method, path, body) {
  let r;
  try { r = await fetch('/api/' + path, { method, headers: { 'content-type': 'application/json', 'x-band': '1' }, body: body === undefined ? undefined : JSON.stringify(body), credentials: 'same-origin' }); }
  catch { throw Object.assign(new Error('No connection. Check your internet and try again.'), { code: 0 }); }
  let j = {}; try { j = await r.json(); } catch { }
  if (!r.ok) throw Object.assign(new Error(j.error || 'Something went wrong.'), { code: r.status });
  return j;
}

/* ---------- small ui ---------- */
export function toast(msg, bad) {
  const el = document.createElement('div'); el.className = 'toast' + (bad ? ' bad' : ''); el.textContent = msg; $('#toast').append(el);
  setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = 0; setTimeout(() => el.remove(), 300); }, bad ? 4200 : 2200);
}
export function modal(html, { onMount } = {}) {
  const m = document.createElement('div'); m.className = 'modal'; m.innerHTML = `<div class="box" role="dialog" aria-modal="true">${html}</div>`;
  const close = () => { m.remove(); removeEventListener('keydown', k); }; const k = e => { if (e.key === 'Escape') close(); };
  m.addEventListener('mousedown', e => { if (e.target === m) close(); }); addEventListener('keydown', k);
  document.body.append(m); m.close = close; onMount?.(m, close); return m;
}
export const debounce = (fn, ms = 600) => { let t; const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; d.flush = (...a) => { clearTimeout(t); return fn(...a); }; return d; };
export const ago = iso => { if (!iso) return ''; const s = (Date.now() - new Date(iso)) / 1000; if (s < 60) return 'now'; if (s < 3600) return Math.floor(s / 60) + 'm'; if (s < 86400) return Math.floor(s / 3600) + 'h'; return Math.floor(s / 86400) + 'd'; };
export const day = iso => { try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; } };
export const money = (n, cur = 'USD') => { try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, maximumFractionDigits: n % 1 ? 2 : 0 }).format(n || 0); } catch { return (n || 0) + ' ' + cur; } };
export const copyText = async t => { try { await navigator.clipboard.writeText(t); toast('Copied'); } catch { toast('Copy failed. Select it and press Ctrl+C.', true); } };

/* ---------- command palette ---------- */
let palItems = [], palSel = 0;
export function setPalette(items) { palItems = items; }
export function openPalette() {
  const pal = $('#pal'), inp = $('#palIn'), list = $('#palList'); pal.classList.add('on'); inp.value = ''; inp.focus(); render();
  function render() {
    const q = inp.value.trim().toLowerCase(), f = palItems.filter(i => !q || i.t.toLowerCase().includes(q) || (i.k || '').includes(q));
    palSel = Math.min(palSel, Math.max(0, f.length - 1)); list.innerHTML = f.length ? f.map((i, n) => `<button data-n="${n}" class="${n === palSel ? 'on' : ''}">${ic(i.i || 'arrow')}<span>${esc(i.t)}</span><em>${esc(i.h || '')}</em></button>`).join('') : '<p style="padding:18px;color:var(--mute)">Nothing matches.</p>';
    list.onclick = e => { const b = e.target.closest('button'); if (b) run(f[+b.dataset.n]); };
    inp.onkeydown = e => {
      if (e.key === 'Escape') close(); else if (e.key === 'ArrowDown') { palSel = Math.min(f.length - 1, palSel + 1); render(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { palSel = Math.max(0, palSel - 1); render(); e.preventDefault(); } else if (e.key === 'Enter' && f[palSel]) run(f[palSel]);
    };
    inp.oninput = () => { palSel = 0; render(); };
    list.querySelector('.on')?.scrollIntoView({ block: 'nearest' });
  }
  const close = () => pal.classList.remove('on'), run = i => { close(); i.run(); };
  pal.onmousedown = e => { if (e.target === pal) close(); };
}
addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && palItems.length) { e.preventDefault(); openPalette(); } });

/* ---------- markdown, just enough for the agreement ---------- */
export function md(text) {
  const out = []; let ul = false, id = 0; const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  for (const raw of String(text).split('\n')) {
    const l = raw.trimEnd();
    if (/^- /.test(l)) { if (!ul) { out.push('<ul>'); ul = true; } out.push(`<li>${inline(l.slice(2))}</li>`); continue; }
    if (ul) { out.push('</ul>'); ul = false; }
    if (/^## /.test(l)) out.push(`<h2 id="s${id++}">${inline(l.slice(3))}</h2>`); else if (/^# /.test(l)) out.push(`<h1>${inline(l.slice(2))}</h1>`); else if (l) out.push(`<p>${inline(l)}</p>`);
  }
  if (ul) out.push('</ul>'); return out.join('');
}
export const headings = text => String(text).split('\n').filter(l => /^## /.test(l)).map(l => l.slice(3));

/* ---------- charts: weekly spend as bars, results as a line, in plain svg ---------- */
export function chart(rows, { label = 'Results' } = {}) {
  const wk = [...new Set(rows.map(r => r.date))].sort(); if (!wk.length) return '';
  const spend = wk.map(d => rows.filter(r => r.date === d).reduce((a, r) => a + r.spend, 0)), res = wk.map(d => rows.filter(r => r.date === d).reduce((a, r) => a + r.results, 0));
  const W = 760, H = 240, L = 44, R = 44, T = 16, B = 30, iw = W - L - R, ih = H - T - B, mx = Math.max(1, ...spend), mr = Math.max(1, ...res), bw = Math.min(46, iw / wk.length * .55);
  const x = i => L + iw * (wk.length === 1 ? .5 : (i + .5) / wk.length), ys = v => T + ih - ih * v / mx, yr = v => T + ih - ih * v / mr;
  const grid = [0, .5, 1].map(g => `<line x1="${L}" x2="${W - R}" y1="${T + ih * g}" y2="${T + ih * g}" stroke="var(--rule)"/><text x="${L - 8}" y="${T + ih * g + 3}" text-anchor="end">${Math.round(mx * (1 - g))}</text><text x="${W - R + 8}" y="${T + ih * g + 3}">${Math.round(mr * (1 - g))}</text>`).join('');
  const line = res.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${yr(v)}`).join(' ');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Spend and ${esc(label)} by week">${grid}
    ${spend.map((v, i) => `<rect x="${x(i) - bw / 2}" y="${ys(v)}" width="${bw}" height="${T + ih - ys(v)}" rx="3" fill="var(--ink)" opacity=".85"/>`).join('')}
    <path d="${line}" fill="none" stroke="#10A862" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${res.map((v, i) => `<circle cx="${x(i)}" cy="${yr(v)}" r="4" fill="#10A862" stroke="var(--paper)" stroke-width="2"/>`).join('')}
    ${wk.map((d, i) => `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${esc(d.slice(5))}</text>`).join('')}</svg>
    <div class="legend"><span><i style="background:var(--ink)"></i>Ad spend (left)</span><span><i style="background:#10A862"></i>${esc(label)} (right)</span></div>`;
}

/* ---------- the status vocabulary, in one place ---------- */
export const STATE = {
  todo: ['To do', ''], submitted: ['Sent', 'ok'], help: ['Needs help', 'warn'], na: ['Not applicable', ''], verified: ['Verified', 'live'], 'needs-fix': ['Needs a fix', 'bad'],
};
export const KIND = { access: 'Access', assets: 'Material', data: 'Numbers', decide: 'Decision', admin: 'Admin' };

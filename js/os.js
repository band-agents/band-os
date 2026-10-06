/* band. OS — the desktop: boot, windows, dock, menus, the crew in the corner, and every app. */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const D = OS, R = BQ.reduced, small = () => innerWidth <= 760;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem('bos:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('bos:' + k, JSON.stringify(v)); } catch { } },
  };
  const gb = (n = 4, off = 0) => `<span class="g-bars" aria-hidden="true">${BQ.glyph(n, off, 70)}</span>`;
  const tileBars = (n, off = 0, k = 120) => BQ.glyph(n, off, k);
  const desk = $('#desk');
  const P = D.PEOPLE, byId = D.byId;
  let lastPointer = 'mouse', ios = null;                 // ios: the iPhone shell on phones (js/ios.js)
  addEventListener('pointerdown', e => { lastPointer = e.pointerType || 'mouse'; }, true);

  /* ---------- small helpers ---------- */
  let toastT;
  function toast(t, ms = 3200) { if (ios) return ios.toast(t, ms); const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), ms); }
  const gen = (vals, hot = []) => `<div class="gen" aria-hidden="true">${vals.map((v, i) => `<i class="${hot.includes(i) ? 'g' : ''}" style="height:${Math.max(3, v * 100)}%;flex-grow:${(BQ.BARS[i % 11].w * 100).toFixed(1)}"></i>`).join('')}</div>`;
  const CH = {
    volcom: { v: [.3, .3, .3, .3, .3, 1, 1, 1, 1, 1, 1], hot: [5, 6, 7, 8, 9, 10], lab: [['€18,892', 'ad spend'], ['€63,034', 'sales · 30 days']], note: 'To scale.' },
    ashya: { v: [.062, .062, .062, .062, 1, 1, 1, 1, 1, 1, 1], hot: [4, 5, 6, 7, 8, 9, 10], lab: [['EGP 260K', 'a month, before'], ['EGP 4.2M', 'a month, 18 months later']], note: 'To scale.' },
    roas16: { v: [.0625, .0625, .0625, 1, 1, 1, 1, 1, 1, 1, 1], hot: [3, 4, 5, 6, 7, 8, 9, 10], lab: [['×1', 'ad spend'], ['×16', 'return at peak']], note: 'To scale.' },
    installs: { v: [1, 1, 1, 1, 1, .2, .2, .2, .2, .2, .2], hot: [5, 6, 7, 8, 9, 10], lab: [['Before', 'cost per install'], ['−80%', 'after']], note: 'To scale.' },
    markets: { v: [.55, .02, .55, .02, .55, .02, .02, 1, 1, 1, 1], hot: [7, 8, 9, 10], lab: [['EG · JO · KW', 'three stores'], ['1', 'Shopify build']], note: '' },
    fig: { v: [.251, .251, .02, 1, 1, .02, .064, .064, .02, .009, .009], hot: [3, 4], lab: [['6,730', 'products'], ['26,829', 'sizes & colours'], ['1,706', 'customers'], ['246', 'categories']], note: 'To scale.' },
  };
  function chart(k) {
    const c = CH[k]; if (!c) return '';
    return `<div class="chart"><div class="bars">${c.v.map((v, i) => `<i class="${c.hot.includes(i) ? 'g' : ''}" style="height:${Math.max(1.5, v * 100)}%;flex-grow:${(BQ.BARS[i].w * 100).toFixed(1)};animation-delay:${i * 40}ms"></i>`).join('')}</div>
      <div class="lab mono">${c.lab.map(([a, b]) => `<span><b>${a}</b> ${b}</span>`).join('')}</div>${c.note ? `<div class="mono" style="color:var(--mute);margin-top:6px">${c.note}</div>` : ''}</div>`;
  }
  const mini = k => CH[k] ? `<div class="mini">${CH[k].v.map((v, i) => `<i class="${CH[k].hot.includes(i) ? 'g' : ''}" style="height:${Math.max(3, v * 100)}%;animation-delay:${i * 30}ms"></i>`).join('')}</div>` : '';
  const cover = (p, cls = '') => p.cover ? `<img class="${cls}" src="${p.cover.src}" alt="${esc(p.cover.cap)}" loading="lazy">` : gen(CH[p.chart?.k]?.v || [1, .6, .8, .4, 1, .7, .5, .9, .6, 1, .8], CH[p.chart?.k]?.hot || []);
  const whoChip = id => `<button class="who" data-person="${id}"><img src="${P[id].head}" alt="">${P[id].name} <small>${P[id].role}</small></button>`;
  const NEED = { ecommerce: 'Store', software: 'Software', brand: 'Brand', media: 'Media', ai: 'AI content', lab: 'Creative tech' };

  /* ---------- window manager ---------- */
  let z = 20, count = 0;
  const W = {};
  const deskBox = () => ({ w: desk.clientWidth, h: desk.clientHeight - parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dockh')) - 6 });
  // Big windows (the Finder, Gallery, Quick Look, projects) open almost full-screen, centred; small ones cascade.
  function place(el, w, h, id, big) {
    const b = deskBox(), n = count++ % 7;
    let x, y;
    if (big) {
      w = Math.min(w, b.w - 32); h = Math.min(h || 9999, b.h - 14);
      const k = Object.values(W).filter(o => o.def.big && !o.min).length % 4;     // nudge stacked big windows a little
      x = (b.w - w) / 2 + k * 22; y = 6 + k * 14; h -= k * 14;
    } else {
      w = Math.min(w, b.w - 16); h = Math.min(h, b.h - 16);
      x = (b.w - w) / 2 + (n - 3) * 30; y = 16 + n * 22;
    }
    x = Math.max(8, Math.min(b.w - w - 8, x)); y = Math.max(6, Math.min(b.h - h - 4, y));
    Object.assign(el.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
  }
  function front(win) {
    if (!win) return;
    Object.values(W).forEach(w => w.el.classList.remove('front'));
    win.el.classList.add('front'); win.el.style.zIndex = ++z;
    const h = win.id.startsWith('case:') ? win.id.slice(5) : win.id === 'work' ? (win.state.pid || (win.state.folder !== 'all' ? win.state.folder : '')) : null;
    if (h != null) try { history.replaceState(null, '', h ? '#' + h : location.pathname); } catch { }
  }
  const topWin = () => Object.values(W).filter(w => !w.min).sort((a, b) => b.el.style.zIndex - a.el.style.zIndex)[0];
  function openWin(id, opts = {}) {
    if (ios) return ios.open(id, opts);
    if (W[id]) {
      const w = W[id]; if (w.min) restore(w); front(w); w.def.update?.(w, opts);
      if (!R && !opts.quiet) w.el.animate([{ transform: 'none' }, { transform: 'scale(1.012)' }, { transform: 'none' }], { duration: 260 });
      return w;
    }
    const def = APP(id); if (!def) return;
    const el = document.createElement('section'); el.className = 'win'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', def.title);
    el.innerHTML = `<div class="tb">${gb(4, (id.length * 3) % 7)}<span class="ttl"></span><span class="ctl"><button class="mn" aria-label="Minimise">–</button><button class="mx" aria-label="Zoom">▢</button><button class="x" aria-label="Close">✕</button></span></div><div class="body ${def.flex ? 'flex' : ''}"></div><span class="grip" aria-hidden="true"></span>`;
    desk.append(el);
    const win = { id, el, def, body: $('.body', el), state: {}, cleanup: [], min: false, max: false,
      title(t) { $('.ttl', el).textContent = t; el.setAttribute('aria-label', t); },
      close: () => closeWin(win) };
    win.title(def.title);
    W[id] = win;
    place(el, def.w || 760, def.big ? def.h : def.h || 560, id, def.big);
    front(win);
    def.render(win, opts);
    wire(win);
    const from = opts.from;
    if (!R) {
      if (from && from.getBoundingClientRect && !small()) {
        const a = from.getBoundingClientRect(), b = el.getBoundingClientRect(); el.style.transformOrigin = '0 0';
        el.animate([{ transform: `translate(${a.left - b.left}px,${a.top - b.top}px) scale(${Math.max(.05, a.width / b.width)},${Math.max(.05, a.height / b.height)})`, opacity: .3 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' });
      } else el.animate(small() ? [{ transform: 'translateY(40px)', opacity: 0 }, { transform: 'none', opacity: 1 }] : [{ transform: 'scale(.96)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: 'ease-out' });
    }
    dockSync(); crewReact(id, opts);
    return win;
  }
  function closeWin(win) {
    if (win?.ios) return ios.close(win);
    if (!W[win.id] || W[win.id] !== win) return;
    delete W[win.id]; win.cleanup.forEach(f => { try { f(); } catch { } });
    const done = () => { win.el.remove(); dockSync(); front(topWin()); };
    if (R) done(); else win.el.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(24px) scale(.94)' }], { duration: 200, easing: 'ease-in' }).onfinish = done;
    dockSync();
  }
  function minimise(win) {
    win.min = true;
    const d = $('#dock').getBoundingClientRect(), b = win.el.getBoundingClientRect();
    const fin = () => { win.el.style.display = 'none'; dockSync(); front(topWin()); };
    if (R) fin(); else win.el.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${d.left + d.width / 2 - b.left - b.width / 2}px,${d.top - b.top}px) scale(.08)`, opacity: .2 }], { duration: 320, easing: 'cubic-bezier(.5,0,.8,.4)' }).onfinish = fin;
  }
  function restore(win) { win.min = false; win.el.style.display = ''; front(win); dockSync(); if (!R) win.el.animate([{ transform: 'translateY(60px) scale(.9)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: 'ease-out' }); }
  function toggleMax(win) {
    if (small()) return;
    const el = win.el;
    if (!win.max) { win.prev = [el.style.left, el.style.top, el.style.width, el.style.height]; const b = deskBox(); Object.assign(el.style, { left: '8px', top: '8px', width: b.w - 16 + 'px', height: b.h - 12 + 'px' }); }
    else[el.style.left, el.style.top, el.style.width, el.style.height] = win.prev;
    win.max = !win.max; el.classList.toggle('max', win.max);
  }
  function wire(win) {
    const el = win.el, tb = $('.tb', el);
    el.addEventListener('pointerdown', () => front(win));
    $('.x', el).onclick = e => { e.stopPropagation(); closeWin(win); };
    $('.mn', el).onclick = e => { e.stopPropagation(); if (small()) closeWin(win); else minimise(win); };
    $('.mx', el).onclick = e => { e.stopPropagation(); toggleMax(win); };
    tb.addEventListener('dblclick', e => { if (!e.target.closest('.ctl')) toggleMax(win); });
    let sx, sy, ox, oy, on = false;
    tb.addEventListener('pointerdown', e => { if (small() || e.target.closest('.ctl') || win.max) return; on = true; sx = e.clientX; sy = e.clientY; ox = el.offsetLeft; oy = el.offsetTop; tb.setPointerCapture(e.pointerId); tb.style.cursor = 'grabbing'; });
    tb.addEventListener('pointermove', e => { if (!on) return; const b = deskBox(); el.style.left = Math.max(-el.offsetWidth + 90, Math.min(b.w - 90, ox + e.clientX - sx)) + 'px'; el.style.top = Math.max(0, Math.min(b.h - 42, oy + e.clientY - sy)) + 'px'; });
    tb.addEventListener('pointerup', () => { on = false; tb.style.cursor = ''; });
    const g = $('.grip', el); let rs = null;
    g.addEventListener('pointerdown', e => { e.stopPropagation(); rs = [e.clientX, e.clientY, el.offsetWidth, el.offsetHeight]; g.setPointerCapture(e.pointerId); });
    g.addEventListener('pointermove', e => { if (!rs) return; el.style.width = Math.max(320, rs[2] + e.clientX - rs[0]) + 'px'; el.style.height = Math.max(240, rs[3] + e.clientY - rs[1]) + 'px'; });
    g.addEventListener('pointerup', () => { rs = null; });
    // people chips and data-open links anywhere inside a window
    el.addEventListener('click', e => {
      const p = e.target.closest('[data-person]'); if (p) { openWin('team', { person: p.dataset.person, from: p }); return; }
      const c = e.target.closest('[data-case]'); if (c) { openCase(c.dataset.case, { from: c.querySelector('img') || c }); return; }
      const a = e.target.closest('[data-app]'); if (a) openApp(a.dataset.app, a);
    });
  }

  /* ---------- apps ---------- */
  // Projects open inside Work (the Finder), so the folders and the other files stay one click away.
  function openCase(pid, o = {}) {
    if (!byId[pid]) return;
    const w = openWin('work', { pid, from: o.from, quiet: o.quiet });
    if (w && o.tab) setTab($('.scroll', w.body), o.tab);
    return w;
  }
  function openApp(name, from) {
    const m = { work: ['work', { folder: 'all' }], gallery: ['photos', {}], photos: ['photos', {}], results: ['results', {}], services: ['services', {}], team: ['team', {}], crew: ['team', {}],
      readme: ['readme', {}], contact: ['mail', {}], mail: ['mail', {}], terminal: ['terminal', {}], trash: ['trash', {}], about: ['about', {}] }[name];
    if (m) return openWin(m[0], { ...m[1], from });
    if (D.FOLDERS.some(f => f[0] === name)) return openWin('work', { folder: name, from });
    if (byId[name]) return openCase(name, { from });
  }
  function APP(id) {
    if (id.startsWith('case:')) return byId[id.slice(5)] && { title: byId[id.slice(5)].name, w: 1180, big: true, render: renderCase, update: (w, o) => o.tab && setTab(w.body, o.tab) };
    return {
      work: { title: 'Work', w: 1320, big: true, flex: true, render: renderFinder, update: (w, o) => finderGo(w, o) },
      photos: { title: 'Gallery', w: 1260, big: true, flex: true, render: renderPhotos, update: (w, o) => o.pid && photosGo(w, o.pid) },
      preview: { title: 'Preview', w: 1500, big: true, render: renderPreview, update: (w, o) => { Object.assign(w.state, o, { fit: null }); drawPreview(w); } },
      results: { title: 'Results', w: 960, h: 640, render: renderResults },
      services: { title: 'Services', w: 900, h: 620, flex: true, render: renderServices, update: (w, o) => o.id && servicesGo(w, o.id) },
      team: { title: 'The crew', w: 880, h: 640, flex: true, render: renderTeam, update: (w, o) => o.person && teamGo(w, o.person) },
      readme: { title: 'Readme.txt', w: 640, h: 620, render: renderReadme, update: (w, o) => o.at && $('#' + o.at, w.body)?.scrollIntoView({ behavior: 'smooth' }) },
      terminal: { title: 'Terminal — guest@band-os', w: 660, h: 420, render: renderTerminal },
      mail: { title: 'New build', w: 620, h: 600, render: renderMail, update: (w, o) => o.need && pressNeed(w, o.need) },
      trash: { title: 'Trash', w: 440, h: 340, render: renderTrash },
      about: { title: 'About band. OS', w: 360, h: 330, render: renderAbout },
    }[id];
  }

  /* Work (the Finder): folders on the left, files on the right, and projects open right here */
  const folderName = k => (D.FOLDERS.find(f => f[0] === k) || D.FOLDERS[0])[1];
  const inFolder = k => D.PROJECTS.filter(p => k === 'all' || p.folder === k);
  function renderFinder(win, o) {
    const s = win.state = { folder: 'all', person: null, pid: null, q: '', view: store.get('view', 'grid'), back: [], fwd: [] };
    win.body.innerHTML = `<div class="side" role="navigation" aria-label="Folders"></div>
      <div class="main"><div class="tools"><button class="tbtn bk" aria-label="Back" title="Back">‹</button><button class="tbtn fw" aria-label="Forward" title="Forward">›</button><nav class="crumbs" aria-label="Where you are"></nav>
      <span class="pnav"><button class="tbtn pv" title="Previous in this folder">‹ Previous</button><button class="tbtn nx" title="Next in this folder">Next ›</button><button class="tbtn po" title="Open in its own window">Pop out ↗</button></span>
      <span class="vnav"><button class="tbtn vg" aria-label="Icons" title="Icons">▦</button><button class="tbtn vl" aria-label="List" title="List">☰</button></span>
      <input class="search" type="search" placeholder="Search all work" aria-label="Search all work"></div>
      <div class="scroll"></div><div class="status mono"></div></div>`;
    const b = win.body;
    $('.side', b).addEventListener('click', e => {
      const f = e.target.closest('[data-f]'), p = e.target.closest('[data-p]'), l = e.target.closest('[data-leaf]');
      if (l) finderGo(win, { pid: l.dataset.leaf, keep: true }); else if (f) finderGo(win, { folder: f.dataset.f }); else if (p) finderGo(win, { person: p.dataset.p });
    });
    $('.crumbs', b).addEventListener('click', e => { const c = e.target.closest('[data-crumb]'); if (c) finderGo(win, c.dataset.crumb === 'person' ? { person: s.person } : { folder: c.dataset.crumb }); });
    const hist = (from, to) => { if (!from.length) return; to.push([s.folder, s.person, s.pid]); [s.folder, s.person, s.pid] = from.pop(); drawFinder(win); };
    $('.bk', b).onclick = () => hist(s.back, s.fwd);
    $('.fw', b).onclick = () => hist(s.fwd, s.back);
    $('.pv', b).onclick = () => stepFinder(win, -1);
    $('.nx', b).onclick = () => stepFinder(win, 1);
    $('.po', b).onclick = e => s.pid && openWin('case:' + s.pid, { from: e.currentTarget });
    $('.vg', b).onclick = () => { s.view = 'grid'; store.set('view', 'grid'); drawFinder(win); };
    $('.vl', b).onclick = () => { s.view = 'list'; store.set('view', 'list'); drawFinder(win); };
    $('.search', b).oninput = e => { s.q = e.target.value.trim().toLowerCase(); if (s.pid && s.q) { s.back.push([s.folder, s.person, s.pid]); s.pid = null; s.folder = 'all'; s.person = null; } drawFinder(win); };
    win.el.addEventListener('keydown', e => {                       // ← → flip through the folder while a project is open
      if (!s.pid || /INPUT|TEXTAREA/.test(e.target.tagName) || W.preview) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); stepFinder(win, e.key === 'ArrowRight' ? 1 : -1); }
      if (e.key === 'Backspace') { e.preventDefault(); hist(s.back, s.fwd); }
    });
    finderGo(win, o, true);
  }
  function finderGo(win, o, first) {
    const s = win.state;
    if (!o.folder && !o.person && !o.pid) return drawFinder(win);
    const was = [s.folder, s.person, s.pid];
    if (o.pid) {
      const p = byId[o.pid]; if (!p) return;
      if (!o.keep || (s.folder !== 'all' && s.folder !== p.folder) || (s.person && !p.people.includes(s.person))) { s.folder = p.folder; s.person = null; }
      s.pid = o.pid;
    } else if (o.person) { s.person = o.person; s.folder = 'all'; s.pid = null; }
    else { s.folder = o.folder; s.person = null; s.pid = null; }
    if (!first && was.join() !== [s.folder, s.person, s.pid].join()) { s.back.push(was); s.fwd = []; }
    if (s.pid) { s.q = ''; const i = $('.search', win.body); if (i) i.value = ''; }
    drawFinder(win);
    if (s.pid && was[2] !== s.pid) crewReact('case:' + s.pid, {});
  }
  function siblings(s) { return D.PROJECTS.filter(p => (s.folder === 'all' || p.folder === s.folder) && (!s.person || p.people.includes(s.person))); }
  function stepFinder(win, d) {
    const s = win.state; if (!s.pid) return;
    const l = siblings(s), i = l.findIndex(p => p.id === s.pid); if (!l.length) return;
    finderGo(win, { pid: l[(i + d + l.length) % l.length].id, keep: true });
  }
  function drawSide(win) {
    const s = win.state;
    const leaves = list => `<div class="sub">${list.map(p => `<button data-leaf="${p.id}" class="${p.id === s.pid ? 'on' : ''}">${p.cover ? `<img src="${p.cover.src}" alt="">` : '<i></i>'}<span>${esc(p.name)}</span></button>`).join('')}</div>`;
    $('.side', win.body).innerHTML = `<h6>Work</h6>${D.FOLDERS.map(([k, n]) => {
      const open = !s.person && s.folder === k, on = open && !s.pid;
      return `<button data-f="${k}" class="${on ? 'on' : open ? 'open' : ''}" aria-expanded="${open}">${gb(3, k.length % 6)}${n}<em>${inFolder(k).length}</em></button>${open && k !== 'all' ? leaves(inFolder(k)) : ''}`;
    }).join('')}<h6>People</h6>${Object.values(P).map(p => {
      const open = s.person === p.id;
      return `<button data-p="${p.id}" class="${open && !s.pid ? 'on' : open ? 'open' : ''}"><img src="${p.head}" alt="">${p.name}<em>${D.PROJECTS.filter(x => x.people.includes(p.id)).length}</em></button>${open ? leaves(D.PROJECTS.filter(x => x.people.includes(p.id))) : ''}`;
    }).join('')}`;
    const side = $('.side', win.body), on = $('.sub .on', side) || $('.on', side);
    if (on && !small()) { const t = on.offsetTop - side.offsetTop; if (t < side.scrollTop || t > side.scrollTop + side.clientHeight - 40) side.scrollTop = t - 80; }
    win.body.scrollTop = 0;
  }
  function drawFinder(win) {
    const s = win.state, b = win.body, sc = $('.scroll', b), st = $('.status', b);
    const fname = s.person ? P[s.person].name + '’s work' : folderName(s.folder);
    const sib = siblings(s);
    const list = s.q ? D.PROJECTS.filter(p => [p.name, p.kind, p.market, p.tagline, folderName(p.folder)].join(' ').toLowerCase().includes(s.q)) : sib;
    const p = s.pid && byId[s.pid];
    drawSide(win);
    const home = s.person ? `<span>People</span> › <button data-crumb="person">${esc(fname)}</button>` : `<button data-crumb="all">Work</button>${s.folder !== 'all' ? ` › <button data-crumb="${s.folder}">${esc(fname)}</button>` : ''}`;
    $('.crumbs', b).innerHTML = s.q ? `<button data-crumb="all">Work</button> › <b>Search: “${esc(s.q)}”</b>` : p ? `${home} › <b>${esc(p.name)}</b>` : home;
    $('.bk', b).disabled = !s.back.length; $('.fw', b).disabled = !s.fwd.length;
    $('.pnav', b).hidden = !p; $('.vnav', b).hidden = !!p;
    $('.vg', b).classList.toggle('on', s.view === 'grid'); $('.vl', b).classList.toggle('on', s.view === 'list');
    win.title(p ? p.name : s.q ? 'Search' : s.person ? P[s.person].name : fname);
    if (W.work === win) front(win);
    if (p) {
      const i = sib.findIndex(x => x.id === p.id), prev = sib[(i - 1 + sib.length) % sib.length], next = sib[(i + 1) % sib.length];
      sc.innerHTML = caseHTML(p, prev, next, true);
      wireCase(sc, p, id => finderGo(win, { pid: id, keep: true }));
      setTab(sc, 'overview', true); sc.scrollTop = 0;
      $('.pv', b).title = 'Previous: ' + prev.name; $('.nx', b).title = 'Next: ' + next.name;
      st.textContent = `${p.name} · ${i + 1} of ${sib.length} in ${fname} · ← → to flip through · ‹ to go back`;
      return;
    }
    const intro = !s.q && !s.person ? `<div class="intro"><b>${esc(fname)}</b><span>${s.folder === 'all' ? 'Pick a folder on the left, or click any project to open it right here. ‹ takes you back.' : `${list.length} project${list.length === 1 ? '' : 's'}. Click one to open it; the others stay in the sidebar.`}</span></div>` : '';
    if (!list.length) sc.innerHTML = `<div class="empty">Nothing here matches “${esc(s.q)}”.</div>`;
    else if (s.view === 'grid') sc.innerHTML = intro + (s.folder === 'all' && !s.q && !s.person
      ? D.FOLDERS.slice(1).map(([k, n]) => `<section class="grp"><button class="gh" data-f="${k}"><b>${n}</b><em>${inFolder(k).length}</em><span>Open folder ›</span></button><div class="tiles">${inFolder(k).map(tile).join('')}</div></section>`).join('')
      : `<div class="tiles">${list.map(tile).join('')}</div>`);
    else sc.innerHTML = intro + `<table class="list"><thead><tr><th>Name</th><th>Folder</th><th>Kind</th><th>Where</th><th>Made by</th></tr></thead><tbody>${list.map(p => `<tr class="tile-row" data-id="${p.id}" tabindex="0"><td>${p.cover ? `<img src="${p.cover.src}" alt="">` : ''}${esc(p.name)}</td><td>${esc(folderName(p.folder))}</td><td>${esc(p.kind)}</td><td>${esc(p.market)}</td><td>${p.people.map(id => P[id].name).join(', ') || '—'}</td></tr>`).join('')}</tbody></table>`;
    sc.scrollTop = 0;
    st.textContent = `${list.length} item${list.length === 1 ? '' : 's'} · click to open`;
    $$('.gh', sc).forEach(g => g.onclick = () => finderGo(win, { folder: g.dataset.f }));
    $$('[data-id]', sc).forEach(t => {
      const openIt = () => finderGo(win, { pid: t.dataset.id, keep: !s.q });
      t.addEventListener('click', openIt);
      t.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); openIt(); } });
      t.addEventListener('pointerenter', () => { const q = byId[t.dataset.id]; st.textContent = `${q.name} — ${q.kind}, ${q.market} · click to open`; });
    });
  }
  const tile = p => `<button class="tile ${p.feed ? 'ig' : ''}" data-id="${p.id}"><span class="cv">${cover(p)}<span class="chip k">${esc(p.kind)}</span></span><b>${esc(p.name)}</b><small>${esc(p.tagline)}</small></button>`;

  /* A project: the same page inside Work and in its own window */
  function caseHTML(p, prev, next) {
    const hasNum = p.numbers?.length || p.chart, split = p.cover && (p.cover.k === 'f' || p.cover.k === 'p');
    const deck = p.gallery.length && p.gallery.every(g => g.k === 'g'), unit = p.feed ? 'images' : deck ? 'slides' : 'screens';
    return `<article class="case">
      <div class="hero ${split ? 'split' : ''}">${split ? `<img class="bg" src="${p.cover.src}" alt=""><img class="fg" src="${p.cover.src}" alt="${esc(p.cover.cap)}">` : cover(p).replace('loading="lazy"', 'fetchpriority="high"')}<div class="cap"><div><span class="chip k">${esc(p.kind)} · ${esc(p.market)}</span><h1>${esc(p.name)}</h1><p>${esc(p.tagline)}</p></div>
        <div class="acts">${p.gallery.length ? `<button class="btn o" data-tab="screens">▦ ${p.gallery.length} ${unit}</button>` : ''}<button class="btn g" data-ask>Ask bqnd</button></div></div></div>
      <nav class="tabs" role="tablist"><button data-tab="overview" role="tab">Overview</button>${p.gallery.length ? `<button data-tab="screens" role="tab">${p.feed ? 'All images' : deck ? 'Slides' : 'Screens'}<em>${p.gallery.length}</em></button>` : ''}${hasNum ? '<button data-tab="numbers" role="tab">Numbers</button>' : ''}</nav>
      <div class="pad" data-panel="overview">
        <div class="meta">${p.facts.map(([k, v]) => `<div><small>${esc(k)}</small><b>${esc(v)}</b></div>`).join('')}</div>
        <div class="cols"><div class="about">${p.about.map(x => `<p>${esc(x)}</p>`).join('')}</div>
          <aside>${p.people.length ? `<div><h6>Made by</h6><div class="whos">${p.people.map(whoChip).join('')}</div></div>` : ''}
            ${p.numbers ? `<div><h6>In numbers</h6><div class="nums">${p.numbers.slice(0, 4).map(([v, l]) => `<div><b>${esc(v)}</b><small>${esc(l)}</small></div>`).join('')}</div></div>` : ''}
            ${p.see?.length ? `<div><h6>See also</h6><div class="links">${p.see.filter(id => byId[id]).map(id => `<button class="btn o" data-go="${id}">${esc(byId[id].name)} · ${esc(byId[id].kind)} →</button>`).join('')}</div></div>` : ''}
            <div><h6>Next step</h6><div class="links">${(p.links || []).map(([t, h]) => `<a class="btn o" href="${h}" target="_blank" rel="noopener">${esc(t)} ↗</a>`).join('')}<button class="btn" data-similar>Start a similar build</button></div></div></aside></div>
        ${p.feed ? feedHTML(p) : ''}
        ${p.chart && !p.features.length ? `<div style="margin-top:26px">${chart(p.chart.k)}</div>` : ''}
        ${p.features.length ? `<h6 class="sech" style="margin-top:34px">What’s in it</h6>` : ''}<div class="feats">${p.features.map((f, n) => `<section class="feat ${f.imgs.every(m => m.k === 'g') ? 'deck' : ''}"><div class="vis">${frames(f.imgs)}</div><div class="txt"><small>${String(n + 1).padStart(2, '0')}</small><h3>${esc(f.t)}</h3><p>${esc(f.x)}</p></div></section>`).join('')}</div>
        <nav class="next" aria-label="More work"><button data-go="${prev.id}">${cover(prev)}<span><small>‹ Previous</small><b>${esc(prev.name)}</b></span></button><button data-go="${next.id}"><span><small>Next ›</small><b>${esc(next.name)}</b></span>${cover(next)}</button></nav>
      </div>
      <div class="pad" data-panel="screens" hidden><p class="hint2">Click any ${p.feed ? 'image' : deck ? 'slide' : 'screen'} to open it big. Use ← → to flip through.</p><div class="shots">${p.gallery.map(shot).join('')}</div></div>
      ${hasNum ? `<div class="pad" data-panel="numbers" hidden>${p.numbers ? `<div class="nums" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:16px">${p.numbers.map(([v, l]) => `<div><b>${esc(v)}</b><small>${esc(l)}</small></div>`).join('')}</div>` : ''}${p.chart ? chart(p.chart.k) : ''}
        <p class="mono" style="color:var(--mute);margin-top:14px">Real figures from the work. Nothing rounded up.</p>${p.people.length ? `<div class="whos" style="display:flex;gap:6px;margin-top:10px">${p.people.map(whoChip).join('')}</div>` : ''}</div>` : ''}
    </article>`;
  }
  // An Instagram profile, the way it reads on a phone: avatar, highlights, then the grid
  function feedHTML(p) {
    const f = p.feed;
    return `<section class="ig"><h6 class="sech">The feed</h6><div class="igp"><div class="igh"><img class="av" src="${f.avatar}" alt="${esc(f.name)}"><div><b>${esc(f.handle)}</b><span>${esc(f.name)}${f.site ? ` · ${esc(f.site)}` : ''}</span><span class="igs"><b>${f.stats?.posts || f.posts.length}</b> posts <b>${f.stats?.followers || ""}</b> followers <b>${f.stats?.following || ""}</b> following</span></div></div>
      <div class="hls">${f.highlights.map((h, i) => `<button class="hl" data-hl="${i}"><img src="${h.src}" alt=""><span>${esc(h.label)}</span></button>`).join('')}</div>
      <div class="grid3">${f.posts.map((x, i) => `<button class="post" data-post="${i}" aria-label="Post ${i + 1}: ${esc(x.cap)}"><img src="${x.thumb}" alt="" loading="lazy">${x.slides.length > 1 ? `<i class="car">${x.slides.length}</i>` : ''}<span class="pc">${esc(x.cap)}</span></button>`).join('')}</div></div></section>`;
  }
  function wireCase(root, p, nav) {
    $$('[data-tab]', root).forEach(t => t.onclick = () => setTab(root, t.dataset.tab));
    $('[data-ask]', root).onclick = () => { openPal(); asst.ask('Tell me about ' + p.name); };
    $('[data-similar]', root).onclick = e => openWin('mail', { need: NEED[p.service], from: e.currentTarget, about: p.name });
    $$('[data-go]', root).forEach(x => x.onclick = e => { e.stopPropagation(); nav(x.dataset.go); });
    const look = (list, i, from) => openWin('preview', { list, i: Math.max(0, i), pid: p.id, from });
    $$('.frame,.shot', root).forEach(f => f.addEventListener('click', e => {
      if (e.target.closest('.sc') && f.classList.contains('p') && e.detail > 1) return;
      const src = f.dataset.src, list = p.gallery.some(g => g.src === src) ? p.gallery : [...new Map(p.features.flatMap(x => x.imgs).map(m => [m.src, m])).values()];
      look(list, list.findIndex(g => g.src === src), f);
    }));
    $$('.post', root).forEach(x => x.onclick = () => { const n = +x.dataset.post + 1; look(p.gallery, p.gallery.findIndex(g => g.post === n), x); });
    $$('.hl', root).forEach(x => x.onclick = () => look(p.feed.highlights.map(h => ({ src: h.src, cap: 'Highlight cover: ' + h.label, k: 'f' })), +x.dataset.hl, x));
  }

  /* A project in its own window (Pop out) */
  function renderCase(win, o) { win.state.pid = win.id.slice(5); drawCase(win, o.tab || 'overview'); }
  function drawCase(win, tab) {
    const p = byId[win.state.pid], b = win.body; win.title(p.name);
    const i = D.PROJECTS.indexOf(p), prev = D.PROJECTS[(i - 1 + D.PROJECTS.length) % D.PROJECTS.length], next = D.PROJECTS[(i + 1) % D.PROJECTS.length];
    b.innerHTML = caseHTML(p, prev, next);
    wireCase(b, p, id => navCase(win, id));
    setTab(b, tab, true);
  }
  function frames(imgs) {
    const phones = imgs.filter(m => m.k === 'p').length;
    return imgs.map(m => m.k === 'p'
      ? `<figure class="frame p ${phones === 1 ? 'one' : ''}" data-src="${m.src}" title="Scroll inside, or click to open big"><div class="sc"><img src="${m.src}" alt="${esc(m.cap)}" loading="lazy"></div><figcaption>${esc(m.cap)}</figcaption></figure>`
      : `<figure class="frame ${m.k}" data-src="${m.src}" title="Scroll inside, or click to open big">${m.k === 'd' ? '<div class="fb"><i></i><i></i><i></i></div>' : ''}<div class="sc">${m.v ? `<video src="${m.v}" poster="${m.src}" muted loop autoplay playsinline preload="metadata" aria-label="${esc(m.cap)}"></video>` : `<img src="${m.src}" alt="${esc(m.cap)}" loading="lazy">`}</div><figcaption>${m.v ? '▶ ' : ''}${esc(m.cap)}</figcaption></figure>`).join('');
  }
  const shot = g => `<button class="shot ${g.k === 'p' ? '' : g.post ? 'sq' : 'w'}" data-src="${g.src}"><span class="i"><img src="${g.thumb || g.src}" alt="${esc(g.cap)}" loading="lazy">${g.of > 1 ? `<i class="car">${g.n}/${g.of}</i>` : ''}${g.v ? '<i class="car">▶ Motion</i>' : ''}</span><span>${esc(g.cap)}</span></button>`;
  function setTab(root, tab, quiet) {
    if (!root) return; if (!$(`[data-panel="${tab}"]`, root)) tab = 'overview';
    $$('[data-panel]', root).forEach(x => x.hidden = x.dataset.panel !== tab);
    $$('.tabs [data-tab]', root).forEach(x => { x.classList.toggle('on', x.dataset.tab === tab); x.setAttribute('aria-selected', x.dataset.tab === tab); });
    if (tab !== 'overview' && !quiet) { const t = $('.tabs', root); root.scrollTo({ top: t.offsetTop, behavior: R ? 'auto' : 'smooth' }); }
  }
  function navCase(win, pid) {
    const nid = 'case:' + pid;
    if (W[nid]) { closeWin(win); front(W[nid]); return; }
    delete W[win.id]; win.id = nid; W[nid] = win; win.state.pid = pid; drawCase(win, 'overview'); win.body.scrollTop = 0; dockSync(); crewReact(nid, {}); front(win);
  }

  /* Quick Look: one big viewer with arrows, a filmstrip and the full caption */
  function renderPreview(win, o) {
    Object.assign(win.state, { list: o.list, i: o.i || 0, pid: o.pid, fit: null });
    win.body.innerHTML = `<div class="pv"><div class="tools"><button class="tbtn pr" aria-label="Previous">‹</button><button class="tbtn nx" aria-label="Next">›</button><span class="cap"></span>
      <button class="tbtn ft">Fit</button><button class="tbtn op">Open project</button></div>
      <div class="sw"><div class="stage"><img alt=""><video muted loop playsinline controls hidden></video></div><button class="arw l" aria-label="Previous">‹</button><button class="arw r" aria-label="Next">›</button></div>
      <p class="long"></p><div class="strip" role="listbox" aria-label="All images"></div></div>`;
    const b = win.body;
    $$('.pr,.arw.l', b).forEach(x => x.onclick = () => stepPreview(win, -1)); $$('.nx,.arw.r', b).forEach(x => x.onclick = () => stepPreview(win, 1));
    $('.ft', b).onclick = () => { win.state.fit = !$('.pv', b).classList.contains('fit'); drawPreview(win, true); };
    $('.op', b).onclick = () => win.state.pid && openCase(win.state.pid);
    $('.strip', b).addEventListener('click', e => { const t = e.target.closest('[data-i]'); if (t) { win.state.i = +t.dataset.i; win.state.fit = null; drawPreview(win); } });
    drawPreview(win);
  }
  function stepPreview(win, d) { const s = win.state; s.i = (s.i + d + s.list.length) % s.list.length; s.fit = null; drawPreview(win); }
  function drawPreview(win, keep) {
    const s = win.state, b = win.body, m = s.list[s.i], p = byId[s.pid];
    const img = $('.stage img', b), vid = $('.stage video', b); img.alt = m.cap; img.hidden = !!m.v; vid.hidden = !m.v;
    if (m.v) { if (vid.getAttribute('src') !== m.v) { vid.poster = m.src; vid.src = m.v; } vid.play().catch(() => { }); img.removeAttribute('src'); } else { vid.pause(); vid.removeAttribute('src'); img.src = m.src; }
    const short = m.cap.length > 70 ? m.cap.slice(0, 68).replace(/\s+\S*$/, '') + '…' : m.cap;
    $('.cap', b).innerHTML = `${esc(m.of > 1 ? `Post ${m.post}, ${m.n} of ${m.of}` : short)} <span>${p ? '— ' + esc(p.name) + ' · ' : ''}${s.i + 1} / ${s.list.length}</span>`;
    const long = $('.long', b); long.hidden = !(m.cap.length > 70 || m.of > 1); long.textContent = m.cap;
    win.title(p ? `${p.name} — ${short}` : short);
    $('.op', b).hidden = !p;
    const strip = $('.strip', b); strip.hidden = s.list.length < 2;
    if (strip.dataset.for !== s.list.map(x => x.src).join('|').length + ':' + s.list.length) {
      strip.dataset.for = s.list.map(x => x.src).join('|').length + ':' + s.list.length;
      strip.innerHTML = s.list.map((g, i) => `<button data-i="${i}" class="${g.k === 'p' ? 'p' : g.k === 'd' || g.k === 'g' ? 'd' : 'f'}${g.v ? ' vid' : ''}" aria-label="${esc(g.cap)}"><img src="${g.thumb || g.src}" alt="" loading="lazy"></button>`).join('');
    }
    $$('.strip [data-i]', b).forEach(x => x.classList.toggle('on', +x.dataset.i === s.i));
    $('.strip .on', b)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: keep || R ? 'auto' : 'smooth' });
    const apply = () => { const tall = img.naturalHeight / Math.max(1, img.naturalWidth) > 1.5; const fit = s.fit == null ? !tall : s.fit; $('.pv', b).classList.toggle('fit', fit); $('.ft', b).textContent = fit ? 'Actual size' : 'Fit'; $('.stage', b).scrollTop = 0; };
    if (m.v) { $('.pv', b).classList.add('fit'); $('.ft', b).textContent = 'Fit'; } else if (img.complete && img.naturalWidth) apply(); else img.onload = apply;
  }

  /* Gallery */
  function renderPhotos(win, o) {
    const all = D.PROJECTS.flatMap(p => p.gallery.map(g => ({ ...g, pid: p.id })));
    win.state = { all, pid: 'all' };
    win.body.innerHTML = `<div class="side"><h6>Library</h6><button data-g="all">${gb(3)}All screens<em>${all.length}</em></button><h6>Projects</h6>${D.PROJECTS.filter(p => p.gallery.length).map(p => `<button data-g="${p.id}">${gb(3, p.id.length % 6)}${esc(p.name)}${p.feed ? ' · Instagram' : ''}<em>${p.gallery.length}</em></button>`).join('')}</div>
      <div class="main"><div class="tools"><span class="crumbs"></span><input class="search" type="search" placeholder="Search captions" aria-label="Search captions"></div><div class="scroll" style="padding:14px"></div></div>`;
    $$('[data-g]', win.body).forEach(b => b.onclick = () => photosGo(win, b.dataset.g));
    $('.search', win.body).oninput = () => photosGo(win, win.state.pid);
    photosGo(win, o.pid || 'all');
  }
  function photosGo(win, pid) {
    const s = win.state, b = win.body, q = $('.search', b).value.trim().toLowerCase(); s.pid = pid;
    const list = s.all.filter(g => (pid === 'all' || g.pid === pid) && (!q || (g.cap + ' ' + byId[g.pid].name).toLowerCase().includes(q)));
    $$('[data-g]', b).forEach(x => x.classList.toggle('on', x.dataset.g === pid));
    $('.crumbs', b).innerHTML = pid === 'all' ? `All screens <span>· ${list.length}</span>` : `${esc(byId[pid].name)} <span>· ${list.length}</span>`;
    $('.scroll', b).innerHTML = `<div class="shots">${list.map(g => `<button class="shot ${g.k === 'p' ? '' : g.post ? 'sq' : 'w'}" data-src="${g.src}" data-pid="${g.pid}"><span class="i"><img src="${g.thumb || g.src}" alt="${esc(g.cap)}" loading="lazy"></span><span>${esc(pid === 'all' ? byId[g.pid].name + ' · ' + g.cap : g.cap)}</span></button>`).join('')}</div>`;
    $$('.shot', b).forEach((x, i) => x.onclick = () => openWin('preview', { list, i, pid: x.dataset.pid, from: x }));
  }

  /* Results */
  function renderResults(win) {
    win.body.innerHTML = `<div class="res"><div class="top"><div><span class="mono" style="color:var(--mute)">Results</span><h2>Real numbers. <em>Nothing rounded up.</em></h2></div><div style="display:flex;gap:8px;flex-wrap:wrap">${whoChip('alaa')}</div></div>
      <div class="rcards">${D.RESULTS.map(r => `<div class="rc"><span class="t mono">${esc(r.t)}</span><b>${esc(r.big)}</b><p>${esc(r.l)}</p>${mini(r.chart)}
        ${r.rows ? `<dl>${r.rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>` : ''}
        <div class="acts">${r.id ? `<button class="tbtn" data-case="${r.id}">Open ${esc(byId[r.id].name)} →</button>` : ''}${r.person ? `<button class="tbtn" data-person="${r.person}">Ask ${P[r.person].name}</button>` : ''}</div></div>`).join('')}</div></div>`;
  }

  /* Services */
  function renderServices(win, o) {
    win.body.innerHTML = `<div class="side"><h6>Services</h6>${D.SERVICES.map((s, i) => `<button data-s="${s.id}">${gb(3, i)}${esc(s.name)}</button>`).join('')}</div><div class="main"><div class="scroll pane-wrap"></div></div>`;
    $$('[data-s]', win.body).forEach(b => b.onclick = () => servicesGo(win, b.dataset.s));
    servicesGo(win, o.id || 'ecommerce');
  }
  function servicesGo(win, id) {
    const s = D.SERVICES.find(x => x.id === id) || D.SERVICES[0], b = win.body;
    $$('[data-s]', b).forEach(x => x.classList.toggle('on', x.dataset.s === s.id));
    win.title('Services — ' + s.name);
    const sc = $('.pane-wrap', b); sc.scrollTop = 0;
    sc.innerHTML = `<div class="pane"><div class="ico">${tileBars(5, D.SERVICES.indexOf(s), 100)}</div><h2>${esc(s.name)}</h2><div class="sub">${esc(s.sub)}</div><p class="lead">${esc(s.lead)}</p>
      <h6 class="sech">What you get</h6><ul class="get">${s.get.map(g => `<li>${esc(g)}</li>`).join('')}</ul>
      ${s.work.length ? `<h6 class="sech">Work</h6><div class="minis">${s.work.map(w => `<button data-case="${w}">${cover(byId[w])}<b>${esc(byId[w].name)}</b></button>`).join('')}</div>` : ''}
      ${s.person ? `<h6 class="sech">Who leads it</h6><div style="margin-bottom:20px">${whoChip(s.person)}</div>` : ''}
      <h6 class="sech">How it runs</h6><div class="steps5"><div><b>A 20-minute call</b>What you sell, where, what’s in the way.</div><div><b>Brief &amp; quote</b>In writing, within 48 hours.</div><div><b>Weekly previews</b>Things you can click.</div><div><b>Launch</b>Tested on real phones.</div><div><b>Grow</b>Reported monthly.</div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn g" data-start>Start this build</button><button class="btn o" data-ask>Ask bqnd</button></div></div>`;
    $('[data-start]', sc).onclick = e => openWin('mail', { need: NEED[s.id], from: e.currentTarget });
    $('[data-ask]', sc).onclick = () => { openPal(); asst.ask('Tell me about your ' + s.name.toLowerCase()); };
  }

  /* The crew */
  function renderTeam(win, o) {
    win.body.innerHTML = `<div class="side"><h6>The crew</h6>${Object.values(P).map(p => `<button data-t="${p.id}"><img src="${p.head}" alt="">${p.name}</button>`).join('')}<h6>Also</h6><button data-app="contact">${gb(3)}Work with us</button></div><div class="main"><div class="scroll tw"></div></div>`;
    $$('[data-t]', win.body).forEach(b => b.onclick = () => teamGo(win, b.dataset.t));
    teamGo(win, o.person || 'alerta');
  }
  function teamGo(win, id) {
    const p = P[id], b = win.body; win.state.person = id;
    $$('[data-t]', b).forEach(x => x.classList.toggle('on', x.dataset.t === id));
    win.title(p.name + ' — ' + p.role);
    const sc = $('.tw', b); sc.scrollTop = 0;
    sc.innerHTML = `<div class="profile"><div class="fig"><div class="q">“${esc(p.quotes[0])}”</div><img src="${p.img}" alt="${esc(p.name)}, illustrated"></div>
      <div><span class="mono" style="color:var(--mute)">The crew</span><h2>${esc(p.name)}</h2><div class="role">${esc(p.role)} · ${esc(p.lead)}</div>
        ${p.bio.map(x => `<p>${esc(x)}</p>`).join('')}
        ${p.stats ? `<div class="nums" style="grid-template-columns:repeat(auto-fit,minmax(110px,1fr));margin:14px 0">${p.stats.map(([v, l]) => `<div><b>${v}</b><small>${l}</small></div>`).join('')}</div>` : ''}
        <div class="tags">${p.tags.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>
        <h6 class="sech">Work</h6><div class="minis">${p.work.map(w => `<button data-case="${w}">${cover(byId[w])}<b>${esc(byId[w].name)}</b></button>`).join('')}</div>
        <div class="acts"><button class="btn" data-mine>See ${esc(p.name)}’s work</button><button class="btn o" data-svc>${esc(D.SERVICES.find(s => s.id === p.service).name)}</button><button class="btn g" data-ask>Ask bqnd about ${esc(p.name)}</button></div></div></div>`;
    $('[data-mine]', sc).onclick = e => openWin('work', { person: id, from: e.currentTarget });
    $('[data-svc]', sc).onclick = () => openWin('services', { id: p.service });
    $('[data-ask]', sc).onclick = () => { openPal(); asst.ask('What does ' + p.name + ' do?'); };
    // the quote in the profile cycles too
    let qi = 0; clearInterval(win.state.qt);
    win.state.qt = setInterval(() => { const q = $('.q', sc); if (!q) return; qi = (qi + 1) % p.quotes.length; q.textContent = '“' + p.quotes[qi] + '”'; }, 3600);
    win.cleanup.push(() => clearInterval(win.state.qt));
  }

  /* Readme */
  function renderReadme(win, o) {
    win.body.innerHTML = `<article class="doc"><span class="mono" style="color:var(--mute)">Readme.txt · band. — Cairo, Egypt</span>
      <h1>We don’t overthink it. <em>We ship it.</em></h1>
      <p>An execution-first studio for brands that already know what they want. We build the store, design the brand around it, buy the media that fills it — and when the tool doesn’t exist, we write the software. In English and Arabic, for brands in Egypt, the Gulf and Europe.</p>
      <h2>What we do</h2><div style="display:flex;flex-wrap:wrap;gap:6px">${D.SERVICES.map(s => `<button class="chip" data-svc="${s.id}">${esc(s.name)}</button>`).join('')}</div>
      <h2>How we work</h2><div class="two"><div><b>Build — ecommerce &amp; software</b><p style="font-size:14px;margin:6px 0 0">We become part of your team, understand your customer, then architect and build something that converts or removes work.</p><ol><li>Think: brand, market and customer behaviour.</li><li>Innovate: UX, data flows and tech decisions.</li><li>Execute: clean code, fast pages, tested checkout.</li></ol></div>
        <div><b>Design &amp; media</b><p style="font-size:14px;margin:6px 0 0">Your in-house execution arm. No strategy layers, no account managers. You brief, we deliver.</p><ol><li>Brief in: vision, guidelines, deliverables.</li><li>Execute: build, design, launch.</li><li>Read the numbers: 48-hour reads, not month-end post-mortems.</li></ol></div></div>
      <h2>How a project starts</h2><p>A 20-minute call. A written brief and quote within 48 hours. Weekly previews you can click. Launch, tested on real phones. Then media, content and improvements, reported monthly.</p>
      <p><button class="btn g" data-app="contact">Start a build</button></p>
      <h2>Who we’ve worked with</h2>${D.CLIENTS.map(([k, l]) => `<div class="cl"><small class="mono">${esc(k)}</small><div>${l.map(c => `<span class="chip">${esc(c)}</span>`).join('')}</div></div>`).join('')}
      <h2>Find us</h2><div class="lk">${D.LINKS.map(([k, v, h]) => `<a href="${h}" target="_blank" rel="noopener"><b>${k} ↗</b><small>${v}</small></a>`).join('')}<a href="mailto:${D.EMAIL}"><b>Email</b><small>${D.EMAIL}</small></a></div>
      <h2 id="keys">Keyboard</h2><p><kbd>⌘ K</kbd> or <kbd>Ctrl K</kbd> or <kbd>/</kbd> ask bqnd · <kbd>Esc</kbd> close · <kbd>←</kbd> <kbd>→</kbd> flip through screens · double-click a title bar to zoom · right-click the desktop for more.</p>
    </article>`;
    $$('[data-svc]', win.body).forEach(x => x.onclick = () => openWin('services', { id: x.dataset.svc, from: x }));
    if (o.at) setTimeout(() => $('#' + o.at, win.body)?.scrollIntoView(), 50);
  }

  /* Terminal */
  function renderTerminal(win) {
    win.body.style.background = '#0B0B0B';
    win.body.innerHTML = `<div class="term"><div class="out"></div><form class="in"><span class="g">guest@band-os</span><span class="m">~ %</span><input aria-label="Terminal input" autocomplete="off" autocapitalize="off" spellcheck="false"></form></div>`;
    const t = $('.term', win.body), out = $('.out', t), inp = $('input', t), hist = []; let hi = 0;
    const print = (h, cls = '') => { const d = document.createElement('div'); d.className = 'ln ' + cls; d.innerHTML = h; out.append(d); t.scrollTop = t.scrollHeight; return d; };
    const CMDS = ['help', 'ls', 'open', 'crew', 'whois', 'results', 'services', 'contact', 'ask', 'ship', 'clear', 'date', 'whoami', 'history', 'exit'];
    const APPN = ['work', ...D.FOLDERS.slice(1).map(f => f[0]), 'gallery', 'results', 'services', 'crew', 'readme', 'mail', 'trash'];
    print(`<span class="w">band. OS</span> <span class="m">— Terminal</span>\nType <span class="g">help</span> to see what you can do. Try <span class="g">open volcom</span> or <span class="g">ship</span>.\n`);
    t.addEventListener('click', () => inp.focus());
    const run = async line => {
      const [cmd, ...rest] = line.trim().split(/\s+/); const arg = rest.join(' ').toLowerCase(), c = (cmd || '').toLowerCase();
      print(`<span class="g">~ %</span> ${esc(line)}`);
      if (!c) return;
      if (c === 'help') print(`<span class="w">ls</span> [${D.FOLDERS.slice(1).map(f => f[0]).join('|')}]   list the work
<span class="w">open</span> &lt;name&gt;        open a project or an app — open fig, open results
<span class="w">crew</span>               who’s who          <span class="w">whois</span> &lt;name&gt;   one of the crew
<span class="w">results</span>            the numbers        <span class="w">services</span>       what we do
<span class="w">ask</span> &lt;question&gt;     ask bqnd           <span class="w">contact</span>        reach us
<span class="w">ship</span>               ship something     <span class="w">clear</span> · <span class="w">date</span> · <span class="w">whoami</span> · <span class="w">history</span> · <span class="w">exit</span>`);
      else if (c === 'ls') {
        if (!arg) print(D.FOLDERS.slice(1).map(([k]) => `<span class="g">${k}/</span>`).join('   ') + '   <span class="m">readme.txt</span>');
        else { const l = D.PROJECTS.filter(p => p.folder === arg.replace(/\/$/, '')); print(l.length ? l.map(p => `<span class="w">${p.id.padEnd(12)}</span> ${esc(p.name)} <span class="m">— ${esc(p.kind)} · ${esc(p.market)}</span>`).join('\n') : `ls: ${esc(arg)}: No such folder`); }
      } else if (c === 'open') {
        const p = D.PROJECTS.find(p => p.id === arg || p.name.toLowerCase() === arg) || D.PROJECTS.find(p => arg && (p.id.startsWith(arg) || p.name.toLowerCase().includes(arg)));
        const who = Object.values(P).find(x => x.id === arg);
        if (p) { openCase(p.id); print(`<span class="m">opening</span> ${esc(p.name)}…`); }
        else if (who) { openWin('team', { person: who.id }); print(`<span class="m">opening</span> ${who.name}…`); }
        else if (APPN.includes(arg) || arg === 'terminal') { openApp(arg); print(`<span class="m">opening</span> ${esc(arg)}…`); }
        else print(`open: ${esc(arg || '?')}: no such file. Try <span class="g">ls</span>.`);
      } else if (c === 'crew') print(Object.values(P).map(p => `<span class="w">${p.id.padEnd(9)}</span> ${p.name} <span class="m">— ${p.role}</span>`).join('\n') + `\n<span class="m">whois &lt;name&gt; for more.</span>`);
      else if (c === 'whois') { const p = P[arg]; if (p) { print(`<span class="w">${p.name}</span> <span class="m">— ${p.role}</span>\n${esc(p.bio[0])}`); openWin('team', { person: p.id }); } else print(`whois: ${esc(arg)}: not in the crew. Try <span class="g">crew</span>.`); }
      else if (c === 'results') print(D.RESULTS.map(r => `<span class="g">${esc(r.big).padEnd(8)}</span> ${esc(r.t)} <span class="m">— ${esc(r.l)}</span>`).join('\n'));
      else if (c === 'services') print(D.SERVICES.map(s => `<span class="w">${esc(s.name)}</span> <span class="m">— ${esc(s.sub)}</span>`).join('\n'));
      else if (c === 'contact') print(`email   <a href="mailto:${D.EMAIL}">${D.EMAIL}</a>\ninsta   <a href="https://www.instagram.com/band.cairo/" target="_blank" rel="noopener">@band.cairo</a>\nor type <span class="g">open mail</span>`);
      else if (c === 'ask') {
        if (!arg) return print('ask: what should I ask? e.g. <span class="g">ask can you build an app</span>');
        const wait = print('<span class="m">bqnd is thinking…</span>');
        await new Promise(res => { const h = m => { if (m.role === 'bot' && m.done) { hooks.delete(h); wait.innerHTML = `<span class="g">bqnd</span> ${esc(m.text)}`; t.scrollTop = t.scrollHeight; res(); } }; hooks.add(h); asst.ask(rest.join(' ')); setTimeout(() => { hooks.delete(h); res(); }, 60000); });
      } else if (c === 'ship') {
        for (const [a, b] of [['reading the brief', 'ok'], ['building', 'ok'], ['testing on real phones', 'ok'], ['launching', '✓ shipped']]) {
          const l = print(`<span class="m">›</span> ${a} `);
          for (let k = 0; k <= 12; k++) { l.innerHTML = `<span class="m">›</span> ${a} <span class="m">${'█'.repeat(k)}${'░'.repeat(12 - k)}</span>`; await new Promise(r => setTimeout(r, R ? 0 : 35)); }
          l.innerHTML += ` <span class="g">${b}</span>`;
        }
        print(`<span class="w">We don’t overthink it.</span> Type <span class="g">open mail</span> to ship yours.`); crewSay('mamdouh', 'Told you. Now ship yours.');
      } else if (c === 'overthink') print('band: command not found: overthink. We don’t do that here.');
      else if (c === 'sudo') { print('You don’t need permission to start a build.'); openWin('mail'); }
      else if (c === 'whoami') print('guest. Welcome in. Type <span class="g">crew</span> to meet the people behind this.');
      else if (c === 'date') print(new Date().toLocaleString('en-GB', { timeZone: 'Africa/Cairo', dateStyle: 'full', timeStyle: 'short' }) + ' <span class="m">(Cairo)</span>');
      else if (c === 'history') print(hist.map((h, i) => `${String(i + 1).padStart(3)}  ${esc(h)}`).join('\n') || '(empty)');
      else if (c === 'clear') out.innerHTML = '';
      else if (c === 'exit') closeWin(win);
      else if (['hi', 'hello', 'hey', 'مرحبا', 'السلام'].includes(c)) print('Hi. Try <span class="g">open labesny</span> or <span class="g">ask what do you do</span>.');
      else print(`band: command not found: ${esc(cmd)}. Type <span class="g">help</span>.`);
    };
    $('form', t).onsubmit = async e => { e.preventDefault(); const v = inp.value; inp.value = ''; if (v.trim()) hist.push(v); hi = hist.length; inp.disabled = true; await run(v); inp.disabled = false; inp.focus(); };
    inp.addEventListener('keydown', e => {
      if (e.key === 'ArrowUp' && hist.length) { e.preventDefault(); hi = Math.max(0, hi - 1); inp.value = hist[hi]; }
      else if (e.key === 'ArrowDown') { e.preventDefault(); hi = Math.min(hist.length, hi + 1); inp.value = hist[hi] || ''; }
      else if (e.key === 'Tab') {
        e.preventDefault(); const parts = inp.value.split(' '), last = parts.pop().toLowerCase();
        const pool = parts.length ? [...D.PROJECTS.map(p => p.id), ...APPN, ...Object.keys(P), ...D.FOLDERS.map(f => f[0])] : CMDS;
        const m = pool.filter(x => x.startsWith(last)); if (m.length === 1) inp.value = [...parts, m[0]].join(' ') + ' '; else if (m.length) print(m.join('  '), 'm');
      }
    });
    setTimeout(() => inp.focus(), 50);
  }

  /* Start a build */
  function renderMail(win, o) {
    const NEEDS = ['Store', 'App', 'Software', 'Brand', 'Media', 'AI content', 'Creative tech'];
    win.body.innerHTML = `<form class="mail" autocomplete="on">
      <div class="row"><label>To</label><b>band.</b>&nbsp;<span style="color:var(--mute)">${D.EMAIL}</span></div>
      <div class="row"><label for="m-name">Your name</label><input id="m-name" name="name" placeholder="Name"></div>
      <div class="row"><label for="m-brand">Brand</label><input id="m-brand" name="brand" placeholder="What’s it called?"></div>
      <div class="row"><label for="m-where">You sell in</label><input id="m-where" name="where" placeholder="Egypt, Kuwait, online, in stores…"></div>
      <div class="row" style="align-items:flex-start"><label>You need</label><div class="needs">${NEEDS.map(n => `<button type="button" aria-pressed="false">${n}</button>`).join('')}</div></div>
      <textarea id="m-body" aria-label="What’s in the way?" placeholder="What’s in the way? Tell us the problem in plain language — we’ll tell you whether it’s a store, a system, or neither."></textarea>
      <div class="acts"><button type="submit" class="btn g">Send by email</button><button type="button" class="btn o" data-ig>Send on Instagram</button><button type="button" class="btn o" data-ask>Ask bqnd first</button></div>
      <p class="note">You get a written brief and quote within 48 hours of a 20-minute call.</p></form>`;
    const f = $('form', win.body);
    $$('.needs button', f).forEach(b => b.onclick = () => b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'));
    if (o.need) pressNeed(win, o.need);
    if (o.about) $('#m-body', f).value = `Something like your work for ${o.about}. `;
    const compose = () => {
      const v = id => $(id, f).value.trim(), needs = $$('.needs [aria-pressed="true"]', f).map(b => b.textContent);
      return { subject: `New build${v('#m-brand') ? ' — ' + v('#m-brand') : ''}`, body: `Hi band.,\n\n${needs.length ? 'We need: ' + needs.join(', ') + '\n' : ''}${v('#m-brand') ? 'Brand: ' + v('#m-brand') + '\n' : ''}${v('#m-where') ? 'We sell in: ' + v('#m-where') + '\n' : ''}\n${v('#m-body') || ''}\n\n${v('#m-name') ? '— ' + v('#m-name') : ''}` };
    };
    f.onsubmit = e => { e.preventDefault(); const m = compose(); location.href = `mailto:${D.EMAIL}?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.body)}`; toast('Opening your email app…'); };
    $('[data-ig]', f).onclick = async () => { const m = compose(); try { await navigator.clipboard.writeText(m.body); toast('Copied. Paste it in the DM.'); } catch { toast('Opening Instagram…'); } window.open('https://ig.me/m/band.cairo', '_blank', 'noopener'); };
    $('[data-ask]', f).onclick = () => { openPal(); asst.ask('I want to start a build.'); };
    setTimeout(() => !small() && $('#m-name', f).focus(), 60);
  }
  function pressNeed(win, need) { $$('.needs button', win.body).forEach(b => { if (b.textContent === need) b.setAttribute('aria-pressed', 'true'); }); }

  /* Trash and About */
  function renderTrash(win) {
    let full = true;
    const draw = () => {
      win.body.innerHTML = `<div class="trash"><div class="tools" style="margin:-18px -18px 14px"><span class="crumbs">${full ? '1 item' : 'Empty'}</span><button class="tbtn em" ${full ? '' : 'disabled'}>Empty Trash</button></div>
        ${full ? `<button class="file"><span class="pg"><i></i><i></i><i style="width:60%"></i><i></i></span><span style="font-size:12.5px;font-weight:600">overthinking.txt</span></button><div class="note" hidden></div>` : `<div class="note">Trash is empty. Nothing left to overthink.</div>`}</div>`;
      $('.em', win.body).onclick = () => { full = false; draw(); crewSay('alerta', 'Cleaner already.'); };
      $('.file', win.body)?.addEventListener('click', () => { const n = $('.note', win.body); n.hidden = false; n.innerHTML = '<b>overthinking.txt</b><br>We don’t overthink it. We ship it.'; });
    };
    draw();
  }
  function renderAbout(win) {
    win.body.innerHTML = `<div class="aboutos"><div class="lk">${BQ.lockup('#0B0B0B')}</div><h3>band. OS</h3><p class="mono">Version 2 · Cairo</p><p style="color:var(--ink2);font-size:14.5px;margin-top:12px">The studio’s work, on the studio’s own desktop. Stores, software, brands and media.</p>
      <p style="margin-top:16px"><button class="btn g" data-app="contact">Start a build</button></p></div>`;
  }

  /* ---------- desktop icons ---------- */
  const heads = ids => `<span style="display:flex;width:100%;height:100%">${ids.map(i => `<img src="${P[i].head}" alt="" style="width:33.4%;object-fit:cover">`).join('')}</span>`;
  const ICONS = [
    ['work', 'Work', 'folder', tileBars(5)], ['stores', 'Stores', 'folder', tileBars(4, 1)], ['web', 'Websites', 'folder', tileBars(4, 3)], ['apps', 'Apps', 'folder', tileBars(3, 4)], ['brands', 'Brands', 'folder', tileBars(4, 6)], ['social', 'Social design', 'photo', `<img src="img/social/yqn/t02.jpg" alt="">`],
    ['software', 'Software', 'folder', tileBars(4, 7)], ['gallery', 'Gallery', 'photo', `<img src="img/labesny/home.jpg" alt="">`], ['results', 'Results', 'g', [.3, .3, 1, 1].map(h => `<i style="width:6px;height:${h * 100}%"></i>`).join('')],
    ['services', 'Services', 'doc', '<i></i><i style="width:70%"></i><i></i><i style="width:50%"></i>'], ['team', 'The crew', 'photo', heads(['alerta', 'mamdouh', 'alaa'])],
    ['readme', 'Readme.txt', 'doc', '<i></i><i></i><i style="width:60%"></i><i></i>'], ['terminal', 'Terminal', 'term', '&gt;_'], ['contact', 'Start a build', 'g', tileBars(11, 0, 40)],
  ];
  function layoutIcons(reset) {
    const box = $('#icons'), H = box.clientHeight || 600, mob = small();
    const saved = reset ? {} : store.get('icons', {});
    const rows = Math.max(3, Math.floor(H / 100));
    $$('.ic', box).forEach((ic, i) => {
      let x, y;
      if (mob) { x = (i % 4) * (box.clientWidth / 4); y = Math.floor(i / 4) * 96; ic.style.left = x + 'px'; ic.style.top = y + 'px'; return; }
      [x, y] = saved[ic.dataset.id] || [Math.floor(i / rows) * 98, (i % rows) * 100];
      ic.style.left = x + 'px'; ic.style.top = y + 'px';
    });
    if (reset) store.set('icons', {});
  }
  function buildIcons() {
    $('#icons').innerHTML = ICONS.map(([id, n, cls, inner]) => `<button class="ic" data-id="${id}" aria-label="${n}"><span class="it ${cls}">${inner}</span><span>${n}</span></button>`).join('');
    layoutIcons();
        $$('.ic').forEach(ic => {
      let sx, sy, ox, oy, drag = false, down = false;
      const openIt = () => { $$('.ic.sel').forEach(x => x.classList.remove('sel')); openApp(ic.dataset.id, ic.querySelector('.it')); };
      ic.addEventListener('pointerdown', e => { if (e.button) return; down = true; drag = false; sx = e.clientX; sy = e.clientY; ox = ic.offsetLeft; oy = ic.offsetTop; });
      ic.addEventListener('pointermove', e => {
        if (!down || small() || e.pointerType !== 'mouse') return;
        if (!drag && Math.hypot(e.clientX - sx, e.clientY - sy) > 5) { drag = true; ic.setPointerCapture(e.pointerId); ic.style.zIndex = 3; }
        if (drag) { ic.style.left = ox + e.clientX - sx + 'px'; ic.style.top = oy + e.clientY - sy + 'px'; }
      });
      ic.addEventListener('pointerup', () => {
        down = false; if (!drag) return; drag = false; ic.style.zIndex = '';
        const x = Math.round(ic.offsetLeft / 8) * 8, y = Math.max(0, Math.round(ic.offsetTop / 8) * 8); ic.style.left = x + 'px'; ic.style.top = y + 'px';
        const s = store.get('icons', {}); s[ic.dataset.id] = [x, y]; store.set('icons', s); ic._dragged = true;
      });
      ic.addEventListener('click', () => { if (ic._dragged) { ic._dragged = false; return; } openIt(); });
      ic.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); openIt(); } });
    });
    desk.addEventListener('pointerdown', e => { if (!e.target.closest('.ic')) $$('.ic.sel').forEach(x => x.classList.remove('sel')); });
    addEventListener('resize', () => layoutIcons());
  }

  /* ---------- widgets ---------- */
  function buildWidgets() {
    $('#widgets').innerHTML = `<button class="wg" data-app="results"><span class="h mono"><span>Results</span><span>Volcom · 30 days</span></span><b>3.34<em>×</em></b><p>€18,892 in ads → €63,034 in sales</p><div class="spark">${CH.volcom.v.map((v, i) => `<i class="${CH.volcom.hot.includes(i) ? 'g' : ''}" style="height:${v * 100}%"></i>`).join('')}</div></button>
      <button class="wg" data-case="fig"><span class="h mono"><span>On the bench</span><span>FIG</span></span><div class="row"><img src="img/fig/home-mobile.jpg" alt=""><div><b style="margin:0">6,730</b><p>products moving to Shopify. Zero lost.</p></div></div></button>
      <button class="wg" data-person="alerta"><span class="h mono"><span>The crew</span><span>say hi ↘</span></span><div class="row">${Object.values(P).map(p => `<img src="${p.head}" alt="" style="border-radius:50%;width:40px;height:40px">`).join('')}</div></button>`;
    $('#widgets').addEventListener('click', e => {
      const a = e.target.closest('[data-app]'), c = e.target.closest('[data-case]'), p = e.target.closest('[data-person]');
      if (a) openApp(a.dataset.app, a); else if (c) openCase(c.dataset.case, { from: c }); else if (p) openWin('team', { person: p.dataset.person, from: p });
    });
  }

  /* ---------- dock ---------- */
  const DOCK = [
    ['ask', 'Ask bqnd', 'ask', '<canvas id="dockCode" aria-hidden="true"></canvas>'], null,
    ['work', 'Work', 'g', tileBars(5, 0, 90)], ['gallery', 'Gallery', 'photo', `<img src="img/womensecret/campaign-1.jpg" alt="">`], ['results', 'Results', 'g', [.3, .3, 1, 1].map(h => `<i style="width:5px;height:${h * 100}%"></i>`).join('')],
    ['services', 'Services', 'doc', '<i></i><i style="width:70%"></i><i></i>'], ['team', 'The crew', 'photo', heads(['alerta', 'mamdouh', 'alaa'])], ['terminal', 'Terminal', 'term', '&gt;_'],
    ['contact', 'Start a build', 'g', tileBars(6, 0, 60)],
  ];
  const APP_OF = { work: ['work'], gallery: ['photos', 'preview'], results: ['results'], services: ['services'], team: ['team'], terminal: ['terminal'], contact: ['mail'] };
  function buildDock() {
    $('#dock').innerHTML = DOCK.map(d => d ? `<button class="dk" data-dk="${d[0]}" aria-label="${d[1]}"><span class="t ${d[2]}">${d[3]}</span><span class="lab">${d[1]}</span></button>` : '<span class="sep"></span>').join('') +
      '<span class="sep"></span><span id="mins" style="display:flex;gap:4px"></span><button class="dk" data-dk="trash" aria-label="Trash"><span class="t trash"><i></i><i></i><i></i></span><span class="lab">Trash</span></button>';
    $('#dock').addEventListener('click', e => {
      const d = e.target.closest('[data-dk]'), m = e.target.closest('[data-min]');
      if (m) { const w = W[m.dataset.min]; if (w) restore(w); return; }
      if (!d) return;
      const k = d.dataset.dk;
      if (k === 'ask') return openPal();
      const open = (APP_OF[k] || []).map(a => W[a]).find(Boolean);
      if (open && open.min) restore(open); else if (open && open.el.classList.contains('front') && !small()) minimise(open); else openApp(k, d);
    });
    if (!small()) {                                        // gentle magnification
      const dk = () => $$('.dk', $('#dock'));
      $('#dock').addEventListener('pointermove', e => { if (e.pointerType !== 'mouse' || R) return; dk().forEach(b => { const r = b.getBoundingClientRect(), d = Math.abs(e.clientX - (r.left + r.width / 2)); const s = 1 + Math.max(0, .28 * (1 - d / 120)); b.style.transform = `scale(${s.toFixed(3)})`; b.style.margin = `0 ${((s - 1) * 14).toFixed(1)}px`; }); });
      $('#dock').addEventListener('pointerleave', () => dk().forEach(b => { b.style.transform = ''; b.style.margin = ''; }));
    }
  }
  function dockSync() {
    const wins = Object.values(W);
    $$('[data-dk]').forEach(d => { const apps = APP_OF[d.dataset.dk] || []; d.classList.toggle('run', wins.some(w => apps.includes(w.id) || (d.dataset.dk === 'work' && w.id.startsWith('case:')))); });
    $('#mins').innerHTML = wins.filter(w => w.min).map(w => { const p = w.id.startsWith('case:') && byId[w.id.slice(5)]; return `<button class="dk" data-min="${w.id}" aria-label="Restore ${esc(w.el.getAttribute('aria-label'))}"><span class="t min">${p && p.cover ? `<img src="${p.cover.src}" alt="">` : tileBars(4, 2, 90)}</span><span class="lab">${esc(w.el.getAttribute('aria-label'))}</span></button>`; }).join('');
    document.body.classList.toggle('has-win', wins.some(w => !w.min));
  }

  /* ---------- menus ---------- */
  const setWall = w => { document.body.dataset.wall = w; store.set('wall', w); };
  const MENUS = {
    band: () => [['About band. OS', () => openWin('about')], ['Start a build…', () => openWin('mail')], null, ['Wallpaper: Dots', () => setWall('dots')], ['Wallpaper: Grid', () => setWall('grid')], ['Wallpaper: Barcode', () => setWall('bars')], ['Wallpaper: Night', () => setWall('night')], null, ['Restart', () => { try { sessionStorage.removeItem('bos:booted'); } catch { } location.reload(); }]],
    go: () => [['Work', () => openApp('work'), 'all'], ...D.FOLDERS.slice(1).map(([k, n]) => [n, () => openApp(k)]), null,
      ['Gallery', () => openApp('gallery')], ['Results', () => openApp('results')], ['Services', () => openApp('services')], ['The crew', () => openApp('team')], ['Readme', () => openApp('readme')], ['Terminal', () => openApp('terminal')]],
    window: () => [['Minimise all', () => Object.values(W).forEach(w => !w.min && minimise(w))], ['Bring all back', () => Object.values(W).forEach(w => w.min && restore(w))], ['Close all', () => Object.values(W).forEach(closeWin)]],
    help: () => [['Ask bqnd', openPal, '⌘K'], ['Keyboard shortcuts', () => openWin('readme', { at: 'keys' })], ['What is band. OS?', () => openWin('about')]],
    desk: () => [['Open Work', () => openApp('work')], ['New build…', () => openWin('mail')], ['Ask bqnd', openPal, '⌘K'], null, ['Wallpaper: Dots', () => setWall('dots')], ['Wallpaper: Grid', () => setWall('grid')], ['Wallpaper: Barcode', () => setWall('bars')], ['Wallpaper: Night', () => setWall('night')], null, ['Clean up icons', () => layoutIcons(true)], ['About band. OS', () => openWin('about')]],
  };
  const menu = $('#menu'); let openMenu = null;
  function showMenu(name, x, y, btn) {
    menu.innerHTML = MENUS[name]().map((m, i) => m ? `<button role="menuitem" data-i="${i}">${m[0]}${m[2] ? `<small>${m[2] === 'all' ? '' : m[2]}</small>` : ''}</button>` : '<hr>').join('');
    const items = MENUS[name]();
    $$('button', menu).forEach(b => b.onclick = () => { hideMenu(); items[+b.dataset.i][1](); });
    menu.classList.add('open'); menu.style.left = Math.min(x, innerWidth - menu.offsetWidth - 8) + 'px'; menu.style.top = Math.min(y, innerHeight - menu.offsetHeight - 8) + 'px';
    $$('[data-menu]').forEach(b => b.setAttribute('aria-expanded', b === btn));
    openMenu = name;
  }
  function hideMenu() { menu.classList.remove('open'); openMenu = null; $$('[data-menu]').forEach(b => b.setAttribute('aria-expanded', 'false')); }
  $$('[data-menu]').forEach(b => {
    b.addEventListener('click', e => { e.stopPropagation(); if (openMenu === b.dataset.menu) return hideMenu(); const r = b.getBoundingClientRect(); showMenu(b.dataset.menu, r.left, r.bottom + 4, b); });
    b.addEventListener('pointerenter', () => { if (openMenu && openMenu !== 'desk' && openMenu !== b.dataset.menu) { const r = b.getBoundingClientRect(); showMenu(b.dataset.menu, r.left, r.bottom + 4, b); } });
  });
  document.addEventListener('pointerdown', e => { if (openMenu && !e.target.closest('#menu') && !e.target.closest('[data-menu]')) hideMenu(); });
  desk.addEventListener('contextmenu', e => { if (e.target.closest('.win')) return; e.preventDefault(); showMenu('desk', e.clientX, e.clientY); });

  /* ---------- the crew ---------- */
  const bubble = $('#bubble'); let speaking = null, hideT, typeT, hover = null, turn = 0;
  const qi = {};
  function crewSay(id, text, ms = 3800) {
    const m = $(`.mate[data-id="${id}"]`); if (!m || !booted) return;
    if (small() && document.body.classList.contains('has-win')) return;
    clearTimeout(hideT); clearInterval(typeT); speaking = id;
    bubble.innerHTML = `<small>${P[id].name} · ${P[id].role}</small><span></span>`;
    const span = $('span', bubble), full = text; let k = 0;
    bubble.classList.remove('on'); bubble.style.visibility = 'hidden'; span.textContent = full;
    const img = $('img', m).getBoundingClientRect(), bw = bubble.offsetWidth, bh = bubble.offsetHeight;
    const cx = img.left + img.width / 2, left = Math.max(8, Math.min(innerWidth - bw - 8, cx - bw / 2));
    bubble.style.left = left + 'px'; bubble.style.top = Math.max(46, img.top - bh - 10) + 'px'; bubble.style.setProperty('--tx', Math.max(14, Math.min(bw - 14, cx - left)) + 'px');
    bubble.style.visibility = ''; const typed = n => { span.innerHTML = esc(full.slice(0, n)) + `<span style="opacity:0">${esc(full.slice(n))}</span>`; }; typed(R ? full.length : 0);
    requestAnimationFrame(() => bubble.classList.add('on'));
    if (!R) typeT = setInterval(() => { k += 2; typed(Math.min(k, full.length)); if (k >= full.length) clearInterval(typeT); }, 22);
    if (ms) hideT = setTimeout(() => { if (hover !== id) { bubble.classList.remove('on'); speaking = null; } }, ms);
  }
  const nextQuote = id => { qi[id] = ((qi[id] ?? -1) + 1) % P[id].quotes.length; return P[id].quotes[qi[id]]; };
  function buildCrew() {
    $('#crew').innerHTML = Object.values(P).map(p => `<button class="mate" data-id="${p.id}" aria-label="${p.name}, ${p.role}. Open profile"><img src="${p.img}" alt=""><span class="nm">${p.name}</span></button>`).join('');
    $$('.mate').forEach(m => {
      const id = m.dataset.id;
      m.addEventListener('pointerenter', e => { if (e.pointerType !== 'mouse') return; hover = id; crewSay(id, nextQuote(id), 0); });
      m.addEventListener('pointerleave', () => { hover = null; hideT = setTimeout(() => { bubble.classList.remove('on'); speaking = null; }, 900); });
      m.addEventListener('click', () => {
        m.classList.remove('jump'); void m.offsetWidth; m.classList.add('jump');
        openWin('team', { person: id, from: $('img', m) });
        crewSay(id, id === 'alaa' ? 'That’s me. The numbers are in Results.' : id === 'alerta' ? 'That’s me. The decks are in Brands.' : 'That’s me. Try the Terminal.', 3200);
      });
    });
    const ids = Object.keys(P);
    setInterval(() => { if (hover || speaking || document.hidden || !booted || $('#pal').classList.contains('open')) return; const id = ids[turn++ % ids.length]; crewSay(id, nextQuote(id)); }, 5600);
  }
  function crewReact(id, opts) {
    if (!booted) return;
    const say = (who, t) => setTimeout(() => crewSay(who, t, 3600), 500);
    if (id.startsWith('case:')) { const p = byId[id.slice(5)]; if (p?.people.length) say(p.people[0], p.people[0] === 'alaa' ? `${p.name}? One of mine. ${p.tagline}` : `${p.name} is one of mine. Look around.`); }
    else if (id === 'results') say('alaa', 'My favourite window.');
    else if (id === 'terminal') say('mamdouh', 'Type ship. Go on.');
    else if (id === 'work' && opts.folder === 'brands') say('alerta', 'My shelf. Open any deck.');
    else if (id === 'mail') say('mamdouh', 'Tell us what’s in the way.');
  }

  /* ---------- the assistant: ⌘K ---------- */
  const kCode = BQ.code($('#kCode'), { color: '#FFFFFF', accent: '#10A862', mode: 'breathe' });
  const pCode = BQ.code($('#pCode'), { color: '#0B0B0B', accent: '#10A862', mode: 'breathe', minH: .1 });
  let dCode = null;
  const pal = $('#pal'), hooks = new Set();
  const asst = new BQ.Assistant({
    context: () => { const f = topWin(); return f ? `the "${f.el.getAttribute('aria-label')}" window on the band. OS desktop` : 'the band. OS desktop'; },
    actions: {
      show: ids => ids[0] && byId[ids[0]] && openCase(ids[0]),
      person: id => P[id] && openWin('team', { person: id }),
      app: a => openApp(a),
    },
    onState: (s, n) => [kCode, pCode, dCode].forEach(c => { if (!c) return; c.mode(s === 'think' ? 'think' : s === 'speak' ? 'speak' : 'breathe'); if (s === 'speak') c.kick(.15 + (n || 1) * .03); }),
  });
  const ui = BQ.chat($('#palChat'), asst, { placeholder: 'Ask anything, or open something…', chips: ['Show me your stores', 'What did Volcom get?', 'Who’s in the crew?', 'عايز أبدأ مشروع'] });
  ['.bq-log', '.bq-chips', '.bq-note'].forEach(s => $('#pbody').append($('#palChat ' + s)));
  { const prev = asst.onReply; asst.onReply = m => { prev(m); hooks.forEach(f => f(m)); }; }
  const CMDS = [
    ...D.FOLDERS.map(([k, n]) => ({ t: 'Open ' + n, k: 'folder', run: () => openApp(k === 'all' ? 'work' : k) })),
    ...D.PROJECTS.map(p => ({ t: p.name, k: p.kind, run: () => openCase(p.id) })),
    ...Object.values(P).map(p => ({ t: p.name + ' — ' + p.role, k: 'crew', run: () => openWin('team', { person: p.id }) })),
    ...D.SERVICES.map(s => ({ t: s.name, k: 'service', run: () => openWin('services', { id: s.id }) })),
    { t: 'Open Gallery', k: 'app', run: () => openApp('gallery') }, { t: 'Open Results', k: 'app', run: () => openApp('results') }, { t: 'Open Readme', k: 'doc', run: () => openApp('readme') },
    { t: 'Open Terminal', k: 'app', run: () => openApp('terminal') }, { t: 'Start a build', k: 'action', run: () => openApp('contact') },
  ];
  let sel = 0, shown = [];
  function renderCmds() {
    const q = ui.input.value.trim().toLowerCase();
    if (!q) { $('#cmds').innerHTML = ''; shown = []; return; }
    shown = [{ t: `Ask bqnd — “${ui.input.value.trim()}”`, k: '↵', ask: true }, ...CMDS.filter(c => c.t.toLowerCase().includes(q) || c.k.toLowerCase().includes(q)).slice(0, 6)];
    sel = Math.min(sel, shown.length - 1);
    $('#cmds').innerHTML = shown.map((c, i) => `<button class="cmd ${c.ask ? 'ask' : ''} ${i === sel ? 'sel' : ''}" role="option" aria-selected="${i === sel}">${gb(4, i)}<b></b><small class="mono"></small></button>`).join('');
    $$('.cmd').forEach((b, i) => { $('b', b).textContent = shown[i].t; $('small', b).textContent = shown[i].k; b.onclick = () => runCmd(i); });
  }
  function runCmd(i) {
    const c = shown[i]; if (!c) return;
    if (c.ask) { const v = ui.input.value; ui.input.value = ''; renderCmds(); asst.ask(v); }
    else { c.run(); ui.input.value = ''; renderCmds(); closePal(); }
  }
  ui.input.addEventListener('input', () => { sel = 0; renderCmds(); pCode.kick(.2); });
  ui.input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!shown.length) return; sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + shown.length) % shown.length; renderCmds(); }
    if (e.key === 'Enter' && shown.length && sel > 0) { e.preventDefault(); runCmd(sel); }
  });
  ui.form.addEventListener('submit', () => setTimeout(renderCmds));
  function openPal() { pal.classList.add('open'); hideMenu(); setTimeout(() => ui.input.focus(), 30); }
  function closePal() { pal.classList.remove('open'); }
  pal.addEventListener('click', e => { if (e.target === pal) closePal(); });
  $('#kbtn').onclick = openPal;

  /* ---------- keyboard ---------- */
  addEventListener('keydown', e => {
    const typing = /INPUT|TEXTAREA/.test(document.activeElement?.tagName || '');
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal.classList.contains('open') ? closePal() : openPal(); return; }
    if (e.key === 'Escape') { if (openMenu) return hideMenu(); if (pal.classList.contains('open')) return closePal(); const f = topWin(); if (f && f.id === 'preview') return closeWin(f); }
    if (typing) return;
    if (e.key === '/' && booted && !pal.classList.contains('open')) { e.preventDefault(); openPal(); }
    const f = topWin();
    if (f && f.id === 'preview' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) stepPreview(f, e.key === 'ArrowRight' ? 1 : -1);
  });

  /* ---------- clock ---------- */
  const clk = () => { try { $('#clock').textContent = 'Cairo ' + new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date()); } catch { } };
  clk(); setInterval(clk, 15000);

  /* ---------- boot ---------- */
  $('#lk').innerHTML = BQ.lockup('#0B0B0B');
  $('#wall').innerHTML = BQ.wordmark('#D9D9D1', 3.2);
  $('#bootWm').innerHTML = BQ.wordmark('#EDEDE6', 5.9);
  document.body.dataset.wall = store.get('wall', 'dots');
  buildIcons(); buildWidgets(); buildDock(); buildCrew();
  if (small() && window.IOS) ios = IOS.start({ D, P, byId, caseHTML, wireCase, setTab, cover, folderName, inFolder, def: APP, openApp, openPal });
  if (!small()) desk.append($('#crew'), $('#bubble'));             // on desktop the crew stands behind open windows
  dCode = BQ.code($('#dockCode'), { color: '#FFFFFF', accent: '#10A862', mode: 'breathe' });
  let booted = false, again = false;
  try { again = !!sessionStorage.getItem('bos:booted'); sessionStorage.setItem('bos:booted', '1'); } catch { }
  const bootCode = BQ.code($('#bootCode'), { color: '#EDEDE6', accent: '#10A862', mode: 'data', minH: .05 });
  const rise = Array(11).fill(0); bootCode.set(rise);
  function finishBoot() {
    if (booted) return; booted = true; $('#boot').classList.add('gone'); setTimeout(() => bootCode.stop(), 700);
    if (!R) $$('.ic').forEach((ic, i) => ic.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: 60 + i * 35, easing: 'ease-out', fill: 'backwards' }));
    if (!R) $$('.mate').forEach((m, i) => m.animate([{ opacity: 0, transform: 'translateY(30px)' }, { opacity: 1, transform: 'none' }], { duration: 500, delay: 500 + i * 140, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }));
    const hash = decodeURIComponent(location.hash.slice(1));
    if (ios) { ios.ready(hash); return; }
    setTimeout(() => {
      if (hash && (byId[hash] || P[hash])) byId[hash] ? openCase(hash) : openWin('team', { person: hash });
      else if (hash) openApp(hash) || (!small() && openWin('work', { folder: 'all' }));
      else if (!small()) openWin('work', { folder: 'all' });
    }, R ? 0 : 420);
    setTimeout(() => crewSay('mamdouh', small() ? 'Welcome to band. OS. Tap anything.' : 'Welcome to band. OS. Click anything.', 4200), R ? 200 : 1500);
    setTimeout(() => toast(small() ? 'Tap Ask to talk to bqnd.' : 'Press ⌘K — or just ask bqnd anything.', 3800), R ? 0 : 5600);
  }
  if (R) finishBoot();
  else {
    const fast = again, step = fast ? 30 : 90;
    BQ.BARS.forEach((_, i) => setTimeout(() => { rise[i] = 1; bootCode.set(rise); bootCode.hot([i]); }, 100 + i * step));
    setTimeout(() => { bootCode.hot([]); BQ.drawIn($('#bootWm svg'), { dur: fast ? 600 : 1100 }); }, fast ? 450 : 1150);
    if (!fast) [['band. os', ' — cairo, egypt'], ...D.FOLDERS.slice(1, 6).map(([k]) => ['mounting /' + k + ' ', String(D.PROJECTS.filter(p => p.folder === k).length)]), ['waking the crew ', 'ok'], ['bqnd, the assistant ', 'ready']]
      .forEach(([a, b], i) => setTimeout(() => { $('#log').innerHTML += `${a}${'.'.repeat(Math.max(2, 26 - a.length))} <b>${b}</b>\n`; }, 250 + i * 320));
    setTimeout(finishBoot, fast ? 1100 : 2900);
  }
  $('#skip').onclick = finishBoot;
  addEventListener('keydown', e => { if (!booted && (e.key === 'Enter' || e.key === 'Escape')) finishBoot(); });

  window.bandOS = { openWin, openApp, W };               // handy from the console
})();

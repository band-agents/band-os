/* band. OS on a phone: an iPhone. Home screen, apps that zoom open, iOS navigation (large titles, back, edge swipe),
   a Photos-style viewer, bottom sheets and the Dynamic Island. Every page is a history entry, so the phone's own back works. */
window.IOS = (() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  let A, root, appsEl, cur = null, depth = 0, viewer = null, swiping = false;
  const R = window.BQ?.reduced;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const BACK = '<svg width="12" height="20" viewBox="0 0 12 20" aria-hidden="true"><path d="M10 2 2.5 10 10 18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const CHEV = '<svg class="chev" width="8" height="13" viewBox="0 0 8 13" aria-hidden="true"><path d="M1.5 1.5 6.5 6.5 1.5 11.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const svg = (p, vb = 24) => `<svg viewBox="0 0 ${vb} ${vb}" width="30" height="30" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const bars = (n, off, col = '#fff') => `<span class="gl" style="color:${col}">${BQ.glyph(n, off, 100)}</span>`;

  /* ---------- the apps on the home screen ---------- */
  const ICON = {
    work: { n: 'Work', bg: 'linear-gradient(160deg,#2a2a2c,#000)', g: () => bars(5, 0, '#10A862'), open: ['work', { folder: 'all' }] },
    stores: { n: 'Stores', bg: 'linear-gradient(160deg,#4cd964,#0f8a3e)', g: () => svg('<path d="M4 9h16l-1.2 10.2a1 1 0 0 1-1 .8H6.2a1 1 0 0 1-1-.8z"/><path d="M8.5 9V7a3.5 3.5 0 0 1 7 0v2"/>'), open: ['work', { folder: 'stores' }] },
    web: { n: 'Websites', bg: 'linear-gradient(160deg,#5ac8fa,#0a63d6)', g: () => svg('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.4 3.8 5.3 3.8 8.5s-1.2 6.1-3.8 8.5c-2.6-2.4-3.8-5.3-3.8-8.5S9.4 5.9 12 3.5z"/>'), open: ['work', { folder: 'web' }] },
    apps: { n: 'Apps', bg: 'linear-gradient(160deg,#b38cff,#5b2fd6)', g: () => svg('<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>'), open: ['work', { folder: 'apps' }] },
    brands: { n: 'Brands', bg: 'linear-gradient(160deg,#ffb04a,#e8590c)', g: () => '<b class="tx">Aa</b>', open: ['work', { folder: 'brands' }] },
    social: { n: 'Social', bg: 'linear-gradient(45deg,#feda75,#fa7e1e 25%,#d62976 50%,#962fbf 75%,#4f5bd5)', g: () => svg('<rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.8"/><circle cx="17" cy="7" r=".9" fill="#fff" stroke="none"/>'), open: ['work', { folder: 'social' }] },
    software: { n: 'Software', bg: 'linear-gradient(160deg,#3ad1c0,#0b6f74)', g: () => '<b class="tx mono">{ }</b>', open: ['work', { folder: 'software' }] },
    media: { n: 'Media', bg: 'linear-gradient(160deg,#ffe066,#f2a20c)', g: () => svg('<path d="M4 18 9.5 12l3.5 3.5L20 8"/><path d="M15 8h5v5"/>'), open: ['work', { folder: 'media' }] },
    lab: { n: 'Lab', bg: 'linear-gradient(160deg,#6f7bff,#2b2fae)', g: () => svg('<path d="M12 3.5 13.9 9.6 20 11.5l-6.1 1.9L12 19.5l-1.9-6.1L4 11.5l6.1-1.9z"/>'), open: ['work', { folder: 'lab' }] },
    gallery: { n: 'Gallery', bg: '#fff', g: () => `<img src="img/labesny-web/cover.jpg" alt="">`, open: ['photos', {}] },
    results: { n: 'Results', bg: '#fff', g: () => `<span class="rb">${[.32, .32, .32, 1, 1, 1].map((h, i) => `<i style="height:${h * 100}%;background:${i > 2 ? '#10A862' : '#1c1c1e'}"></i>`).join('')}</span>`, open: ['results', {}] },
    services: { n: 'Services', bg: 'linear-gradient(160deg,#9a9aa2,#4a4a50)', g: () => svg('<path d="M8 6.5h11M8 12h11M8 17.5h11"/><circle cx="4.6" cy="6.5" r="1" fill="#fff"/><circle cx="4.6" cy="12" r="1" fill="#fff"/><circle cx="4.6" cy="17.5" r="1" fill="#fff"/>'), open: ['services', {}] },
    team: { n: 'The crew', bg: '#e9e9ee', g: () => `<span class="heads">${Object.values(A.P).map(p => `<img src="${p.head}" alt="">`).join('')}</span>`, open: ['team', {}] },
    readme: { n: 'Readme', bg: 'linear-gradient(#ffd60a 0 28%,#fff 28%)', g: () => '<span class="ln"><i></i><i></i><i style="width:60%"></i></span>', open: ['readme', {}] },
    terminal: { n: 'Terminal', bg: '#000', g: () => '<b class="tx mono" style="color:#30d158">&gt;_</b>', open: ['terminal', {}] },
    contact: { n: 'Start a build', bg: 'linear-gradient(160deg,#30d158,#0a8f4a)', g: () => svg('<path d="M12 5v14M5 12h14"/>'), open: ['mail', {}] },
    ask: { n: 'Ask bqnd', bg: '#0b0b0b', g: () => bars(7, 2, '#fff'), ask: true },
    trash: { n: 'Trash', bg: 'linear-gradient(160deg,#d8d8de,#a0a0a8)', g: () => svg('<path d="M5 7h14M9.5 7V5h5v2M7 7l.8 12h8.4L17 7"/>'), open: ['trash', {}] },
    about: { n: 'About', bg: 'linear-gradient(160deg,#fff,#e6e6eb)', g: () => '<b class="tx" style="color:#0b0b0b;font-size:15px">band.</b>', open: ['about', {}] },
  };
  const PAGE1 = ['work', 'stores', 'web', 'apps', 'brands', 'social', 'software', 'media', 'gallery', 'results', 'services', 'team'];
  const PAGE2 = ['readme', 'terminal', 'lab', 'contact', 'trash', 'about'];
  const DOCK = ['work', 'gallery', 'ask', 'contact'];
  const icon = (k, label = true) => { const c = ICON[k]; return `<button class="ic2" data-ic="${k}" aria-label="${c.n}"><span class="sq" style="background:${c.bg}">${c.g()}</span>${label ? `<span class="lb">${c.n}</span>` : ''}</button>`; };

  /* ---------- status bar, island, home ---------- */
  function build() {
    document.body.classList.add('ios');
    root = document.createElement('div'); root.id = 'ios';
    const vol = A.D.RESULTS[0], wk = A.D.PROJECTS.length;
    root.innerHTML = `<div class="wall" aria-hidden="true"><span class="bc">${BQ.BARS.map((b, i) => `<i class="${i % 4 === 2 ? 'g' : ''}" style="flex:${(b.w * 100).toFixed(1)} 1 0"></i>`).join('')}</span></div>
      <div class="sb" aria-hidden="true"><span class="tm"></span><span class="sys"><svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor"/><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="currentColor"/><rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor"/><rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor"/></svg>
        <svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 11.2 5.6 8.6a3.4 3.4 0 0 1 4.8 0zM3.2 6.2a6.8 6.8 0 0 1 9.6 0l-1.4 1.4a4.8 4.8 0 0 0-6.8 0zM.8 3.8a10.2 10.2 0 0 1 14.4 0l-1.4 1.4a8.2 8.2 0 0 0-11.6 0z" fill="currentColor"/></svg>
        <svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="22" height="12" rx="3.6" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="16.5" height="9" rx="2.2" fill="currentColor"/><path d="M24.5 4.4v4.2a2.2 2.2 0 0 0 0-4.2z" fill="currentColor" opacity=".5"/></svg></span></div>
      <div class="island" aria-live="polite"><span class="ii"></span><span class="it"></span></div>
      <main class="home">
        <div class="hp" aria-label="Home screen">
          <div class="hpage"><button class="wd" data-ic="results"><span class="wh">Results · ${esc(vol.t)}</span><b>${esc(vol.big)}</b><span class="wl">${esc(vol.l)}</span>
            <span class="wsp">${[.3, .3, .3, .3, .3, 1, 1, 1, 1, 1, 1].map((v, i) => `<i class="${i > 4 ? 'g' : ''}" style="height:${v * 100}%"></i>`).join('')}</span></button>
            ${PAGE1.map(k => icon(k)).join('')}</div>
          <div class="hpage"><button class="wd crew" data-ic="team"><span class="wh">The crew · say hi</span><span class="whs">${Object.values(A.P).map(p => `<span><img src="${p.head}" alt=""><b>${p.name}</b><small>${esc(p.role)}</small></span>`).join('')}</span></button>
            <button class="wd sm" data-ic="work"><span class="wh">Work</span><b>${wk}</b><span class="wl">projects in ${A.D.FOLDERS.length - 1} folders</span></button>
            ${PAGE2.map(k => icon(k)).join('')}</div>
        </div>
        <div class="dots"><i class="on"></i><i></i></div>
        <button class="spot" data-ic="ask"><svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true"><circle cx="5.5" cy="5.5" r="4.3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m8.8 8.8 3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>Search or ask bqnd</button>
        <nav class="dockbar" aria-label="Dock">${DOCK.map(k => icon(k, false)).join('')}</nav>
      </main>
      <div class="apps"></div>
      <button class="hind" aria-label="Home"><i></i></button>`;
    document.body.append(root);
    appsEl = $('.apps', root);
    const hp = $('.hp', root);
    hp.addEventListener('scroll', () => { const i = Math.round(hp.scrollLeft / hp.clientWidth); $$('.dots i', root).forEach((d, k) => d.classList.toggle('on', k === i)); }, { passive: true });
    root.addEventListener('click', e => {
      const ic = e.target.closest('[data-ic]'); if (!ic || ic.closest('.app')) return;
      const c = ICON[ic.dataset.ic]; if (c.ask) return A.openPal();
      press(ic); launch(c.open[0], c.open[1], $('.sq', ic) || ic);
    });
    // home indicator: tap or swipe up to go home
    const hi = $('.hind', root); let y0 = null;
    hi.addEventListener('click', home);
    hi.addEventListener('touchstart', e => { y0 = e.touches[0].clientY; }, { passive: true });
    hi.addEventListener('touchmove', e => { if (y0 != null && y0 - e.touches[0].clientY > 30) { y0 = null; home(); } }, { passive: true });
    const tick = () => { try { $('.tm', root).textContent = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit' }).format(new Date()); } catch { } };
    tick(); setInterval(tick, 15000);
    addEventListener('popstate', e => { const n = e.state?.ios || 0; while (depth > n) stepBack(); ui(); });
    matchMedia('(max-width:760px)').addEventListener('change', () => location.reload());
    ui();
  }
  const press = el => { if (R) return; el.animate([{ transform: 'scale(1)' }, { transform: 'scale(.9)' }, { transform: 'scale(1)' }], { duration: 220 }); };

  /* status bar and home indicator follow what is behind them */
  function ui() {
    let dark = true;
    if (viewer) dark = true;
    else if (cur) { const pg = cur.stack.at(-1); dark = !!pg && pg.el.classList.contains('hero') && !pg.el.querySelector('.nav').classList.contains('solid'); }
    root.classList.toggle('lightui', !dark); root.classList.toggle('in-app', !!cur);
  }

  /* ---------- Dynamic Island notifications ---------- */
  let it;
  function toast(t, ms = 3200) {
    const is = $('.island', root); $('.it', is).textContent = t; $('.ii', is).innerHTML = BQ.glyph(5, 1, 60);
    is.classList.add('on'); clearTimeout(it); it = setTimeout(() => is.classList.remove('on'), ms);
  }

  /* ---------- apps and their page stacks ---------- */
  function launch(id, opts = {}, from) {
    if (cur) return open(id, opts);
    const el = document.createElement('section'); el.className = 'app';
    el.innerHTML = '<div class="stack"></div>';
    appsEl.append(el);
    const a = { el, stack: [], stackEl: $('.stack', el) }; cur = a;
    el.addEventListener('click', delegate);
    if (from && !R) { const r = from.getBoundingClientRect(); el.style.setProperty('--ox', r.left + r.width / 2 + 'px'); el.style.setProperty('--oy', r.top + r.height / 2 + 'px'); el.classList.add('launch'); setTimeout(() => el.classList.remove('launch'), 520); }
    for (const spec of specsFor(id, opts)) push(spec, { instant: true });
    ui();
  }
  // a folder opened from the home screen sits on top of Work, so Back leads to all the folders
  function specsFor(id, o) {
    if (id === 'work' || id.startsWith('case:')) {
      const pid = o.pid || (id.startsWith('case:') ? id.slice(5) : null);
      if (pid) { const p = A.byId[pid]; return [{ t: 'root' }, { t: 'folder', folder: p.folder }, { t: 'case', pid }]; }
      if (o.person) return [{ t: 'root' }, { t: 'person', person: o.person }];
      if (o.folder && o.folder !== 'all') return [{ t: 'root' }, { t: 'folder', folder: o.folder }];
      return [{ t: 'root' }];
    }
    return [{ t: 'app', id, o }];
  }
  function open(id, opts = {}) {
    if (id === 'preview') return openViewer(opts.list, opts.i || 0, opts.pid);
    if (!cur) return launch(id, opts);
    if (id === 'work' || id.startsWith('case:')) {
      const pid = opts.pid || (id.startsWith('case:') ? id.slice(5) : null);
      if (pid) return push({ t: 'case', pid });
      if (opts.person) return push({ t: 'person', person: opts.person });
      if (opts.folder && opts.folder !== 'all') return push({ t: 'folder', folder: opts.folder });
      return push({ t: 'root' });
    }
    return push({ t: 'app', id, o: opts });
  }
  function home() { if (viewer) return history.back(); if (depth > 0) history.go(-depth); else closeApp(); }
  function closeApp() {
    const a = cur; if (!a) return; cur = null;
    a.stack.forEach(p => p.fw?.cleanup.forEach(f => { try { f(); } catch { } }));
    if (R) a.el.remove(); else { a.el.classList.add('closing'); setTimeout(() => a.el.remove(), 380); }
    ui();
  }

  function push(spec, o = {}) {
    const a = cur, prev = a.stack.at(-1), pg = page(spec, prev);
    a.stack.push(pg); a.stackEl.append(pg.el);
    if (prev) {
      if (o.instant || R) prev.el.classList.add('under');
      else { pg.el.classList.add('enter'); void pg.el.offsetWidth; requestAnimationFrame(() => { pg.el.classList.remove('enter'); prev.el.classList.add('under'); }); }
    }
    depth++; try { history.pushState({ ios: depth }, '', '#' + (pg.hash || '')); } catch { }
    ui();
    return pg;
  }
  function stepBack() {
    depth = Math.max(0, depth - 1);
    if (viewer) return closeViewer();
    const a = cur; if (!a) return;
    if (a.stack.length <= 1) return closeApp();
    const pg = a.stack.pop(), prev = a.stack.at(-1);
    pg.fw?.cleanup.forEach(f => { try { f(); } catch { } });
    prev.el.classList.remove('under'); prev.el.style.transform = ''; prev.el.style.transition = '';
    if (R || swiping) { pg.el.remove(); swiping = false; }
    else { pg.el.classList.add('leave'); setTimeout(() => pg.el.remove(), 420); }
    syncHash();
  }
  const syncHash = () => { const h = cur?.stack.at(-1)?.hash || ''; try { history.replaceState(history.state, '', h ? '#' + h : location.pathname); } catch { } };

  /* ---------- one page: nav bar + scrolling content ---------- */
  function page(spec, prev) {
    const el = document.createElement('div'); el.className = 'pg';
    el.innerHTML = `<header class="nav"><button class="back" aria-label="Back">${BACK}<span></span></button><span class="t"></span><span class="r"></span></header><div class="sc"></div>`;
    const sc = $('.sc', el), nav = $('.nav', el);
    const pg = { el, spec, title: '', hash: '' };
    const setTitle = t => { pg.title = t; $('.t', nav).textContent = t; };
    const bk = $('.back', el);
    if (prev) $('span', bk).textContent = prev.title.length > 14 ? 'Back' : prev.title; else bk.hidden = true;
    bk.onclick = () => history.back();
    let solidAt = 34;
    if (spec.t === 'root') {
      setTitle('Work'); pg.hash = '';
      sc.innerHTML = `<h1 class="lt">Work</h1><label class="srch">${'<svg width="15" height="15" viewBox="0 0 15 15"><circle cx="6.3" cy="6.3" r="5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="m10 10 3.6 3.6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>'}<input type="search" placeholder="Search ${A.D.PROJECTS.length} projects" aria-label="Search work"></label>
        <div class="res" hidden></div>
        <div class="lists"><h6 class="gh2">Folders</h6><div class="grp2">${A.D.FOLDERS.slice(1).map(([k, n]) => `<button class="row" data-f="${k}"><span class="ico" style="background:${ICON[k]?.bg || '#8e8e93'}">${(ICON[k]?.g() || '').replace(/width="30" height="30"/, 'width="19" height="19"')}</span><span class="nm">${esc(n)}</span><span class="meta">${A.inFolder(k).length}</span>${CHEV}</button>`).join('')}</div>
        <h6 class="gh2">The crew</h6><div class="grp2">${Object.values(A.P).map(p => `<button class="row" data-pp="${p.id}"><img class="av" src="${p.head}" alt=""><span class="nm">${esc(p.name)}<small>${esc(p.role)}</small></span><span class="meta">${A.D.PROJECTS.filter(x => x.people.includes(p.id)).length}</span>${CHEV}</button>`).join('')}</div>
        <h6 class="gh2">More</h6><div class="grp2"><button class="row" data-ap="photos"><span class="ico" style="background:#fff;overflow:hidden"><img src="img/labesny-web/cover.jpg" alt="" style="width:100%;height:100%;object-fit:cover"></span><span class="nm">Every screen</span>${CHEV}</button><button class="row" data-ap="results"><span class="ico" style="background:#10A862">${bars(4, 3)}</span><span class="nm">Results</span>${CHEV}</button><button class="row" data-ap="mail"><span class="ico" style="background:#30d158">+</span><span class="nm">Start a build</span>${CHEV}</button></div></div>`;
      const inp = $('input', sc), res = $('.res', sc), lists = $('.lists', sc);
      inp.oninput = () => { const q = inp.value.trim().toLowerCase(); lists.hidden = !!q; res.hidden = !q; if (q) res.innerHTML = cards(A.D.PROJECTS.filter(p => [p.name, p.kind, p.market, p.tagline, A.folderName(p.folder)].join(' ').toLowerCase().includes(q))) || '<p class="none">No results.</p>'; };
    } else if (spec.t === 'folder' || spec.t === 'person') {
      const list = spec.t === 'folder' ? A.inFolder(spec.folder) : A.D.PROJECTS.filter(p => p.people.includes(spec.person));
      const t = spec.t === 'folder' ? A.folderName(spec.folder) : A.P[spec.person].name + '’s work';
      setTitle(t); pg.hash = spec.folder || spec.person;
      sc.innerHTML = `<h1 class="lt">${esc(t)}</h1><p class="sub">${list.length} project${list.length === 1 ? '' : 's'}</p>${cards(list)}`;
    } else if (spec.t === 'case') {
      const p = A.byId[spec.pid], sib = A.inFolder(p.folder), i = sib.indexOf(p);
      setTitle(p.name); pg.hash = p.id; el.classList.add('hero');
      sc.innerHTML = A.caseHTML(p, sib[(i - 1 + sib.length) % sib.length], sib[(i + 1) % sib.length]);
      A.wireCase(sc, p, id => { const n = A.byId[id]; if (n) open('work', { pid: id }); });
      A.setTab(sc, 'overview', true);
      solidAt = 200;
    } else {
      const d = A.def(spec.id);
      el.classList.add('appg'); if (d.flex) sc.classList.add('flex');
      const fw = { id: spec.id, el, body: sc, state: {}, cleanup: [], def: d, ios: true, title: setTitle, close: () => history.back() };
      pg.fw = fw; setTitle(d.title); pg.hash = { photos: 'gallery', team: 'team', mail: 'contact' }[spec.id] || spec.id;
      d.render(fw, spec.o || {});
      solidAt = -1;
    }
    const onScroll = () => { nav.classList.toggle('solid', sc.scrollTop > solidAt); if (cur && cur.stack.at(-1) === pg) ui(); };
    sc.addEventListener('scroll', onScroll, { passive: true }); onScroll();
    if (spec.t === 'root' || spec.t === 'folder' || spec.t === 'person') sc.addEventListener('click', e => {
      const f = e.target.closest('[data-f]'), pp = e.target.closest('[data-pp]'), ap = e.target.closest('[data-ap]'), c = e.target.closest('[data-pid]');
      if (f) push({ t: 'folder', folder: f.dataset.f }); else if (pp) push({ t: 'person', person: pp.dataset.pp }); else if (ap) open(ap.dataset.ap, {}); else if (c) push({ t: 'case', pid: c.dataset.pid });
    });
    edgeSwipe(pg);
    return pg;
  }
  const cards = list => list.length ? `<div class="cards">${list.map(p => `<button class="card" data-pid="${p.id}"><span class="cimg">${A.cover(p)}<span class="kk">${esc(p.kind)}</span></span><span class="ct"><b>${esc(p.name)}</b><small>${esc(p.tagline)}</small><em>${esc(p.market)}</em></span></button>`).join('')}</div>` : '';

  // the same click wiring a desktop window has: people, projects and apps open as new pages
  function delegate(e) {
    const p = e.target.closest('[data-person]'); if (p) { e.stopPropagation(); return open('team', { person: p.dataset.person }); }
    const c = e.target.closest('[data-case]'); if (c) { e.stopPropagation(); return open('work', { pid: c.dataset.case }); }
    const a = e.target.closest('[data-app]'); if (a) { e.stopPropagation(); A.openApp(a.dataset.app); }
  }

  /* swipe from the left edge to go back, the page follows the finger */
  function edgeSwipe(pg) {
    const el = pg.el; let x0 = null, y0, dx = 0, prev;
    el.addEventListener('touchstart', e => {
      const t = e.touches[0]; if (t.clientX > 28 || !cur || cur.stack.length < 2 || cur.stack.at(-1) !== pg) return;
      x0 = t.clientX; y0 = t.clientY; dx = 0; prev = cur.stack.at(-2).el;
      el.style.transition = prev.style.transition = 'none';
    }, { passive: true });
    el.addEventListener('touchmove', e => {
      if (x0 == null) return; const t = e.touches[0]; dx = Math.max(0, t.clientX - x0);
      if (Math.abs(t.clientY - y0) > 40 && dx < 20) { x0 = null; el.style.transition = prev.style.transition = ''; return; }
      el.style.transform = `translateX(${dx}px)`; prev.style.transform = `translateX(${-28 + dx / innerWidth * 28}%)`;
    }, { passive: true });
    el.addEventListener('touchend', () => {
      if (x0 == null) return; x0 = null; el.style.transition = prev.style.transition = '';
      if (dx > innerWidth * .32) { el.style.transform = 'translateX(100%)'; prev.style.transform = 'translateX(0)'; swiping = true; setTimeout(() => history.back(), 200); }
      else { el.style.transform = ''; prev.style.transform = ''; }
    });
  }

  /* ---------- Photos-style viewer ---------- */
  function openViewer(list, i, pid) {
    if (!list?.length) return;
    if (viewer) closeViewer(true);
    const p = A.byId[pid];
    const el = document.createElement('div'); el.className = 'qv';
    el.innerHTML = `<div class="top"><button class="dn">Done</button><span class="ttl"><b></b><small></small></span><button class="pj">${p ? 'Project' : ''}</button></div>
      <div class="slides">${list.map((g, k) => `<div class="sl ${g.v ? 'vid' : ''}" data-k="${k}">${g.v ? `<video ${Math.abs(k - i) < 3 ? 'src' : 'data-src'}="${g.v}" poster="${g.src}" muted loop playsinline preload="metadata" aria-label="${esc(g.cap)}"></video>` : `<img ${Math.abs(k - i) < 3 ? 'src' : 'data-src'}="${g.src}" alt="${esc(g.cap)}">`}</div>`).join('')}</div>
      <div class="bot"><p class="cap"></p><div class="film">${list.map((g, k) => `<button data-k="${k}" class="${g.v ? 'vid' : ''}"><img src="${g.thumb || g.src}" alt="" loading="lazy"></button>`).join('')}</div></div>`;
    document.body.append(el);
    const sl = $('.slides', el); viewer = { el, list, i, pid };
    const show = k => {
      viewer.i = k; const g = list[k];
      $('.ttl b', el).textContent = p ? p.name : 'Gallery'; $('.ttl small', el).textContent = `${k + 1} of ${list.length}`;
      $('.cap', el).textContent = g.of > 1 ? `Post ${g.post}, ${g.n} of ${g.of}. ${g.cap}` : g.cap;
      $$('.film button', el).forEach((b, n) => b.classList.toggle('on', n === k)); $('.film .on', el)?.scrollIntoView({ inline: 'center', block: 'nearest' });
      for (let n = k - 2; n <= k + 2; n++) { const im = $(`.sl[data-k="${n}"] :is(img,video)`, el); if (im && im.dataset.src) { im.src = im.dataset.src; delete im.dataset.src; } }
      $$('.sl video', el).forEach(v => { if (+v.parentNode.dataset.k === k) v.play().catch(() => { }); else v.pause(); });
    };
    const fit = im => { const t = () => im.closest('.sl').classList.toggle('tall', im.naturalHeight / Math.max(1, im.naturalWidth) > (innerHeight - 240) / innerWidth); im.complete && im.naturalWidth ? t() : im.addEventListener('load', t, { once: true }); };
    $$('.sl img', el).forEach(fit);
    requestAnimationFrame(() => { sl.scrollLeft = i * sl.clientWidth; show(i); });
    let st; sl.addEventListener('scroll', () => { clearTimeout(st); st = setTimeout(() => { const k = Math.round(sl.scrollLeft / sl.clientWidth); if (k !== viewer?.i) show(k); }, 60); }, { passive: true });
    $('.film', el).addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) { sl.scrollTo({ left: +b.dataset.k * sl.clientWidth, behavior: 'smooth' }); } });
    $('.dn', el).onclick = () => history.back();
    $('.pj', el).onclick = () => { if (!p) return; history.back(); setTimeout(() => open('work', { pid: p.id }), 60); };
    sl.addEventListener('click', e => { if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO') el.classList.toggle('bare'); });
    // pull down to dismiss
    let y0 = null, dy = 0, box;
    sl.addEventListener('touchstart', e => { box = e.target.closest('.sl'); if (!box || box.scrollTop > 2) return; y0 = e.touches[0].clientY; dy = 0; }, { passive: true });
    sl.addEventListener('touchmove', e => { if (y0 == null) return; dy = e.touches[0].clientY - y0; if (dy < 0) { y0 = null; box.style.transform = ''; return; } box.style.transform = `translateY(${dy}px) scale(${1 - Math.min(dy, 400) / 1600})`; el.style.background = `rgba(0,0,0,${1 - Math.min(dy, 300) / 400})`; }, { passive: true });
    sl.addEventListener('touchend', () => { if (y0 == null) return; y0 = null; if (dy > 110) history.back(); else { box.style.transform = ''; el.style.background = ''; } });
    depth++; try { history.pushState({ ios: depth, qv: 1 }, ''); } catch { }
    ui();
  }
  function closeViewer(now) {
    const v = viewer; if (!v) return; viewer = null;
    if (now || R) v.el.remove(); else { v.el.classList.add('out'); setTimeout(() => v.el.remove(), 260); }
    ui();
  }

  /* ---------- start ---------- */
  function start(api) { A = api; build(); return { open, toast, close: w => { if (w?.ios) history.back(); }, ready }; }
  function ready(hash) {
    if (hash) {
      if (A.byId[hash]) launch('work', { pid: hash });
      else if (A.P[hash]) launch('team', { person: hash });
      else if (A.D.FOLDERS.some(f => f[0] === hash)) launch('work', { folder: hash });
      else if (ICON[hash]?.open) launch(...ICON[hash].open);
    }
    setTimeout(() => toast('Welcome to band. OS. Tap an app.'), 900);
  }
  return { start };
})();

/* band. OS — the studio's work in one app, sorted by category.
   · Routes live in the hash: #stores (a category), #volcom (a project), #services, #results, #clients, #contact. Empty = overview.
   · Desktop: one window with the categories down the side. Phone: full screen, category chips on top, tabs at the bottom.
   · Every screen opens in the viewer; ⌘K (or /) searches the work and asks bqnd. */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const D = OS, byId = D.byId, R = BQ.reduced;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const phone = matchMedia('(max-width: 760px)');
  const view = $('#view');

  /* ---------- what the site is made of ---------- */
  const CATS = D.FOLDERS.map(([id, name, line]) => ({ id, name, line }));
  const cat = id => CATS.find(c => c.id === id);
  const inCat = id => D.PROJECTS.filter(p => p.folder === id || p.also?.includes(id));
  const PAGES = [['services', 'Services'], ['results', 'Results'], ['clients', 'Clients'], ['contact', 'Contact']];
  const pageName = id => (PAGES.find(p => p[0] === id) || [])[1];
  const COVER_OF = { stores: 'womensecret', apps: 'labesny', software: 'thoth', brands: 'mes-brand', social: 'ig-yqn', media: 'volcom', lab: 'lab' };
  const FEATURED = ['odds', 'womensecret', 'labesny', 'mes-brand', 'volcom', 'end'];
  const NEED = ['Store', 'Website', 'App', 'Software', 'Brand', 'Social', 'Media', 'AI content', 'Creative tech'];

  const I = {
    home: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
    stores: '<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    web: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/>',
    apps: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    software: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 6l-3 12"/>',
    brands: '<path d="M12 3l8 9-8 9-8-9z"/>',
    social: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/>',
    media: '<path d="M5 20V11M11 20V5M17 20v-6M3 20h18"/>',
    lab: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/>',
    services: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
    results: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    clients: '<path d="M4 20V8l8-4 8 4v12"/><path d="M9 20v-6h6v6"/>',
    portal: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    contact: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    out: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  };
  const ic = (k, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${I[k]}</svg>`;

  /* ---------- charts: the logo's own bars, to scale ---------- */
  const CH = {
    volcom: { v: [.3, .3, .3, .3, .3, 1, 1, 1, 1, 1, 1], hot: [5, 6, 7, 8, 9, 10], lab: [['€18,892', 'ad spend'], ['€63,034', 'sales · 30 days']] },
    ashya: { v: [.062, .062, .062, .062, 1, 1, 1, 1, 1, 1, 1], hot: [4, 5, 6, 7, 8, 9, 10], lab: [['EGP 260K', 'a month, before'], ['EGP 4.2M', 'a month, 18 months later']] },
    roas16: { v: [.0625, .0625, .0625, 1, 1, 1, 1, 1, 1, 1, 1], hot: [3, 4, 5, 6, 7, 8, 9, 10], lab: [['×1', 'ad spend'], ['×16', 'return at peak']] },
    installs: { v: [1, 1, 1, 1, 1, .2, .2, .2, .2, .2, .2], hot: [5, 6, 7, 8, 9, 10], lab: [['Before', 'cost per install'], ['−80%', 'after']] },
    markets: { v: [.55, .02, .55, .02, .55, .02, .02, 1, 1, 1, 1], hot: [7, 8, 9, 10], lab: [['EG · JO · KW', 'three stores'], ['1', 'Shopify build']] },
    fig: { v: [.251, .251, .02, 1, 1, .02, .064, .064, .02, .009, .009], hot: [3, 4], lab: [['6,730', 'products'], ['26,829', 'sizes & colours'], ['1,706', 'customers'], ['246', 'categories']] },
  };
  const bars = (c, cls) => `<div class="${cls}" aria-hidden="true">${c.v.map((v, i) => `<i class="${c.hot.includes(i) ? 'g' : ''}" style="height:${Math.max(1.5, v * 100)}%;flex-grow:${(BQ.BARS[i].w * 100).toFixed(1)};animation-delay:${i * 40}ms"></i>`).join('')}</div>`;
  const chart = k => CH[k] ? `<figure class="chart">${bars(CH[k], 'bars')}<figcaption class="mono">${CH[k].lab.map(([a, b]) => `<span><b>${a}</b> ${b}</span>`).join('')}</figcaption></figure>` : '';
  const FLAT = { v: [1, .6, .8, .4, 1, .7, .5, .9, .6, 1, .8], hot: [] };

  /* ---------- pieces ---------- */
  const imgK = g => g?.k === 'd' || g?.k === 'p' ? 'top' : '';
  const coverHTML = p => p.cover
    ? `<img class="${imgK(p.cover)}" src="${p.cover.src}" alt="${esc(p.cover.cap)}" loading="lazy">`
    : `<span class="gen">${bars(CH[p.chart?.k] || FLAT, 'bars')}</span>`;
  const card = (p, big) => `<a class="card ${big ? 'big' : ''}" href="#${p.id}">
      <span class="cv">${coverHTML(p)}<span class="kind mono">${esc(p.kind)}</span></span>
      <span class="ct"><b>${esc(p.name)}</b><small>${esc(p.market)}</small></span>
      <span class="tg">${esc(p.tagline)}</span></a>`;
  const head = (eyebrow, title, lead, extra = '') => `<header class="ph"><p class="eyebrow mono">${eyebrow}</p><h1>${title}</h1>${lead ? `<p class="lead">${lead}</p>` : ''}${extra}</header>`;
  const chips = cur => `<nav class="chips" aria-label="Categories"><a href="#" class="${cur === 'home' ? 'on' : ''}">All</a>${CATS.map(c => `<a href="#${c.id}" class="${cur === c.id ? 'on' : ''}">${c.name}</a>`).join('')}</nav>`;
  const secHead = (t, href, more) => `<header class="sh"><h2>${t}</h2>${href ? `<a class="more" href="${href}">${more} ${ic('arrow')}</a>` : ''}</header>`;

  // A screen, photo, slide or motion loop. Desktop screens sit in a browser frame, phone screens in a phone; tall pages scroll inside.
  let lists = [];
  const listId = arr => lists.push(arr) - 1;
  function media(g, l, i) {
    const inner = g.v
      ? `<video src="${g.v}" poster="${g.src}" muted loop playsinline preload="none" data-auto></video>`
      : `<img src="${g.thumb || g.src}" alt="${esc(g.cap)}" loading="lazy">`;
    const k = ['d', 'p', 't'].includes(g.k) ? g.k : 'f';            // t = a tall 9:16 clip
    return `<figure class="m ${k}"><div class="frame" role="button" tabindex="0" data-l="${l}" data-i="${i}" aria-label="Open ${esc(g.cap)}">${k === 'd' ? '<span class="chrome"><i></i><i></i><i></i></span>' : ''}<span class="scr">${inner}</span>${g.v ? '<span class="play mono">motion</span>' : ''}</div><figcaption>${esc(g.cap)}</figcaption></figure>`;
  }
  const strip = (imgs, cls = '') => { const l = listId(imgs); return `<div class="strip ${cls} n${Math.min(imgs.length, 4)}">${imgs.map((g, i) => media(g, l, i)).join('')}</div>`; };

  /* ---------- pages ---------- */
  function home() {
    const n = D.PROJECTS.length;
    return `<div class="page">
      ${chips('home')}
      <header class="hero"><div class="hero-fx" id="heroFx" aria-hidden="true"></div>
        <p class="eyebrow mono">band. — a studio in Cairo</p>
        <h1>Stores, software, brands <span>and media.</span></h1>
        <p class="lead">We build online stores, write custom software, shape brands and buy the media, in English and Arabic. Everything we’ve made, sorted by category.</p>
        <div class="cta"><a class="btn dark" href="#contact">Start a project ${ic('arrow')}</a><a class="btn" href="#services">What we do</a></div>
        <dl class="stats"><div><dt>${n}</dt><dd>projects</dd></div><div><dt>${CATS.length}</dt><dd>categories</dd></div><div><dt>20+</dt><dd>brands served</dd></div><div><dt>9+</dt><dd>years building</dd></div></dl>
      </header>
      <section class="sec">${secHead('Browse by category')}
        <div class="cats">${CATS.map(c => { const p = byId[COVER_OF[c.id]] || inCat(c.id)[0]; return `<a class="catc" href="#${c.id}">
          <span class="cv">${coverHTML(p)}</span>
          <span class="cb"><span class="cn">${ic(c.id)}<b>${c.name}</b><em class="mono">${inCat(c.id).length}</em></span><span class="cl">${c.line}</span></span></a>`; }).join('')}
          <a class="catc yours" href="#contact"><span class="cb"><span class="cl mono">Next</span><b>Your project.</b><span class="go">Start a project ${ic('arrow')}</span></span></a></div>
      </section>
      <section class="sec">${secHead('Selected work')}
        <div class="grid">${FEATURED.map(id => byId[id] && card(byId[id])).join('')}</div>
      </section>
      <section class="sec">${secHead('Results', '#results', 'All results')}
        <div class="res-grid">${D.RESULTS.slice(0, 4).map(resTile).join('')}</div>
      </section>
      <section class="sec">${secHead('Clients', '#clients', 'All clients')}
        <p class="names">${D.CLIENTS.flatMap(([, l]) => l).slice(0, 18).map(esc).join(' <i>/</i> ')}</p>
      </section>
      ${outro()}
    </div>`;
  }

  function category(id) {
    const c = cat(id), list = inCat(id), i = CATS.indexOf(c), nx = CATS[(i + 1) % CATS.length];
    const svc = D.SERVICES.find(s => s.work.some(w => list.some(p => p.id === w)));
    return `<div class="page">
      ${chips(id)}
      ${head(`Work <i>/</i> ${list.length} ${list.length === 1 ? 'project' : 'projects'}`, c.name, c.line, svc ? `<a class="more" href="#services">${esc(svc.name)} ${ic('arrow')}</a>` : '')}
      <div class="grid ${id === 'social' ? 'sq' : ''}">${list.map(p => card(p)).join('')}</div>
      <a class="nextcat" href="#${nx.id}"><span class="mono">Next category</span><b>${nx.name}</b>${ic('arrow')}</a>
    </div>`;
  }

  function project(p) {
    const list = inCat(p.folder), i = list.indexOf(p), prev = list[(i - 1 + list.length) % list.length], next = list[(i + 1) % list.length];
    const c = cat(p.folder);
    const featImgs = new Set(p.features.flatMap(f => f.imgs.map(g => g.src)));
    const extra = p.feed ? [] : p.gallery.filter(g => !featImgs.has(g.src));
    const hero = p.feed ? '' : p.cover ? (() => { const l = listId([p.cover, ...p.gallery.filter(g => g.src !== p.cover.src)]); return `<figure class="hero-m ${imgK(p.cover) ? 'top' : ''}" role="button" tabindex="0" data-l="${l}" data-i="0"><img src="${p.cover.src}" alt="${esc(p.cover.cap)}"></figure>`; })()
      : `<figure class="hero-m chartbox">${chart(p.chart?.k)}</figure>`;
    const related = (p.see || []).map(id => byId[id]).filter(Boolean);
    return `<article class="page case">
      <header class="ph">
        <p class="eyebrow mono"><a href="#${c.id}">${c.name}</a> <i>/</i> ${esc(p.kind)} <i>/</i> ${esc(p.market)}</p>
        <h1>${esc(p.name)}</h1>
        <p class="lead">${esc(p.tagline)}</p>
        ${p.links?.length ? `<div class="cta">${p.links.map(([t, u], j) => `<a class="btn ${j ? '' : 'dark'}" href="${u}" target="_blank" rel="noopener">${esc(t)} ${ic('out')}</a>`).join('')}</div>` : ''}
      </header>
      ${hero}
      ${p.numbers?.length ? `<dl class="nums">${p.numbers.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl>` : ''}
      ${p.cover && p.chart?.k ? chart(p.chart.k) : ''}
      <section class="story">
        <div class="txt"><h2 class="lbl mono">The story</h2>${p.about.map(t => `<p>${esc(t)}</p>`).join('')}</div>
        <dl class="facts">${p.facts.map(([a, b]) => `<div><dt class="mono">${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl>
      </section>
      ${p.feed ? feed(p) : ''}
      ${p.features.filter(f => f.imgs.length || f.x).map((f, j) => `<section class="feat">
        <div class="ft"><span class="n mono">${String(j + 1).padStart(2, '0')}</span><h3>${esc(f.t)}</h3><p>${esc(f.x)}</p></div>
        ${f.imgs.length ? strip(f.imgs) : ''}</section>`).join('')}
      ${extra.length ? `<section class="sec">${secHead(`More screens <em class="mono">${extra.length}</em>`)}${strip(extra, 'all')}</section>` : ''}
      ${related.length ? `<section class="sec">${secHead('Related')}<div class="grid">${related.map(r => card(r)).join('')}</div></section>` : ''}
      <nav class="pager" aria-label="More ${esc(c.name.toLowerCase())}">
        <a href="#${prev.id}"><span class="mono">‹ Previous</span><b>${esc(prev.name)}</b></a>
        <a href="#${c.id}" class="up"><span class="mono">All</span><b>${c.name}</b></a>
        <a href="#${next.id}" class="nx"><span class="mono">Next ›</span><b>${esc(next.name)}</b></a>
      </nav>
    </article>`;
  }

  function feed(p) {
    const s = p.feed, l = listId(p.gallery);
    let k = 0; const start = s.posts.map(po => { const at = k; k += po.slides.length; return at; });
    return `<section class="feed">
      <div class="prof"><img class="av" src="${s.avatar}" alt="">
        <div><b>${esc(s.handle)}</b><span>${esc(s.name)}${s.site ? ` · ${esc(s.site)}` : ''}</span>
        <dl><div><dt>${esc(s.stats?.posts || s.posts.length)}</dt><dd>posts</dd></div><div><dt>${esc(s.stats?.followers || '—')}</dt><dd>followers</dd></div><div><dt>${esc(s.stats?.following || '—')}</dt><dd>following</dd></div></dl></div></div>
      <div class="hls">${s.highlights.map(h => `<span><img src="${h.src}" alt="" loading="lazy"><small>${esc(h.label)}</small></span>`).join('')}</div>
      <div class="posts">${s.posts.map((po, j) => `<div class="post" role="button" tabindex="0" data-l="${l}" data-i="${start[j]}" aria-label="Open post ${j + 1}"><img src="${po.thumb}" alt="${esc(po.cap)}" loading="lazy">${po.slides.length > 1 ? `<span class="multi mono">1/${po.slides.length}</span>` : ''}</div>`).join('')}</div>
    </section>`;
  }

  function resTile(r) {
    return `<article class="res"><p class="mono">${esc(r.t)}</p><b class="big">${esc(r.big)}</b><p class="l">${esc(r.l)}</p>
      ${r.chart && CH[r.chart] ? bars(CH[r.chart], 'bars') : ''}
      ${r.rows ? `<dl>${r.rows.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('')}</dl>` : ''}
      ${r.id && byId[r.id] ? `<a class="more" href="#${r.id}">See the project ${ic('arrow')}</a>` : ''}</article>`;
  }

  const outro = () => `<section class="outro"><h2>Have something to build?</h2><p>A 20-minute call, then a written brief and quote within 48 hours.</p><a class="btn light" href="#contact">Start a project ${ic('arrow')}</a></section>`;

  function services() {
    return `<div class="page">
      ${head('Studio <i>/</i> what we do', 'Services', 'Six things we do, and the work that proves each one.')}
      <div class="svcs">${D.SERVICES.map((s, j) => `<section class="svc" id="svc-${s.id}">
        <div class="sl"><span class="n mono">${String(j + 1).padStart(2, '0')}</span><h2>${esc(s.name)}</h2><p class="sub mono">${esc(s.sub)}</p><p>${esc(s.lead)}</p></div>
        <div class="sr"><ul>${s.get.map(g => `<li>${esc(g)}</li>`).join('')}</ul>
        ${s.work.length ? `<div class="minis">${s.work.map(id => byId[id]).filter(Boolean).map(p => `<a href="#${p.id}" title="${esc(p.name)}"><span>${coverHTML(p)}</span><small>${esc(p.name)}</small></a>`).join('')}</div>` : ''}</div>
      </section>`).join('')}</div>
      ${outro()}
    </div>`;
  }

  function results() {
    return `<div class="page">
      ${head('Studio <i>/</i> real figures only', 'Results', 'Every number here comes from a real build or a real campaign. The bars are drawn to scale.')}
      <div class="res-grid all">${D.RESULTS.map(resTile).join('')}</div>
      ${outro()}
    </div>`;
  }

  function clients() {
    return `<div class="page">
      ${head('Studio <i>/</i> who we’ve worked with', 'Clients', `${D.CLIENTS.reduce((t, [, l]) => t + l.length, 0)} brands across Egypt, the Gulf, Europe and the USA.`)}
      ${D.CLIENTS.map(([g, l]) => `<section class="cgroup"><h2 class="lbl mono">${esc(g)}</h2><ul>${l.map(n => `<li>${esc(n)}</li>`).join('')}</ul></section>`).join('')}
      ${outro()}
    </div>`;
  }

  function contact() {
    const steps = [['20-minute call', 'What you sell, where, and what’s in the way.'], ['Brief and quote', 'Written, within 48 hours.'], ['Weekly previews', 'Click through it while we build.'], ['Launch', 'Tested on real phones.'], ['After launch', 'Media, content and improvements, reported monthly.']];
    return `<div class="page">
      ${head('Studio <i>/</i> start a project', 'Let’s build it.', 'Tell us what you need. We reply within a day, and a written quote follows within 48 hours of a short call.')}
      <div class="contact">
        <form class="brief" id="brief">
          <fieldset><legend class="lbl mono">What do you need?</legend><div class="needs">${NEED.map(n => `<button type="button" aria-pressed="false">${n}</button>`).join('')}</div></fieldset>
          <label><span class="lbl mono">Your name</span><input name="name" autocomplete="name" required></label>
          <label><span class="lbl mono">Brand or company</span><input name="brand" autocomplete="organization"></label>
          <label><span class="lbl mono">What are you building?</span><textarea name="msg" rows="4" placeholder="What you sell, where you sell it, and what’s in the way."></textarea></label>
          <div class="cta"><button class="btn dark" type="submit">Send by email ${ic('arrow')}</button><a class="btn" href="https://ig.me/m/band.cairo" target="_blank" rel="noopener">DM on Instagram</a></div>
          <p class="note">Sending opens your email app with everything filled in, addressed to <a href="mailto:${D.EMAIL}">${D.EMAIL}</a>.</p>
        </form>
        <aside class="how">
          <h2 class="lbl mono">How it goes</h2>
          <ol>${steps.map(([a, b]) => `<li><b>${a}</b><span>${b}</span></li>`).join('')}</ol>
          <h2 class="lbl mono">Find us online</h2>
          <ul class="links">${D.LINKS.filter(([n]) => n !== 'Threads').map(([n, h, u]) => `<li><a href="${u}" target="_blank" rel="noopener"><span>${n}</span><small>${h}</small>${ic('out')}</a></li>`).join('')}
            <li><a href="mailto:${D.EMAIL}"><span>Email</span><small>${D.EMAIL}</small>${ic('out')}</a></li></ul>
        </aside>
      </div>
      <section class="place">
        <div class="pl"><h2 class="lbl mono">The studio</h2><b>${esc(D.PLACE.label)}</b><p>Come by for the 20-minute call in person. Tell us you’re coming first.</p>
          <a class="btn dark" href="${D.PLACE.url}" target="_blank" rel="noopener">Open in Google Maps ${ic('out')}</a></div>
        <div class="map"><iframe title="band. on the map" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
          src="https://www.google.com/maps/embed?origin=mfe&pb=!1m3!2m1!1s${D.PLACE.lat},${D.PLACE.lng}!6i16"></iframe></div>
      </section>
    </div>`;
  }

  /* ---------- the router ---------- */
  let cur = null, scrolls = {};
  const parse = () => {
    const h = decodeURIComponent(location.hash.slice(1)).replace(/^\//, '');
    if (!h || h === 'work' || h === 'all' || h === 'home') return { k: 'home', id: 'home' };
    if (cat(h)) return { k: 'cat', id: h };
    if (h === 'web' || h === 'websites') return { k: 'cat', id: 'stores' };       // Websites now live with Stores
    if (pageName(h)) return { k: 'page', id: h };
    if (byId[h]) return { k: 'project', id: h };
    if (h === 'gallery' || h === 'photos') return { k: 'home', id: 'home' };
    return { k: 'home', id: 'home' };
  };
  function render(push) {
    if (cur) scrolls[cur.id] = view.scrollTop;
    const r = parse(); cur = r; lists = [];
    const p = r.k === 'project' ? byId[r.id] : null;
    view.innerHTML = r.k === 'home' ? home() : r.k === 'cat' ? category(r.id) : r.k === 'project' ? project(p)
      : ({ services, results, clients, contact })[r.id]();
    const section = r.k === 'cat' ? r.id : p ? p.folder : r.k === 'page' ? r.id : 'home';
    // where you are
    const crumbs = [['', 'band.']];
    if (r.k === 'cat') crumbs.push([r.id, cat(r.id).name]);
    if (p) crumbs.push([p.folder, cat(p.folder).name], [p.id, p.name]);
    if (r.k === 'page') crumbs.push([r.id, pageName(r.id)]);
    $('#crumbs').innerHTML = crumbs.map(([h, t], i) => i === crumbs.length - 1 ? `<span aria-current="page">${esc(t)}</span>` : `<a href="#${h}">${esc(t)}</a>`).join('<i>/</i>');
    document.title = r.k === 'home' ? 'band. OS — stores, software, brands and media from Cairo' : `${crumbs[crumbs.length - 1][1]} — band.`;
    $$('[data-go]').forEach(a => a.classList.toggle('on', a.dataset.go === section || (a.dataset.go === 'home' && (r.k === 'cat' || p) && a.closest('#tabs, #top'))));
    document.body.classList.toggle('deep', r.k !== 'home');
    $('#backBtn').disabled = r.k === 'home';
    wire();
    view.scrollTop = push === 'pop' ? (scrolls[r.id] || 0) : 0;
    placeLoop();
    if (push !== 'first' && win.state !== 'open') openWindow();     // anything you open shows the window
    if (!R && push !== 'first') view.firstElementChild?.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
    $('.chips .on', view)?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
  // the pages visited in this tab, so Back knows whether to step back or go up a level
  const trail = [location.hash.slice(1)];
  const go = h => { if (location.hash.slice(1) === h) render(); else location.hash = h; };
  addEventListener('hashchange', () => {
    const h = location.hash.slice(1), wasBack = trail.length > 1 && trail[trail.length - 2] === h;
    if (wasBack) trail.pop(); else trail.push(h);
    render(wasBack ? 'pop' : 'push');
  });
  const back = () => { if (trail.length > 1) history.back(); else { const r = parse(); go(r.k === 'project' ? byId[r.id].folder : ''); } };
  $('#backBtn').onclick = back;

  /* ---------- wiring a page ---------- */
  let io;
  function wire() {
    $$('[data-l]', view).forEach(el => {
      const open = () => quick(lists[+el.dataset.l], +el.dataset.i);
      el.addEventListener('click', e => { if (e.target.closest('a')) return; open(); });
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
    io?.disconnect();
    if (!R) {
      io = new IntersectionObserver(es => es.forEach(e => { const v = e.target; if (e.isIntersecting) { v.preload = 'auto'; v.play().catch(() => { }); } else v.pause(); }), { root: view, threshold: .25 });
      $$('video[data-auto]', view).forEach(v => io.observe(v));
    }
    const f = $('#brief', view);
    if (f) {
      $$('.needs button', f).forEach(b => b.onclick = () => b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'));
      f.onsubmit = e => {
        e.preventDefault();
        const d = new FormData(f), needs = $$('.needs [aria-pressed="true"]', f).map(b => b.textContent);
        const subj = `New project${d.get('brand') ? ' — ' + d.get('brand') : ''}`;
        const body = [`Name: ${d.get('name')}`, d.get('brand') ? `Brand: ${d.get('brand')}` : null, needs.length ? `Needs: ${needs.join(', ')}` : null, '', d.get('msg')].filter(x => x !== null).join('\n');
        location.href = `mailto:${D.EMAIL}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
        toast('Opening your email app…');
      };
    }
  }

  /* ---------- the motion loop (made with Remotion, see band-os-motion) ---------- */
  const calm = R || navigator.connection?.saveData;
  function loop(host, tall) {
    if (!host || host.firstChild) return;
    const name = tall ? 'garden-tall' : 'garden', v = document.createElement('video');
    Object.assign(v, { muted: true, loop: true, playsInline: true, poster: `img/bg/${name}.jpg`, preload: calm ? 'none' : 'auto' });
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    if (calm) v.classList.add('on');
    else { v.src = `img/bg/${name}.mp4`; v.addEventListener('playing', () => v.classList.add('on'), { once: true }); }
    host.append(v); if (!calm) v.play().catch(() => v.classList.add('on'));
  }
  const placeLoop = () => { if (phone.matches) loop($('#heroFx', view), true); else loop($('#bgfx'), innerHeight > innerWidth * 1.2); };
  if (!R) addEventListener('pointermove', e => {                     // the desk leans a little toward the pointer
    if (phone.matches) return;
    $('#bgfx').style.transform = `translate(${(e.clientX / innerWidth - .5) * -14}px,${(e.clientY / innerHeight - .5) * -10}px) scale(1.04)`;
  }, { passive: true });
  phone.addEventListener('change', placeLoop);

  /* ---------- the viewer ---------- */
  const ql = $('#ql'); let qs = null, lastFocus = null;
  function quick(list, i) {
    if (!list?.length) return;
    lastFocus = document.activeElement; qs = { list, i };
    ql.hidden = false; document.body.classList.add('qlon');
    drawQuick(); $('.qx', ql)?.focus();
    if (!R) ql.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
  }
  function drawQuick() {
    const { list, i } = qs, g = list[i], n = list.length;
    ql.innerHTML = `<div class="qtop"><span class="mono">${i + 1} / ${n}</span><p>${esc(g.cap || '')}${g.of > 1 ? ` <em class="mono">slide ${g.n} of ${g.of}</em>` : ''}</p><button class="qx" aria-label="Close">${ic('close')}</button></div>
      <div class="qstage ${g.k === 'p' ? 'p' : ''}">${g.v ? `<video src="${g.v}" poster="${g.src}" autoplay muted loop playsinline controls></video>` : `<img src="${g.src}" alt="${esc(g.cap || '')}">`}</div>
      ${n > 1 ? `<button class="qa prev" aria-label="Previous">${ic('back')}</button><button class="qa next" aria-label="Next">${ic('back')}</button>
      <div class="qfilm">${list.map((x, j) => `<button class="${j === i ? 'on' : ''}" data-j="${j}" aria-label="Show ${j + 1}"><img src="${x.thumb || x.src}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}`;
    $('.qx', ql).onclick = closeQuick;
    $('.prev', ql)?.addEventListener('click', () => stepQuick(-1));
    $('.next', ql)?.addEventListener('click', () => stepQuick(1));
    $$('.qfilm button', ql).forEach(b => b.onclick = () => { qs.i = +b.dataset.j; drawQuick(); });
    $('.qfilm .on', ql)?.scrollIntoView({ block: 'nearest', inline: 'center' });
    const st = $('.qstage', ql); st.scrollTop = 0;
    const im = $('img', st); // full-page screenshots scroll; everything else fits the screen
    if (im) { const t = () => im.classList.toggle('tall', im.naturalHeight / im.naturalWidth > 1.9); im.complete ? t() : im.onload = t; }
    st.onclick = e => { if (e.target === st) closeQuick(); };
  }
  const stepQuick = d => { if (!qs) return; qs.i = (qs.i + d + qs.list.length) % qs.list.length; drawQuick(); };
  function closeQuick() { ql.hidden = true; ql.innerHTML = ''; qs = null; document.body.classList.remove('qlon'); lastFocus?.focus?.(); }
  { // swipe on phones
    let x0 = null, y0 = 0;
    ql.addEventListener('touchstart', e => { if (e.target.closest('.qfilm')) return; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    ql.addEventListener('touchend', e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) stepQuick(dx < 0 ? 1 : -1); }, { passive: true });
  }

  /* ---------- toast ---------- */
  let toastT;
  function toast(t, ms = 2600) { let el = $('#toast'); if (!el) { el = document.createElement('div'); el.id = 'toast'; el.setAttribute('role', 'status'); document.body.append(el); } el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), ms); }

  /* ---------- search and bqnd ---------- */
  const kCode = BQ.code($('#kCode'), { color: '#0B0B0B', accent: '#10A862', mode: 'breathe' });
  const pCode = BQ.code($('#pCode'), { color: '#0B0B0B', accent: '#10A862', mode: 'breathe', minH: .1 });
  const pal = $('#pal');
  const asst = new BQ.Assistant({
    context: () => `the "${document.title}" page of the band. website`,
    actions: { show: ids => ids[0] && byId[ids[0]] && go(ids[0]), app: a => go(a === 'home' || a === 'work' ? '' : a) },
    onState: (s, n) => [kCode, pCode].forEach(c => { c.mode(s === 'think' ? 'think' : s === 'speak' ? 'speak' : 'breathe'); if (s === 'speak') c.kick(.15 + (n || 1) * .03); }),
  });
  const ui = BQ.chat($('#palChat'), asst, { placeholder: 'Search the work, or ask anything…', chips: ['Show me your stores', 'What did Volcom get?', 'How do you work?', 'عايز أبدأ مشروع'] });
  ['.bq-log', '.bq-chips', '.bq-note'].forEach(s => $('#pbody').append($('#palChat ' + s)));
  const CMDS = [
    ...CATS.map(c => ({ t: c.name, k: `${inCat(c.id).length} projects`, h: c.id, ic: c.id })),
    ...D.PROJECTS.map(p => ({ t: p.name, k: `${cat(p.folder).name} · ${p.kind}`, h: p.id, img: p.cover?.src, q: `${p.market} ${p.tagline}` })),
    ...PAGES.map(([h, t]) => ({ t, k: 'Studio', h, ic: h })),
    ...D.SERVICES.map(s => ({ t: s.name, k: 'Service', h: 'services', ic: 'services' })),
  ];
  let sel = 0, shown = [];
  function renderCmds() {
    const raw = ui.input.value.trim(), q = raw.toLowerCase();
    const hits = q ? CMDS.filter(c => (c.t + ' ' + c.k + ' ' + (c.q || '')).toLowerCase().includes(q)).slice(0, 7) : CATS.map(c => CMDS.find(x => x.h === c.id));
    shown = [...hits, ...(q ? [{ t: `Ask bqnd: “${raw}”`, k: '↵', ask: true }] : [])];
    sel = Math.min(sel, shown.length - 1);
    $('#cmds').innerHTML = (q ? '' : '<p class="mono hint">Categories</p>') + shown.map((c, i) => `<button class="cmd ${c.ask ? 'ask' : ''} ${i === sel ? 'sel' : ''}" role="option" aria-selected="${i === sel}">
      <span class="ci">${c.img ? `<img src="${c.img}" alt="">` : ic(c.ask ? 'search' : c.ic || 'arrow')}</span><b></b><small class="mono"></small></button>`).join('');
    $$('#cmds .cmd').forEach((b, i) => { $('b', b).textContent = shown[i].t; $('small', b).textContent = shown[i].k; b.onclick = () => runCmd(i); b.onmouseenter = () => { sel = i; $$('#cmds .cmd').forEach((x, j) => x.classList.toggle('sel', j === i)); }; });
  }
  function runCmd(i) {
    const c = shown[i]; if (!c) return;
    if (c.ask) { const v = ui.input.value; ui.input.value = ''; renderCmds(); asst.ask(v); }
    else { go(c.h); ui.input.value = ''; closePal(); }
  }
  ui.input.addEventListener('input', () => { sel = 0; renderCmds(); pCode.kick(.2); });
  ui.input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!shown.length) return; sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + shown.length) % shown.length; renderCmds(); }
    if (e.key === 'Enter' && shown.length && !shown[sel]?.ask && ui.input.value.trim()) { e.preventDefault(); runCmd(sel); }
  });
  ui.form.addEventListener('submit', () => setTimeout(renderCmds));
  function openPal() { pal.classList.add('open'); document.body.classList.add('palon'); sel = 0; renderCmds(); setTimeout(() => ui.input.focus(), 30); }
  function closePal() { pal.classList.remove('open'); document.body.classList.remove('palon'); }
  pal.addEventListener('click', e => { if (e.target === pal) closePal(); });
  $('#palX').onclick = closePal;
  $('#askBtn').onclick = openPal;

  addEventListener('keydown', e => {
    const typing = /INPUT|TEXTAREA/.test(document.activeElement?.tagName || '');
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal.classList.contains('open') ? closePal() : openPal(); return; }
    if (e.key === 'Escape') { if (qs) return closeQuick(); if (pal.classList.contains('open')) return closePal(); }
    if (qs && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { e.preventDefault(); return stepQuick(e.key === 'ArrowRight' ? 1 : -1); }
    if (typing) return;
    if (e.key === '/' && !pal.classList.contains('open')) { e.preventDefault(); openPal(); }
  });

  /* ---------- the frame: side, top nav, tabs ---------- */
  $('#side').innerHTML = `<div class="lights"><button class="l-close" aria-label="Close window"></button><button class="l-min" aria-label="Minimise to the Dock"></button><button class="l-zoom" aria-label="Zoom window"></button></div>
    <a href="#" data-go="home" class="si">${ic('home')}<span>Overview</span></a>
    <h6 class="mono">Work</h6>
    ${CATS.map(c => `<a href="#${c.id}" data-go="${c.id}" class="si">${ic(c.id)}<span>${c.name}</span><em class="mono">${inCat(c.id).length}</em></a>`).join('')}
    <h6 class="mono">Studio</h6>
    ${PAGES.map(([h, t]) => `<a href="#${h}" data-go="${h}" class="si">${ic(h)}<span>${t}</span></a>`).join('')}
    <div class="sfoot"><a href="mailto:${D.EMAIL}">${D.EMAIL}</a><a href="https://www.instagram.com/band.cairo/" target="_blank" rel="noopener">@band.cairo</a></div>`;
  $('#top').innerHTML = [['home', '', 'Work'], ...PAGES.map(([h, t]) => [h, h, t])].map(([g, h, t]) => `<a href="#${h}" data-go="${g}">${t}</a>`).join('');
  $('#tabs').innerHTML = [['home', '', 'Work', 'home'], ['services', 'services', 'Services', 'services'], ['results', 'results', 'Results', 'results'], ['contact', 'contact', 'Contact', 'contact']]
    .map(([g, h, t, i]) => `<a href="#${h}" data-go="${g}">${ic(i)}<span>${t}</span></a>`).join('') + `<button id="tabAsk">${ic('search')}<span>Search</span></button>`;
  $('#tabAsk').onclick = openPal;
  $('#bar').insertAdjacentHTML('afterbegin', `<button class="mback" id="mBack" aria-label="Back">${ic('back')}</button>`);
  $('#mBack').onclick = back;

  /* ---------- the Mac: folders on the desktop, a Dock, and a window you can close, minimise, zoom, move and resize ---------- */
  const app = $('#app'), desk = () => !phone.matches;
  const win = { state: 'open' };                          // open | min | closed
  const FOLDER = (glyph) => `<svg class="fold" viewBox="0 0 64 52" aria-hidden="true"><path d="M4 9a4 4 0 0 1 4-4h14.5l5 5H56a4 4 0 0 1 4 4v3H4z" fill="#7FCFA3"/>
    <rect x="4" y="13" width="56" height="35" rx="5" fill="url(#fg)"/><g transform="translate(23 21) scale(.75)" class="fg-glyph">${glyph}</g></svg>`;
  $('#icons').innerHTML = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="fg" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#A6E3C1"/><stop offset="1" stop-color="#6BC394"/></linearGradient></defs></svg>`
    + CATS.map(c => `<a class="dicon" href="#${c.id}" data-open>${FOLDER(`<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#1F6B45" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity=".6">${I[c.id]}</svg>`)}<span>${c.name}</span></a>`).join('');
  const DOCK = [['home', '', 'band.'], ['search', null, 'Search'], ['services', 'services', 'Services'], ['results', 'results', 'Results'], ['clients', 'clients', 'Clients'], ['contact', 'contact', 'Contact'], ['portal', null, 'Portal']];
  $('#dock').innerHTML = DOCK.map(([k, h, t]) => `${k === 'services' ? '<i class="sep" aria-hidden="true"></i>' : ''}<button class="ditem d-${k}" data-k="${k}" aria-label="${t}"><span class="tip">${t}</span>
      <span class="tile">${k === 'home' ? BQ.lockup('#FFFFFF') : ic(k)}</span><i class="dot"></i></button>`).join('');
  const dockSync = () => $('.d-home', $('#dock')).classList.toggle('run', win.state !== 'closed');
  const centre = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  const fly = (el) => { const a = app.getBoundingClientRect(), [x, y] = centre(el); return `translate(${x - a.left - a.width / 2}px,${y - a.top - a.height / 2}px)`; };
  function openWindow(from) {
    if (!desk() || win.state === 'open') return;
    app.classList.remove('closed'); win.state = 'open'; dockSync();
    if (!R) app.animate([{ transform: (from ? fly(from) : 'translateY(30px)') + ' scale(.06)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 460, easing: 'cubic-bezier(.2,.85,.25,1)' });
  }
  function closeWindow(min) {
    if (win.state !== 'open') return;
    const done = () => { app.classList.add('closed'); win.state = min ? 'min' : 'closed'; dockSync(); };
    if (R) return done();
    app.animate([{ transform: 'none', opacity: 1 }, min ? { transform: fly($('.d-home')) + ' scale(.05)', opacity: .2 } : { transform: 'scale(.94)', opacity: 0 }],
      { duration: min ? 420 : 200, easing: 'cubic-bezier(.55,0,.8,.2)' }).onfinish = done;
  }
  function zoomWindow() {
    if (!R) { app.classList.add('easing'); setTimeout(() => app.classList.remove('easing'), 380); }
    app.classList.toggle('zoomed');
  }
  $('.l-close').onclick = () => closeWindow(false);
  $('.l-min').onclick = () => closeWindow(true);
  $('.l-zoom').onclick = zoomWindow;
  $$('#icons [data-open]').forEach(a => a.addEventListener('click', () => { $$('#icons .dicon').forEach(x => x.classList.toggle('sel', x === a)); openWindow(a); }));
  $$('#dock .ditem').forEach(b => b.onclick = () => {
    const k = b.dataset.k, d = DOCK.find(x => x[0] === k);
    if (k === 'search') return openPal();
    if (k === 'portal') { if (!R) b.querySelector('.tile').animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-14px)' }, { transform: 'translateY(0)' }], { duration: 420, easing: 'ease-out' }); return void setTimeout(() => { location.href = 'portal/'; }, R ? 0 : 260); }
    if (!R) b.querySelector('.tile').animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-14px)' }, { transform: 'translateY(0)' }], { duration: 420, easing: 'ease-out' });
    if (k === 'home' && win.state !== 'open') return openWindow(b);
    go(d[1]); openWindow(b);
  });
  $('.logo').addEventListener('click', () => openWindow($('.d-home')));
  // the Dock magnifies under the pointer
  $('#dock').addEventListener('pointermove', e => { if (R) return; $$('#dock .ditem').forEach(b => { const [x] = centre(b), d = Math.abs(e.clientX - x); b.style.setProperty('--m', Math.max(0, 1 - d / 150).toFixed(3)); }); });
  $('#dock').addEventListener('pointerleave', () => $$('#dock .ditem').forEach(b => b.style.setProperty('--m', 0)));
  // move the window by its toolbar, resize it from the corner, double-click the toolbar to zoom
  {
    app.insertAdjacentHTML('beforeend', '<span class="grip" aria-hidden="true"></span>');
    const box = () => { const r = app.getBoundingClientRect(); Object.assign(app.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', right: 'auto', bottom: 'auto' }); };
    const drag = (el, move) => el.addEventListener('pointerdown', e => {
      if (!desk() || e.button !== 0 || e.target.closest('button,a,input') || app.classList.contains('zoomed')) return;
      e.preventDefault(); box(); const r = app.getBoundingClientRect(), x0 = e.clientX, y0 = e.clientY;
      const mv = ev => move(r, ev.clientX - x0, ev.clientY - y0), up = () => { removeEventListener('pointermove', mv); app.classList.remove('moving'); };
      app.classList.add('moving'); addEventListener('pointermove', mv); addEventListener('pointerup', up, { once: true });
    });
    const mb = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mb')) || 46;
    const moveBy = (r, dx, dy) => { app.style.left = Math.min(innerWidth - 120, Math.max(120 - r.width, r.left + dx)) + 'px'; app.style.top = Math.min(innerHeight - 140, Math.max(mb() + 4, r.top + dy)) + 'px'; };
    drag($('#tool'), moveBy); drag($('.lights'), moveBy);
    drag($('.grip', app), (r, dx, dy) => { app.style.width = Math.max(720, r.width + dx) + 'px'; app.style.height = Math.max(440, r.height + dy) + 'px'; });
    $('#tool').addEventListener('dblclick', e => { if (!e.target.closest('button,a')) zoomWindow(); });
  }
  phone.addEventListener('change', () => { if (!desk()) { app.classList.remove('closed', 'zoomed'); app.removeAttribute('style'); win.state = 'open'; } dockSync(); });
  dockSync();

  /* ---------- clock ---------- */
  const clk = () => { try { $('#clock').textContent = 'Cairo ' + new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date()); } catch { } };
  clk(); setInterval(clk, 15000);

  /* ---------- boot: the barcode rises, the wordmark writes itself ---------- */
  $('#lk').innerHTML = BQ.lockup('currentColor');
  $('#bootWm').innerHTML = BQ.wordmark('#EDEDE6', 5.9);
  if (desk() && !R) { app.classList.add('closed'); win.state = 'closed'; }   // the window opens out of the Dock after boot
  render('first');
  let again = false;
  try { again = !!sessionStorage.getItem('bos:booted'); sessionStorage.setItem('bos:booted', '1'); } catch { }
  const boot = $('#boot');
  const finish = () => { boot.classList.add('gone'); setTimeout(() => { bootCode?.stop(); boot.remove(); }, 600); setTimeout(() => openWindow($('.d-home')), 350); };
  let bootCode = null;
  if (R || again) { boot.remove(); setTimeout(() => openWindow($('.d-home')), 250); }
  else {
    bootCode = BQ.code($('#bootCode'), { color: '#EDEDE6', accent: '#10A862', mode: 'data', minH: .05 });
    const rise = Array(11).fill(0); bootCode.set(rise);
    BQ.BARS.forEach((_, i) => setTimeout(() => { rise[i] = 1; bootCode.set(rise); bootCode.hot([i]); }, 80 + i * 55));
    setTimeout(() => { bootCode.hot([]); BQ.drawIn($('#bootWm svg'), { dur: 800 }); }, 720);
    setTimeout(finish, 1600);
    boot.addEventListener('click', finish);
  }

  window.bandOS = { go, quick };                          // handy from the console
})();

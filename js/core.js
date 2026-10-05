/* bqnd core — the logo, the animated barcode, and the assistant.
   · The logo: 11 bars and the stroked wordmark, geometry from brand/_src/pp-barcode.html.
   · code(): an animated barcode on canvas — rest, breathe, think, speak, data.
   · Assistant: asks Claude when the page runs inside claude.ai (the `sample` capability); everywhere else it
     answers from the written facts below and opens the right windows. It only knows band.'s real facts. */
const BQ = (() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- logo ---------- */
  const RAW = [7, 3, 3, 11, 4, 3, 7, 3, 11, 3, 4, 7, 3, 3, 11, 4, 7, 3, 3, 7, 11, 3];
  const bars = []; let x = 96;
  RAW.forEach((b, i) => { if (i % 2 === 0) bars.push({ x, w: b }); x += b + (i % 3 === 0 ? 5 : 4); });
  const X0 = 96, X1 = 301;
  const BARS = bars.map(b => ({ x: (b.x - X0) / (X1 - X0), w: b.w / (X1 - X0) }));
  const WM = ['M2.944 2.944V32.448', 'C17.664 32.448 14.72', 'C73.797 32.512 14.72', 'M88.517 32.512V65.04', 'M116.919 47.104V17.92',
    'M116.919 31.2A13.408 13.408 0 0 1 143.735 31.2', 'M143.735 31.2V47.104', 'C186.147 32.448 14.72', 'M200.867 2.944V32.448'];
  const wmInner = (c = 'currentColor', sw = 5.9) => `<g fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${WM.map(p => p[0] === 'C'
    ? (([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`)(p.slice(1).split(' ')) : `<path d="${p}"/>`).join('')}</g>`;
  const wordmark = (c = 'currentColor', sw = 5.9) => `<svg viewBox="-4 -4 212 78" aria-label="band." role="img">${wmInner(c, sw)}</svg>`;
  function lockup(c = 'currentColor') {
    const r = bars.map(b => `<rect x="${b.x - X0}" y="0" width="${b.w}" height="150" fill="${c}"/>`).join('');
    const s = 98 / 206.76, tx = (205 - 98) / 2 + 2.95 * s, ty = 170 + 2.95 * s;
    return `<svg viewBox="0 0 205 206" role="img" aria-label="band.">${r}<g transform="translate(${tx} ${ty}) scale(${s})">${wmInner(c)}</g></svg>`;
  }
  // a row of the logo's bars as <i> elements (icons, title bars)
  const glyph = (n = 11, off = 0, k = 120) => BARS.slice(off, off + n).map(b => `<i style="width:${Math.max(1.5, b.w * k).toFixed(1)}px"></i>`).join('');
  function drawIn(svg, { dur = 1400, delay = 0 } = {}) {
    if (!svg || reduced) return;
    svg.querySelectorAll('path,circle').forEach((el, i) => {
      const L = el.getTotalLength ? el.getTotalLength() : 100;
      el.style.strokeDasharray = L; el.style.strokeDashoffset = L;
      el.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: dur * .55, delay: delay + i * dur * .05, easing: 'cubic-bezier(.6,0,.2,1)', fill: 'forwards' });
    });
  }

  /* ---------- animated barcode ---------- */
  function code(canvas, o = {}) {
    const opt = Object.assign({ color: '#0B0B0B', accent: '#10A862', align: 'bottom', mode: 'breathe', minH: .12 }, o);
    const ctx = canvas.getContext('2d');
    const st = BARS.map(() => ({ h: 1, v: 0, t: 1 }));
    let mode = opt.mode, energy = 0, hot = new Set(), raf = 0, W = 0, H = 0, alive = true;
    const t0 = performance.now();
    function resize() {
      const r = canvas.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
      W = r.width; H = r.height; canvas.width = Math.max(1, W * d); canvas.height = Math.max(1, H * d); ctx.setTransform(d, 0, 0, d, 0, 0);
    }
    const ro = new ResizeObserver(resize); ro.observe(canvas); resize();
    const wob = (i, t) => .5 + .5 * Math.sin(t * 11 + i * 2.1) * Math.sin(t * 6.3 + i * 1.3);
    function frame(now) {
      if (!alive) return;
      const t = (now - t0) / 1000;
      st.forEach((s, i) => {
        let tg = s.t;
        if (mode === 'rest') tg = 1;
        else if (mode === 'breathe') tg = .9 + .1 * Math.sin(t * 1.4 + i * .6);
        else if (mode === 'think') tg = .3 + .7 * (.5 + .5 * Math.sin(t * 5.5 - i * .72));
        else if (mode === 'speak') tg = opt.minH + (1 - opt.minH) * Math.min(1, .25 + energy * wob(i, t));
        if (reduced && mode !== 'data') tg = 1;
        s.v += (tg - s.h) * .16; s.v *= .72; s.h += s.v;
      });
      energy *= .93;
      ctx.clearRect(0, 0, W, H);
      BARS.forEach((b, i) => {
        const h = Math.max(1, H * Math.max(0, Math.min(1.05, st[i].h))), y = opt.align === 'bottom' ? H - h : opt.align === 'top' ? 0 : (H - h) / 2;
        ctx.fillStyle = hot.has(i) ? opt.accent : opt.color; ctx.fillRect(b.x * W, y, Math.max(1, b.w * W), h);
      });
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return {
      mode(m) { mode = m; }, get currentMode() { return mode; },
      set(v) { mode = 'data'; st.forEach((s, i) => { s.t = v[i % v.length]; }); },
      kick(a = .6) { energy = Math.min(1.4, energy + a); },
      hot(i) { hot = new Set([].concat(i).filter(n => n >= 0)); },
      stop() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); },
    };
  }

  /* ---------- facts ---------- */
  const D = OS;
  const WORK = D.PROJECTS;
  const APPS = ['work', 'stores', 'apps', 'brands', 'software', 'media', 'gallery', 'results', 'services', 'team', 'readme', 'contact', 'terminal'];
  const RULES = `You are "bqnd", the assistant inside band. OS — the website of band., a studio in Cairo, Egypt, built to look like the studio's own computer. You help visitors while they explore it.

FACTS — the only facts you may use:
- band. builds online stores (Shopify and headless, one market or several, English and Arabic right to left), custom software (ERPs, client portals, dashboards, shopping apps), brand and design (identities, guideline decks, campaign design), media buying (Meta, TikTok, Google, Snapchat), AI content and creative tech (campaign visuals that run live in the browser).
- Motto: "We don't overthink it. We ship it." Based in Cairo; works with brands in Egypt, the Gulf and Europe. 20+ brands served, 9+ years in development.
- People: ${Object.values(D.PEOPLE).map(p => `${p.id}: ${p.name}, ${p.role}. ${p.bio.join(' ')}`).join(' | ')}
- Work (id: what): ${WORK.map(w => `${w.id}: ${w.name} (${w.kind}, ${w.market}). ${w.tagline} ${w.about.join(' ')}`).join(' | ')}
- Clients include: ${D.CLIENTS.map(([, l]) => l.join(', ')).join(', ')}.
- How a project starts: a 20-minute call; a written brief and quote within 48 hours; weekly previews while building; launch tested on real phones; then media, content and improvements reported monthly.
- To start: the "Start a build" app on the desktop, email ${D.EMAIL}, or a DM to @band.cairo on Instagram.

RULES:
- Reply in the visitor's language: Arabic if they write in Arabic, otherwise English. Plain text only, no markdown, no lists, at most 55 words. Direct, warm, confident. No hype words.
- Never invent anything that is not in FACTS: no prices, no timelines beyond the 48-hour quote, no other clients, no other numbers. If asked about price or time, say it depends on scope and that a written quote comes within 48 hours of a short call.
- Whenever you mention specific work, call show_work with its ids so the desktop opens it. When the visitor asks about a person, call open_person. When they want a part of the desktop, call open_app.
- If the visitor wants to start a project, ask what they sell, where they sell it, and what is in the way — one question at a time.`;

  /* written answers — the default outside claude.ai */
  const T = (en, ar, act = {}) => ({ en, ar, ...act });
  const OFFLINE = [
    [/price|cost|budget|how much|quote|سعر|تكلف|ميزاني|بكام|كام/i, T('It depends on scope. After a 20-minute call you get a written brief and quote within 48 hours, so you know exactly what you are paying for.', 'السعر يعتمد على حجم المشروع. بعد مكالمة قصيرة لمدة ٢٠ دقيقة يصلك عرض مكتوب خلال ٤٨ ساعة.', { app: 'contact' })],
    [/how long|timeline|time|process|how do you work|steps|مدة|وقت|ازاي بتشتغلوا|خطوات/i, T('A 20-minute call, a written brief and quote within 48 hours, weekly previews you can click, launch tested on real phones, then monthly reports. Timing depends on scope; the quote says it plainly.', 'مكالمة ٢٠ دقيقة، ثم عرض مكتوب خلال ٤٨ ساعة، ثم معاينات أسبوعية، ثم إطلاق مُختبَر على الموبايل، ثم تقارير شهرية.', { app: 'readme' })],
    [/arab|rtl|right to left|عرب|يمين/i, T('Arabic done properly, not translated labels. Alo Yoga Egypt reads right to left, and the Labesny app mirrors its whole layout with one tap.', 'عربي حقيقي وليس ترجمة. متجر ألو يوجا مصر يقرأ من اليمين لليسار، وتطبيق لابسني يعكس التصميم بالكامل بلمسة واحدة.', { show: ['labesny', 'alo'] })],
    [/\bapps?\b|ios|android|تطبيق|ابلكيشن|أبلكيشن/i, T('We build shopping apps. Labesny puts eighteen brands in one bag for Kuwait, with KNET and club points. FIG runs on the same engine.', 'نبني تطبيقات تسوّق. لابسني يجمع ١٨ علامة في حقيبة واحدة في الكويت، مع KNET ونقاط الولاء، وتطبيق FIG على نفس المحرك.', { show: ['labesny'], app: 'apps' })],
    [/result|number|roas|sales|revenue|growth|نتائج|أرقام|ارقام|مبيعات/i, T('Volcom Spain: €18,892 in ads, €63,034 in sales in 30 days, 3.34× return. Ashya Egypt: EGP 260K to 4.2M a month in 18 months. It’s all in Results.', 'فولكوم إسبانيا: ١٨٬٨٩٢ يورو إعلانات و٦٣٬٠٣٤ يورو مبيعات في ٣٠ يومًا. أشيا مصر: من ٢٦٠ ألف إلى ٤٫٢ مليون جنيه شهريًا في ١٨ شهرًا.', { app: 'results' })],
    [/ads|media|meta|google|tiktok|snap|campaign|اعلان|إعلان|ميديا|حملات/i, T('Media buying is Alaa’s world: Meta, TikTok, Google and Snapchat, budgets read at 48 hours. Ashya Egypt grew 16× in 18 months.', 'الإعلانات مسؤولية علاء: ميتا وتيك توك وجوجل وسناب شات. أشيا مصر نمت ١٦ ضعفًا في ١٨ شهرًا.', { person: 'alaa' })],
    [/instagram|insta\b|social|feed|carousel|انستا|إنستا|سوشيال|بوست/i, T('Instagram feeds planned as one grid: posts, carousels and highlight covers. YQN Eyewear, El Safwa Resort, MAS SofaBed, Handler and four more are in Social design.', 'نصمم حسابات إنستجرام كشبكة واحدة: بوستات وكاروسيل وأغلفة هايلايت. YQN وEl Safwa وMAS وHandler وغيرهم في Social design.', { show: ['ig-yqn'], app: 'social' })],
    [/brand|logo|identity|design|guideline|هوي|شعار|تصميم|براند/i, T('Alerta shapes brands with full guideline decks: Sloth, Handler, end. and Guess What. Essence, tone of voice, colour, type and how it all behaves.', 'أليرتا تصمّم الهويات مع أدلة استخدام كاملة: Sloth وHandler وend. وGuess What.', { person: 'alerta', app: 'brands' })],
    [/software|erp|system|portal|dashboard|نظام|برمج|سيستم/i, T('When the tool doesn’t exist, we write it. THOTH runs a retail business end to end, POS to loyalty to Shopify sync, in English and Arabic.', 'عندما لا توجد الأداة نكتبها. نظام THOTH يدير متجر التجزئة من نقاط البيع إلى الولاء والمزامنة مع شوبيفاي.', { show: ['thoth'], app: 'software' })],
    [/store|shop|shopify|ecom|متجر|شوبيفاي|اونلاين/i, T('Stores for one market or several. Women’secret runs Egypt, Jordan and Kuwait on one Shopify build; improve it once and all three get better.', 'متاجر لسوق واحد أو عدة أسواق. وومن سيكرت تعمل في مصر والأردن والكويت على متجر شوبيفاي واحد.', { show: ['womensecret'], app: 'stores' })],
    [/\busa\b|america|أمريكا|امريكا/i, T('In the USA: Pier 1, Stein Mart and Dressbarn on Shopify, and RadioShack. All four are in Stores.', 'في أمريكا: Pier 1 وStein Mart وDressbarn على شوبيفاي، وRadioShack. كلها في Stores.', { show: ['pier1'], app: 'stores' })],
    [/\bai\b|content|video|copy|ذكاء|محتوى|فيديو/i, T('AI content: product visuals, copy and video, made faster and finished on brand. And for launches, visuals that run live in the browser.', 'محتوى بالذكاء الاصطناعي: صور منتجات ونصوص وفيديو أسرع، وبنفس روح البراند.', { app: 'services' })],
    [/shader|creative|webgl|3d|interactive/i, T('Creative tech: campaign images rendered live through a shader, reacting to the visitor, with no video file. Open the Lab.', 'تقنية إبداعية: صور حملات تُعرض مباشرة عبر الـ shader وتتفاعل مع الزائر.', { show: ['lab'] })],
    [/start|build|project|hire|contact|email|mail|reach|ابدأ|مشروع|تواصل|ايميل/i, T('Let’s start. Open Start a build, or tell me here: what do you sell, and where do your customers buy today?', 'لنبدأ. ماذا تبيع، وأين يشتري عملاؤك اليوم؟', { app: 'contact' })],
    [/team|who|people|crew|founder|فريق|مين|انتم/i, T('Meet the crew in the corner: Alerta, Art Director; Mamdouh, Head of Development; Alaa, Head of Media Buying. Click any of them.', 'تعرّف على الفريق في الركن: أليرتا للتصميم، ممدوح للتطوير، وعلاء للإعلانات.', { app: 'team' })],
    [/where|cairo|egypt|location|about|القاهرة|فين|مكان/i, T('band. is a studio in Cairo, working with brands in Egypt, the Gulf and Europe. We build the store, shape the brand, write the software and buy the media.', 'باند استوديو في القاهرة، نعمل مع علامات في مصر والخليج وأوروبا.', { app: 'readme' })],
  ];
  const FALLBACK = T('I can open stores, apps, brands, software or results, or introduce the crew. Try “show me Arabic stores” or “what did Volcom get?”', 'أستطيع أن أفتح المتاجر أو التطبيقات أو الهويات أو النتائج، أو أعرّفك على الفريق. جرّب «أرني المتاجر العربية».');
  const ALIAS = { volcom: ['فولكوم'], labesny: ['لابسني'], alo: ['ألو يوجا', 'الو يوجا', 'alo'], womensecret: ['women’secret', "women'secret", 'women secret', 'womensecret', 'وومن سيكرت'], fig: ['فيج'], thoth: ['تحوت'], ayas: ['aya s', 'ayas', 'aya'], guesswhat: ['guess what'], handler: ['handler'], ashya: ['أشيا', 'اشيا'], capital: ['capital'], mas: ['mas'], lab: ['shader'], colehaan: ['cole haan', 'colehaan', 'كول هان'], pier1: ['pier 1', 'pier one', 'pier1'], steinmart: ['stein mart', 'steinmart'], dressbarn: ['dress barn', 'dressbarn'], radioshack: ['radio shack', 'radioshack', 'راديو شاك'], 'fig-web': ['fig website', 'figeg', 'موقع فيج'], 'labesny-web': ['labesny website', 'labesny.com', 'موقع لابسني'], 'ig-1pass': ['1pass', 'one pass'], 'ig-elsafwa': ['el safwa', 'elsafwa', 'الصفوة'], 'ig-hunna': ['hunna'], 'ig-menna': ['menna', 'منة'], 'ig-yqn': ['yqn'] };
  const P_ALIAS = { alerta: ['alerta', 'أليرتا', 'اليرتا', 'art director'], mamdouh: ['mamdouh', 'ممدوح', 'dan', 'developer'], alaa: ['alaa', 'علاء', 'media buyer'] };
  const hasWord = (text, k) => /[؀-ۿ]/.test(k) ? text.includes(k) : new RegExp('(^|[^\\p{L}])' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=$|[^\\p{L}])', 'iu').test(text);

  class Assistant {
    constructor({ onState = () => {}, onReply = () => {}, actions = {}, context = () => '' } = {}) {
      Object.assign(this, { onState, onReply, actions, context });
      this.turns = []; this.busy = false;
      this.ready = (window.claude && claude.use) ? claude.use('sample').then(async s => {
        this.sample = s; if (s) { try { this.tools = !!(await s.limits()).tools; } catch { this.tools = false; } }
        return s;
      }).catch(() => null) : Promise.resolve(null);
    }
    toolList() {
      const a = this.actions;
      return [
        { name: 'show_work', description: 'Opens these projects as windows on the desktop. Returns what was opened.',
          inputSchema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string', enum: WORK.map(w => w.id) } } }, required: ['ids'] },
          execute: ({ ids }) => { const l = [].concat(ids || []).map(String).filter(i => D.byId[i]); a.show?.(l); return l.length ? 'Opened: ' + l.join(', ') : 'Unknown ids'; } },
        { name: 'open_person', description: 'Opens a crew member’s profile.',
          inputSchema: { type: 'object', properties: { id: { type: 'string', enum: Object.keys(D.PEOPLE) } }, required: ['id'] },
          execute: ({ id }) => { a.person?.(String(id)); return 'Opened ' + id; } },
        { name: 'open_app', description: 'Opens a part of the desktop.',
          inputSchema: { type: 'object', properties: { app: { type: 'string', enum: APPS } }, required: ['app'] },
          execute: ({ app }) => { a.app?.(String(app)); return 'Opened ' + app; } },
      ];
    }
    async ask(text, again = false) {
      text = String(text || '').trim(); if (!text || this.busy) return;
      this.busy = true; this.turns.push({ role: 'user', content: text });
      this.onState('think'); if (!again) this.onReply({ role: 'user', text });
      const s = await this.ready;
      if (s) {
        this.ctl = new AbortController();
        const ctx = this.context(); let spoke = false;
        try {
          const res = await s([{ role: 'user', content: RULES + (ctx ? `\n\nThe visitor is currently looking at: ${ctx}` : '') }, ...this.turns.slice(-8)], {
            modelTier: 'quick', cache: false, signal: this.ctl.signal, ...(this.tools ? { tools: this.toolList() } : {}),
            onText: ({ text, delta }) => { spoke = true; this.onState('speak', delta.length); this.onReply({ role: 'bot', text, partial: true }); },
          });
          this.turns.push({ role: 'assistant', content: res.text });
          this.onReply({ role: 'bot', text: res.text, done: true });
        } catch (e) {
          const gone = ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed', 'session_expired'];
          if (gone.includes(e.code)) { this.sample = null; this.ready = Promise.resolve(null); this.busy = false; this.turns.pop(); return this.ask(text, true); }
          const msg = e.text || (e.code === 'rate_limited' ? 'Too many questions at once — try again in a moment.' : e.code === 'cancelled' ? '' : 'That didn’t go through. Ask again?');
          if (msg) this.onReply({ role: 'bot', text: msg, done: true });
          if (!spoke) this.turns.pop();
        }
        this.busy = false; this.onState('idle'); return;
      }
      const ar = /[؀-ۿ]/.test(text);
      const person = Object.keys(P_ALIAS).find(id => P_ALIAS[id].some(k => hasWord(text, k)));
      const igAsk = /instagram|insta\b|feed|social|انستا|إنستا|سوشيال/i.test(text);
      const named = WORK.filter(w => [w.name, ...(w.id.length > 3 ? [w.id] : []), ...(ALIAS[w.id] || [])].some(k => hasWord(text, k)));
      const hit = OFFLINE.find(([re]) => re.test(text));
      let a;
      if (named.length) { const w = (igAsk && named.find(n => n.feed)) || named[0]; a = T(`${w.name}: ${w.about[0]}`, `${w.name}: ${w.tagline}`, { show: named.map(n => n.id) }); }
      else if (person) { const p = D.PEOPLE[person]; a = T(`${p.name}, ${p.role}. ${p.bio[0]}`, `${p.name} — ${p.role}.`, { person }); }
      else a = hit ? hit[1] : FALLBACK;
      const out = ar ? a.ar : a.en;
      await new Promise(r => setTimeout(r, 420));
      if (a.show) this.actions.show?.(a.show); if (a.person) this.actions.person?.(a.person); if (a.app) this.actions.app?.(a.app);
      let shown = '';
      for (const word of out.split(/(\s+)/)) {
        shown += word; this.onState('speak', word.length); this.onReply({ role: 'bot', text: shown, partial: true });
        await new Promise(r => setTimeout(r, reduced ? 0 : 24));
      }
      this.turns.push({ role: 'assistant', content: out });
      this.onReply({ role: 'bot', text: out, done: true });
      this.busy = false; this.onState('idle');
    }
    stop() { this.ctl?.abort(); }
  }

  /* ---------- a chat panel ---------- */
  function chat(root, asst, { placeholder = 'Ask about our work…', chips = [] } = {}) {
    const live = !!(window.claude && claude.use);
    root.innerHTML = `<div class="bq-log" aria-live="polite"></div>
      <div class="bq-chips">${chips.map(c => `<button type="button" class="bq-chip">${c}</button>`).join('')}</div>
      <form class="bq-form"><input class="bq-in" id="bq-in-${Math.random().toString(36).slice(2, 7)}" autocomplete="off" placeholder="${placeholder}" aria-label="Message bqnd"><button class="bq-send" type="submit" aria-label="Send">↵</button></form>
      <p class="bq-note">${live ? 'Answers by Claude — asks once for permission. Only band.’s real facts.' : 'Quick answers from band.’s real work and numbers.'}</p>`;
    const log = root.querySelector('.bq-log'), form = root.querySelector('form'), input = root.querySelector('.bq-in');
    let cur = null;
    const add = (role, text) => { const d = document.createElement('div'); d.className = 'bq-msg ' + role; d.textContent = text; log.append(d); log.scrollTop = log.scrollHeight; return d; };
    const prev = asst.onReply;
    asst.onReply = m => {
      if (m.role === 'user') { add('user', m.text); cur = null; }
      else { if (!cur) cur = add('bot', ''); cur.textContent = m.text; log.scrollTop = log.scrollHeight; if (m.done) cur = null; }
      prev(m);
    };
    form.addEventListener('submit', e => { e.preventDefault(); const v = input.value; input.value = ''; asst.ask(v); });
    root.querySelectorAll('.bq-chip').forEach(b => b.addEventListener('click', () => asst.ask(b.textContent)));
    return { input, log, form };
  }

  return { reduced, BARS, glyph, wordmark, lockup, drawIn, code, Assistant, chat };
})();

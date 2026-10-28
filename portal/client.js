import { $, $$, esc, api, ic, toast, modal, debounce, ago, day, money, copyText, setPalette, openPalette, md, headings, chart, barcode, STATE, KIND } from './lib.js';
import { shell, signOut } from './main.js';
import { agreementPdf } from './pdf.js';

let W, T, me, route = 'overview', arg = '', open = new Set(), bc = null, sigInk = false, S = null, selDay = '', selSlot = '';
const sections = () => [
  ['overview', 'Overview', 'home'], ['feed', 'Updates', 'news', unreadF() || '', !!unreadF()], ['start', 'Start here', 'list', `${W.summary.done}/${W.summary.total}`, W.summary.done === W.summary.total],
  ['forms', 'Forms', 'form'], ['agreement', 'Agreement', 'pen', { draft: 'soon', void: '—', sent: 'sign', signed: 'done' }[W.contract.status], W.contract.status === 'signed'],
  ['results', 'Ads & results', 'chart'], ['events', 'Events', 'flag', upEv().length || ''], ['invoices', 'Invoices', 'receipt'], ['files', 'Files & links', 'link'],
  ['support', 'Support', 'ticket', unreadT() || openT() || '', !!unreadT()], ['meetings', 'Meetings', 'cal', upMeet().length || ''], ['messages', 'Messages', 'chat', W.msgs.length || '']];

/* ---------- tickets and meetings, as the client sees them ---------- */
const unreadC = t => { const l = t.thread.at(-1); return l?.from === 'staff' && !(t.seenClient >= l.at); };
const unreadT = () => (W.tickets || []).filter(unreadC).length, openT = () => (W.tickets || []).filter(t => t.status !== 'closed').length;
const upMeet = () => (W.meetings || []).filter(m => m.status === 'booked' && Date.parse(m.end) > Date.now()).sort((a, b) => a.start.localeCompare(b.start));
const TST = { open: ['Waiting on us', 'warn'], answered: ['Answered', 'ok'], closed: ['Closed', ''] };
const CATS = { question: 'Question', problem: 'Something is broken', request: 'A request', billing: 'Billing', other: 'Other' };
const TOPICS = ['Results review', 'Ads and creative', 'Setup and access', 'Billing', 'Something else'];
const since = iso => { const a = ago(iso); return a === 'now' ? 'just now' : a + ' ago'; };
const today = () => new Date().toISOString().slice(0, 10);
const unseen = p => p.at > (W.answers.feedSeen || ''), unreadF = () => (W.feed || []).filter(unseen).length;
const KINDF = { update: ['Update', ''], result: ['Result', 'live'], news: ['News', 'dark'], tip: ['Tip', 'ok'], 'heads-up': ['Heads-up', 'warn'] };
const post = (p, seen) => `<article class="post ${p.pinned ? 'pinned' : ''}"><div class="ph"><span class="pillx ${KINDF[p.kind]?.[1] || ''}">${KINDF[p.kind]?.[0] || 'Update'}</span>
  <span class="pillx ${p.target === 'all' ? '' : 'ok'}">${p.target === 'all' ? 'For all clients' : 'For you'}${p.brand ? ' · ' + esc(p.brand) : ''}</span>${p.pinned ? `<span class="pillx dark">${ic('pin')} Pinned</span>` : ''}
  <span class="small">${esc(p.by)} · ${esc(day(p.at))}</span>${!seen && unseen(p) ? '<i class="dotu" title="New"></i>' : ''}</div>
  <h3>${esc(p.title)}</h3>${p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy">` : ''}<div class="pb">${esc(p.body)}</div>
  ${p.link ? `<div class="acts"><a class="btn sm dark" href="${esc(p.link)}" target="_blank" rel="noopener">${esc(p.linkLabel || 'Open')} ${ic('arrow')}</a></div>` : ''}</article>`;
const upEv = () => (W.events || []).filter(e => (e.end || e.start) >= today());
const EST = { new: ['Sent to us', ''], planned: ['In our plan', 'ok'], live: ['Ads running', 'live'], done: ['Done', ''] };
const SEGMENTS = ['Product launch', 'Sale or promo', 'Opening', 'Holiday or season', 'In-store event', 'Collaboration', 'Other'];

/* ---------- state of one checklist item, same rules as the server ---------- */
const items = () => [...T.checklist, ...(W.staff.customItems || [])].filter(i => !(W.staff.hidden || []).includes(i.id));
const stateOf = i => W.staff.verify[i.id]?.state || (i.id === 'sign' ? (W.contract.status === 'signed' ? 'verified' : 'todo') : i.owner === 'staff' ? (W.staff.auto?.[i.id] ? 'verified' : 'todo') : W.answers.checklist[i.id]?.state || 'todo');
const isDone = s => ['submitted', 'verified', 'na'].includes(s);
const pct = () => Math.round(100 * W.summary.done / Math.max(1, W.summary.total));
const nextItem = () => items().filter(i => i.required !== false && i.owner !== 'staff').find(i => !isDone(stateOf(i)));

export async function mount(who) {
  me = who;
  try { [W, T] = await Promise.all([api('GET', 'client/workspace'), api('GET', 'template')]); }
  catch (e) { toast(e.message, true); return; }
  document.title = `${W.client.name} · band. portal`;
  $('#app').innerHTML = shell({ tag: 'Client', name: W.client.name }) + `
    <div class="win"><aside class="side" id="side"></aside><section class="main"><div class="tool"><button class="nav-b" id="back" aria-label="Back">‹</button><nav class="crumbs" id="crumbs"></nav><span class="sp"></span><span class="save" id="save"><i></i><span>Saved</span></span></div><div class="view" id="view" tabindex="-1"></div></section></div><nav class="bnav" id="bnav" aria-label="Sections"></nav>`;
  $('#outBtn').onclick = signOut; $('#palBtn').onclick = openPalette; $('#back').onclick = () => history.back();
  $('#view').addEventListener('click', onClick); $('#view').addEventListener('input', onInput); $('#view').addEventListener('change', onInput);
  addEventListener('hashchange', go); setInterval(poll, 30000);
  palette(); go();
}
const bust = () => { setPalette([]); palette(); };
function palette() {
  setPalette([
    ...sections().map(([r, t, i]) => ({ t: t, i, h: 'Go to', k: r, run: () => nav(r) })),
    ...items().filter(i => i.owner !== 'staff').map(i => ({ t: i.title, i: 'check', h: KIND[i.kind] || 'Item', run: () => { open.add(i.id); nav('start'); setTimeout(() => $(`[data-item="${i.id}"]`)?.scrollIntoView({ block: 'center' }), 80); } })),
    { t: 'Add an event', i: 'flag', h: 'Action', run: () => nav('events', 'new') }, { t: 'Open a ticket', i: 'ticket', h: 'Action', run: () => nav('support', 'new') }, { t: 'Book a meeting', i: 'cal', h: 'Action', run: () => nav('meetings') },
    { t: 'Message the team', i: 'chat', h: 'Action', run: () => nav('messages') }, { t: 'Sign out', i: 'out', h: 'Action', run: signOut },
  ]);
}
const nav = (r, a = '') => { location.hash = '#' + r + (a ? '/' + a : ''); };
function go() {
  [route, arg] = (location.hash.slice(1) || 'overview').split('/'); if (!sections().some(s => s[0] === route)) route = 'overview';
  if (route === 'meetings') { S = null; selSlot = ''; loadSlots(); }
  paint();
  // opening Updates marks everything as read, but this visit still shows which posts were new
  if (route === 'feed' && unreadF()) api('PUT', 'client/feedseen', {}).then(r => { W.answers.feedSeen = r.feedSeen; }).catch(() => { });
  const t = route === 'support' && (W.tickets || []).find(x => x.id === arg);
  if (t && unreadC(t)) { t.seenClient = new Date().toISOString(); api('PUT', 'client/ticket', { id: t.id, seen: true }).catch(() => { }); }
}
async function loadSlots() { try { S = await api('GET', 'client/slots'); } catch (e) { S = { on: false, slots: [], err: e.message }; } if (route === 'meetings') stay(); }
function paint() {
  $('#side').innerHTML = `<div class="who-card"><b>${esc(W.client.name)}</b><span>${esc(W.client.brands.map(b => b.name).join(' · '))}</span></div><h6>Your project</h6>` +
    sections().map(([r, t, i, badge, ok]) => `<button class="si ${r === route ? 'on' : ''}" data-nav="${r}">${ic(i)}<span>${t}</span>${badge !== undefined && badge !== '' ? `<em class="${ok ? 'ok' : ''}">${esc(badge)}</em>` : ''}</button>`).join('') +
    `<div class="sfoot"><span>Questions?</span><a href="mailto:${esc(W.settings.studioEmail)}">${esc(W.settings.studioEmail)}</a></div>`;
  $$('#side [data-nav]').forEach(b => b.onclick = () => nav(b.dataset.nav));
  tabbar();
  const title = sections().find(s => s[0] === route)[1];
  $('#crumbs').innerHTML = `<a data-nav="overview">Portal</a><i>/</i><span>${esc(title)}</span>`; $('#crumbs a').onclick = () => nav('overview');
  const v = $('#view'); v.innerHTML = ({ overview, feed, start, forms, agreement, results, events, invoices, files, support, meetings, messages })[route](); v.scrollTop = 0;
  bc?.stop(); bc = null; const cv = $('#nxcode'); if (cv) bc = barcode(cv, { color: '#FBFBF8', level: .7 });
  if (route === 'agreement') sigPad(); if (route === 'start') {} bust();
}

/* phone: the four things you use most live in a bottom bar, the rest under More */
const PRIMARY = ['overview', 'start', 'agreement', 'results'], SHORT = { start: 'Start', results: 'Results' };
function tabbar() {
  const all = sections(), prim = all.filter(s => PRIMARY.includes(s[0])), more = all.filter(s => !PRIMARY.includes(s[0]));
  $('#bnav').innerHTML = prim.map(([r, t, i, badge]) => `<button class="${r === route ? 'on' : ''}" data-nav="${r}" aria-label="${t}">${ic(i)}<span>${SHORT[r] || t}</span>${r === 'agreement' && W.contract.status === 'sent' ? '<i>!</i>' : ''}</button>`).join('')
    + `<button class="${more.some(s => s[0] === route) ? 'on' : ''}" data-more aria-label="More">${ic('list')}<span>More</span>${unreadT() ? `<i>${unreadT()}</i>` : ''}</button>`;
  $$('#bnav [data-nav]').forEach(b => b.onclick = () => nav(b.dataset.nav));
  $('#bnav [data-more]').onclick = () => modal(`<h3>More</h3><div style="display:flex;flex-direction:column;gap:6px;margin-top:14px">${more.map(([r, t, i, badge]) => `<button class="btn" style="justify-content:flex-start;height:52px" data-go="${r}">${ic(i)}<span style="flex:1;text-align:left">${t}</span>${badge ? `<span class="mono" style="color:var(--mute)">${esc(badge)}</span>` : ''}</button>`).join('')}<button class="btn" style="justify-content:flex-start;height:52px" data-go="__out">${ic('out')}<span>Sign out</span></button></div>`, {
    onMount: (m, close) => $$('[data-go]', m).forEach(b => b.onclick = () => { close(); b.dataset.go === '__out' ? signOut() : nav(b.dataset.go); }),
  });
}

/* ---------- overview ---------- */
const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
function overview() {
  const n = nextItem(), c = W.contract.status, last = [...W.msgs].reverse().find(m => m.from === 'staff');
  const tl = W.staff.timeline || [];
  return `<div class="page wide"><p class="eyebrow mono">${esc(greet())}</p><h1>${esc(W.client.name)}<span>, welcome.</span></h1>
    <p class="lead">${pct() === 100 ? 'Everything we need is in. We start on week one.' : 'Here is what we need from you to start. Do it in any order, and come back any time. It saves as you go.'}</p>
    <div class="grid gov" style="margin-top:30px">
      <div class="card" style="display:flex;align-items:center;gap:22px"><div class="ring" style="--p:${pct()}"><div><b>${pct()}%</b><small>READY</small></div></div></div>
      <div class="card stat"><div class="v">${W.summary.done}<small>of ${W.summary.total}</small></div><div class="k">things sent to us</div><div class="bar-p" style="margin-top:14px"><i style="width:${pct()}%"></i></div><div class="k" style="margin-top:10px">${W.summary.verified} checked by us${W.summary.fix ? `, <b style="color:var(--red)">${W.summary.fix} need a fix</b>` : ''}</div></div>
      <div class="card stat"><div class="v" style="font-size:24px">${{ draft: 'Being prepared', sent: 'Ready to sign', signed: 'Signed', void: 'Withdrawn' }[c]}</div><div class="k">your agreement</div><button class="btn ${c === 'sent' ? 'green' : ''} sm" style="margin-top:14px" data-nav="agreement">${c === 'signed' ? 'View and download' : c === 'sent' ? 'Read and sign' : 'Open'} ${ic('arrow')}</button></div></div>
    ${n ? `<div class="next"><div class="t"><span class="chipx" style="opacity:.6">Next step · ${esc(KIND[n.kind] || '')}</span><h3>${esc(n.title)}</h3><p>${esc(n.why)}</p></div><button class="btn light" data-open="${esc(n.id)}">Do it now ${ic('arrow')}</button><canvas id="nxcode" aria-hidden="true"></canvas></div>`
      : c === 'sent' ? `<div class="next"><div class="t"><span class="chipx" style="opacity:.6">Next step</span><h3>Read and sign your agreement</h3><p>It takes five minutes. You get a PDF copy straight after.</p></div><button class="btn light" data-nav="agreement">Open agreement ${ic('arrow')}</button><canvas id="nxcode" aria-hidden="true"></canvas></div>` : ''}
    <div class="sec"><div class="sh"><h2>The next 12 weeks</h2></div><div class="tl">${tl.map(t => `<div class="${t.state === 'now' ? 'now' : t.state === 'done' ? 'done' : ''}"><div class="w">WEEKS ${esc(t.weeks)}${t.state === 'now' ? ' · NOW' : t.state === 'done' ? ' · DONE' : ''}</div><h4>${esc(t.title)}</h4><p>${esc(t.body)}</p></div>`).join('')}</div></div>
    ${W.feed?.length ? `<div class="sec"><div class="sh"><h2>Latest from the team${unreadF() ? `<em>${unreadF()} new</em>` : ''}</h2><button class="more btn sm ghost" data-nav="feed">All updates ${ic('arrow')}</button></div>${post(W.feed.find(p => !p.pinned) || W.feed[0], true)}</div>` : ''}
    <div class="sec"><div class="sh"><h2>Need us?</h2></div><div class="grid g2">
      <div class="card"><h3 style="font-size:18px">${ic('ticket')} Open a ticket</h3><p class="small" style="margin-top:6px">One topic, one thread. We answer within a working day and email you when we do.${openT() ? ` You have ${openT()} open.` : ''}</p><div class="acts"><button class="btn sm dark" data-newticket>New ticket ${ic('arrow')}</button>${openT() ? '<button class="btn sm ghost" data-nav="support">See tickets</button>' : ''}</div></div>
      <div class="card"><h3 style="font-size:18px">${ic('cal')} Book a call</h3><p class="small" style="margin-top:6px">${upMeet()[0] ? `Next call: <b style="color:var(--ink)">${esc(mwhen(upMeet()[0].start))}</b>.` : 'Pick a free time. It goes straight into our calendar.'}</p><div class="acts"><button class="btn sm dark" data-nav="meetings">${upMeet()[0] ? 'Manage calls' : 'Pick a time'} ${ic('arrow')}</button></div></div></div></div>
    ${last ? `<div class="sec"><div class="sh"><h2>Latest from us</h2><button class="more btn sm ghost" data-nav="messages">Reply ${ic('arrow')}</button></div><div class="msg" style="max-width:none"><small>${esc(last.name)} · ${ago(last.at)} ago</small>${esc(last.text)}</div></div>` : ''}</div>`;
}

/* ---------- start here ---------- */
function field(f, val, ns) {
  const v = val ?? '', id = `${ns}-${f.id}`, ph = f.ph ? ` placeholder="${esc(f.ph)}"` : '';
  if (f.type === 'check') return `<label class="chk full"><input type="checkbox" data-f="${esc(f.id)}" ${v === true || v === 'true' ? 'checked' : ''}><span>${esc(f.label)}</span></label>`;
  const lab = `<label for="${id}">${esc(f.label)}${f.req ? ' <span class="req">*</span>' : ''}</label>`;
  if (f.type === 'area') return `<div class="fld full">${lab}<textarea class="in" id="${id}" data-f="${esc(f.id)}"${ph}>${esc(v)}</textarea></div>`;
  if (f.type === 'select') return `<div class="fld">${lab}<select class="in" id="${id}" data-f="${esc(f.id)}"><option value=""></option>${(f.opts || []).map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
  return `<div class="fld">${lab}<input class="in" id="${id}" data-f="${esc(f.id)}" type="${f.type === 'url' ? 'url' : f.type === 'email' ? 'email' : 'text'}" value="${esc(v)}"${ph}></div>`;
}
function itemHtml(i) {
  const s = stateOf(i), a = W.answers.checklist[i.id] || {}, ver = W.staff.verify[i.id], isOpen = open.has(i.id), [lab, tone] = STATE[s];
  const staffOwned = i.owner === 'staff', canNA = i.required === false;
  return `<div class="item s-${s} ${isOpen ? 'open' : ''}" data-item="${esc(i.id)}"><header data-toggle="${esc(i.id)}"><span class="dot">${ic('check')}</span>
    <h4>${esc(i.title)}${i.required === false ? '' : ''}<small>${esc(KIND[i.kind] || '')}${i.required === false ? ' · optional' : ''}</small></h4><span class="pillx ${tone}">${lab}</span></header>
    <div class="body"><p class="why">${esc(i.why)}</p>
    ${i.steps?.length ? `<ol class="steps">${i.steps.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}
    ${i.show?.includes('bandBmId') ? `<div class="copy"><span>Our Business ID</span><b>${esc(W.settings.bandBmId || 'we will send it')}</b>${W.settings.bandBmId ? `<button class="btn sm" data-copy="${esc(W.settings.bandBmId)}">${ic('copy')} Copy</button>` : ''}</div>` : ''}
    ${i.kind === 'access' ? `<div class="warnbox">${ic('shield')}<span>Never type a password here. If a platform can only be shared by password, press “I need help” and we will arrange a safe way.</span></div>` : ''}
    ${ver?.state === 'verified' ? `<div class="note ok">Checked by band.${ver.comment ? ': ' + esc(ver.comment) : '.'}</div>` : ''}${ver?.state === 'needs-fix' ? `<div class="note bad"><b>Needs a fix.</b> ${esc(ver.comment || '')}</div>` : ''}
    ${i.id === 'sign' ? `<div class="acts"><button class="btn dark" data-nav="agreement">${W.contract.status === 'signed' ? 'View your copy' : W.contract.status === 'sent' ? 'Read and sign' : 'Not ready yet'}</button></div>`
      : staffOwned ? `<p class="small" style="margin-top:14px">${s === 'verified' ? 'Done.' : 'We mark this when it happens. Nothing for you to do.'}</p>`
      : `${i.fields?.length ? `<div class="fgrid" data-ns="${esc(i.id)}">${i.fields.map(f => field(f, a.fields?.[f.id], i.id)).join('')}</div>` : ''}
         <div class="fld" style="margin-top:14px"><label for="n-${esc(i.id)}">Note for us (optional)</label><textarea class="in" id="n-${esc(i.id)}" data-note style="min-height:64px"${s === 'help' ? ' placeholder="What is blocking you?"' : ''}>${esc(a.note || '')}</textarea></div>
         <div class="acts"><button class="btn green sm" data-state="submitted">${ic('check')} ${s === 'submitted' ? 'Update' : 'Mark as sent'}</button><button class="btn sm" data-state="help">I need help</button>${canNA ? '<button class="btn sm ghost" data-state="na">Not applicable</button>' : ''}${isDone(s) || s === 'help' ? '<button class="btn sm ghost" data-state="todo">Undo</button>' : ''}</div>`}
    </div></div>`;
}
function start() {
  const all = items(), groups = T.groups.map(g => [g, all.filter(i => i.group === g.id)]).filter(([, l]) => l.length);
  return `<div class="page"><p class="eyebrow mono">Start here</p><h1>What we need<span> to begin.</span></h1><p class="lead">Access, material, numbers and a few decisions. Open an item, do what it says, press “Mark as sent”. We check each one and tell you if anything needs a fix.</p>
    <div class="bar-p" style="margin-top:22px;max-width:420px"><i style="width:${pct()}%"></i></div><p class="small" style="margin-top:8px">${W.summary.done} of ${W.summary.total} required items sent</p>
    ${groups.map(([g, l]) => `<div class="grp"><div class="sh"><h2>${esc(g.title)}<em>${l.filter(i => isDone(stateOf(i))).length}/${l.length}</em></h2></div><p class="small">${esc(g.hint)}</p>${l.map(itemHtml).join('')}</div>`).join('')}</div>`;
}

/* ---------- forms ---------- */
const formKey = (f, brand) => f.perBrand ? `${f.id}:${brand}` : f.id;
function formTabs() { return T.forms.flatMap(f => f.perBrand ? W.client.brands.map(b => ({ f, brand: b.id, label: `${f.title} · ${b.name}` })) : [{ f, brand: '', label: f.title }]); }
function forms() {
  const tabs = formTabs(), cur = tabs.find(t => formKey(t.f, t.brand) === arg) || tabs[0], key = formKey(cur.f, cur.brand), vals = W.answers.forms[key] || {};
  const filled = t => { const v = W.answers.forms[formKey(t.f, t.brand)] || {}, r = t.f.fields.filter(x => x.req); return r.length ? r.filter(x => v[x.id]).length + '/' + r.length : ''; };
  return `<div class="page"><p class="eyebrow mono">Forms</p><h1>About you<span> and the business.</span></h1><p class="lead">Short answers are fine. It saves as you type.</p>
    <div class="tabs">${tabs.map(t => `<button class="${formKey(t.f, t.brand) === key ? 'on' : ''}" data-form="${esc(formKey(t.f, t.brand))}">${esc(t.label)} <span class="mono" style="opacity:.6">${filled(t)}</span></button>`).join('')}</div>
    <div class="card" style="margin-top:14px"><h3 style="font-size:20px">${esc(cur.f.title)}${cur.brand ? ' · ' + esc(W.client.brands.find(b => b.id === cur.brand)?.name) : ''}</h3><p class="small" style="margin-top:4px">${esc(cur.f.hint)}</p>
    <div class="fgrid" data-formkey="${esc(key)}">${cur.f.fields.map(f => field(f, vals[f.id], key)).join('')}</div></div></div>`;
}

/* ---------- agreement ---------- */
function agreement() {
  const c = W.contract;
  if (c.status === 'draft' || c.status === 'void') return `<div class="page"><p class="eyebrow mono">Agreement</p><h1>${c.status === 'void' ? 'Withdrawn' : 'Being prepared'}<span>.</span></h1><div class="empty" style="margin-top:26px"><b>${c.status === 'void' ? 'We withdrew this agreement.' : 'We are writing your agreement.'}</b>We will message you the moment it is ready to read.</div></div>`;
  const hs = headings(c.text), signed = c.status === 'signed', sg = c.signature;
  return `<div class="page wide"><p class="eyebrow mono">Agreement</p><h1>${esc(c.title)}<span>.</span></h1>
    <p class="lead">${signed ? 'Signed. Your copy is below, and you can download it any time.' : 'Read it first. When you are ready, sign on the right.'}</p>
    <div class="agr" style="margin-top:28px"><nav class="toc" id="toc" aria-label="Sections">${hs.map((h, n) => `<a data-jump="s${n}">${esc(h.replace(/^\d+\.\s*/, ''))}</a>`).join('')}</nav>
    <article class="paper" id="paper">${md(c.text)}${signed ? `<div class="seal"><div><img alt="Signature of ${esc(sg.name)}" src="${esc(sg.drawing)}"><b>${esc(sg.name)}</b><span>${esc(sg.title || 'For ' + W.client.name)} · ${esc(new Date(sg.at).toUTCString().slice(5, 22))}</span></div>
      <div>${c.countersign ? `<div style="font:italic 28px/1 Georgia,serif;height:70px;padding-top:24px">${esc(c.countersign.name)}</div><b>${esc(W.settings.studio)}</b><span>Countersigned ${esc(day(c.countersign.at))}</span>` : `<div style="height:70px;display:grid;align-items:center;color:#8a8d86;font-style:italic">Awaiting our countersignature</div><b>${esc(W.settings.studio)}</b>`}</div></div>` : ''}</article>
    <aside class="card signp">${signed ? `<div class="signed"><h3>${ic('check')} Signed</h3><p style="margin-top:8px">${esc(sg.name)}<br><span class="small" style="color:inherit;opacity:.8">${esc(new Date(sg.at).toUTCString())}</span></p><div class="hash">Fingerprint ${esc(sg.docHash)}</div></div>
      <div class="acts" style="flex-direction:column"><button class="btn dark" data-pdf>${ic('down')} Download PDF</button><button class="btn" data-print>${ic('print')} Print</button></div>`
      : `<h3 style="font-size:19px;margin-bottom:14px">Sign here</h3>
      <div class="fld"><label for="sgn">Full name</label><input class="in" id="sgn" autocomplete="name" placeholder="As on your ID"></div>
      <div class="fld" style="margin-top:12px"><label for="sgt">Role (optional)</label><input class="in" id="sgt" placeholder="Owner, Director…"></div>
      <div class="fld" style="margin-top:12px"><label>Draw your signature</label><canvas id="pad" width="640" height="200" aria-label="Signature pad"></canvas><span class="clear" data-clear>Clear</span></div>
      <label class="chk" style="margin-top:14px"><input type="checkbox" id="sgc"><span>I have read this agreement, I am allowed to sign for ${esc(W.client.name)}, and I agree to sign electronically.</span></label>
      <button class="btn green" id="sgo" style="width:100%;margin-top:16px" disabled>${ic('pen')} Sign agreement</button>
      <p class="small" style="margin-top:10px">We record the time and a fingerprint of this exact text. You get a PDF straight after.</p>`}</aside></div></div>`;
}
function sigPad() {
  const cv = $('#pad'); if (!cv) return; const ctx = cv.getContext('2d'); ctx.lineWidth = 3.2; ctx.lineCap = ctx.lineJoin = 'round'; ctx.strokeStyle = '#0B0B0B'; sigInk = false; let down = false, last;
  const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
  cv.onpointerdown = e => { down = true; last = pos(e); cv.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.arc(...last, 1.4, 0, 7); ctx.fill(); e.preventDefault(); };
  cv.onpointermove = e => { if (!down) return; const p = pos(e); ctx.beginPath(); ctx.moveTo(...last); ctx.lineTo(...p); ctx.stroke(); last = p; sigInk = true; ready(); };
  cv.onpointerup = cv.onpointercancel = () => { down = false; };
  $('[data-clear]').onclick = () => { ctx.clearRect(0, 0, cv.width, cv.height); sigInk = false; ready(); };
  const ready = () => { $('#sgo').disabled = !(sigInk && $('#sgn').value.trim().length >= 3 && $('#sgc').checked); };
  ['#sgn', '#sgc'].forEach(s => $(s).addEventListener('input', ready)); $('#sgc').addEventListener('change', ready);
  $('#sgo').onclick = async () => {
    const b = $('#sgo'); b.disabled = true;
    try { W = { ...W, ...(await api('POST', 'client/sign', { name: $('#sgn').value, title: $('#sgt').value, consent: $('#sgc').checked, drawing: cv.toDataURL('image/png') })) }; toast('Signed. Your copy is ready.'); paint(); }
    catch (e) { toast(e.message, true); b.disabled = false; }
  };
  const view = $('#view'), hs = $$('.paper h2'), links = $$('#toc a');
  view.onscroll = () => { let k = 0; hs.forEach((h, n) => { if (h.getBoundingClientRect().top < 140) k = n; }); links.forEach((a, n) => a.classList.toggle('on', n === k)); };
}
const pdfNow = async () => { try { await agreementPdf({ title: W.contract.title, text: W.contract.text, client: W.client.name, signature: W.contract.signature && { ...W.contract.signature }, countersign: W.contract.countersign, docHash: W.contract.signature.docHash, studio: W.settings.studio }); } catch (e) { toast(e.message, true); } };

/* ---------- ads and results ---------- */
function results() {
  const P = W.staff.performance || [], ads = W.staff.ads || [], dash = W.staff.dashboardUrl;
  const months = [...new Set(P.map(r => r.date.slice(0, 7)))].sort(), cur = months.at(-1), prev = months.at(-2);
  const sum = (m, k) => P.filter(r => r.date.startsWith(m)).reduce((a, r) => a + r[k], 0), lbl = P.at(-1)?.label || 'Results';
  const kpi = (t, v, p, fmt, mode) => `<div class="card stat"><div class="v">${fmt(v)}</div><div class="k">${t}${p !== undefined && p > 0 ? `<br><span style="color:${mode === 'flat' ? 'var(--mute)' : (v >= p) === (mode === 'up') ? 'var(--green)' : 'var(--red)'}">${v >= p ? '&uarr;' : '&darr;'} ${Math.abs(Math.round((v - p) / p * 100))}% vs last month</span>` : ''}</div></div>`;
  const mon = m => new Date(m + '-15').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  const cpr = m => sum(m, 'results') ? sum(m, 'spend') / sum(m, 'results') : 0;
  const brands = [...new Set(P.map(r => r.brand))];
  return `<div class="page wide"><p class="eyebrow mono">Ads &amp; results</p><h1>How your ads<span> are doing.</span></h1>
    <p class="lead">${P.length ? 'Updated by our team. Every number is from your own ad account.' : 'Your ads go live in weeks 3 to 6. The numbers appear here as soon as they do.'}</p>
    ${dash ? `<div class="cta" style="margin-top:20px"><a class="btn dark" href="${esc(dash)}" target="_blank" rel="noopener">${ic('chart')} Open the live dashboard ${ic('arrow')}</a></div>` : ''}
    ${P.length ? `<div class="grid g4" style="margin-top:28px">${kpi('Ad spend, ' + mon(cur), sum(cur, 'spend'), prev && sum(prev, 'spend'), v => money(v), 'flat')}${kpi(esc(lbl) + ', ' + mon(cur), sum(cur, 'results'), prev && sum(prev, 'results'), v => v.toLocaleString(), 'up')}${kpi('Cost per ' + esc(lbl.toLowerCase().replace(/s$/, '')), cpr(cur), prev && cpr(prev), v => v ? money(v) : '—', 'down')}
      <div class="card stat"><div class="v">${P.length}<small>weeks logged</small></div><div class="k">${brands.length} brand${brands.length > 1 ? 's' : ''}</div></div></div>
      <div class="sec"><div class="sh"><h2>Week by week</h2></div><div class="card">${chart(P, { label: lbl })}</div></div>
      <div class="sec"><div class="sh"><h2>The numbers</h2></div><div class="card" style="padding:6px 10px;overflow:auto"><table class="t"><thead><tr><th>Week of</th><th>Brand</th><th class="r">Spend</th><th class="r">Results</th><th class="r">Cost each</th><th>Note</th></tr></thead><tbody>${[...P].sort((a, b) => b.date.localeCompare(a.date)).map(r => `<tr><td>${esc(r.date)}</td><td>${esc(r.brand)}</td><td class="r">${money(r.spend)}</td><td class="r">${r.results.toLocaleString()} <span class="mono" style="color:var(--mute)">${esc(r.label)}</span></td><td class="r">${r.results ? money(r.spend / r.results) : '—'}</td><td style="color:var(--mute)">${esc(r.note)}</td></tr>`).join('')}</tbody></table></div></div>` : `<div class="empty" style="margin-top:28px"><b>Nothing to show yet.</b>Weeks 1 and 2 are set-up. Ads start in week 3.</div>`}
    <div class="sec"><div class="sh"><h2>Your ads<em>${ads.length}</em></h2></div>${ads.length ? `<div class="ads">${ads.map(a => `<div class="ad"><div class="th" ${a.thumb ? `style="background-image:url('${esc(a.thumb)}')"` : ''}>${a.thumb ? '' : ic('image')}<span class="pillx ${a.status === 'live' ? 'live' : a.status === 'review' ? 'warn' : ''}">${esc(a.status)}</span></div><div class="tx"><b>${esc(a.name)}</b><span class="small">${esc(a.brand)} · ${esc(a.platform)}</span>${a.note ? `<p class="small" style="margin-top:6px">${esc(a.note)}</p>` : ''}${a.link ? `<a class="more small" style="display:inline-flex;margin-top:10px;font-weight:700;color:var(--ink)" href="${esc(a.link)}" target="_blank" rel="noopener">View ad ${ic('arrow')}</a>` : ''}</div></div>`).join('')}</div>` : `<div class="empty"><b>No ads yet.</b>They show up here, with a link to each, once they are approved.</div>`}</div></div>`;
}

/* ---------- invoices, files, messages ---------- */
function invoices() {
  const I = W.staff.invoices || [];
  return `<div class="page"><p class="eyebrow mono">Invoices</p><h1>What you pay<span> us.</span></h1><p class="lead">Our fee is billed monthly in advance. Ad spend is separate: you pay it straight to Meta from your own ad account.</p>
    ${I.length ? `<div class="card" style="margin-top:26px;padding:6px 10px"><table class="t"><thead><tr><th>Invoice</th><th>Due</th><th class="r">Amount</th><th>Status</th><th></th></tr></thead><tbody>${I.map(i => `<tr><td><b>${esc(i.no)}</b>${i.note ? `<br><span class="small">${esc(i.note)}</span>` : ''}</td><td>${esc(i.due)}</td><td class="r">${money(i.amount, i.currency)}</td><td><span class="pillx ${i.status === 'paid' ? 'live' : i.status === 'due' ? 'warn' : ''}">${esc(i.status)}</span></td><td class="r">${i.link ? `<a class="btn sm" href="${esc(i.link)}" target="_blank" rel="noopener">${ic('down')} Open</a>` : ''}</td></tr>`).join('')}</tbody></table></div>` : `<div class="empty" style="margin-top:26px"><b>No invoices yet.</b>Your first one arrives with the signed agreement.</div>`}</div>`;
}
function files() {
  const L = W.staff.links || [], mine = []; for (const [id, a] of Object.entries(W.answers.checklist)) for (const [f, v] of Object.entries(a.fields || {})) if (/^https?:\/\//.test(v)) mine.push({ label: items().find(i => i.id === id)?.title || id, url: v });
  return `<div class="page"><p class="eyebrow mono">Files &amp; links</p><h1>Everything<span> in one list.</span></h1>
    <div class="sec"><div class="sh"><h2>From us</h2></div>${L.length || W.staff.dashboardUrl ? `<div class="card" style="padding:6px 18px"><table class="t"><tbody>${W.staff.dashboardUrl ? `<tr><td><b>Live dashboard</b></td><td class="r"><a class="btn sm" href="${esc(W.staff.dashboardUrl)}" target="_blank" rel="noopener">Open ${ic('arrow')}</a></td></tr>` : ''}${L.map(l => `<tr><td><b>${esc(l.label)}</b><br><span class="small mono">${esc(l.kind)}</span></td><td class="r"><a class="btn sm" href="${esc(l.url)}" target="_blank" rel="noopener">Open ${ic('arrow')}</a></td></tr>`).join('')}</tbody></table></div>` : `<div class="empty"><b>Nothing yet.</b>Reports, the dashboard and shared folders show up here.</div>`}</div>
    <div class="sec"><div class="sh"><h2>What you shared with us</h2></div>${mine.length ? `<div class="card" style="padding:6px 18px"><table class="t"><tbody>${mine.map(m => `<tr><td><b>${esc(m.label)}</b></td><td class="r"><a class="btn sm" href="${esc(m.url)}" target="_blank" rel="noopener">Open ${ic('arrow')}</a></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty"><b>No links yet.</b>Folder links you add in “Start here” are listed here.</div>'}</div></div>`;
}
function messages() {
  return `<div class="page"><p class="eyebrow mono">Messages</p><h1>Talk to<span> the team.</span></h1><p class="lead">For quick questions. For anything urgent, email ${esc(W.settings.studioEmail)}.</p>
    <div class="thread" style="margin-top:28px">${W.msgs.length ? W.msgs.map(m => `<div class="msg ${m.from === 'client' ? 'me' : ''}"><small>${esc(m.name)} · ${esc(day(m.at))} ${ago(m.at)}</small>${esc(m.text)}</div>`).join('') : '<div class="empty"><b>No messages yet.</b>Say hello.</div>'}</div>
    <div class="fld"><textarea class="in" id="msgText" placeholder="Write to us…" aria-label="Message"></textarea></div><div class="acts"><button class="btn dark" data-send>${ic('send')} Send</button></div></div>`;
}

/* ---------- updates: what the team shares with this client, and news for everyone ---------- */
function feed() {
  const F = W.feed || [];
  return `<div class="page"><p class="eyebrow mono">Updates</p><h1>What is<span> happening.</span></h1><p class="lead">News from the team about your ads and your brand, plus things we share with all our clients.</p>
    <div class="sec">${F.map(p => post(p)).join('') || '<div class="empty"><b>Nothing posted yet.</b>Updates from the team show up here.</div>'}</div></div>`;
}

/* ---------- events: launches, sales and openings we plan ads around ---------- */
const dShort = (s, o = {}) => new Date(s + 'T12:00:00Z').toLocaleDateString('en-GB', { timeZone: 'UTC', ...o });
const span = e => e.end && e.end !== e.start ? `${dShort(e.start, { day: 'numeric', month: 'short' })} – ${dShort(e.end, { day: 'numeric', month: 'short', year: 'numeric' })}` : dShort(e.start, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const inDays = s => { const n = Math.round((Date.parse(s + 'T00:00:00Z') - Date.parse(today() + 'T00:00:00Z')) / 864e5); return n <= 0 ? 'on now' : n === 1 ? 'tomorrow' : `in ${n} days`; };
const erow = (e, past) => { const [lab, tone] = EST[e.status] || EST.new; return `<div class="meet ev ${past ? 'past' : ''}"><div class="d"><span>${dShort(e.start, { month: 'short' })}</span><b>${dShort(e.start, { day: 'numeric' })}</b><span>${dShort(e.start, { weekday: 'short' })}</span></div>
  <div class="n"><b>${esc(e.title)}</b><span class="small">${esc(span(e))}${past ? '' : ' · ' + inDays(e.start)}${e.brand ? ' · ' + esc(e.brand) : ''}</span>
    <div class="tk-head" style="margin-top:8px">${e.segment ? `<span class="pillx dark">${esc(e.segment)}</span>` : ''}<span class="pillx ${tone}">${lab}</span></div>
    ${e.description ? `<p class="desc">${esc(e.description)}</p>` : ''}${e.audience || e.offer ? `<p class="small" style="margin-top:6px">${e.audience ? `<strong>For:</strong> ${esc(e.audience)}` : ''}${e.audience && e.offer ? ' · ' : ''}${e.offer ? `<strong>Offer:</strong> ${esc(e.offer)}` : ''}</p>` : ''}
    ${e.link ? `<a class="small" href="${esc(e.link)}" target="_blank" rel="noopener" style="color:var(--green);font-weight:700">${esc(e.link)}</a>` : ''}
    ${e.comment ? `<div class="note ok" style="margin-top:10px">From ${esc(W.settings.studio)}: ${esc(e.comment)}</div>` : ''}</div>
  <button class="btn sm ghost" data-evedit="${esc(e.id)}">${ic('edit')} Edit</button></div>`; };
function events() {
  const all = W.events || [], e = all.find(x => x.id === arg);
  if (arg === 'new' || e) {
    const v = e || { title: '', segment: '', brand: W.client.brands.length === 1 ? W.client.brands[0].name : '', start: '', end: '', audience: '', offer: '', description: '', link: '' };
    return `<div class="page"><p class="eyebrow mono">Events · ${e ? 'edit' : 'new'}</p><h1>${e ? esc(e.title) : 'Tell us<span> what is coming.</span>'}</h1><p class="lead">A launch, a sale, an opening, a holiday. The earlier we know, the better the ads around it.</p>
      <div class="card" style="margin-top:24px"><div class="fgrid">
        <div class="fld full"><label for="ev-t">Event name <span class="req">*</span></label><input class="in" id="ev-t" maxlength="120" value="${esc(v.title)}" placeholder="e.g. Winter collection launch"></div>
        <div class="fld"><label for="ev-s">Segment</label><input class="in" id="ev-s" list="ev-segs" maxlength="60" value="${esc(v.segment)}" placeholder="Pick or type your own"><datalist id="ev-segs">${SEGMENTS.map(x => `<option value="${x}">`).join('')}</datalist></div>
        <div class="fld"><label for="ev-b">Brand</label><select class="in" id="ev-b"><option value="">All brands</option>${W.client.brands.map(b => `<option ${b.name === v.brand ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></div>
        <div class="fld"><label for="ev-d">Date <span class="req">*</span></label><input class="in" id="ev-d" type="date" value="${esc(v.start)}"></div>
        <div class="fld"><label for="ev-e">Ends (if more than one day)</label><input class="in" id="ev-e" type="date" value="${esc(v.end)}"></div>
        <div class="fld full"><label for="ev-x">Description</label><textarea class="in" id="ev-x" style="min-height:130px" placeholder="What happens, where, and what you want people to do.">${esc(v.description)}</textarea></div>
        <div class="fld"><label for="ev-a">Who it is for</label><input class="in" id="ev-a" maxlength="300" value="${esc(v.audience)}" placeholder="e.g. Members, new customers, Cairo only"></div>
        <div class="fld"><label for="ev-o">Offer (optional)</label><input class="in" id="ev-o" maxlength="300" value="${esc(v.offer)}" placeholder="e.g. 20% off, free gift"></div>
        <div class="fld full"><label for="ev-l">Link (optional)</label><input class="in" id="ev-l" type="url" value="${esc(v.link)}" placeholder="https:// a page, a folder with photos…"></div></div>
        <div class="acts"><button class="btn green" data-evsave="${esc(e?.id || '')}">${ic('check')} ${e ? 'Save changes' : 'Add event'}</button><button class="btn ghost" data-nav="events">Cancel</button>${e ? `<button class="btn ghost danger" data-evdel="${esc(e.id)}">${ic('trash')} Remove</button>` : ''}</div></div></div>`;
  }
  const up = upEv(), past = all.filter(x => !up.includes(x)).reverse().slice(0, 12);
  return `<div class="page"><p class="eyebrow mono">Events</p><h1>What is<span> coming up.</span></h1><p class="lead">Add launches, sales, openings and seasons. We plan the ads around them and tell you here when they are in our plan.</p>
    <div class="acts" style="margin-top:20px"><button class="btn green" data-evnew>${ic('plus')} Add an event</button></div>
    <div class="sec"><div class="sh"><h2>Coming up<em>${up.length}</em></h2></div>${up.map(x => erow(x)).join('') || '<div class="empty"><b>No events yet.</b>Add the next launch or sale, even if the date is rough.</div>'}</div>
    ${past.length ? `<div class="sec"><div class="sh"><h2>Past</h2></div>${past.map(x => erow(x, true)).join('')}</div>` : ''}</div>`;
}

/* ---------- support tickets ---------- */
const trow = t => `<div class="row" data-ticket="${esc(t.id)}" tabindex="0"><span class="tno">#${t.no}</span><div class="n"><b>${esc(t.subject)}</b><span>${esc(CATS[t.cat] || '')} · ${t.thread.length} message${t.thread.length > 1 ? 's' : ''} · ${since(t.updated)}</span></div>${t.priority === 'urgent' ? '<span class="pillx bad">urgent</span>' : ''}<span class="pillx ${TST[t.status][1]}">${TST[t.status][0]}</span>${unreadC(t) ? '<i class="dotu" title="New reply"></i>' : ''}</div>`;
function support() {
  const all = W.tickets || [], t = all.find(x => x.id === arg);
  if (arg === 'new') return `<div class="page"><p class="eyebrow mono">Support · new ticket</p><h1>What do you<span> need?</span></h1><p class="lead">One topic per ticket. The whole team sees it, and you get an email when we answer.</p>
    <div class="card" style="margin-top:24px"><div class="fgrid">
      <div class="fld full"><label for="tk-s">Subject <span class="req">*</span></label><input class="in" id="tk-s" maxlength="140" placeholder="e.g. The pixel is not firing on checkout"></div>
      <div class="fld"><label for="tk-c">Type</label><select class="in" id="tk-c">${Object.entries(CATS).map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join('')}</select></div>
      <div class="fld"><label for="tk-p">How urgent</label><select class="in" id="tk-p"><option value="normal">Normal · within a working day</option><option value="urgent">Urgent · an ad or a sale is affected</option></select></div>
      <div class="fld full"><label for="tk-t">Details <span class="req">*</span></label><textarea class="in" id="tk-t" style="min-height:170px" placeholder="What happened, what you expected, and any links."></textarea></div></div>
      <div class="warnbox">${ic('shield')}<span>Never send a password here. If something can only be shared with a password, say so and we will set up a safe way.</span></div>
      <div class="acts"><button class="btn green" data-tksend>${ic('send')} Send ticket</button><button class="btn ghost" data-nav="support">Cancel</button></div></div></div>`;
  if (t) {
    const [lab, tone] = TST[t.status];
    return `<div class="page"><p class="eyebrow mono">Support · ticket #${t.no}</p><h1>${esc(t.subject)}<span>.</span></h1>
      <div class="tk-head"><span class="pillx ${tone}">${lab}</span><span class="pillx">${esc(CATS[t.cat] || '')}</span>${t.priority === 'urgent' ? '<span class="pillx bad">urgent</span>' : ''}<span class="small">Opened ${esc(day(t.at))}</span></div>
      <div class="thread" style="margin-top:26px">${t.thread.map(m => `<div class="msg ${m.from === 'client' ? 'me' : ''}"><small>${m.from === 'staff' ? `<span class="by">${esc(W.settings.studio)}</span> · ` : ''}${esc(m.name)} · ${esc(day(m.at))} ${esc(clock(m.at))}</small>${esc(m.text)}</div>`).join('')}</div>
      ${t.status === 'answered' ? '<p class="small" style="margin-bottom:10px">We answered. Reply if you need more, or mark it as solved.</p>' : t.status === 'open' ? '<p class="small" style="margin-bottom:10px">With our team. You get an email when we answer.</p>' : ''}
      <div class="fld"><textarea class="in" id="tkReply" placeholder="${t.status === 'closed' ? 'Write here to reopen this ticket…' : 'Write a reply…'}" aria-label="Reply"></textarea></div>
      <div class="acts"><button class="btn dark" data-tkreply="${esc(t.id)}">${ic('send')} ${t.status === 'closed' ? 'Reply and reopen' : 'Send reply'}</button>${t.status !== 'closed' ? `<button class="btn ghost" data-tkclose="${esc(t.id)}">${ic('check')} Mark as solved</button>` : ''}<button class="btn ghost" data-nav="support">All tickets</button></div></div>`;
  }
  const op = all.filter(x => x.status !== 'closed'), cl = all.filter(x => x.status === 'closed');
  return `<div class="page"><p class="eyebrow mono">Support</p><h1>Ask us<span> anything.</span></h1><p class="lead">One ticket per topic. We answer within a working day, and you get an email when we do. For a conversation, book a call.</p>
    <div class="acts" style="margin-top:20px"><button class="btn green" data-newticket>${ic('plus')} New ticket</button><button class="btn" data-nav="meetings">${ic('cal')} Book a call</button></div>
    <div class="sec"><div class="sh"><h2>Open<em>${op.length}</em></h2></div>${op.map(trow).join('') || '<div class="empty"><b>No open tickets.</b>Press “New ticket” whenever you need us.</div>'}</div>
    ${cl.length ? `<div class="sec"><div class="sh"><h2>Solved<em>${cl.length}</em></h2></div>${cl.map(trow).join('')}</div>` : ''}</div>`;
}

/* ---------- meetings: free slots in the studio's time zone ---------- */
const tzOf = () => W.settings.tz || 'Africa/Cairo', here = Intl.DateTimeFormat().resolvedOptions().timeZone;
const inTz = (iso, o, tz = tzOf()) => new Date(iso).toLocaleString('en-GB', { timeZone: tz, ...o });
const clock = (iso, tz) => inTz(iso, { hour: '2-digit', minute: '2-digit', hour12: false }, tz);
const mwhen = iso => `${inTz(iso, { weekday: 'short', day: 'numeric', month: 'short' })}, ${clock(iso)}`;
const city = tz => tz.split('/').pop().replace(/_/g, ' ');
const mrow = (m, past) => `<div class="meet ${past ? 'past' : ''}"><div class="d"><span>${inTz(m.start, { month: 'short' })}</span><b>${inTz(m.start, { day: 'numeric' })}</b><span>${inTz(m.start, { weekday: 'short' })}</span></div>
  <div class="n"><b>${esc(m.topic)}</b><span class="small">${clock(m.start)}–${clock(m.end)} ${esc(city(tzOf()))} time${here !== tzOf() ? ` · ${clock(m.start, here)} your time` : ''}${m.note ? ' · ' + esc(m.note) : ''}</span></div>
  ${m.status === 'cancelled' ? `<span class="pillx bad">cancelled</span>` : past ? '<span class="pillx">done</span>' : `<span class="pillx ok">booked</span><button class="btn sm ghost" data-mcancel="${esc(m.id)}">Cancel</button>`}</div>`;
function meetings() {
  const up = upMeet(), past = (W.meetings || []).filter(m => !up.includes(m)).slice(0, 8);
  let pick;
  if (!S) pick = '<p class="small">Finding free times…</p>';
  else if (!S.on) pick = `<div class="empty"><b>Booking is paused.</b>${esc(S.err || 'Open a ticket and we will find a time with you.')}</div>`;
  else if (!S.slots.length) pick = '<div class="empty"><b>No free times in the next weeks.</b>Open a ticket and we will find one.</div>';
  else {
    const days = [...new Set(S.slots.map(s => s.day))]; if (!days.includes(selDay)) selDay = days[0];
    const d = iso => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).split(' ');
    pick = `<div class="days" role="tablist">${days.map(x => { const [wd, dn, mo] = d(x); return `<button class="${x === selDay ? 'on' : ''}" data-day="${x}"><span>${wd.replace(',', '')}</span><b>${dn}</b><span>${mo}</span></button>`; }).join('')}</div>
      <div class="slots">${S.slots.filter(s => s.day === selDay).map(s => `<button class="${s.start === selSlot ? 'on' : ''}" data-slot="${esc(s.start)}">${clock(s.start)}${here !== tzOf() ? `<small>${clock(s.start, here)} yours</small>` : ''}</button>`).join('')}</div>
      <p class="small" style="margin-top:10px">Times are ${esc(city(tzOf()))} time. Each call is ${S.length} minutes.</p>
      <div class="fgrid" style="margin-top:6px"><div class="fld"><label for="mt-t">What about</label><select class="in" id="mt-t">${TOPICS.map(x => `<option>${x}</option>`).join('')}</select></div>
      <div class="fld full"><label for="mt-n">Anything we should prepare (optional)</label><textarea class="in" id="mt-n" style="min-height:70px"></textarea></div></div>
      <div class="acts"><button class="btn green" data-book ${selSlot ? '' : 'disabled'}>${ic('cal')} ${selSlot ? `Book ${esc(mwhen(selSlot))}` : 'Pick a time first'}</button></div>`;
  }
  return `<div class="page"><p class="eyebrow mono">Meetings</p><h1>Book a call<span> with us.</span></h1><p class="lead">Pick a free time. It goes into our calendar straight away, and you get an email with a calendar file.</p>
    ${up.length ? `<div class="sec"><div class="sh"><h2>Coming up<em>${up.length}</em></h2></div>${up.map(m => mrow(m)).join('')}</div>` : ''}
    <div class="sec"><div class="sh"><h2>Pick a time</h2></div><div class="card">${pick}</div></div>
    ${past.length ? `<div class="sec"><div class="sh"><h2>Earlier</h2></div>${past.map(m => mrow(m, true)).join('')}</div>` : ''}</div>`;
}

/* ---------- events ---------- */
const saving = n => { const s = $('#save'); s.classList.toggle('busy', n); $('span', s).textContent = n ? 'Saving…' : 'Saved'; };
const flush = {};
async function persist(patch) { saving(true); try { await api('PUT', 'client/answers', patch); } catch (e) { toast(e.message, true); } saving(false); }
const saveField = debounce(patch => persist(patch), 700);
function itemPatch(el) {
  const card = el.closest('[data-item]'), id = card.dataset.item, fields = {};
  $$('[data-f]', card).forEach(x => fields[x.dataset.f] = x.type === 'checkbox' ? x.checked : x.value);
  const p = { fields, note: $('[data-note]', card)?.value || '' };
  (W.answers.checklist[id] = W.answers.checklist[id] || {}); Object.assign(W.answers.checklist[id], { fields, note: p.note }); return { id, p };
}
function onInput(e) {
  const el = e.target;
  if (el.closest('[data-item]') && (el.dataset.f || el.dataset.note !== undefined)) { const { id, p } = itemPatch(el); saveField({ checklist: { [id]: p } }); }
  else if (el.closest('[data-formkey]') && el.dataset.f) { const box = el.closest('[data-formkey]'), key = box.dataset.formkey, v = {}; $$('[data-f]', box).forEach(x => v[x.dataset.f] = x.value); W.answers.forms[key] = v; saveField({ forms: { [key]: v } }); }
}
async function onClick(e) {
  const t = e.target.closest('button,a,[data-toggle],[data-ticket]'); if (!t) return;
  if (t.dataset.nav) return nav(t.dataset.nav);
  if (t.dataset.ticket) return nav('support', t.dataset.ticket);
  if (t.dataset.newticket !== undefined) return nav('support', 'new');
  if (t.dataset.evnew !== undefined) return nav('events', 'new');
  if (t.dataset.evedit) return nav('events', t.dataset.evedit);
  if (t.dataset.evsave !== undefined || t.dataset.evdel) return events$(t);
  if (t.dataset.day) { selDay = t.dataset.day; selSlot = ''; return stay(); }
  if (t.dataset.slot) { selSlot = t.dataset.slot; const keep = [$('#mt-t')?.value, $('#mt-n')?.value]; stay(); if (keep[0]) { $('#mt-t').value = keep[0]; $('#mt-n').value = keep[1]; } return; }
  if (t.dataset.tksend !== undefined || t.dataset.tkreply || t.dataset.tkclose || t.dataset.book !== undefined || t.dataset.mcancel) return support$(t);
  if (t.dataset.copy) return copyText(t.dataset.copy);
  if (t.dataset.open) { open.add(t.dataset.open); nav('start'); return setTimeout(() => $(`[data-item="${t.dataset.open}"]`)?.scrollIntoView({ block: 'center' }), 80); }
  if (t.dataset.form) return nav('forms', t.dataset.form);
  if (t.dataset.jump) return document.getElementById(t.dataset.jump)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (t.dataset.toggle !== undefined) { const id = t.dataset.toggle; open.has(id) ? open.delete(id) : open.add(id); return t.closest('.item').classList.toggle('open'); }
  if (t.dataset.pdf !== undefined) return pdfNow();
  if (t.dataset.print !== undefined) return print();
  if (t.dataset.state) {
    const { id, p } = itemPatch(t); p.state = t.dataset.state; saveField.flush({ checklist: { [id]: p } }); W.answers.checklist[id].state = p.state; await refresh(); toast(p.state === 'submitted' ? 'Sent to us. Thank you.' : p.state === 'help' ? 'We will reach out.' : 'Updated');
  }
  if (t.dataset.send !== undefined) { const v = $('#msgText').value.trim(); if (!v) return; try { await api('POST', 'client/message', { text: v }); await refresh(); toast('Sent'); } catch (er) { toast(er.message, true); } }
}
// the actions that talk to the server: send, reply, solve, book, cancel. The button stays disabled while it runs.
async function support$(t) {
  const d = t.dataset; t.disabled = true;
  try {
    if (d.tksend !== undefined) {
      const r = await api('POST', 'client/ticket', { subject: $('#tk-s').value, cat: $('#tk-c').value, priority: $('#tk-p').value, text: $('#tk-t').value });
      W.tickets = [r.ticket, ...(W.tickets || [])]; toast(`Ticket #${r.ticket.no} sent. We will email you.`); return nav('support', r.ticket.id);
    }
    if (d.tkreply) { const r = await api('POST', 'client/reply', { id: d.tkreply, text: $('#tkReply').value }); putTicket(r.ticket); toast('Sent'); return stay(); }
    if (d.tkclose) { const r = await api('PUT', 'client/ticket', { id: d.tkclose, status: 'closed' }); putTicket(r.ticket); toast('Marked as solved'); return stay(); }
    if (d.book !== undefined) {
      const r = await api('POST', 'client/meeting', { start: selSlot, topic: $('#mt-t').value, note: $('#mt-n').value });
      W.meetings = [r.meeting, ...(W.meetings || [])]; selSlot = ''; toast('Booked. Check your email for the calendar file.'); S = null; stay(); return loadSlots();
    }
    if (d.mcancel) {
      const m = W.meetings.find(x => x.id === d.mcancel); if (!confirm(`Cancel the call on ${mwhen(m.start)}?`)) return;
      const r = await api('PUT', 'client/meeting', { id: d.mcancel }); Object.assign(m, r.meeting); toast('Cancelled. We are told by email.'); S = null; stay(); return loadSlots();
    }
  } catch (er) { toast(er.message, true); if (d.book !== undefined && er.code === 409) { S = null; selSlot = ''; loadSlots(); } }
  finally { t.disabled = false; }
}
async function events$(t) {
  const d = t.dataset; t.disabled = true;
  try {
    if (d.evdel) {
      if (!confirm('Remove this event?')) return;
      await api('DELETE', 'client/event', { id: d.evdel }); W.events = W.events.filter(x => x.id !== d.evdel); toast('Removed'); return nav('events');
    }
    const r = await api('POST', 'client/event', { id: d.evsave || undefined, title: $('#ev-t').value, segment: $('#ev-s').value, brand: $('#ev-b').value, start: $('#ev-d').value, end: $('#ev-e').value, description: $('#ev-x').value, audience: $('#ev-a').value, offer: $('#ev-o').value, link: $('#ev-l').value });
    W.events = [...(W.events || []).filter(x => x.id !== r.event.id), r.event].sort((a, b) => a.start.localeCompare(b.start));
    toast(d.evsave ? 'Saved' : 'Added. The team is told.'); nav('events');
  } catch (er) { toast(er.message, true); } finally { t.disabled = false; }
}
const putTicket = t => { W.tickets = (W.tickets || []).map(x => x.id === t.id ? t : x); };
const stay = () => { const k = $('#view').scrollTop; paint(); $('#view').scrollTop = k; };
async function refresh() { try { W = await api('GET', 'client/workspace'); } catch { } stay(); }
async function poll() {
  if (document.hidden || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '') || route === 'agreement') return;
  try {
    const n = await api('GET', 'client/workspace'), sig = w => JSON.stringify([w.staff, w.contract.status, w.msgs.length, (w.tickets || []).map(t => t.updated + t.thread.length), (w.meetings || []).map(m => m.status), (w.events || []).map(e => e.status + e.comment), (w.feed || []).map(p => p.id + (p.edited || '') + p.pinned)]);
    if (sig(n) !== sig(W)) { if (n.msgs.length > W.msgs.length) toast('New message from the team'); const before = unreadT(), fb = unreadF(); W = n; if (unreadT() > before) toast('We answered a ticket'); if (unreadF() > fb) toast('New update from the team'); stay(); }
  } catch { }
}

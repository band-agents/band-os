import { $, $$, esc, api, ic, toast, modal, debounce, ago, day, money, copyText, setPalette, openPalette, md, chart, barcode, STATE, KIND, getFile, showFiles, fileData, PARTY_F, partyFields, partyOk, readParty, BLANK } from './lib.js';
import { shell, signOut } from './main.js';
import { agreementPdf, clientDataPdf } from './pdf.js';

let FEED = [], me, O, T, C = null, route = 'overview', arg = '', tab = 'checklist', sub = '', bc = null, open = new Set(), lastLog = null;
const nav = (r, a = '', t = '', s = '') => { location.hash = '#' + r + (a ? '/' + a : '') + (t ? '/' + t : '') + (s ? '/' + s : ''); };

export async function mount(who) {
  me = who;
  try { [O, T] = await Promise.all([api('GET', 'staff/overview'), api('GET', 'template')]); } catch (e) { toast(e.message, true); return; }
  lastLog = O.log[0]?.at;
  document.title = 'Staff · band. portal';
  $('#app').innerHTML = shell({ tag: 'Staff', staff: true, name: me.name, extra: `<span class="mono envtag" style="color:rgba(255,255,255,.5);margin-right:6px">${O.mode === 'redis' ? 'LIVE' : 'LOCAL DATA'}</span>` }) + `
    <div class="win"><aside class="side" id="side"></aside><section class="main"><div class="tool"><button class="nav-b" id="back" aria-label="Back">‹</button><nav class="crumbs" id="crumbs"></nav><span class="sp"></span><button class="btn sm green" id="newBtn">${ic('plus')} New client</button></div><div class="view" id="view" tabindex="-1"></div></section></div><nav class="bnav" id="bnav" aria-label="Sections"></nav>`;
  $('#outBtn').onclick = signOut; $('#palBtn').onclick = openPalette; $('#back').onclick = () => history.back(); $('#newBtn').onclick = newClient;
  $('#view').addEventListener('click', onClick); $('#view').addEventListener('input', onInput);
  addEventListener('hashchange', go); go(); pulse();
  addEventListener('keydown', e => { if (e.key === 'n' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) && !e.metaKey && !e.ctrlKey && !$('.modal')) { e.preventDefault(); newClient(); } });
}

/* ---------- helpers ---------- */
const items = c => [...T.checklist, ...(c.staff.customItems || [])].filter(i => c.staff.customItems?.some(x => x.id === i.id) || true);
const visible = c => items(c).filter(i => !(c.staff.hidden || []).includes(i.id));
const stateOf = (c, i) => c.staff.verify[i.id]?.state || (i.id === 'sign' ? (c.contract?.status === 'signed' ? 'verified' : 'todo') : i.owner === 'staff' ? (c.staff.auto?.[i.id] ? 'verified' : 'todo') : c.answers.checklist[i.id]?.state || 'todo');
const palette = () => setPalette([
  { t: 'New client', i: 'plus', h: 'N', run: newClient }, { t: 'Overview', i: 'home', h: 'Go to', run: () => nav('overview') }, { t: 'All clients', i: 'users', h: 'Go to', run: () => nav('clients') },
  { t: 'Activity', i: 'clock', h: 'Go to', run: () => nav('activity') }, { t: 'Settings', i: 'settings', h: 'Go to', run: () => nav('settings') },
  ...O.clients.map(c => ({ t: c.name, i: 'users', h: 'Client', k: c.brands.map(b => b.name).join(' ').toLowerCase(), run: () => nav('client', c.id) })),
  ...(C ? ['checklist', 'answers', 'agreement', 'results', 'billing', 'messages', 'settings'].map(t => ({ t: `${C.client.name}: ${t}`, i: 'arrow', h: 'Tab', run: () => nav('client', C.client.id, t) })) : []),
  { t: 'Sign out', i: 'out', h: 'Action', run: signOut }]);

async function go() {
  [route, arg, tab, sub] = (location.hash.slice(1) || 'overview').split('/'); tab = tab || 'checklist'; sub = sub || '';
  if (!['overview', 'clients', 'client', 'tickets', 'meetings', 'feed', 'activity', 'settings'].includes(route)) route = 'overview';
  if (route === 'feed') { try { FEED = (await api('GET', 'staff/feed')).posts; } catch (e) { toast(e.message, true); FEED = []; } }
  if (route === 'client') { try { C = await api('GET', 'staff/clients/' + arg); } catch (e) { toast(e.message, true); return nav('clients'); } } else C = null;
  if (['tickets', 'meetings'].includes(route)) await reload().catch(() => { });
  paint();
  if (route === 'client' && tab === 'events' && sub) document.getElementById('ev-' + sub)?.scrollIntoView({ block: 'center' });
  const t = route === 'client' && tab === 'tickets' && C.tickets.find(x => x.id === sub);
  if (t && unreadS(t)) { t.seenStaff = new Date().toISOString(); api('PUT', `staff/clients/${arg}/ticket`, { tid: t.id, seen: true }).then(reload).then(side).catch(() => { }); }
}

/* ---------- tickets and meetings, shared helpers ---------- */
const unreadS = t => { const l = t.thread.at(-1); return l?.from === 'client' && !(t.seenStaff >= l.at); };
const TST = { open: ['Waiting on us', 'warn'], answered: ['Waiting on client', 'ok'], closed: ['Closed', ''] };
const CATS = { question: 'Question', problem: 'Problem', request: 'Request', billing: 'Billing', other: 'Other' };
const since = iso => { const a = ago(iso); return a === 'now' ? 'just now' : a + ' ago'; };
const bk = () => ({ tz: 'Africa/Cairo', days: [0, 1, 2, 3, 4], from: '11:00', to: '17:00', length: 30, notice: 24, ahead: 21, max: 3, blocked: [], on: true, ...(O.settings.booking || {}) });
const inTz = (iso, o) => new Date(iso).toLocaleString('en-GB', { timeZone: bk().tz, ...o });
const clock = iso => inTz(iso, { hour: '2-digit', minute: '2-digit', hour12: false });
const mwhen = iso => `${inTz(iso, { weekday: 'short', day: 'numeric', month: 'short' })}, ${clock(iso)}`;
const waiting = () => O.tickets.filter(t => t.status === 'open').length;
const trow = (t, cid, name) => `<div class="row" data-tk="${esc(cid)}/${esc(t.id)}" tabindex="0"><span class="tno">#${t.no}</span><div class="n"><b>${esc(t.subject)}</b><span>${name ? `${esc(name)} · ` : ''}${esc(CATS[t.cat] || '')} · ${since(t.updated)}</span></div>${t.priority === 'urgent' ? '<span class="pillx bad">urgent</span>' : ''}<span class="pillx ${TST[t.status][1]}">${TST[t.status][0]}</span>${t.unread || (t.thread && unreadS(t)) ? '<i class="dotu" title="New from the client"></i>' : ''}</div>`;
const mrow = (m, withClient, past) => `<div class="meet ${past ? 'past' : ''}" ${withClient ? `data-meetc="${esc(m.cid)}"` : ''} style="${withClient ? 'cursor:pointer' : ''}"><div class="d"><span>${inTz(m.start, { month: 'short' })}</span><b>${inTz(m.start, { day: 'numeric' })}</b><span>${inTz(m.start, { weekday: 'short' })}</span></div>
  <div class="n"><b>${withClient ? esc(m.client) + ' · ' : ''}${esc(m.topic)}</b><span class="small">${clock(m.start)}–${clock(m.end)} · ${esc(m.byName)} (${esc(m.by)})${m.note ? ' · ' + esc(m.note) : ''}</span></div>
  ${m.status === 'cancelled' ? `<span class="pillx bad">cancelled${m.cancelledBy ? ' by ' + esc(m.cancelledBy) : ''}</span>` : past ? '<span class="pillx">done</span>' : `<span class="pillx ok">booked</span>${withClient ? '' : `<button class="btn sm ghost danger" data-mcancel="${esc(m.id)}">Cancel</button>`}`}</div>`;
function tabbar() {
  const on = r => route === r || (r === 'clients' && route === 'client');
  $('#bnav').innerHTML = [['overview', 'Overview', 'home'], ['clients', 'Clients', 'users'], ['tickets', 'Support', 'ticket'], ['meetings', 'Calls', 'cal'], ['settings', 'Settings', 'settings']]
    .map(([r, t, i]) => `<button class="${on(r) ? 'on' : ''}" data-nav="${r}" aria-label="${t}">${ic(i)}<span>${t}</span>${r === 'clients' && O.clients.some(c => c.awaiting || c.help) ? '<i>•</i>' : r === 'tickets' && waiting() ? `<i>${waiting()}</i>` : ''}</button>`).join('');
  $$('#bnav [data-nav]').forEach(b => b.onclick = () => nav(b.dataset.nav));
}
function side() {
  tabbar();
  $('#side').innerHTML = `<div class="who-card"><b>${esc(me.name)}</b><span>Staff</span></div><h6>Studio</h6>
    ${[['overview', 'Overview', 'home', ''], ['clients', 'Clients', 'users', O.clients.length], ['tickets', 'Support inbox', 'ticket', waiting() || '', waiting()], ['meetings', 'Calls', 'cal', O.meetings.length || ''], ['feed', 'Updates', 'news', ''], ['activity', 'Activity', 'clock', ''], ['settings', 'Settings', 'settings', '']].map(([r, t, i, n, hot]) => `<button class="si ${route === r ? 'on' : ''}" data-nav="${r}">${ic(i)}<span>${t}</span>${n !== '' ? `<em class="${hot ? 'hot' : ''}">${n}</em>` : ''}</button>`).join('')}
    <h6>Clients</h6>${O.clients.map(c => `<button class="si ${route === 'client' && arg === c.id ? 'on' : ''}" data-client="${c.id}">${ic('arrow')}<span>${esc(c.name)}</span><em class="${c.awaiting || c.help || c.tickets || c.events ? 'hot' : c.done === c.total ? 'ok' : ''}">${c.awaiting + c.help + c.tickets + (c.events || 0) || (c.done + '/' + c.total)}</em></button>`).join('') || '<p class="small" style="padding:6px 10px">No clients yet.</p>'}
    <div class="sfoot"><span class="mono">n · new client</span><span class="mono">⌘K · jump to anything</span></div>`;
  $$('#side [data-nav]').forEach(b => b.onclick = () => nav(b.dataset.nav)); $$('#side [data-client]').forEach(b => b.onclick = () => nav('client', b.dataset.client));
}
function paint() {
  side(); const v = $('#view'), t = { overview, clients, client, tickets: inbox, meetings: calls, feed: updates, activity, settings }[route]();
  $('#crumbs').innerHTML = route === 'client' ? `<a data-nav="clients">Clients</a><i>/</i><span>${esc(C.client.name)}</span>` : `<span>${{ overview: 'Overview', clients: 'Clients', tickets: 'Support inbox', meetings: 'Calls', feed: 'Updates', activity: 'Activity', settings: 'Settings' }[route]}</span>`;
  $('#crumbs a')?.addEventListener('click', () => nav('clients'));
  v.innerHTML = t; v.scrollTop = 0; bc?.stop(); bc = null; const cv = $('#hcode'); if (cv) bc = barcode(cv, { color: '#EDEDE6', level: Math.min(1, .3 + O.log.filter(l => Date.now() - new Date(l.at) < 864e5).length / 12) }); palette(); if (route === 'settings') { loadTeam(); legalFile(); } showFiles('staff', v);
}

/* ---------- overview ---------- */
const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
const pctOf = c => Math.round(100 * c.done / Math.max(1, c.total));
const brandChips = c => c.brands.map(b => `<span class="brand"><i></i>${esc(b.name)}</span>`).join('');
const cpill = s => `<span class="pillx ${s === 'signed' ? 'live' : s === 'sent' ? 'warn' : ''}">${{ draft: 'agreement draft', sent: 'awaiting signature', signed: 'signed', void: 'agreement void' }[s]}</span>`;
function row(c) {
  return `<div class="row" data-client="${c.id}" tabindex="0"><div class="n"><b>${esc(c.name)}</b><span>${brandChips(c)}</span></div>${cpill(c.contract)}
    ${c.tickets ? `<span class="pillx warn">${c.tickets} ticket${c.tickets > 1 ? 's' : ''}</span>` : ''}${c.events ? `<span class="pillx warn">${c.events} new event${c.events > 1 ? 's' : ''}</span>` : ''}${c.awaiting ? `<span class="pillx warn">${c.awaiting} to review</span>` : ''}${c.help ? `<span class="pillx bad">${c.help} need help</span>` : ''}<div style="width:120px"><div class="bar-p"><i style="width:${pctOf(c)}%"></i></div><span class="small mono">${c.done}/${c.total} · ${pctOf(c)}%</span></div></div>`;
}
const feed = (n = 14) => `<div class="feed">${O.log.slice(0, n).map(l => `<div><time>${ago(l.at)}</time><span><b>${esc(l.who)}</b> ${esc(l.what)}</span></div>`).join('') || '<p class="small">Nothing yet.</p>'}</div>`;
function overview() {
  const C0 = O.clients, sum = k => C0.reduce((a, c) => a + c[k], 0), sign = C0.filter(c => c.contract === 'sent').length, need = C0.filter(c => c.awaiting || c.help || c.fix || c.tickets || c.events || c.contract === 'sent');
  return `<div class="page wide"><div class="hero-s"><div><p class="eyebrow mono">${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p><h1>${greet()},<span> ${esc(me.name)}.</span></h1></div><canvas id="hcode" aria-hidden="true"></canvas></div>
    <div class="grid g4" style="margin-top:30px">${[['Clients', C0.length, 'in the portal'], ['To review', sum('awaiting'), 'items sent by clients'], ['Waiting to sign', sign, 'agreements out'], ['Need help', sum('help'), 'items flagged']].map(([t, v, k], n) => `<div class="card stat"><div class="v" style="${n && v ? 'color:var(--green)' : ''}">${v}</div><div class="k">${t}<br><span class="mini">${k}</span></div></div>`).join('')}</div>
    <div class="split" style="margin-top:44px;grid-template-columns:1.5fr 1fr"><div><div class="sh"><h2>Needs you<em>${need.length}</em></h2></div>${need.map(row).join('') || '<div class="empty"><b>All clear.</b>Nothing is waiting on us.</div>'}
      ${waiting() ? `<div class="sh" style="margin-top:34px"><h2>Tickets waiting<em>${waiting()}</em></h2><button class="btn sm ghost" data-nav="tickets">All</button></div>${O.tickets.filter(t => t.status === 'open').slice(0, 4).map(t => trow(t, t.cid, t.client)).join('')}` : ''}
      ${O.events.length ? `<div class="sh" style="margin-top:34px"><h2>Coming events<em>${O.events.length}</em></h2></div>${O.events.slice(0, 4).map(e => erow(e, true)).join('')}` : ''}
      ${O.meetings.length ? `<div class="sh" style="margin-top:34px"><h2>Next calls<em>${O.meetings.length}</em></h2><button class="btn sm ghost" data-nav="meetings">All</button></div>${O.meetings.slice(0, 3).map(m => mrow(m, true)).join('')}` : ''}
      <div class="sh" style="margin-top:34px"><h2>All clients<em>${C0.length}</em></h2><button class="btn sm" data-new>${ic('plus')} New client</button></div>${C0.map(row).join('') || '<div class="empty"><b>No clients yet.</b>Press <span class="mono">N</span> to create the first workspace.</div>'}</div>
      <div><div class="sh"><h2>Activity</h2><button class="btn sm ghost" data-nav="activity">All</button></div><div class="card" style="padding:6px 18px">${feed(10)}</div></div></div></div>`;
}
function inbox() {
  const op = O.tickets.filter(t => t.status === 'open'), an = O.tickets.filter(t => t.status === 'answered');
  return `<div class="page"><p class="eyebrow mono">Support inbox</p><h1>Tickets<span>.</span></h1><p class="lead">Every open ticket, newest activity first. Solved ones stay on each client's Tickets tab.</p>
    <div class="sec"><div class="sh"><h2>Waiting on us<em>${op.length}</em></h2></div>${op.map(t => trow(t, t.cid, t.client)).join('') || '<div class="empty"><b>Inbox zero.</b>Nothing is waiting on us.</div>'}</div>
    ${an.length ? `<div class="sec"><div class="sh"><h2>Waiting on the client<em>${an.length}</em></h2></div>${an.map(t => trow(t, t.cid, t.client)).join('')}</div>` : ''}</div>`;
}
function calls() {
  return `<div class="page"><p class="eyebrow mono">Calls</p><h1>Booked<span> calls.</span></h1><p class="lead">Times in ${esc(bk().tz.split('/').pop().replace(/_/g, ' '))} time. Clients book from their portal; set the hours in Settings.</p>
    <div class="sec">${O.meetings.map(m => mrow(m, true)).join('') || '<div class="empty"><b>No calls booked.</b>Clients see your free hours under Meetings.</div>'}</div></div>`;
}
function clients() { return `<div class="page"><p class="eyebrow mono">Clients</p><h1>Every workspace<span>.</span></h1><div style="margin-top:28px">${O.clients.map(row).join('') || '<div class="empty"><b>No clients yet.</b>Press <span class="mono">N</span>.</div>'}</div></div>`; }
function activity() { return `<div class="page"><p class="eyebrow mono">Activity</p><h1>What happened<span>.</span></h1><div class="card" style="margin-top:28px;padding:6px 18px">${feed(60)}</div></div>`; }

/* ---------- new client ---------- */
function newClient() {
  modal(`<h3>New client workspace</h3><p class="small">They sign in with the email and a code we generate. They never choose a password.</p>
    <form id="nc" class="fgrid"><div class="fld full"><label>Client or company</label><input class="in" name="name" required placeholder="Origin Circle"></div>
    <div class="fld full"><label>Brands (comma separated)</label><input class="in" name="brands" placeholder="Origin Circle, Lonely Mouth"></div>
    <div class="fld"><label>Contact name</label><input class="in" name="contactName" placeholder="Farah"></div><div class="fld"><label>Contact email (their login)</label><input class="in" name="contactEmail" type="email" required></div>
    <div class="fld full"><label>Other emails that can log in to the same workspace (optional, comma separated)</label><input class="in" name="extraEmails" placeholder="second@company.com"></div>
    <div class="fld"><label>Start date</label><input class="in" name="startDate" type="date"></div><div class="fld"><label>Monthly fee</label><input class="in" name="fee" type="number" value="1200"></div>
    <div class="fld"><label>Currency</label><select class="in" name="currency"><option>USD</option><option>EGP</option><option>EUR</option><option>KWD</option></select></div><div class="fld"><label>Accounts wording</label><input class="in" name="accounts" placeholder="two ad accounts"></div>
    <div class="full err" id="ncerr" style="color:var(--red)"></div><div class="full acts"><button class="btn green" type="submit">Create workspace</button><button type="button" class="btn ghost" data-close>Cancel</button></div></form>`, {
    onMount: (m, close) => {
      $('[data-close]', m).onclick = close;
      $('#nc', m).onsubmit = async e => {
        e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); f.brands = f.brands.split(',').map(x => x.trim()).filter(Boolean);
        try { const r = await api('POST', 'staff/clients', f); close(); await reload(); codeModal(r.client, r.code, true); nav('client', r.client.id); } catch (er) { $('#ncerr', m).textContent = er.message; }
      };
    },
  });
}
const loginMsg = (c, code) => `Hi ${c.contacts[0]?.name || ''},\n\nYour band. portal is ready: ${location.origin}/portal/\nEmail: ${c.contacts.map(x => x.email).join(" or ")}\nAccess code: ${code}\n\nEverything we need from you is in "Start here". Your agreement will appear there too.\n\nband.`;
function codeModal(c, code, fresh, mailed) {
  modal(`<h3>${fresh ? 'Workspace ready' : 'New access code'}</h3><p class="small" style="margin-bottom:14px">${mailed ? `${ic('check')} Emailed to ${esc(c.contacts.map(x => x.email).join(", "))}. You can also copy it below.` : `This code is shown once. We only store a hash. Send it to ${esc(c.contacts.map(x => x.email).join(", "))} over a private channel.`}</p>
    <div class="codebox">${esc(code)}</div><div class="acts"><button class="btn green" data-copyall>${ic('copy')} Copy the message to send</button><button class="btn" data-copycode>Copy code</button><button class="btn ghost" data-close>Done</button></div>`, {
    onMount: (m, close) => { $('[data-close]', m).onclick = close; $('[data-copycode]', m).onclick = () => copyText(code); $('[data-copyall]', m).onclick = () => copyText(loginMsg(c, code)); },
  });
}
/* ---------- email the client about the page you are on ---------- */
// each tab maps to the client's own page, with a ready message and what to include; staff edit both before sending
const plain = t => String(t).replace(/^#+\s*/gm, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\n{3,}/g, '\n\n').trim();
const bullet = l => l.length ? l.map(x => '- ' + x).join('\n') : '';
const money_ = (n, c) => `${Number(n || 0).toLocaleString('en-US')} ${c || C.client.currency || 'USD'}`;
function pageMail() {
  const c = C.client, first = c.contacts[0]?.name?.split(' ')[0] || 'there', hi = `Hi ${first},`, now = new Date().toISOString().slice(0, 10), studio = C.settings.studio;
  const todo = items(C).filter(i => i.owner !== 'staff' && i.required !== false && !(C.staff.hidden || []).includes(i.id) && !['submitted', 'verified', 'na'].includes(stateOf(C, i)));
  const k = C.contract || {}, up = C.events.filter(e => (e.end || e.start) >= now), P = C.staff.performance || [], inv = (C.staff.invoices || []).filter(x => x.status !== 'draft');
  const M = {
    agreement: ['agreement', k.status === 'signed' ? `Your signed agreement with ${studio}` : `Your agreement with ${studio}`,
      k.status === 'signed' ? `${hi}\n\nHere is a copy of the agreement you signed. You can download the signed PDF from the Agreement page in your portal any time.`
        : k.status === 'sent' ? `${hi}\n\nYour agreement is ready to sign. The full text is below. To sign, open the Agreement page in your portal, type your name and draw your signature.\n\nAny questions, just reply to this email.`
        : `${hi}\n\nHere is the draft of our agreement, with everything we agreed. Have a read and tell us if anything should change. Once you are happy with it, we will send it to your portal to sign.`,
      plain(k.status === 'signed' ? k.signedText : rend(k.text || ''))],
    checklist: ['start', 'What we still need from you', `${hi}\n\nTo get your ads running, these are the things we still need from you. Each one has the steps in "Start here" in your portal.`, bullet(todo.map(i => i.title))],
    answers: ['forms', 'Your forms', `${hi}\n\nA quick note about the forms in your portal.`, ''],
    feed: ['feed', `Updates from ${studio}`, `${hi}\n\nWe posted new updates for you in the portal.`, bullet((C.feed || []).slice(0, 5).map(p => p.title))],
    tickets: ['support', 'Your support tickets', `${hi}\n\nAn update on your tickets.`, bullet(C.tickets.filter(t => t.status !== 'closed').map(t => `#${t.no} ${t.subject} (${t.status === 'open' ? 'with us' : 'answered'})`))],
    meetings: ['meetings', 'Your calls with us', `${hi}\n\nHere are your upcoming calls with us. You can book or move a call from Meetings in your portal.`, bullet(C.meetings.filter(m => m.status === 'booked' && Date.parse(m.end) > Date.now()).map(m => `${new Date(m.start).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })} · ${m.topic}`))],
    events: ['events', 'Your upcoming events', `${hi}\n\nThese are the events we are planning your ads around. Add anything new under Events in your portal, the earlier the better.`, bullet(up.map(e => `${e.start}${e.end && e.end !== e.start ? ' to ' + e.end : ''} · ${e.title} (${({ new: 'received', planned: 'in our plan', live: 'ads running', done: 'done' })[e.status] || e.status})`))],
    results: ['results', 'Your ad results', `${hi}\n\nHere are your latest ad results. The charts are on Ads & results in your portal.`, bullet(P.slice(-6).reverse().map(x => `Week of ${x.date} · ${x.brand}: ${money_(x.spend)} spent, ${x.results} ${x.label || 'results'}${x.revenue ? `, ${money_(x.revenue)} revenue` : ''}`))],
    billing: ['invoices', 'Your invoices', `${hi}\n\nA note about your invoices. You can open each one from Invoices in your portal.`, bullet(inv.map(x => `${x.no || 'Invoice'} · ${money_(x.amount, x.currency)} · ${x.status === 'paid' ? 'paid' : 'due ' + (x.due || '')}`))],
    messages: ['messages', `A message from ${studio}`, `${hi}\n\n`, ''],
    settings: ['overview', `Your ${studio} portal`, `${hi}\n\nYour portal is at ${location.origin}/portal/. Sign in with ${c.contacts[0]?.email} and your access code.`, ''],
  };
  return M[tab] || M.settings;
}
const PAGE_NAMES = { overview: 'Overview', start: 'Start here', forms: 'Forms', agreement: 'Agreement', results: 'Ads & results', events: 'Events', invoices: 'Invoices', support: 'Support', meetings: 'Meetings', messages: 'Messages', feed: 'Updates' };
function mailPage() {
  const c = C.client, [page, subject, text, quote] = pageMail();
  if (!O.mail) return toast('Email is not connected yet. See Settings → Email.', true);
  const draft = tab === 'agreement' && C.contract?.status !== 'sent' && C.contract?.status !== 'signed';
  modal(`<h3>Email this page</h3><p class="small" style="margin-bottom:12px">From ${esc(C.settings.studioEmail)}. The email ends with a button that opens <b>${esc(PAGE_NAMES[page] || page)}</b> in their portal.${draft ? ' This agreement is still a draft: they can read it in the email, but they can only sign it after you press "Send to client".' : ''}</p>
    <div class="fld"><label>To</label><div class="daycb" style="flex-wrap:wrap">${c.contacts.map(x => `<label><input type="checkbox" data-mto value="${esc(x.email)}" checked>${esc(x.name ? `${x.name} · ${x.email}` : x.email)}</label>`).join('')}</div></div>
    <div class="fld" style="margin-top:12px"><label for="pm-s">Subject</label><input class="in" id="pm-s" value="${esc(subject)}"></div>
    <div class="fld" style="margin-top:12px"><label for="pm-t">Message</label><textarea class="in" id="pm-t" style="min-height:130px">${esc(text)}</textarea></div>
    <div class="fld" style="margin-top:12px"><label for="pm-q">From this page (shown in a box; clear it to leave it out)</label><textarea class="in mono" id="pm-q" style="min-height:${quote.length > 600 ? 260 : 110}px;font-size:12.5px">${esc(quote)}</textarea></div>
    <div class="acts"><button class="btn green" data-pmsend>${ic('send')} Send email</button><button class="btn ghost" data-close>Cancel</button></div>`, {
    onMount: (m, close) => {
      $('[data-close]', m).onclick = close; $('#pm-t', m).focus();
      $('[data-pmsend]', m).onclick = async e => {
        const to = $$('[data-mto]', m).filter(x => x.checked).map(x => x.value); if (!to.length) return toast('Pick at least one email.', true);
        e.currentTarget.disabled = true;
        try { const r = await api('POST', `staff/clients/${arg}/email`, { page, to, subject: $('#pm-s', m).value, text: $('#pm-t', m).value, quote: $('#pm-q', m).value }); close(); toast(`Emailed to ${r.to.join(', ')}`); }
        catch (er) { toast(er.message, true); e.currentTarget.disabled = false; }
      };
    },
  });
}
// reset a client's access code: the old one stops working; email the new one to them, or copy it and send it yourself
function resetCode() {
  const c = C.client, to = c.contacts.map(x => x.email).join(', ');
  modal(`<h3>Reset the access code</h3><p class="small" style="margin-bottom:14px">${esc(c.name)} signs in with <b>${esc(c.contacts[0]?.email)}</b>. A new code replaces the old one, which stops working straight away.</p>
    <div class="acts" style="flex-direction:column;align-items:stretch">${O.mail ? `<button class="btn green" data-rmail>${ic('send')} Reset and email it to ${esc(to)}</button>` : ''}<button class="btn" data-rself>${ic('key')} Reset, I will send it myself</button><button class="btn ghost" data-close>Cancel</button></div>`, {
    onMount: (m, close) => {
      $('[data-close]', m).onclick = close;
      const go = async email => { $$('button', m).forEach(b => b.disabled = true);
        try { const r = await api('POST', `staff/clients/${arg}/resetcode`, { email }); close(); codeModal(c, r.code, false, r.mailed); if (email && !r.mailed) toast('Reset, but the email failed. Copy the code and send it.', true); }
        catch (er) { toast(er.message, true); $$('button', m).forEach(b => b.disabled = false); } };
      $('[data-rmail]', m) && ($('[data-rmail]', m).onclick = () => go(true)); $('[data-rself]', m).onclick = () => go(false);
    },
  });
}
async function reload() { O = await api('GET', 'staff/overview'); }
async function reloadClient() { C = await api('GET', 'staff/clients/' + arg); await reload(); }

/* ---------- one client ---------- */
const TABS = [['checklist', 'Checklist'], ['answers', 'Answers'], ['feed', 'Updates'], ['tickets', 'Tickets'], ['meetings', 'Meetings'], ['events', 'Events'], ['agreement', 'Agreement'], ['results', 'Results'], ['billing', 'Billing'], ['messages', 'Messages'], ['settings', 'Settings']];
function client() {
  const s = C.summary;
  return `<div class="page wide"><div class="hero-s"><div><p class="eyebrow mono">${brandChips(C.client)} · ${esc(C.client.status)}</p><h1>${esc(C.client.name)}<span>.</span></h1><div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">${cpill(s.contract)}<span class="pillx">${s.done}/${s.total} sent</span><span class="pillx ok">${s.verified} verified</span>${s.awaiting ? `<span class="pillx warn">${s.awaiting} to review</span>` : ''}${s.help ? `<span class="pillx bad">${s.help} need help</span>` : ''}</div><div class="acts" style="margin-top:14px"><button class="btn sm dark" data-filepdf>${ic('down')} Download client data (PDF)</button><button class="btn sm" data-reset>${ic('key')} Reset access code</button></div></div><div class="ring" style="--p:${pctOf(s)}"><div><b>${pctOf(s)}%</b></div></div></div>
    <div class="tabs">${TABS.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-tab="${k}">${l}${(k === 'tickets' && C.summary.tickets) || (k === 'events' && C.summary.events) ? ` <span class="mono" style="color:var(--green)">${C.summary[k]}</span>` : ''}</button>`).join('')}<button class="btn sm ghost" data-mailpage style="margin-left:auto">${ic('send')} Email this page</button></div><div id="tabbody" style="margin-top:22px">${({ checklist, answers, feed: cfeed, tickets: ctickets, meetings: cmeetings, events: cevents, agreement, results, billing, messages, csettings })[tab === 'settings' ? 'csettings' : tab]?.() || ''}</div></div>`;
}
const ansVal = v => /^https?:\/\//.test(v) ? `<a href="${esc(v)}" target="_blank" rel="noopener" style="color:var(--green)">${esc(v)}</a>` : esc(v === true ? 'Yes' : v);
function checklist() {
  const hidden = C.staff.hidden || [], groups = T.groups.map(g => [g, items(C).filter(i => i.group === g.id)]).filter(([, l]) => l.length);
  return `<div class="acts" style="margin:0 0 6px"><button class="btn sm" data-addItem>${ic('plus')} Add an item for this client</button></div>` + groups.map(([g, l]) => `<div class="grp"><div class="sh"><h2>${esc(g.title)}</h2></div>${l.map(i => {
    const hid = hidden.includes(i.id), s = stateOf(C, i), a = C.answers.checklist[i.id] || {}, ver = C.staff.verify[i.id] || {}, [lab, tone] = STATE[s];
    return `<div class="item s-${s} ${open.has(i.id) ? 'open' : ''}" data-item="${esc(i.id)}" style="${hid ? 'opacity:.45' : ''}"><header data-toggle="${esc(i.id)}"><span class="dot">${ic('check')}</span><h4>${esc(i.title)}<small>${esc(KIND[i.kind] || '')}${i.required === false ? ' · optional' : ''}${hid ? ' · hidden from client' : ''}${i.owner === 'staff' ? ' · we do this' : ''}</small></h4><span class="pillx ${tone}">${lab}</span></header>
    <div class="body">${i.owner === 'staff' ? `<div class="acts"><button class="btn sm ${s === 'verified' ? '' : 'green'}" data-auto="${esc(i.id)}">${s === 'verified' ? 'Mark not done' : 'Mark done'}</button></div>`
      : i.id === 'sign' ? `<p class="why">Agreement is <b>${C.contract?.status}</b>. Manage it in the Agreement tab.</p>` : `${Object.keys(a.fields || {}).length || a.note ? `<dl class="ans">${(i.fields || []).filter(f => a.fields?.[f.id]).map(f => `<dt>${esc(f.label)}</dt><dd>${ansVal(a.fields[f.id])}</dd>`).join('')}${a.note ? `<dt>Their note</dt><dd>${esc(a.note)}</dd>` : ''}</dl>` : '<p class="small">Nothing from them yet.</p>'}
      <div class="verify"><input class="in" style="flex:1;min-width:200px;height:38px" data-vc placeholder="Comment shown to the client (optional)" value="${esc(ver.comment || '')}"><button class="btn sm green" data-verify="verified">Verify</button><button class="btn sm danger" data-verify="needs-fix">Needs a fix</button><button class="btn sm ghost" data-verify="">Clear</button></div>`}
      <div class="acts" style="margin-top:16px"><button class="btn sm ghost" data-hide="${esc(i.id)}">${hid ? 'Show to client' : 'Hide from this client'}</button>${i.custom || C.staff.customItems?.some(x => x.id === i.id) ? `<button class="btn sm ghost danger" data-rmitem="${esc(i.id)}">Remove item</button>` : ''}</div></div></div>`;
  }).join('')}</div>`).join('');
}
function answers() {
  const forms = T.forms.flatMap(f => f.perBrand ? C.client.brands.map(b => ({ f, key: `${f.id}:${b.id}`, title: `${f.title} · ${b.name}` })) : [{ f, key: f.id, title: f.title }]);
  return forms.map(({ f, key, title }) => { const v = C.answers.forms[key] || {}, has = f.fields.some(x => v[x.id]); return `<div class="card" style="margin-bottom:12px"><h3>${esc(title)} ${has ? '' : '<span class="pillx">empty</span>'}</h3>${has ? `<dl class="ans">${f.fields.filter(x => v[x.id]).map(x => `<dt>${esc(x.label)}</dt><dd>${ansVal(v[x.id])}</dd>`).join('')}</dl>` : ''}</div>`; }).join('');
}

/* tickets for this client: the list, or one thread with the reply box */
function ctickets() {
  const t = C.tickets.find(x => x.id === sub);
  if (!t) {
    const op = C.tickets.filter(x => x.status !== 'closed'), cl = C.tickets.filter(x => x.status === 'closed');
    return (op.map(x => trow(x, C.client.id)).join('') || '<div class="empty"><b>No open tickets.</b>The client opens them from Support in their portal.</div>') +
      (cl.length ? `<div class="sh" style="margin-top:26px"><h2>Solved<em>${cl.length}</em></h2></div>${cl.map(x => trow(x, C.client.id)).join('')}` : '');
  }
  const [lab, tone] = TST[t.status];
  return `<div style="max-width:820px"><button class="btn sm ghost" data-tab="tickets">${ic('back')} All tickets</button>
    <h2 style="margin-top:16px;font-size:24px;letter-spacing:-.02em">#${t.no} · ${esc(t.subject)}</h2>
    <div class="tk-head"><span class="pillx ${tone}">${lab}</span><span class="pillx">${esc(CATS[t.cat] || '')}</span>${t.priority === 'urgent' ? '<span class="pillx bad">urgent</span>' : ''}<span class="small">Opened ${esc(day(t.at))} by ${esc(t.by)}</span>
      <span style="flex:1"></span><select class="in" data-tkstatus="${esc(t.id)}" style="width:auto;height:34px">${Object.entries(TST).map(([k, [l]]) => `<option value="${k}" ${k === t.status ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="thread" style="margin-top:22px">${t.thread.map(m => `<div class="msg ${m.from === 'staff' ? 'me' : ''}"><small>${esc(m.name)} · ${esc(day(m.at))} ${esc(new Date(m.at).toTimeString().slice(0, 5))}</small>${esc(m.text)}</div>`).join('')}</div>
    <div class="fld"><textarea class="in" id="tkReply" style="min-height:120px" placeholder="Reply to ${esc(C.client.name)}. They get it by email too."></textarea></div>
    <div class="acts"><button class="btn dark" data-tkreply="${esc(t.id)}">${ic('send')} Send reply</button><button class="btn green" data-tkreply="${esc(t.id)}" data-andclose="1">${ic('check')} Send and close</button></div></div>`;
}
function cmeetings() {
  const now = Date.now(), up = C.meetings.filter(m => m.status === 'booked' && Date.parse(m.end) > now).sort((a, b) => a.start.localeCompare(b.start)), rest = C.meetings.filter(m => !up.includes(m));
  return (up.map(m => mrow(m)).join('') || '<div class="empty"><b>No calls booked.</b>The client books from Meetings in their portal.</div>') +
    (rest.length ? `<div class="sh" style="margin-top:26px"><h2>Earlier and cancelled</h2></div>${rest.map(m => mrow(m, false, true)).join('')}` : '');
}

/* updates feed: posts for one client, or for every client. Written in a modal, shown as cards. */
const KINDF = { update: ['Update', ''], result: ['Result', 'live'], news: ['News', 'dark'], tip: ['Tip', 'ok'], 'heads-up': ['Heads-up', 'warn'] };
const pcard = p => `<article class="post ${p.pinned ? 'pinned' : ''}" data-post="${esc(p.target)}/${esc(p.id)}"><div class="ph"><span class="pillx ${KINDF[p.kind]?.[1] || ''}">${KINDF[p.kind]?.[0] || 'Update'}</span>
  <span class="pillx ${p.target === 'all' ? '' : 'ok'}">${p.target === 'all' ? 'All clients' : esc(p.client || C?.client.name || '')}${p.brand ? ' · ' + esc(p.brand) : ''}</span>${p.pinned ? `<span class="pillx dark">${ic('pin')} Pinned</span>` : ''}
  <span class="small">${esc(p.by)} · ${esc(day(p.at))}${p.edited ? ' · edited' : ''}</span></div>
  <h3>${esc(p.title)}</h3>${p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy">` : ''}<div class="pb">${esc(p.body)}</div>
  ${p.link ? `<p class="small" style="margin-top:10px">Button: <a href="${esc(p.link)}" target="_blank" rel="noopener" style="color:var(--green);font-weight:700">${esc(p.linkLabel || 'Open')}</a></p>` : ''}
  <div class="acts"><button class="btn sm" data-pedit>${ic('edit')} Edit</button><button class="btn sm ghost" data-ppin>${ic('pin')} ${p.pinned ? 'Unpin' : 'Pin to top'}</button><button class="btn sm ghost danger" data-pdel>${ic('trash')} Remove</button></div></article>`;
function updates() {
  return `<div class="page"><p class="eyebrow mono">Updates</p><h1>Tell clients<span> what is happening.</span></h1><p class="lead">Post to one client for news about their ads and brand, or to all clients for studio news and tips. Each client sees theirs under Updates in the portal.</p>
    <div class="acts" style="margin-top:20px"><button class="btn green" data-pnew="">${ic('plus')} New post</button></div>
    <div class="sec">${FEED.map(pcard).join('') || '<div class="empty"><b>Nothing posted yet.</b>Write the first update.</div>'}</div></div>`;
}
function cfeed() {
  return `<div class="acts" style="margin:0 0 14px"><button class="btn sm green" data-pnew="${esc(C.client.id)}">${ic('plus')} New post for ${esc(C.client.name)}</button><span class="small">Below: what ${esc(C.client.name)} sees, including posts for all clients.</span></div>` +
    (C.feed.map(p => pcard({ ...p, client: C.client.name })).join('') || '<div class="empty"><b>Nothing posted for them yet.</b></div>');
}
const postList = () => route === 'feed' ? FEED : C.feed;
function composer(target, p) {
  const brands = target && target !== 'all' ? (O.clients.find(c => c.id === target)?.brands || []) : [];
  modal(`<h3>${p ? 'Edit post' : 'New post'}</h3><form id="pf" class="fgrid" style="margin-top:12px">
    <div class="fld"><label>For</label><select class="in" name="target" ${p ? 'disabled' : ''}><option value="all">All clients</option>${O.clients.map(c => `<option value="${esc(c.id)}" ${c.id === target ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
    <div class="fld"><label>Kind</label><select class="in" name="kind">${Object.entries(KINDF).map(([k, [l]]) => `<option value="${k}" ${k === p?.kind ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="fld full"><label>Title</label><input class="in" name="title" required maxlength="140" value="${esc(p?.title || '')}" placeholder="e.g. Your winter ads are live"></div>
    <div class="fld full"><label>Post</label><textarea class="in" name="body" required style="min-height:150px" placeholder="What happened, what it means for them, what comes next.">${esc(p?.body || '')}</textarea></div>
    <div class="fld"><label>Brand (optional)</label><input class="in" name="brand" list="pf-b" value="${esc(p?.brand || '')}"><datalist id="pf-b">${brands.map(b => `<option value="${esc(b.name)}">`).join('')}</datalist></div>
    <div class="fld"><label>Image URL (optional)</label><input class="in" name="image" type="url" value="${esc(p?.image || '')}" placeholder="https://"></div>
    <div class="fld"><label>Button link (optional)</label><input class="in" name="link" type="url" value="${esc(p?.link || '')}" placeholder="https://"></div>
    <div class="fld"><label>Button text</label><input class="in" name="linkLabel" maxlength="40" value="${esc(p?.linkLabel || '')}" placeholder="See the ad"></div>
    <label class="chk full"><input type="checkbox" name="pinned" ${p?.pinned ? 'checked' : ''}><span>Pin to the top of their feed</span></label>
    ${p ? '' : '<label class="chk full"><input type="checkbox" name="email"><span>Also email it to them</span></label>'}
    <div class="full err" id="pferr" style="color:var(--red)"></div><div class="full acts"><button class="btn green" type="submit">${p ? 'Save' : 'Post'}</button><button type="button" class="btn ghost" data-close>Cancel</button></div></form>`, {
    onMount: (m, close) => {
      $('[data-close]', m).onclick = close;
      $('#pf', m).onsubmit = async e => {
        e.preventDefault(); const f = new FormData(e.target), b = Object.fromEntries(f); b.pinned = f.has('pinned'); b.email = f.has('email'); b.target = p ? p.target : b.target;
        try { await api(p ? 'PUT' : 'POST', 'staff/post', p ? { ...b, id: p.id } : b); close(); toast(p ? 'Saved' : b.email ? 'Posted and emailed' : 'Posted'); refreshFeed(); } catch (er) { $('#pferr', m).textContent = er.message; }
      };
    },
  });
}
async function refreshFeed() { if (route === 'feed') FEED = (await api('GET', 'staff/feed')).posts; else await reloadClient(); stay(); }

/* the client's events: launches, sales, openings. We set where each one stands and can leave them a note. */
const EST = { new: ['New', 'warn'], planned: ['In our plan', 'ok'], live: ['Ads running', 'live'], done: ['Done', ''] };
const dShort = (s, o = {}) => new Date(s + 'T12:00:00Z').toLocaleDateString('en-GB', { timeZone: 'UTC', ...o });
const evSpan = e => e.end && e.end !== e.start ? `${dShort(e.start, { day: 'numeric', month: 'short' })} – ${dShort(e.end, { day: 'numeric', month: 'short', year: 'numeric' })}` : dShort(e.start, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
// when something happened, to the minute, in the viewer's own time
const at = iso => iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
const edited = e => e.updated && e.at && Date.parse(e.updated) - Date.parse(e.at) > 60e3;
// the conversation on an event; for our replies, whether the email went out and whether the client has opened it since
const evThread = e => {
  const list = e.replies || (e.comment ? [{ from: 'staff', name: 'band.', text: e.comment, at: e.seen || e.at }] : []);
  if (!list.length) return '';
  return `<div class="thread" style="margin:12px 0 0">${list.map(r => `<div class="msg ${r.from === 'staff' ? 'me' : ''}"><small>${esc(r.name)} · ${esc(at(r.at))}</small>${esc(r.text)}${r.from === 'staff' ? `<small class="evdeliv">${
    r.mailed ? `${ic('check')} Emailed to ${esc((r.mailedTo || []).join(', '))}` : r.mailed === false ? `${ic('alert')} Not emailed${O.mail ? ' (Gmail refused it)' : ' (email not connected)'}: they see it in the portal` : 'Shown in the portal'}${
    e.clientSeen && e.clientSeen >= r.at ? ` · seen by the client ${esc(at(e.clientSeen))}` : ' · not opened by the client yet'}</small>` : ''}</div>`).join('')}</div>`;
};
const erow = (e, withClient, past) => `<div class="meet ev ${past ? 'past' : ''} ${!withClient && sub === e.id ? 'focus' : ''}" id="ev-${esc(e.id)}" ${withClient ? `data-evc="${esc(e.cid)}/${esc(e.id)}" style="cursor:pointer"` : ''}><div class="d"><span>${dShort(e.start, { month: 'short' })}</span><b>${dShort(e.start, { day: 'numeric' })}</b><span>${dShort(e.start, { weekday: 'short' })}</span></div>
  <div class="n"><b>${withClient ? esc(e.client) + ' · ' : ''}${esc(e.title)}</b><span class="small">${esc(evSpan(e))}${e.brand ? ' · ' + esc(e.brand) : ''}</span>
    <span class="small evsub">Submitted ${esc(at(e.at))} by ${esc(e.by)}${edited(e) ? ` · last changed ${esc(at(e.updated))}` : ''}</span>
    <div class="tk-head" style="margin-top:8px">${e.segment ? `<span class="pillx dark">${esc(e.segment)}</span>` : ''}<span class="pillx ${EST[e.status][1]}">${EST[e.status][0]}</span>${(e.replies || []).at(-1)?.from === 'client' ? '<span class="pillx warn">Client replied · waiting on us</span>' : ''}${(e.replies || []).length ? `<span class="pillx">${e.replies.length} repl${e.replies.length > 1 ? 'ies' : 'y'}</span>` : ''}</div>
    ${withClient ? '' : `${e.description ? `<p class="desc">${esc(e.description)}</p>` : ''}${e.audience || e.offer ? `<p class="small" style="margin-top:6px">${e.audience ? `<strong>For:</strong> ${esc(e.audience)}` : ''}${e.audience && e.offer ? ' · ' : ''}${e.offer ? `<strong>Offer:</strong> ${esc(e.offer)}` : ''}</p>` : ''}${e.link ? `<a class="small" href="${esc(e.link)}" target="_blank" rel="noopener" style="color:var(--green);font-weight:700">${esc(e.link)}</a>` : ''}
    ${evThread(e)}
    <div class="evreply" data-ev="${esc(e.id)}"><textarea class="in" data-evtx placeholder="Reply to ${esc(e.by)}. It goes to the portal and to their email."></textarea>
      <div class="acts" style="margin-top:8px"><select class="in" data-evst style="width:auto;height:38px">${Object.entries(EST).map(([k, [l]]) => `<option value="${k}" ${k === e.status ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <button class="btn sm dark" data-evsend>${ic('send')} Send reply</button><button class="btn sm ghost" data-evsave>Save status only</button></div></div>`}</div></div>`;
function cevents() {
  const now = new Date().toISOString().slice(0, 10), up = C.events.filter(e => (e.end || e.start) >= now), past = C.events.filter(e => !up.includes(e)).reverse();
  return (up.map(e => erow(e)).join('') || '<div class="empty"><b>No events coming up.</b>The client adds them under Events in their portal.</div>') +
    (past.length ? `<div class="sh" style="margin-top:26px"><h2>Past</h2></div>${past.map(e => erow(e, false, true)).join('')}` : '');
}

/* agreement editor: the text on the left, the client's view on the right */
const fmtD = d => { try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return ''; } };
const list = a => a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
const vars = () => {
  const c = C.client, s = C.settings, P = c.party || {}, L = s.legal || {}, pv = k => String(P[k] || '').trim() || BLANK, lv = k => String(L[k] || '').trim() || '[to be confirmed]';
  return { studio: s.studio, client: c.name, brands: list(c.brands.map(b => b.name)) || c.name, start: fmtD(c.startDate) || '[start date]', fee: Number(c.fee || 0).toLocaleString('en-US'), currency: c.currency || 'USD', accounts: c.accounts || `${c.brands.length || 1} ad account${c.brands.length > 1 ? 's' : ''}`, law: c.law || s.governingLaw,
    studioLegal: lv('name'), studioForm: lv('form'), studioOwner: lv('owner'), studioReg: lv('reg'), studioTax: lv('tax'), studioAddress: lv('address'), studioEmail: s.studioEmail,
    partyName: pv('name'), partyForm: pv('form'), partyCountry: pv('country'), partyReg: pv('reg'), partyTax: String(P.tax || '').trim() || 'not applicable', partyAddress: pv('address'), partySigner: pv('signer'), partySignerTitle: pv('signerTitle'), partyEmail: pv('email') };
};
const rend = t => String(t).replace(/\{\{(\w+)\}\}/g, (_, k) => vars()[k] ?? `{{${k}}}`);
/* ---------- legal details on the agreement tab: the client's company, the studio's papers, pages signed by hand ---------- */
const partyBox = () => {
  const p = C.client.party || {}, ok = partyOk(p), k = C.contract || {}, sg = k.signature, docs = C.settings.legalDocs || [];
  return `<div class="card" style="margin-bottom:16px"><div class="sh"><h2>The client's company<em>${ok ? 'filled in' : p.name ? 'partly filled in' : 'they fill this in before signing'}</em></h2>${k.status === 'signed' ? '' : `<button class="btn sm" data-pfstaff>${ic('edit')} ${p.name ? 'Edit' : 'Fill in for them'}</button>`}</div>
    ${p.name ? `<div class="kv">${PARTY_F.filter(([key]) => p[key]).map(([key, l]) => `<div><span>${l}</span><b>${esc(p[key])}</b></div>`).join('')}</div>` : '<p class="small">When you send the agreement, the client sees boxes for these details. What they type goes straight into the text, and they can only sign once it is complete.</p>'}
    <p class="small" style="margin-top:12px">Attached to every agreement: ${docs.length ? docs.map((d, i) => `Annex ${i + 1}, ${esc(d.title)}`).join(' · ') : 'nothing yet'}. <a data-nav="settings" style="color:var(--green);cursor:pointer">Change in Settings</a></p>
    ${sg?.method === 'hand' ? `<div class="sh" style="margin-top:16px"><h2>Signed by hand<em>${(sg.files || []).length} page${(sg.files || []).length > 1 ? 's' : ''}</em></h2></div><div class="hthumbs">${(sg.files || []).map((id, i) => `<figure><img data-file="${esc(id)}" alt="Page ${i + 1}"><figcaption>Page ${i + 1}</figcaption></figure>`).join('')}</div>` : ''}
    ${k.status === 'sent' && (k.handPending || []).length ? `<p class="small" style="margin-top:12px">${ic('clock')} They have uploaded ${k.handPending.length} signed page${k.handPending.length > 1 ? 's' : ''} and not submitted them yet.</p>` : ''}</div>`;
};
function partyModal() {
  modal(`<h3>${esc(C.client.name)}: company details</h3><p class="small" style="margin-bottom:12px">These go straight into the agreement. The client can change them until they sign.</p>${partyFields(C.client.party || {})}
    <div class="acts"><button class="btn green" data-pfok>${ic('check')} Save</button><button class="btn ghost" data-close>Cancel</button></div>`, {
    onMount: (m, close) => {
      $('[data-close]', m).onclick = close;
      $('[data-pfok]', m).onclick = async e => {
        e.currentTarget.disabled = true;
        try { await api('PUT', `staff/clients/${arg}/party`, readParty(m)); close(); await reloadClient(); toast('Saved into the agreement'); stay(); }
        catch (er) { toast(er.message, true); e.currentTarget.disabled = false; }
      };
    },
  });
}
// the studio's own legal details and papers, used in every agreement
const LEGAL = [['name', 'Legal name of the business'], ['form', 'Legal form'], ['owner', 'Owner / who signs'], ['reg', 'Commercial register no.'], ['tax', 'Tax registration no.'], ['address', 'Office address']];
const legalCard = () => { const L = O.settings.legal || {}, docs = O.settings.legalDocs || []; return `<div class="card" style="margin-top:14px"><h3>Our legal details</h3><p class="small">Used in the Parties section of every agreement, as {{studioLegal}}, {{studioReg}}, {{studioTax}}, {{studioAddress}} and so on. An agreement cannot be sent while one is empty.</p>
  <div class="fgrid" style="margin-top:12px">${LEGAL.map(([k, l]) => `<div class="fld ${k === 'address' || k === 'name' ? 'full' : ''}"><label>${l}</label><input class="in" data-legal="${k}" value="${esc(L[k] || '')}"></div>`).join('')}</div>
  <div class="acts"><button class="btn green sm" data-savelegal>Save legal details</button></div>
  <div class="sh" style="margin-top:18px"><h2>Attached to every agreement<em>shown as annexes, only to signed-in clients</em></h2></div>
  ${docs.map((d, i) => `<div class="ldoc"><img data-file="${esc(d.id)}" alt=""><div><b>Annex ${i + 1}: ${esc(d.title)}</b><span class="small">Kept in the portal's private storage, not on the public site.</span></div><button class="btn sm ghost danger" data-ldrm="${esc(d.id)}">${ic('trash')} Remove</button></div>`).join('') || '<p class="small">Nothing attached yet.</p>'}
  <div class="fgrid" style="grid-template-columns:1fr auto;align-items:end;margin-top:12px"><div class="fld"><label>Title</label><input class="in" id="ld-title" placeholder="e.g. Extract of the commercial register"></div><label class="btn sm">${ic('plus')} Add a photo or PDF<input type="file" id="ld-file" accept="image/*,application/pdf" hidden></label></div></div>`; };
function legalFile() {
  const inp = $('#ld-file'); if (!inp) return;
  inp.onchange = async () => {
    const f = inp.files[0]; inp.value = ''; if (!f) return;
    try { toast('Uploading…'); const data = await fileData(f); O.settings = await api('POST', 'staff/legaldoc', { title: $('#ld-title').value || f.name.replace(/\.[^.]+$/, ''), data }); toast('Attached to every agreement'); stay(); }
    catch (er) { toast(er.message, true); }
  };
}
const annexData = () => Promise.all((C.settings.legalDocs || []).map(d => getFile('staff', d.id).then(f => ({ title: d.title, data: f.data }))));
function agreement() {
  const k = C.contract, signed = k.status === 'signed', c = C.client;
  return `<div class="card" style="margin-bottom:16px"><div class="fgrid" style="grid-template-columns:repeat(5,1fr);margin:0">${[['fee', 'Monthly fee', c.fee, 'number'], ['currency', 'Currency', c.currency, 'text'], ['accounts', 'Accounts wording', c.accounts, 'text'], ['startDate', 'Start date', c.startDate, 'date'], ['law', 'Governing law', c.law || C.settings.governingLaw, 'text']].map(([n, l, v, t]) => `<div class="fld"><label>${l}</label><input class="in" data-cv="${n}" type="${t}" value="${esc(v ?? '')}" ${signed ? 'disabled' : ''}></div>`).join('')}</div>
    <div class="acts"><span class="pillx ${signed ? 'live' : k.status === 'sent' ? 'warn' : ''}">${k.status}</span><span class="sp" style="flex:1"></span>
    ${signed ? `<button class="btn sm dark" data-spdf>${ic('down')} Signed PDF</button>${k.countersign ? `<span class="small">Countersigned by ${esc(k.countersign.name)}</span>` : '<button class="btn sm green" data-counter>Countersign</button>'}`
      : `<button class="btn sm" data-csave>Save text</button>${k.status === 'sent' ? '<button class="btn sm" data-creopen>Take back to draft</button>' : '<button class="btn sm green" data-csend>Send to client</button>'}`}<button class="btn sm ghost danger" data-cvoid>${k.status === 'void' ? 'Void' : 'Void'}</button></div></div>
    ${signed ? `<div class="signed" style="margin-bottom:16px"><h3>${ic('check')} Signed by ${esc(k.signature.name)}</h3><p class="small" style="color:inherit;margin-top:4px">${esc(new Date(k.signature.at).toUTCString())} · from ${esc(k.signature.ip)}</p><div class="hash">${esc(k.signature.docHash)}</div></div>` : ''}
    ${partyBox()}
    <div class="split"><div><div class="lbl" style="margin-bottom:8px">Text · variables like {{client}} {{fee}} {{partyName}} are filled in</div><textarea class="in mono" id="ctext" style="min-height:640px;font-size:12.5px;line-height:1.6" ${signed ? 'disabled' : ''}>${esc(signed ? k.signedText : k.text)}</textarea></div>
    <div><div class="lbl" style="margin-bottom:8px">What the client sees</div><article class="paper" id="cprev" style="padding:28px;max-height:640px;overflow:auto;font-size:14px">${md(signed ? k.signedText : rend(k.text))}</article></div></div>`;
}
function results() {
  const P = C.staff.performance, brands = C.client.brands.map(b => b.name), T_ = C.staff.timeline, ads = C.staff.ads;
  return `<div class="card"><div class="sh"><h2>Weekly results<em>from the ad account</em></h2><div class="acts" style="margin:0"><button class="btn sm" data-add="performance">${ic('plus')} Add a week</button><button class="btn sm green" data-save="performance">Save</button></div></div>
    <p class="small" style="margin:-6px 0 12px">One row per brand per week. Clients see these as charts. Meta numbers are typed in here for now.</p>
    ${editor('performance', [{ k: 'date', l: 'Week of', t: 'date' }, { k: 'brand', l: 'Brand', t: 'select', o: brands }, { k: 'spend', l: 'Spend', t: 'number' }, { k: 'results', l: 'Results', t: 'number' }, { k: 'label', l: 'Unit', t: 'text' }, { k: 'revenue', l: 'Revenue', t: 'number' }, { k: 'note', l: 'Note', t: 'text' }], P)}
    ${P.length ? `<div style="margin-top:18px">${chart(P, { label: P.at(-1).label })}</div>` : ''}</div>
    <div class="card" style="margin-top:14px"><div class="sh"><h2>Ads</h2><div class="acts" style="margin:0"><button class="btn sm" data-add="ads">${ic('plus')} Add an ad</button><button class="btn sm green" data-save="ads">Save</button></div></div>
    ${editor('ads', [{ k: 'name', l: 'Name', t: 'text' }, { k: 'brand', l: 'Brand', t: 'select', o: brands }, { k: 'status', l: 'Status', t: 'select', o: ['draft', 'review', 'live', 'paused', 'ended'] }, { k: 'link', l: 'Link to the ad', t: 'url' }, { k: 'thumb', l: 'Thumbnail URL', t: 'url' }, { k: 'note', l: 'Note', t: 'text' }], ads)}</div>
    <div class="card" style="margin-top:14px"><div class="sh"><h2>Dashboard and timeline</h2><button class="btn sm green" data-save="meta">Save</button></div>
    <div class="fld"><label>Live dashboard URL (Looker Studio, Meta, anything)</label><input class="in" id="dashUrl" type="url" value="${esc(C.staff.dashboardUrl)}" placeholder="https://"></div>
    <div style="margin-top:14px">${editor('timeline', [{ k: 'weeks', l: 'Weeks', t: 'text' }, { k: 'title', l: 'Stage', t: 'text' }, { k: 'state', l: 'State', t: 'select', o: ['todo', 'now', 'done'] }, { k: 'body', l: 'What happens', t: 'text' }], T_, true)}</div></div>`;
}
function billing() {
  return `<div class="card"><div class="sh"><h2>Invoices</h2><div class="acts" style="margin:0"><button class="btn sm" data-add="invoices">${ic('plus')} Add</button><button class="btn sm green" data-save="invoices">Save</button></div></div>
    ${editor('invoices', [{ k: 'no', l: 'Number', t: 'text' }, { k: 'amount', l: 'Amount', t: 'number' }, { k: 'currency', l: 'Cur.', t: 'text' }, { k: 'due', l: 'Due', t: 'date' }, { k: 'status', l: 'Status', t: 'select', o: ['draft', 'due', 'paid'] }, { k: 'link', l: 'Link to PDF', t: 'url' }, { k: 'note', l: 'Note', t: 'text' }], C.staff.invoices)}</div>
    <div class="card" style="margin-top:14px"><div class="sh"><h2>Shared links</h2><div class="acts" style="margin:0"><button class="btn sm" data-add="links">${ic('plus')} Add</button><button class="btn sm green" data-save="links">Save</button></div></div>
    ${editor('links', [{ k: 'label', l: 'Label', t: 'text' }, { k: 'url', l: 'URL', t: 'url' }, { k: 'kind', l: 'Kind', t: 'text' }], C.staff.links)}</div>`;
}
function messages() {
  return `<div class="thread">${C.msgs.map(m => `<div class="msg ${m.from === 'staff' ? 'me' : ''}"><small>${esc(m.name)} · ${esc(day(m.at))} ${ago(m.at)}</small>${esc(m.text)}</div>`).join('') || '<div class="empty"><b>No messages.</b></div>'}</div>
    <div class="fld"><textarea class="in" id="msgText" placeholder="Reply to ${esc(C.client.name)}…"></textarea></div><div class="acts"><button class="btn dark" data-send>${ic('send')} Send</button></div>`;
}
const ctRow = (x, i) => `<div class="fgrid ctrow" data-was="${esc(x.email)}" style="grid-template-columns:1fr 1.4fr auto;align-items:end;margin-top:8px"><div class="fld"><label>${i ? 'Name' : 'Name · login'}</label><input class="in" data-ctn value="${esc(x.name)}"></div><div class="fld"><label>Email</label><input class="in" data-cte type="email" value="${esc(x.email)}"></div><button class="btn sm ghost danger" data-ctdel aria-label="Remove">${ic('trash')}</button></div>`;
function csettings() {
  const c = C.client;
  return `<div class="card"><h3>Workspace</h3><div class="fgrid"><div class="fld"><label>Name</label><input class="in" id="cs-name" value="${esc(c.name)}"></div><div class="fld"><label>Status</label><select class="in" id="cs-status">${['invited', 'active', 'paused', 'closed'].map(s => `<option ${s === c.status ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
    <div class="fld full"><label>Brands (one per line)</label><textarea class="in" id="cs-brands">${esc(c.brands.map(b => b.name).join('\n'))}</textarea></div></div><div class="acts"><button class="btn green sm" data-savecs>Save</button></div></div>
    <div class="card" style="margin-top:14px"><h3>Private notes</h3><p class="small">Only staff see these.</p><textarea class="in" id="cs-notes" style="margin-top:10px;min-height:140px">${esc(C.staff.notes)}</textarea><div class="acts"><button class="btn green sm" data-savenotes>Save notes</button></div></div>
    <div class="card" style="margin-top:14px"><h3>People and emails</h3><p class="small">The first email is their login. Every email here gets our replies and notifications. Change one and the login, their events and their tickets move to the new address; we email the new address to say so.</p>
      <div id="cts" style="margin-top:12px">${c.contacts.map((x, i) => ctRow(x, i)).join('')}</div>
      <div class="acts"><button class="btn sm ghost" data-ctadd>${ic('plus')} Add an email</button><button class="btn green sm" data-ctsave>Save emails</button></div></div>
    <div class="card" style="margin-top:14px"><h3>Access</h3><p class="small">Login: <b>${esc(c.contacts[0]?.email)}</b>. Codes are stored as hashes, so we cannot show the old one. Make a new one if it is lost; the old one stops working.</p><div class="acts"><button class="btn sm" data-reset>${ic('key')} Make a new access code</button></div></div>
    <div class="card" style="margin-top:14px"><h3 style="color:var(--red)">Delete workspace</h3><p class="small">Removes everything: answers, signed agreement, results. This cannot be undone.</p><div class="acts"><button class="btn sm danger" data-del>${ic('trash')} Delete ${esc(c.name)}</button></div></div>`;
}
function settings() {
  const s = O.settings, b = bk();
  return `<div class="page"><p class="eyebrow mono">Settings</p><h1>The studio<span>.</span></h1><div class="card" style="margin-top:28px"><div class="fgrid">
    <div class="fld"><label>Studio name</label><input class="in" id="st-studio" value="${esc(s.studio)}"></div><div class="fld"><label>Studio email</label><input class="in" id="st-email" value="${esc(s.studioEmail)}"></div>
    <div class="fld full"><label>Our Meta Business ID (shown to clients in “Add band. as a partner”)</label><input class="in" id="st-bm" inputmode="numeric" value="${esc(s.bandBmId)}" placeholder="16-digit number from Business settings"></div>
    <div class="fld"><label>Default governing law</label><input class="in" id="st-law" value="${esc(s.governingLaw)}"></div><div class="fld"><label>Agreement title</label><input class="in" id="st-title" value="${esc(s.contractTitle)}"></div></div>
    <div class="warnbox">${ic('alert')}<span>The default agreement text is a draft written for this service. Have a lawyer read it before the first client signs. Electronic signature rules depend on the country.</span></div>
    <div class="acts"><button class="btn green" data-savesettings>Save settings</button></div></div>
    ${legalCard()}
    <div class="card" style="margin-top:14px"><h3>Staff team</h3><p class="small">A personal code signs in under that person's own name, so the activity log says who did what. The code you set here is temporary: the first time they sign in, they have to choose their own.</p>${me.personal ? `<div class="acts" style="margin-top:10px"><button class="btn sm" data-mycode>${ic('key')} Change my code</button></div>` : ''}
    <div id="team" style="margin-top:12px"><p class="small">Loading…</p></div>
    <div class="fgrid" style="margin-top:14px;grid-template-columns:1fr 1fr auto;align-items:end"><div class="fld"><label>Name</label><input class="in" id="tm-name" autocomplete="off"></div><div class="fld"><label>Temporary code (6+ characters)</label><input class="in" id="tm-code" type="password" autocomplete="new-password"></div><button class="btn green" data-addstaff>${ic('plus')} Add</button></div></div>
    <div class="card" style="margin-top:14px"><h3>Calls clients can book</h3><p class="small">Clients see these hours under Meetings and pick a slot. Each booking emails ${esc(s.studioEmail)} a calendar invite. Times are ${esc(b.tz)} time.</p>
    <label class="chk" style="margin-top:14px"><input type="checkbox" id="bk-on" ${b.on ? 'checked' : ''}><span>Clients can book calls</span></label>
    <div class="fld" style="margin-top:14px"><label>Days</label><div class="daycb">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => `<label><input type="checkbox" data-bkday="${i}" ${b.days.includes(i) ? 'checked' : ''}>${d}</label>`).join('')}</div></div>
    <div class="fgrid" style="grid-template-columns:repeat(3,1fr)"><div class="fld"><label>From</label><input class="in" id="bk-from" type="time" value="${esc(b.from)}"></div><div class="fld"><label>Until</label><input class="in" id="bk-to" type="time" value="${esc(b.to)}"></div>
      <div class="fld"><label>Call length</label><select class="in" id="bk-len">${[15, 20, 30, 45, 60].map(n => `<option value="${n}" ${n === b.length ? 'selected' : ''}>${n} minutes</option>`).join('')}</select></div>
      <div class="fld"><label>Book at least (hours ahead)</label><input class="in" id="bk-notice" type="number" min="0" value="${b.notice}"></div><div class="fld"><label>Show this many days</label><input class="in" id="bk-ahead" type="number" min="1" value="${b.ahead}"></div><div class="fld"><label>Calls per client at once</label><input class="in" id="bk-max" type="number" min="1" value="${b.max}"></div>
      <div class="fld full"><label>Days off (YYYY-MM-DD, comma separated)</label><input class="in" id="bk-off" value="${esc(b.blocked.join(', '))}" placeholder="2026-12-25, 2027-01-07"></div></div>
    <div class="acts"><button class="btn green" data-savebooking>Save hours</button></div></div>
    <div class="card" style="margin-top:14px"><h3>Email</h3>${O.mail ? `<p class="small">Connected. New tickets, client replies and bookings go to <b>${esc(s.studioEmail)}</b>; clients get an email when you answer.</p><div class="acts"><button class="btn" data-testmail>${ic('send')} Send a test email</button></div>`
      : `<div class="warnbox">${ic('alert')}<span>Not connected yet, so nothing is emailed. Everything still shows up here in the portal. To connect Gmail: turn on 2-Step Verification for ${esc(s.studioEmail)}, create an app password at myaccount.google.com/apppasswords, then add <b>GMAIL_USER</b> and <b>GMAIL_APP_PASSWORD</b> in Vercel and redeploy.</span></div>`}</div></div>`;
}
async function loadTeam() {
  const el = $('#team'); if (!el) return;
  try { const r = await api('GET', 'staff/team'); el.innerHTML = r.team.length ? `<table class="t"><tbody>${r.team.map(m => `<tr><td><b>${esc(m.name)}</b><br><span class="small">${m.temp ? 'temporary code · has not chosen their own yet' : m.changedAt ? `own code since ${esc(day(m.changedAt))}` : `added ${esc(day(m.at))}`}</span></td><td class="r"><button class="btn sm ghost danger" data-rmstaff="${esc(m.id)}">Remove</button></td></tr>`).join('')}</tbody></table>` : '<p class="small">No personal codes yet.</p>'; }
  catch (e) { el.innerHTML = `<p class="small">${esc(e.message)}</p>`; }
}

/* ---------- row editors ---------- */
function editor(kind, cols, rows, noAdd) {
  if (!rows.length) return `<div class="empty"><b>Nothing here yet.</b></div>`;
  return `<div style="overflow:auto"><table class="t" data-ed="${kind}"><thead><tr>${cols.map(c => `<th>${c.l}</th>`).join('')}<th></th></tr></thead><tbody>${rows.map(r => `<tr data-id="${esc(r.id || '')}">${cols.map(c => `<td>${c.t === 'select' ? `<select data-k="${c.k}">${(c.o || []).map(o => `<option ${o === r[c.k] ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>` : `<input data-k="${c.k}" type="${c.t}" value="${esc(r[c.k] ?? '')}" ${c.t === 'number' ? 'step="any"' : ''}>`}</td>`).join('')}<td>${noAdd ? '' : `<button class="btn sm ghost" data-rm aria-label="Remove">${ic('x')}</button>`}</td></tr>`).join('')}</tbody></table></div>`;
}
const readEd = kind => $$(`table[data-ed="${kind}"] tbody tr`).map(tr => { const o = { id: tr.dataset.id }; $$('[data-k]', tr).forEach(x => o[x.dataset.k] = x.value); return o; });
const blank = { performance: () => ({ date: new Date().toISOString().slice(0, 10), brand: C.client.brands[0]?.name || '', spend: 0, results: 0, label: 'Orders', revenue: 0, note: '' }), ads: () => ({ name: '', brand: C.client.brands[0]?.name || '', status: 'draft', link: '', thumb: '', note: '' }), invoices: () => ({ no: '', amount: 0, currency: C.client.currency, due: '', status: 'due', link: '', note: '' }), links: () => ({ label: '', url: 'https://', kind: 'report' }) };

/* ---------- events ---------- */
function onInput(e) {
  if (e.target.id === 'ctext') $('#cprev').innerHTML = md(rend(e.target.value));
}
const put = async (body, msg = 'Saved') => { try { const r = await api('PUT', `staff/clients/${arg}/staffdata`, body); C.staff = r.staff; C.summary = r.summary; await reload(); toast(msg); return true; } catch (er) { toast(er.message, true); return false; } };
// repaint for a live update without losing what someone is typing: unsaved text and the caret survive
const stay = () => {
  const v = $('#view'), k = v.scrollTop, a = document.activeElement;
  const key = el => el.id ? '#' + CSS.escape(el.id) : el.matches('[data-evtx]') && el.closest('[data-ev]') ? `[data-ev="${el.closest('[data-ev]').dataset.ev}"] [data-evtx]` : null;
  const drafts = [...v.querySelectorAll('textarea,input[type=text],input[type=email],input[type=url],input:not([type])')].filter(el => el.value !== el.defaultValue).map(el => [key(el), el.value]).filter(([x]) => x);
  const focus = a && v.contains(a) && key(a), sel = focus && [a.selectionStart, a.selectionEnd];
  paint(); v.scrollTop = k;
  for (const [x, val] of drafts) { const el = $(x, v); if (el) el.value = val; }
  if (focus) { const el = $(focus, v); if (el) { el.focus({ preventScroll: true }); try { el.setSelectionRange(...sel); } catch { } } }
};
async function onClick(e) {
  const t = e.target.closest('button,a,[data-toggle],.row,[data-meetc],[data-evc]'); if (!t) return; const d = t.dataset;
  if (d.nav) return nav(d.nav); if (d.client) return nav('client', d.client); if (d.new !== undefined) return newClient(); if (d.tab) return nav('client', arg, d.tab);
  if (d.tk) { const [cid, tid] = d.tk.split('/'); return nav('client', cid, 'tickets', tid); }
  if (d.meetc) return nav('client', d.meetc, 'meetings');
  if (d.evc) { const [cid, eid] = d.evc.split('/'); return nav('client', cid, 'events', eid); }
  if (d.pnew !== undefined) return composer(d.pnew || (C ? C.client.id : 'all'));
  if (d.pedit !== undefined || d.ppin !== undefined || d.pdel !== undefined) {
    const [target, id] = t.closest('[data-post]').dataset.post.split('/'), p = postList().find(x => x.id === id && x.target === target);
    if (d.pedit !== undefined) return composer(target, p);
    try {
      if (d.ppin !== undefined) await api('PUT', 'staff/post', { target, id, pinOnly: true, pinned: !p.pinned });
      else { if (!confirm(`Remove "${p.title}"${target === 'all' ? ' for all clients' : ''}?`)) return; await api('DELETE', 'staff/post', { target, id }); }
      toast(d.ppin !== undefined ? (p.pinned ? 'Unpinned' : 'Pinned') : 'Removed'); refreshFeed();
    } catch (er) { toast(er.message, true); } return;
  }
  if (d.evsave !== undefined) {
    const box = t.closest('[data-ev]');
    try { await api('PUT', `staff/clients/${arg}/event`, { eid: box.dataset.ev, status: $('[data-evst]', box).value }); await reloadClient(); toast('Status saved. The client sees it.'); stay(); } catch (er) { toast(er.message, true); } return;
  }
  if (d.evsend !== undefined) {
    const box = t.closest('[data-ev]'), text = $('[data-evtx]', box).value.trim(); if (!text) return toast('Write a reply first.', true); t.disabled = true;
    try {
      const r = await api('POST', `staff/clients/${arg}/eventreply`, { eid: box.dataset.ev, text, status: $('[data-evst]', box).value }), last = r.event.replies.at(-1);
      await reloadClient(); toast(last.mailed ? `Sent. Emailed to ${last.mailedTo.join(', ')}.` : 'Sent to the portal. Not emailed: email is not connected.', !last.mailed); stay();
    } catch (er) { toast(er.message, true); t.disabled = false; } return;
  }
  if (d.tkreply) {
    const v = $('#tkReply').value.trim(); if (!v) return toast('Write a reply first.', true); t.disabled = true;
    try { await api('POST', `staff/clients/${arg}/reply`, { tid: d.tkreply, text: v, close: !!d.andclose }); await reloadClient(); toast(d.andclose ? 'Sent and closed' : 'Sent'); stay(); } catch (er) { toast(er.message, true); t.disabled = false; } return;
  }
  if (d.mcancel) {
    const m = C.meetings.find(x => x.id === d.mcancel); if (!confirm(`Cancel the call with ${C.client.name} on ${mwhen(m.start)}? They get an email.`)) return;
    try { await api('PUT', `staff/clients/${arg}/meeting`, { mid: d.mcancel }); await reloadClient(); toast('Cancelled. The client is emailed.'); stay(); } catch (er) { toast(er.message, true); } return;
  }
  if (d.savebooking !== undefined) {
    try { O.settings = await api('PUT', 'staff/booking', { on: $('#bk-on').checked, days: $$('[data-bkday]').filter(x => x.checked).map(x => +x.dataset.bkday), from: $('#bk-from').value, to: $('#bk-to').value, length: $('#bk-len').value, notice: $('#bk-notice').value, ahead: $('#bk-ahead').value, max: $('#bk-max').value, blocked: $('#bk-off').value }); toast('Saved'); stay(); } catch (er) { toast(er.message, true); } return;
  }
  if (d.testmail !== undefined) { t.disabled = true; try { await api('POST', 'staff/testmail', {}); toast(`Sent. Check ${O.settings.studioEmail}.`); } catch (er) { toast(er.message, true); } t.disabled = false; return; }
  if (d.toggle !== undefined) { open.has(d.toggle) ? open.delete(d.toggle) : open.add(d.toggle); return t.closest('.item').classList.toggle('open'); }
  if (d.verify !== undefined) { const id = t.closest('[data-item]').dataset.item, comment = $('[data-vc]', t.closest('[data-item]')).value, v = { ...C.staff.verify }; v[id] = { state: d.verify, comment }; if (await put({ verify: v }, d.verify ? 'Marked ' + d.verify : 'Cleared')) stay(); return; }
  if (d.auto) { const a = { ...(C.staff.auto || {}) }; a[d.auto] = !a[d.auto]; if (await put({ auto: a })) stay(); return; }
  if (d.hide) { const h = new Set(C.staff.hidden || []); h.has(d.hide) ? h.delete(d.hide) : h.add(d.hide); if (await put({ hidden: [...h] })) stay(); return; }
  if (d.rmitem) { if (await put({ customItems: C.staff.customItems.filter(x => x.id !== d.rmitem) }, 'Removed')) stay(); return; }
  if (d.additem !== undefined) return addItem();
  if (d.add) { const kind = d.add; if (kind === 'timeline') return; const list = readEd(kind); const key = kind; C.staff[key] = [...list, blank[kind]()]; return stay(); }
  if (t.matches('[data-rm]')) { const tb = t.closest('table'), kind = tb.dataset.ed, list = readEd(kind); list.splice([...tb.tBodies[0].rows].indexOf(t.closest('tr')), 1); C.staff[kind] = list; return stay(); }
  if (d.save) {
    if (d.save === 'meta') { if (await put({ timeline: readEd('timeline'), dashboardUrl: $('#dashUrl').value })) stay(); return; }
    if (await put({ [d.save]: readEd(d.save) })) stay(); return;
  }
  if (d.send !== undefined) { const v = $('#msgText').value.trim(); if (!v) return; try { await api('POST', `staff/clients/${arg}/message`, { text: v }); await reloadClient(); toast('Sent'); stay(); } catch (er) { toast(er.message, true); } return; }
  if (d.csave !== undefined) return contract('save');
  if (d.csend !== undefined) { if (!confirm('Send the agreement to the client now? They will be able to read and sign it.')) return; return contract('send'); }
  if (d.creopen !== undefined) return contract('reopen');
  if (d.cvoid !== undefined) { if (!confirm('Void this agreement?')) return; return contract('void'); }
  if (d.counter !== undefined) return contract('countersign');
  if (d.filepdf !== undefined) { t.disabled = true; try { await clientFile(); } catch (er) { toast(er.message, true); } t.disabled = false; return; }
  if (d.spdf !== undefined) { try { const k = C.contract, sg = k.signature, hand = sg.method === 'hand' ? await Promise.all(sg.files.map(id => getFile('staff', id))) : []; await agreementPdf({ title: k.title, text: k.signedText, client: C.client.name, signature: sg, countersign: k.countersign, docHash: sg.docHash, studio: C.settings.studio, annex: await annexData(), hand }); } catch (er) { toast(er.message, true); } return; }
  if (d.pfstaff !== undefined) return partyModal();
  if (d.savelegal !== undefined) { try { O.settings = await api('PUT', 'staff/settings', { legal: Object.fromEntries($$('[data-legal]').map(x => [x.dataset.legal, x.value])) }); toast('Saved'); } catch (er) { toast(er.message, true); } return; }
  if (d.ldrm) { if (!confirm('Remove this document from every agreement?')) return; try { O.settings = await api('DELETE', 'staff/legaldoc', { id: d.ldrm }); toast('Removed'); stay(); } catch (er) { toast(er.message, true); } return; }
  if (d.savecs !== undefined) { try { const old = C.client.brands, names = $('#cs-brands').value.split('\n').map(x => x.trim()).filter(Boolean); await api('PATCH', 'staff/clients/' + arg, { name: $('#cs-name').value, status: $('#cs-status').value, brands: names.map((n, i) => ({ id: old[i]?.id || 'b' + (i + 1 + old.length), name: n })) }); await reloadClient(); toast('Saved'); stay(); } catch (er) { toast(er.message, true); } return; }
  if (d.savenotes !== undefined) return void (await put({ notes: $('#cs-notes').value }));
  if (d.ctadd !== undefined) { $('#cts').insertAdjacentHTML('beforeend', ctRow({ name: '', email: '' }, $('#cts').children.length)); $('#cts').lastElementChild.querySelector('[data-cte]').focus(); return; }
  if (d.ctdel !== undefined) { if ($('#cts').children.length < 2) return toast('Keep at least one email. It is their login.', true); t.closest('.ctrow').remove(); return; }
  if (d.ctsave !== undefined) {
    const contacts = [...$('#cts').children].map(row => ({ was: row.dataset.was, name: $('[data-ctn]', row).value, email: $('[data-cte]', row).value })).filter(x => x.email.trim());
    if (contacts[0]?.email.trim().toLowerCase() !== C.client.contacts[0]?.email && !confirm(`Change the login to ${contacts[0]?.email}? They sign in with it from now on, with the same access code.`)) return;
    t.disabled = true; try { await api('PUT', `staff/clients/${arg}/contacts`, { contacts }); await reloadClient(); toast('Emails saved'); stay(); } catch (er) { toast(er.message, true); t.disabled = false; } return;
  }
  if (d.reset !== undefined) return resetCode();
  if (d.mailpage !== undefined) return mailPage();
  if (d.del !== undefined) { const n = prompt(`Type "${C.client.name}" to delete this workspace for good.`); if (n === null) return; try { await api('DELETE', 'staff/clients/' + arg, { confirm: n }); await reload(); toast('Deleted'); nav('overview'); } catch (er) { toast(er.message, true); } return; }
  if (d.mycode !== undefined) {
    modal(`<h3>Change my code</h3><p class="small">At least 8 characters. Your old code stops working when you save.</p>
      <div class="fld" style="margin-top:12px"><label>New code</label><input class="in" id="mc1" type="password" autocomplete="new-password"></div>
      <div class="fld" style="margin-top:12px"><label>Type it again</label><input class="in" id="mc2" type="password" autocomplete="new-password"></div>
      <div class="err" id="mcerr"></div><div class="acts"><button class="btn green" data-mcsave>Save</button><button class="btn ghost" data-close>Cancel</button></div>`, {
      onMount: (m, close) => {
        $('[data-close]', m).onclick = close; $('#mc1', m).focus();
        $('[data-mcsave]', m).onclick = async () => {
          const a = $('#mc1', m).value; if (a !== $('#mc2', m).value) return void ($('#mcerr', m).textContent = 'The two codes are not the same.');
          try { await api('POST', 'staff/mycode', { code: a }); close(); toast('Your code is changed'); } catch (er) { $('#mcerr', m).textContent = er.message; }
        };
      } });
    return;
  }
  if (d.addstaff !== undefined) { try { await api('POST', 'staff/team', { name: $('#tm-name').value, code: $('#tm-code').value }); $('#tm-name').value = $('#tm-code').value = ''; toast('Added. Send them the temporary code privately.'); loadTeam(); } catch (er) { toast(er.message, true); } return; }
  if (d.rmstaff) { if (!confirm('Remove this person? Their personal code stops working.')) return; try { await api('DELETE', 'staff/team', { id: d.rmstaff }); toast('Removed'); loadTeam(); } catch (er) { toast(er.message, true); } return; }
  if (d.savesettings !== undefined) { try { O.settings = await api('PUT', 'staff/settings', { studio: $('#st-studio').value, studioEmail: $('#st-email').value, bandBmId: $('#st-bm').value, governingLaw: $('#st-law').value, contractTitle: $('#st-title').value }); toast('Saved'); } catch (er) { toast(er.message, true); } }
}
document.addEventListener('change', async e => {
  const x = e.target;
  if (x.dataset?.tkstatus && C) { try { await api('PUT', `staff/clients/${arg}/ticket`, { tid: x.dataset.tkstatus, status: x.value }); await reloadClient(); toast('Updated'); stay(); } catch (er) { toast(er.message, true); } return; }
  if (!x.dataset?.cv || !C) return;
  const body = { [x.dataset.cv]: x.value }; try { await api('PATCH', 'staff/clients/' + arg, body); await reloadClient(); $('#cprev').innerHTML = md(rend($('#ctext').value)); toast('Saved'); } catch (er) { toast(er.message, true); }
});
async function contract(action) {
  const body = { action }; if (action === 'save' || action === 'send') body.text = $('#ctext').value; if (action === 'countersign') { body.name = prompt('Countersign as', me.name); if (!body.name) return; }
  try { await api('PUT', `staff/clients/${arg}/contract`, body); await reloadClient(); toast({ save: 'Saved', send: 'Sent to the client', void: 'Voided', reopen: 'Back to draft', countersign: 'Countersigned' }[action]); stay(); } catch (er) { toast(er.message, true); }
}
/* the client's whole file as a PDF: key facts, the forms, then the checklist by section */
function clientFile() {
  const c = C.client, s = C.summary, k = C.contract;
  const forms = T.forms.flatMap(f => f.perBrand ? c.brands.map(b => ({ f, key: `${f.id}:${b.id}`, title: `${f.title} · ${b.name}` })) : [{ f, key: f.id, title: f.title }])
    .map(({ f, key, title }) => { const v = C.answers.forms[key] || {}; return { title, sub: f.hint, rows: f.fields.map(x => [x.label, v[x.id]]) }; });
  const groups = T.groups.map(g => ({ title: g.title, hint: g.hint, blocks: visible(C).filter(i => i.group === g.id).map(i => {
    const st = stateOf(C, i), a = C.answers.checklist[i.id] || {}, ver = C.staff.verify[i.id] || {}, own = i.owner === 'staff' || i.id === 'sign';
    return { title: i.title, status: STATE[st], sub: [KIND[i.kind], i.required === false && 'optional', i.owner === 'staff' && 'we do this', i.id === 'sign' && `agreement ${k?.status}`].filter(Boolean).join(' · '),
      rows: own ? [] : (i.fields || []).map(f => [f.label, a.fields?.[f.id]]), note: a.note, comment: ver.comment, quiet: own || !(i.fields || []).length };
  }) })).filter(g => g.blocks.length);
  const contact = c.contacts.map(x => [x.name, x.email].filter(Boolean).join('\n')).join('\n');
  return clientDataPdf({ studio: C.settings.studio, client: c.name, progress: s,
    facts: [['Brands', c.brands.map(b => b.name).join(', ')], ['Contact', contact, 1.6], ['Start date', fmtD(c.startDate)], ['Monthly fee', c.fee ? money(c.fee, c.currency) : '', .8], ['Agreement', k?.status === 'signed' ? `Signed ${fmtD(k.signature.at)}` : k?.status]],
    sections: [{ title: 'Forms', hint: 'What the client typed into the forms.', blocks: forms }, ...groups] });
}
function addItem() {
  modal(`<h3>Add an item for ${esc(C.client.name)}</h3><form id="ai" class="fgrid"><div class="fld full"><label>What do they need to do?</label><input class="in" name="title" required placeholder="Give us access to the Shopify store"></div>
    <div class="fld"><label>Section</label><select class="in" name="group">${T.groups.filter(g => g.id !== 'admin').map(g => `<option value="${g.id}">${esc(g.title)}</option>`).join('')}</select></div><div class="fld"><label>Required</label><select class="in" name="required"><option value="1">Yes</option><option value="0">Optional</option></select></div>
    <div class="fld full"><label>Why we need it</label><textarea class="in" name="why" style="min-height:70px"></textarea></div><div class="fld full"><label>Steps (one per line)</label><textarea class="in" name="steps" style="min-height:90px"></textarea></div>
    <div class="fld full"><label>Field the client fills (optional)</label><input class="in" name="field" placeholder="e.g. Store URL"></div><div class="full acts"><button class="btn green" type="submit">Add</button><button class="btn ghost" type="button" data-close>Cancel</button></div></form>`, {
    onMount: (m, close) => { $('[data-close]', m).onclick = close; $('#ai', m).onsubmit = async ev => { ev.preventDefault(); const f = Object.fromEntries(new FormData(ev.target)); const it = { group: f.group, kind: f.group, required: f.required === '1', title: f.title, why: f.why, steps: f.steps.split('\n').map(x => x.trim()).filter(Boolean), fields: f.field ? [{ id: 'v', label: f.field, type: 'text' }] : [] }; close(); if (await put({ customItems: [...C.staff.customItems, it] }, 'Added')) stay(); }; },
  });
}
// live: read the change counter every 4 seconds (30 in a background tab) and fetch the overview only when it moved
let rev = null;
async function pulse() {
  try { const { rev: r } = await api('GET', 'staff/pulse'); if (rev !== null && r !== rev) await poll(); rev = r; } catch { }
  setTimeout(pulse, document.hidden ? 30000 : 4000);
}
async function poll() {
  try {
    const n = await api('GET', 'staff/overview'), head = n.log[0];
    if (head && head.at !== lastLog) { lastLog = head.at; if (head.who !== me.name) toast(`${head.who} ${head.what}`); }
    const changed = route === 'client' || JSON.stringify([n.clients, n.tickets, n.meetings, n.events]) !== JSON.stringify([O.clients, O.tickets, O.meetings, O.events]); O = n;
    // conversations (events, tickets, messages) update while you type; editors elsewhere wait until you leave the field
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '') && !(route === 'client' && ['events', 'tickets', 'messages'].includes(tab));
    if (changed && !typing && !$('.modal')) { if (route === 'client') { await reloadClient().catch(() => { }); } stay(); } else side();
  } catch { }
}

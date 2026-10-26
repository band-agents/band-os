import { $, $$, esc, api, ic, toast, modal, debounce, ago, day, money, copyText, setPalette, openPalette, md, chart, barcode, STATE, KIND } from './lib.js';
import { shell, signOut } from './main.js';
import { agreementPdf } from './pdf.js';

let me, O, T, C = null, route = 'overview', arg = '', tab = 'checklist', bc = null, open = new Set(), lastLog = null;
const nav = (r, a = '', t = '') => { location.hash = '#' + r + (a ? '/' + a : '') + (t ? '/' + t : ''); };

export async function mount(who) {
  me = who;
  try { [O, T] = await Promise.all([api('GET', 'staff/overview'), api('GET', 'template')]); } catch (e) { toast(e.message, true); return; }
  lastLog = O.log[0]?.at;
  document.title = 'Staff · band. portal';
  $('#app').innerHTML = shell({ tag: 'Staff', staff: true, name: me.name, extra: `<span class="mono envtag" style="color:rgba(255,255,255,.5);margin-right:6px">${O.mode === 'redis' ? 'LIVE' : 'LOCAL DATA'}</span>` }) + `
    <div class="win"><aside class="side" id="side"></aside><section class="main"><div class="tool"><button class="nav-b" id="back" aria-label="Back">‹</button><nav class="crumbs" id="crumbs"></nav><span class="sp"></span><button class="btn sm green" id="newBtn">${ic('plus')} New client</button></div><div class="view" id="view" tabindex="-1"></div></section></div><nav class="bnav" id="bnav" aria-label="Sections"></nav>`;
  $('#outBtn').onclick = signOut; $('#palBtn').onclick = openPalette; $('#back').onclick = () => history.back(); $('#newBtn').onclick = newClient;
  $('#view').addEventListener('click', onClick); $('#view').addEventListener('input', onInput);
  addEventListener('hashchange', go); setInterval(poll, 20000); go();
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
  [route, arg, tab] = (location.hash.slice(1) || 'overview').split('/'); tab = tab || 'checklist';
  if (!['overview', 'clients', 'client', 'activity', 'settings'].includes(route)) route = 'overview';
  if (route === 'client') { try { C = await api('GET', 'staff/clients/' + arg); } catch (e) { toast(e.message, true); return nav('clients'); } } else C = null;
  paint();
}
function tabbar() {
  const on = r => route === r || (r === 'clients' && route === 'client');
  $('#bnav').innerHTML = [['overview', 'Overview', 'home'], ['clients', 'Clients', 'users'], ['activity', 'Activity', 'clock'], ['settings', 'Settings', 'settings']]
    .map(([r, t, i]) => `<button class="${on(r) ? 'on' : ''}" data-nav="${r}" aria-label="${t}">${ic(i)}<span>${t}</span>${r === 'clients' && O.clients.some(c => c.awaiting || c.help) ? '<i>•</i>' : ''}</button>`).join('');
  $$('#bnav [data-nav]').forEach(b => b.onclick = () => nav(b.dataset.nav));
}
function side() {
  tabbar();
  $('#side').innerHTML = `<div class="who-card"><b>${esc(me.name)}</b><span>Staff</span></div><h6>Studio</h6>
    ${[['overview', 'Overview', 'home', ''], ['clients', 'Clients', 'users', O.clients.length], ['activity', 'Activity', 'clock', ''], ['settings', 'Settings', 'settings', '']].map(([r, t, i, n]) => `<button class="si ${route === r ? 'on' : ''}" data-nav="${r}">${ic(i)}<span>${t}</span>${n !== '' ? `<em>${n}</em>` : ''}</button>`).join('')}
    <h6>Clients</h6>${O.clients.map(c => `<button class="si ${route === 'client' && arg === c.id ? 'on' : ''}" data-client="${c.id}">${ic('arrow')}<span>${esc(c.name)}</span><em class="${c.awaiting || c.help ? 'hot' : c.done === c.total ? 'ok' : ''}">${c.awaiting || c.help || (c.done + '/' + c.total)}</em></button>`).join('') || '<p class="small" style="padding:6px 10px">No clients yet.</p>'}
    <div class="sfoot"><span class="mono">n · new client</span><span class="mono">⌘K · jump to anything</span></div>`;
  $$('#side [data-nav]').forEach(b => b.onclick = () => nav(b.dataset.nav)); $$('#side [data-client]').forEach(b => b.onclick = () => nav('client', b.dataset.client));
}
function paint() {
  side(); const v = $('#view'), t = { overview, clients, client, activity, settings }[route]();
  $('#crumbs').innerHTML = route === 'client' ? `<a data-nav="clients">Clients</a><i>/</i><span>${esc(C.client.name)}</span>` : `<span>${{ overview: 'Overview', clients: 'Clients', activity: 'Activity', settings: 'Settings' }[route]}</span>`;
  $('#crumbs a')?.addEventListener('click', () => nav('clients'));
  v.innerHTML = t; v.scrollTop = 0; bc?.stop(); bc = null; const cv = $('#hcode'); if (cv) bc = barcode(cv, { color: '#EDEDE6', level: Math.min(1, .3 + O.log.filter(l => Date.now() - new Date(l.at) < 864e5).length / 12) }); palette(); if (route === 'settings') loadTeam();
}

/* ---------- overview ---------- */
const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
const pctOf = c => Math.round(100 * c.done / Math.max(1, c.total));
const brandChips = c => c.brands.map(b => `<span class="brand"><i></i>${esc(b.name)}</span>`).join('');
const cpill = s => `<span class="pillx ${s === 'signed' ? 'live' : s === 'sent' ? 'warn' : ''}">${{ draft: 'agreement draft', sent: 'awaiting signature', signed: 'signed', void: 'agreement void' }[s]}</span>`;
function row(c) {
  return `<div class="row" data-client="${c.id}" tabindex="0"><div class="n"><b>${esc(c.name)}</b><span>${brandChips(c)}</span></div>${cpill(c.contract)}
    ${c.awaiting ? `<span class="pillx warn">${c.awaiting} to review</span>` : ''}${c.help ? `<span class="pillx bad">${c.help} need help</span>` : ''}<div style="width:120px"><div class="bar-p"><i style="width:${pctOf(c)}%"></i></div><span class="small mono">${c.done}/${c.total} · ${pctOf(c)}%</span></div></div>`;
}
const feed = (n = 14) => `<div class="feed">${O.log.slice(0, n).map(l => `<div><time>${ago(l.at)}</time><span><b>${esc(l.who)}</b> ${esc(l.what)}</span></div>`).join('') || '<p class="small">Nothing yet.</p>'}</div>`;
function overview() {
  const C0 = O.clients, sum = k => C0.reduce((a, c) => a + c[k], 0), sign = C0.filter(c => c.contract === 'sent').length, need = C0.filter(c => c.awaiting || c.help || c.fix || c.contract === 'sent');
  return `<div class="page wide"><div class="hero-s"><div><p class="eyebrow mono">${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p><h1>${greet()},<span> ${esc(me.name)}.</span></h1></div><canvas id="hcode" aria-hidden="true"></canvas></div>
    <div class="grid g4" style="margin-top:30px">${[['Clients', C0.length, 'in the portal'], ['To review', sum('awaiting'), 'items sent by clients'], ['Waiting to sign', sign, 'agreements out'], ['Need help', sum('help'), 'items flagged']].map(([t, v, k], n) => `<div class="card stat"><div class="v" style="${n && v ? 'color:var(--green)' : ''}">${v}</div><div class="k">${t}<br><span class="mini">${k}</span></div></div>`).join('')}</div>
    <div class="split" style="margin-top:44px;grid-template-columns:1.5fr 1fr"><div><div class="sh"><h2>Needs you<em>${need.length}</em></h2></div>${need.map(row).join('') || '<div class="empty"><b>All clear.</b>Nothing is waiting on us.</div>'}
      <div class="sh" style="margin-top:34px"><h2>All clients<em>${C0.length}</em></h2><button class="btn sm" data-new>${ic('plus')} New client</button></div>${C0.map(row).join('') || '<div class="empty"><b>No clients yet.</b>Press <span class="mono">N</span> to create the first workspace.</div>'}</div>
      <div><div class="sh"><h2>Activity</h2><button class="btn sm ghost" data-nav="activity">All</button></div><div class="card" style="padding:6px 18px">${feed(10)}</div></div></div></div>`;
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
function codeModal(c, code, fresh) {
  modal(`<h3>${fresh ? 'Workspace ready' : 'New access code'}</h3><p class="small" style="margin-bottom:14px">This code is shown once. We only store a hash. Send it to ${esc(c.contacts.map(x => x.email).join(", "))} over a private channel.</p>
    <div class="codebox">${esc(code)}</div><div class="acts"><button class="btn green" data-copyall>${ic('copy')} Copy the message to send</button><button class="btn" data-copycode>Copy code</button><button class="btn ghost" data-close>Done</button></div>`, {
    onMount: (m, close) => { $('[data-close]', m).onclick = close; $('[data-copycode]', m).onclick = () => copyText(code); $('[data-copyall]', m).onclick = () => copyText(loginMsg(c, code)); },
  });
}
async function reload() { O = await api('GET', 'staff/overview'); }
async function reloadClient() { C = await api('GET', 'staff/clients/' + arg); await reload(); }

/* ---------- one client ---------- */
const TABS = [['checklist', 'Checklist'], ['answers', 'Answers'], ['agreement', 'Agreement'], ['results', 'Results'], ['billing', 'Billing'], ['messages', 'Messages'], ['settings', 'Settings']];
function client() {
  const s = C.summary;
  return `<div class="page wide"><div class="hero-s"><div><p class="eyebrow mono">${brandChips(C.client)} · ${esc(C.client.status)}</p><h1>${esc(C.client.name)}<span>.</span></h1><div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">${cpill(s.contract)}<span class="pillx">${s.done}/${s.total} sent</span><span class="pillx ok">${s.verified} verified</span>${s.awaiting ? `<span class="pillx warn">${s.awaiting} to review</span>` : ''}${s.help ? `<span class="pillx bad">${s.help} need help</span>` : ''}</div></div><div class="ring" style="--p:${pctOf(s)}"><div><b>${pctOf(s)}%</b></div></div></div>
    <div class="tabs">${TABS.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div><div id="tabbody" style="margin-top:22px">${({ checklist, answers, agreement, results, billing, messages, csettings })[tab === 'settings' ? 'csettings' : tab]?.() || ''}</div></div>`;
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

/* agreement editor: the text on the left, the client's view on the right */
const fmtD = d => { try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return ''; } };
const list = a => a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
const vars = () => { const c = C.client, s = C.settings; return { studio: s.studio, client: c.name, brands: list(c.brands.map(b => b.name)) || c.name, start: fmtD(c.startDate) || '[start date]', fee: Number(c.fee || 0).toLocaleString('en-US'), currency: c.currency || 'USD', accounts: c.accounts || `${c.brands.length || 1} ad account${c.brands.length > 1 ? 's' : ''}`, law: c.law || s.governingLaw }; };
const rend = t => String(t).replace(/\{\{(\w+)\}\}/g, (_, k) => vars()[k] ?? `{{${k}}}`);
function agreement() {
  const k = C.contract, signed = k.status === 'signed', c = C.client;
  return `<div class="card" style="margin-bottom:16px"><div class="fgrid" style="grid-template-columns:repeat(5,1fr);margin:0">${[['fee', 'Monthly fee', c.fee, 'number'], ['currency', 'Currency', c.currency, 'text'], ['accounts', 'Accounts wording', c.accounts, 'text'], ['startDate', 'Start date', c.startDate, 'date'], ['law', 'Governing law', c.law || C.settings.governingLaw, 'text']].map(([n, l, v, t]) => `<div class="fld"><label>${l}</label><input class="in" data-cv="${n}" type="${t}" value="${esc(v ?? '')}" ${signed ? 'disabled' : ''}></div>`).join('')}</div>
    <div class="acts"><span class="pillx ${signed ? 'live' : k.status === 'sent' ? 'warn' : ''}">${k.status}</span><span class="sp" style="flex:1"></span>
    ${signed ? `<button class="btn sm dark" data-spdf>${ic('down')} Signed PDF</button>${k.countersign ? `<span class="small">Countersigned by ${esc(k.countersign.name)}</span>` : '<button class="btn sm green" data-counter>Countersign</button>'}`
      : `<button class="btn sm" data-csave>Save text</button>${k.status === 'sent' ? '<button class="btn sm" data-creopen>Take back to draft</button>' : '<button class="btn sm green" data-csend>Send to client</button>'}`}<button class="btn sm ghost danger" data-cvoid>${k.status === 'void' ? 'Void' : 'Void'}</button></div></div>
    ${signed ? `<div class="signed" style="margin-bottom:16px"><h3>${ic('check')} Signed by ${esc(k.signature.name)}</h3><p class="small" style="color:inherit;margin-top:4px">${esc(new Date(k.signature.at).toUTCString())} · from ${esc(k.signature.ip)}</p><div class="hash">${esc(k.signature.docHash)}</div></div>` : ''}
    <div class="split"><div><div class="lbl" style="margin-bottom:8px">Text · variables like {{client}} {{fee}} are filled in</div><textarea class="in mono" id="ctext" style="min-height:640px;font-size:12.5px;line-height:1.6" ${signed ? 'disabled' : ''}>${esc(signed ? k.signedText : k.text)}</textarea></div>
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
function csettings() {
  const c = C.client;
  return `<div class="card"><h3>Workspace</h3><div class="fgrid"><div class="fld"><label>Name</label><input class="in" id="cs-name" value="${esc(c.name)}"></div><div class="fld"><label>Status</label><select class="in" id="cs-status">${['invited', 'active', 'paused', 'closed'].map(s => `<option ${s === c.status ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
    <div class="fld full"><label>Brands (one per line)</label><textarea class="in" id="cs-brands">${esc(c.brands.map(b => b.name).join('\n'))}</textarea></div></div><div class="acts"><button class="btn green sm" data-savecs>Save</button></div></div>
    <div class="card" style="margin-top:14px"><h3>Private notes</h3><p class="small">Only staff see these.</p><textarea class="in" id="cs-notes" style="margin-top:10px;min-height:140px">${esc(C.staff.notes)}</textarea><div class="acts"><button class="btn green sm" data-savenotes>Save notes</button></div></div>
    <div class="card" style="margin-top:14px"><h3>Access</h3><p class="small">Login: <b>${esc(c.contacts[0]?.email)}</b>. Codes are stored as hashes, so we cannot show the old one. Make a new one if it is lost; the old one stops working.</p><div class="acts"><button class="btn sm" data-reset>${ic('key')} Make a new access code</button></div></div>
    <div class="card" style="margin-top:14px"><h3 style="color:var(--red)">Delete workspace</h3><p class="small">Removes everything: answers, signed agreement, results. This cannot be undone.</p><div class="acts"><button class="btn sm danger" data-del>${ic('trash')} Delete ${esc(c.name)}</button></div></div>`;
}
function settings() {
  const s = O.settings;
  return `<div class="page"><p class="eyebrow mono">Settings</p><h1>The studio<span>.</span></h1><div class="card" style="margin-top:28px"><div class="fgrid">
    <div class="fld"><label>Studio name</label><input class="in" id="st-studio" value="${esc(s.studio)}"></div><div class="fld"><label>Studio email</label><input class="in" id="st-email" value="${esc(s.studioEmail)}"></div>
    <div class="fld full"><label>Our Meta Business ID (shown to clients in “Add band. as a partner”)</label><input class="in" id="st-bm" inputmode="numeric" value="${esc(s.bandBmId)}" placeholder="16-digit number from Business settings"></div>
    <div class="fld"><label>Default governing law</label><input class="in" id="st-law" value="${esc(s.governingLaw)}"></div><div class="fld"><label>Agreement title</label><input class="in" id="st-title" value="${esc(s.contractTitle)}"></div></div>
    <div class="warnbox">${ic('alert')}<span>The default agreement text is a draft written for this service. Have a lawyer read it before the first client signs. Electronic signature rules depend on the country.</span></div>
    <div class="acts"><button class="btn green" data-savesettings>Save settings</button></div></div>
    <div class="card" style="margin-top:14px"><h3>Staff team</h3><p class="small">Everyone can sign in with the team code. A personal code signs in under that person's own name, so the activity log says who did what.</p>
    <div id="team" style="margin-top:12px"><p class="small">Loading…</p></div>
    <div class="fgrid" style="margin-top:14px;grid-template-columns:1fr 1fr auto;align-items:end"><div class="fld"><label>Name</label><input class="in" id="tm-name" autocomplete="off"></div><div class="fld"><label>Personal code (6+ characters)</label><input class="in" id="tm-code" type="password" autocomplete="new-password"></div><button class="btn green" data-addstaff>${ic('plus')} Add</button></div></div></div>`;
}
async function loadTeam() {
  const el = $('#team'); if (!el) return;
  try { const r = await api('GET', 'staff/team'); el.innerHTML = r.team.length ? `<table class="t"><tbody>${r.team.map(m => `<tr><td><b>${esc(m.name)}</b><br><span class="small">added ${esc(day(m.at))}</span></td><td class="r"><button class="btn sm ghost danger" data-rmstaff="${esc(m.id)}">Remove</button></td></tr>`).join('')}</tbody></table>` : '<p class="small">No personal codes yet.</p>'; }
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
const stay = () => { const k = $('#view').scrollTop; paint(); $('#view').scrollTop = k; };
async function onClick(e) {
  const t = e.target.closest('button,a,[data-toggle],.row'); if (!t) return; const d = t.dataset;
  if (d.nav) return nav(d.nav); if (d.client) return nav('client', d.client); if (d.new !== undefined) return newClient(); if (d.tab) return nav('client', arg, d.tab);
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
  if (d.spdf !== undefined) { try { const k = C.contract; await agreementPdf({ title: k.title, text: k.signedText, client: C.client.name, signature: k.signature, countersign: k.countersign, docHash: k.signature.docHash, studio: C.settings.studio }); } catch (er) { toast(er.message, true); } return; }
  if (d.savecs !== undefined) { try { const old = C.client.brands, names = $('#cs-brands').value.split('\n').map(x => x.trim()).filter(Boolean); await api('PATCH', 'staff/clients/' + arg, { name: $('#cs-name').value, status: $('#cs-status').value, brands: names.map((n, i) => ({ id: old[i]?.id || 'b' + (i + 1 + old.length), name: n })) }); await reloadClient(); toast('Saved'); stay(); } catch (er) { toast(er.message, true); } return; }
  if (d.savenotes !== undefined) return void (await put({ notes: $('#cs-notes').value }));
  if (d.reset !== undefined) { if (!confirm('Make a new access code? The old one stops working immediately.')) return; try { const r = await api('POST', `staff/clients/${arg}/resetcode`, {}); codeModal(C.client, r.code, false); } catch (er) { toast(er.message, true); } return; }
  if (d.del !== undefined) { const n = prompt(`Type "${C.client.name}" to delete this workspace for good.`); if (n === null) return; try { await api('DELETE', 'staff/clients/' + arg, { confirm: n }); await reload(); toast('Deleted'); nav('overview'); } catch (er) { toast(er.message, true); } return; }
  if (d.addstaff !== undefined) { try { await api('POST', 'staff/team', { name: $('#tm-name').value, code: $('#tm-code').value }); $('#tm-name').value = $('#tm-code').value = ''; toast('Added'); loadTeam(); } catch (er) { toast(er.message, true); } return; }
  if (d.rmstaff) { if (!confirm('Remove this person? Their personal code stops working.')) return; try { await api('DELETE', 'staff/team', { id: d.rmstaff }); toast('Removed'); loadTeam(); } catch (er) { toast(er.message, true); } return; }
  if (d.savesettings !== undefined) { try { O.settings = await api('PUT', 'staff/settings', { studio: $('#st-studio').value, studioEmail: $('#st-email').value, bandBmId: $('#st-bm').value, governingLaw: $('#st-law').value, contractTitle: $('#st-title').value }); toast('Saved'); } catch (er) { toast(er.message, true); } }
}
document.addEventListener('change', async e => {
  const x = e.target; if (!x.dataset?.cv || !C) return;
  const body = { [x.dataset.cv]: x.value }; try { await api('PATCH', 'staff/clients/' + arg, body); await reloadClient(); $('#cprev').innerHTML = md(rend($('#ctext').value)); toast('Saved'); } catch (er) { toast(er.message, true); }
});
async function contract(action) {
  const body = { action }; if (action === 'save' || action === 'send') body.text = $('#ctext').value; if (action === 'countersign') { body.name = prompt('Countersign as', me.name); if (!body.name) return; }
  try { await api('PUT', `staff/clients/${arg}/contract`, body); await reloadClient(); toast({ save: 'Saved', send: 'Sent to the client', void: 'Voided', reopen: 'Back to draft', countersign: 'Countersigned' }[action]); stay(); } catch (er) { toast(er.message, true); }
}
function addItem() {
  modal(`<h3>Add an item for ${esc(C.client.name)}</h3><form id="ai" class="fgrid"><div class="fld full"><label>What do they need to do?</label><input class="in" name="title" required placeholder="Give us access to the Shopify store"></div>
    <div class="fld"><label>Section</label><select class="in" name="group">${T.groups.filter(g => g.id !== 'admin').map(g => `<option value="${g.id}">${esc(g.title)}</option>`).join('')}</select></div><div class="fld"><label>Required</label><select class="in" name="required"><option value="1">Yes</option><option value="0">Optional</option></select></div>
    <div class="fld full"><label>Why we need it</label><textarea class="in" name="why" style="min-height:70px"></textarea></div><div class="fld full"><label>Steps (one per line)</label><textarea class="in" name="steps" style="min-height:90px"></textarea></div>
    <div class="fld full"><label>Field the client fills (optional)</label><input class="in" name="field" placeholder="e.g. Store URL"></div><div class="full acts"><button class="btn green" type="submit">Add</button><button class="btn ghost" type="button" data-close>Cancel</button></div></form>`, {
    onMount: (m, close) => { $('[data-close]', m).onclick = close; $('#ai', m).onsubmit = async ev => { ev.preventDefault(); const f = Object.fromEntries(new FormData(ev.target)); const it = { group: f.group, kind: f.group, required: f.required === '1', title: f.title, why: f.why, steps: f.steps.split('\n').map(x => x.trim()).filter(Boolean), fields: f.field ? [{ id: 'v', label: f.field, type: 'text' }] : [] }; close(); if (await put({ customItems: [...C.staff.customItems, it] }, 'Added')) stay(); }; },
  });
}
async function poll() {
  if (document.hidden) return;
  try {
    const n = await api('GET', 'staff/overview'), head = n.log[0];
    if (head && head.at !== lastLog) { lastLog = head.at; if (head.who !== me.name) toast(`${head.who} ${head.what}`); }
    const changed = JSON.stringify(n.clients) !== JSON.stringify(O.clients); O = n;
    if (changed && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '') && !$('.modal')) { if (route === 'client') { await reloadClient().catch(() => { }); } stay(); } else side();
  } catch { }
}

import { store, mode } from './store.js';
import { configured, sessionOf, setSession, clearSession, sha, same, hashCode, newCode, newId, newSalt } from './auth.js';
import { GROUPS, CHECKLIST, FORMS, TIMELINE, DEFAULT_SETTINGS, CONTRACT } from './seed.js';
import { send, letter, mailReady, mailWho, ics, gcalLink } from './mail.js';
import { BOOKING, freeSlots, when } from './slots.js';

const MAX_BODY = 400_000;
const bad = (code, msg) => Object.assign(new Error(msg), { code });
const clip = (v, n = 2000) => String(v ?? '').slice(0, n);
const url = v => { const s = clip(v, 500).trim(); return /^https?:\/\//i.test(s) ? s : ''; };
const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const okId = s => /^[a-z0-9:_-]{1,48}$/i.test(String(s));
const now = () => new Date().toISOString();

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = '';
  if (typeof req.body === 'string') raw = req.body;
  else { let n = 0; for await (const ch of req) { n += ch.length; if (n > MAX_BODY) throw bad(413, 'Too large'); raw += ch; } }
  try { return raw ? JSON.parse(raw) : {}; } catch { throw bad(400, 'Bad JSON'); }
}
const ip = req => String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
const mask = s => s.includes(':') ? s.split(':').slice(0, 2).join(':') + ':…' : s.split('.').slice(0, 2).join('.') + '.x.x';
const settings = async () => ({ ...DEFAULT_SETTINGS, ...(await store.get('settings') || {}) });
const log = async (who, what, cid) => { await store.lpush('log', { at: now(), who, what, cid: cid || null }); await store.ltrim('log', 0, 199); };

// ---------- shapes ----------
const pubClient = c => { const { codeHash, salt, ...rest } = c; return rest; };
const pubStaff = s => { const { notes, ...rest } = s; return rest; };
const emptyAnswers = () => ({ checklist: {}, forms: {}, updatedAt: null });
const emptyStaff = () => ({ verify: {}, performance: [], ads: [], invoices: [], links: [], timeline: TIMELINE.map(t => ({ ...t, state: 'todo' })), customItems: [], hidden: [], notes: '', dashboardUrl: '', auto: {} });

const fmtDate = d => { try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return ''; } };
const list = a => a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
const vars = (c, s) => ({
  studio: s.studio, client: c.name, brands: list(c.brands.map(b => b.name)) || c.name, start: fmtDate(c.startDate) || '[start date]',
  fee: Number(c.fee || 0).toLocaleString('en-US'), currency: c.currency || 'USD', accounts: c.accounts || `${c.brands.length || 1} ad account${c.brands.length > 1 ? 's' : ''}`,
  law: c.law || s.governingLaw,
});
export const render = (text, v) => String(text).replace(/\{\{(\w+)\}\}/g, (_, k) => v[k] ?? `{{${k}}}`);

async function bundle(id) {
  const [c, answers, st, contract, msgs, tickets, events] = await Promise.all([store.get(`client:${id}`), store.get(`answers:${id}`), store.get(`staff:${id}`), store.get(`contract:${id}`), store.lrange(`msgs:${id}`, 0, 199), store.get(`tickets:${id}`), store.get(`events:${id}`)]);
  if (!c) throw bad(404, 'Unknown client');
  return { c, answers: answers || emptyAnswers(), st: { ...emptyStaff(), ...(st || {}) }, contract, msgs: msgs.reverse(), tickets: tickets || [], events: events || [] };
}
const items = (st) => [...CHECKLIST, ...(st.customItems || []).map(i => ({ ...i, custom: true }))].filter(i => !(st.hidden || []).includes(i.id));
function summarize({ c, answers, st, contract, tickets = [], events = [] }) {
  const all = items(st).filter(i => i.required !== false);
  const stateOf = i => {
    const v = st.verify[i.id]?.state; if (v) return v;
    if (i.id === 'sign') return contract?.status === 'signed' ? 'verified' : 'todo';
    if (i.owner === 'staff') return st.auto?.[i.id] ? 'verified' : 'todo';
    return answers.checklist[i.id]?.state || 'todo';
  };
  const done = all.filter(i => ['submitted', 'verified', 'na'].includes(stateOf(i))).length;
  const verified = all.filter(i => ['verified', 'na'].includes(stateOf(i))).length;
  return {
    id: c.id, name: c.name, brands: c.brands, status: c.status, startDate: c.startDate, createdAt: c.createdAt,
    total: all.length, done, verified, help: all.filter(i => stateOf(i) === 'help').length,
    awaiting: all.filter(i => stateOf(i) === 'submitted' && i.owner !== 'staff').length, fix: all.filter(i => stateOf(i) === 'needs-fix').length,
    contract: contract?.status || 'draft', lastActive: answers.updatedAt, tickets: tickets.filter(t => t.status === 'open').length, events: events.filter(e => e.status === 'new' && (e.end || e.start) >= now().slice(0, 10)).length,
  };
}

// ---------- handlers ----------
const H = { client: {}, staff: {}, open: {} };

H.open['GET health'] = async () => ({ ok: true, mode, ...configured() });
H.open['POST login/staff'] = async (req, res) => {
  const cfg = configured(); if (!cfg.secret) throw bad(503, 'Staff login is not configured on this server yet.');
  const b = await readBody(req), code = clip(b.code, 200);
  if (await store.hit(`rl:s:${sha(ip(req))}`, 600) > 8) throw bad(429, 'Too many tries. Wait ten minutes.');
  // the team code from the host's environment works for anyone; personal codes made in Settings sign in under their own name
  let name = cfg.staffCode && same(sha(code), sha(process.env.STAFF_CODE)) ? (clip(b.name, 40).trim() || 'Staff') : null, u = null;
  if (!name) { u = ((await store.get('staffusers')) || []).find(x => same(hashCode(code, x.salt), x.hash)); name = u?.name || null; }
  if (!name) throw bad(401, 'That code is not right.');
  // a temporary code only lets the person choose their own (a short session, nothing else works until they do)
  setSession(req, res, { role: 'staff', name, ...(u ? { uid: u.id } : {}), ...(u?.temp ? { temp: true } : {}) }, u?.temp ? 60 * 30 : 60 * 60 * 24 * 7);
  await log(name, u?.temp ? 'signed in with a temporary code' : 'signed in');
  return { role: 'staff', name, mustChange: !!u?.temp };
};
H.open['POST login/client'] = async (req, res) => {
  if (!configured().secret) throw bad(503, 'Login is not configured on this server yet.');
  const b = await readBody(req), email = clip(b.email, 200).trim().toLowerCase();
  if (await store.hit(`rl:c:${sha(ip(req))}`, 600) > 10) throw bad(429, 'Too many tries. Wait ten minutes.');
  const id = email && await store.get(`idx:email:${email}`);
  const c = id && await store.get(`client:${id}`);
  const fail = () => bad(401, 'Email or access code is not right.');
  if (!c || c.status === 'closed') throw fail();
  if (!same(hashCode(b.code, c.salt), c.codeHash)) throw fail();
  setSession(req, res, { role: 'client', cid: c.id, email }, 60 * 60 * 24 * 14);
  const a = (await store.get(`answers:${c.id}`)) || emptyAnswers(); a.firstSeen = a.firstSeen || now(); a.lastSeen = now(); await store.set(`answers:${c.id}`, a);
  await log(c.name, 'signed in', c.id);
  return { role: 'client', name: c.name };
};
H.open['POST logout'] = async (req, res) => { clearSession(res); return { ok: true }; };
H.open['GET me'] = async (req) => {
  const s = sessionOf(req); if (!s) return { role: null };
  if (s.role === 'client') { const c = await store.get(`client:${s.cid}`); return c ? { role: 'client', name: c.name, brands: c.brands } : { role: null }; }
  return { role: 'staff', name: s.name, personal: !!s.uid, mustChange: !!s.temp };
};
H.open['GET template'] = async (req) => { if (!sessionOf(req)) throw bad(401, 'Sign in first'); return { groups: GROUPS, checklist: CHECKLIST, forms: FORMS, timeline: TIMELINE, contract: CONTRACT }; };

// ---------- client ----------
const clientWorkspace = async id => {
  const { c, answers, st, contract, msgs, tickets, events } = await bundle(id), s = await settings(), v = vars(c, s);
  const visible = contract && ['sent', 'signed'].includes(contract.status);
  const sig = contract?.signature;
  return {
    client: pubClient(c), answers, staff: pubStaff(st), msgs, settings: { studio: s.studio, studioEmail: s.studioEmail, bandBmId: s.bandBmId, tz: booking(s).tz }, summary: summarize({ c, answers, st, contract, tickets, events }),
    tickets, events, meetings: (await meetingsAll()).filter(m => m.cid === id).slice(0, 30), feed: (await feedFor(id)).slice(0, 80),
    contract: visible ? { status: contract.status, title: contract.title, text: contract.status === 'signed' ? contract.signedText : render(contract.text, v), sentAt: contract.sentAt, hash: contract.hash,
      signature: sig ? { name: sig.name, title: sig.title, at: sig.at, ip: mask(sig.ip || ''), drawing: sig.drawing, docHash: sig.docHash } : null,
      countersign: contract.countersign || null } : { status: contract?.status === 'void' ? 'void' : 'draft' },
  };
};
H.client['GET workspace'] = async (req, res, s) => clientWorkspace(s.cid);
H.client['PUT answers'] = async (req, res, s) => {
  const b = await readBody(req), a = (await store.get(`answers:${s.cid}`)) || emptyAnswers();
  for (const [id, v] of Object.entries(b.checklist || {})) {
    if (!okId(id) || id === 'sign') continue;
    const cur = a.checklist[id] || {};
    if (v.state !== undefined) { if (!['todo', 'submitted', 'help', 'na'].includes(v.state)) throw bad(400, 'Bad state'); cur.state = v.state; }
    if (v.note !== undefined) cur.note = clip(v.note, 2000);
    if (v.fields && typeof v.fields === 'object') { cur.fields = cur.fields || {}; for (const [f, x] of Object.entries(v.fields)) if (okId(f)) cur.fields[f] = typeof x === 'boolean' ? x : clip(x, 3000); }
    cur.at = now(); a.checklist[id] = cur;
  }
  for (const [fid, v] of Object.entries(b.forms || {})) {
    if (!okId(fid) || typeof v !== 'object') continue;
    a.forms[fid] = a.forms[fid] || {};
    for (const [f, x] of Object.entries(v)) if (okId(f)) a.forms[fid][f] = clip(x, 3000);
  }
  a.updatedAt = now();
  if (JSON.stringify(a).length > 150_000) throw bad(413, 'Too much text');
  await store.set(`answers:${s.cid}`, a);
  if (b.note) { const c = await store.get(`client:${s.cid}`); await log(c.name, clip(b.note, 120), s.cid); }
  return { ok: true, updatedAt: a.updatedAt };
};
H.client['POST message'] = async (req, res, s) => {
  const b = await readBody(req), text = clip(b.text, 3000).trim(); if (!text) throw bad(400, 'Say something first');
  const c = await store.get(`client:${s.cid}`);
  await store.lpush(`msgs:${s.cid}`, { from: 'client', name: c.name, text, at: now() }); await store.ltrim(`msgs:${s.cid}`, 0, 299);
  await log(c.name, 'sent a message', s.cid);
  return { ok: true };
};
H.client['POST sign'] = async (req, res, s) => {
  const b = await readBody(req), { c, contract, st } = await bundle(s.cid), set = await settings();
  if (!contract || contract.status !== 'sent') throw bad(409, contract?.status === 'signed' ? 'Already signed.' : 'The agreement is not ready to sign yet.');
  const name = clip(b.name, 120).trim(), title = clip(b.title, 120).trim();
  if (name.length < 3) throw bad(400, 'Type your full name.');
  if (!b.consent) throw bad(400, 'Tick the box to confirm.');
  const drawing = String(b.drawing || ''); if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(drawing) || drawing.length > 160_000 || drawing.length < 800) throw bad(400, 'Draw your signature in the box.');
  const text = render(contract.text, vars(c, set)), at = now();
  const docHash = sha(`${text}\n${name}\n${at}`);
  Object.assign(contract, { status: 'signed', signedText: text, hash: sha(text), signature: { name, title, at, ip: ip(req), ua: clip(req.headers['user-agent'], 200), drawing, docHash } });
  await store.set(`contract:${s.cid}`, contract);
  await log(c.name, `signed the agreement (${name})`, s.cid);
  return clientWorkspace(s.cid);
};

// ---------- staff ----------
const cleanStaff = (k, v) => {
  const arr = (a, n) => (Array.isArray(a) ? a.slice(0, n) : []);
  const id = x => okId(x) ? String(x) : newId(6);
  switch (k) {
    case 'verify': return Object.fromEntries(Object.entries(v || {}).filter(([i]) => okId(i)).map(([i, x]) => [i, { state: ['verified', 'needs-fix', ''].includes(x?.state) ? x.state : '', comment: clip(x?.comment, 600) }]).filter(([, x]) => x.state || x.comment));
    case 'auto': return Object.fromEntries(Object.entries(v || {}).filter(([i]) => okId(i)).map(([i, x]) => [i, !!x]));
    case 'performance': return arr(v, 600).map(r => ({ id: id(r.id), date: clip(r.date, 10), brand: clip(r.brand, 80), spend: num(r.spend), results: num(r.results), label: clip(r.label || 'Results', 40), revenue: num(r.revenue), note: clip(r.note, 300) }));
    case 'ads': return arr(v, 200).map(r => ({ id: id(r.id), brand: clip(r.brand, 80), name: clip(r.name, 120), status: ['live', 'review', 'paused', 'ended', 'draft'].includes(r.status) ? r.status : 'draft', platform: clip(r.platform || 'Meta', 30), link: url(r.link), thumb: url(r.thumb), note: clip(r.note, 300) }));
    case 'invoices': return arr(v, 120).map(r => ({ id: id(r.id), no: clip(r.no, 40), amount: num(r.amount), currency: clip(r.currency || 'USD', 5), status: ['due', 'paid', 'draft'].includes(r.status) ? r.status : 'due', due: clip(r.due, 10), link: url(r.link), note: clip(r.note, 200) }));
    case 'links': return arr(v, 60).map(r => ({ id: id(r.id), label: clip(r.label, 80), url: url(r.url), kind: clip(r.kind || 'link', 20) })).filter(r => r.url);
    case 'timeline': return arr(v, 20).map(r => ({ id: id(r.id), weeks: clip(r.weeks, 20), title: clip(r.title, 80), body: clip(r.body, 600), state: ['todo', 'now', 'done'].includes(r.state) ? r.state : 'todo' }));
    case 'customItems': return arr(v, 40).map(r => ({ id: id(r.id), group: GROUPS.some(g => g.id === r.group) ? r.group : 'access', kind: clip(r.kind || r.group, 12), required: r.required !== false, title: clip(r.title, 160), why: clip(r.why, 400), steps: arr(r.steps, 8).map(x => clip(x, 300)), fields: arr(r.fields, 6).map(f => ({ id: id(f.id), label: clip(f.label, 100), type: ['text', 'url', 'email', 'area', 'check'].includes(f.type) ? f.type : 'text' })) }));
    case 'hidden': return arr(v, 80).filter(okId);
    case 'notes': return clip(v, 8000);
    case 'dashboardUrl': return url(v);
    default: return undefined;
  }
};

H.staff['GET overview'] = async () => {
  const ids = await store.smembers('clients');
  const rows = [];
  for (const id of ids) { try { rows.push(summarize(await bundle(id))); } catch { } }
  rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const tickets = [];
  for (const id of ids) for (const t of (await store.get(`tickets:${id}`)) || []) if (t.status !== 'closed') tickets.push({ ...brief(t), cid: id, client: rows.find(r => r.id === id)?.name || '' });
  tickets.sort((a, b) => b.updated.localeCompare(a.updated));
  // events from today on, across clients, soonest first
  const today = new Date().toISOString().slice(0, 10), events = [];
  for (const id of ids) for (const e of (await store.get(`events:${id}`)) || []) if ((e.end || e.start) >= today && e.status !== 'done') events.push({ ...e, cid: id, client: rows.find(r => r.id === id)?.name || '' });
  events.sort((a, b) => a.start.localeCompare(b.start));
  return { clients: rows, log: await store.lrange('log', 0, 59), settings: await settings(), mode, mail: mailReady(), tickets, meetings: upcoming(await meetingsAll()), events };
};
H.staff['POST clients'] = async (req, res, s) => {
  const b = await readBody(req), set = await settings();
  const name = clip(b.name, 100).trim(), email = clip(b.contactEmail, 200).trim().toLowerCase();
  if (!name) throw bad(400, 'The client needs a name.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw bad(400, 'A valid contact email is needed. It is their login.');
  const extra = [].concat(b.extraEmails || []).flatMap(x => String(x).split(/[,\s;]+/)).map(x => x.trim().toLowerCase()).filter(x => x && x !== email).slice(0, 5);
  for (const e of [email, ...extra]) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw bad(400, `${clip(e, 60)} is not a valid email.`);
    if (await store.get(`idx:email:${e}`)) throw bad(409, `${clip(e, 60)} already has a workspace.`);
  }
  const id = newId(8), code = newCode(), salt = newSalt();
  const brands = (Array.isArray(b.brands) ? b.brands : []).map(x => clip(x, 60).trim()).filter(Boolean).slice(0, 8).map((n, i) => ({ id: 'b' + (i + 1), name: n }));
  const c = { id, name, brands: brands.length ? brands : [{ id: 'b1', name }], contacts: [{ name: clip(b.contactName, 80), email }, ...extra.map(e => ({ name: '', email: e }))], status: 'invited', startDate: clip(b.startDate, 10), createdAt: now(), createdBy: s.name,
    fee: num(b.fee) || 1200, currency: clip(b.currency || 'USD', 5), accounts: clip(b.accounts, 80), salt, codeHash: hashCode(code, salt) };
  await store.set(`client:${id}`, c);
  await store.set(`answers:${id}`, emptyAnswers());
  await store.set(`staff:${id}`, emptyStaff());
  await store.set(`contract:${id}`, { status: 'draft', title: set.contractTitle, text: CONTRACT, version: 1 });
  for (const e of [email, ...extra]) await store.set(`idx:email:${e}`, id);
  await store.sadd('clients', id);
  await log(s.name, `created the workspace for ${name}`, id);
  return { client: pubClient(c), code };
};
H.staff['GET client'] = async (req, res, s, q) => {
  const { c, answers, st, contract, msgs, tickets, events } = await bundle(q.id), set = await settings();
  return { client: pubClient(c), answers, staff: st, contract: contract && { ...contract, rendered: render(contract.text, vars(c, set)) }, msgs, summary: summarize({ c, answers, st, contract, tickets, events }), settings: set,
    tickets, events, feed: await feedFor(q.id), meetings: (await meetingsAll()).filter(m => m.cid === q.id).slice(0, 40) };
};
H.staff['PATCH client'] = async (req, res, s, q) => {
  const b = await readBody(req), { c } = await bundle(q.id);
  if (b.name !== undefined) c.name = clip(b.name, 100).trim() || c.name;
  if (b.startDate !== undefined) c.startDate = clip(b.startDate, 10);
  if (b.fee !== undefined) c.fee = num(b.fee);
  if (b.currency !== undefined) c.currency = clip(b.currency, 5);
  if (b.accounts !== undefined) c.accounts = clip(b.accounts, 80);
  if (b.law !== undefined) c.law = clip(b.law, 120);
  if (b.status !== undefined && ['invited', 'active', 'paused', 'closed'].includes(b.status)) c.status = b.status;
  if (Array.isArray(b.brands)) c.brands = b.brands.slice(0, 8).map((x, i) => ({ id: okId(x.id) ? x.id : 'b' + (i + 1), name: clip(x.name, 60).trim() })).filter(x => x.name);
  await store.set(`client:${q.id}`, c); await log(s.name, `updated ${c.name}`, q.id);
  return { client: pubClient(c) };
};
// the people on a workspace. The first email is the login and every email gets our notifications.
// Changing an email moves the login and the events and tickets it submitted, so replies keep reaching the new address.
H.staff['PUT contacts'] = async (req, res, s, q) => {
  const b = await readBody(req), { c } = await bundle(q.id), set = await settings(), ok = x => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x);
  const list = (Array.isArray(b.contacts) ? b.contacts : []).slice(0, 6).map(x => ({ was: clip(x.was, 200).trim().toLowerCase(), name: clip(x.name, 80).trim(), email: clip(x.email, 200).trim().toLowerCase() })).filter(x => x.email);
  if (!list.length) throw bad(400, 'Keep at least one email. The first one is their login.');
  const before = emailsOf(c), seen = new Set();
  for (const x of list) {
    if (!ok(x.email)) throw bad(400, `${clip(x.email, 60)} is not a valid email.`);
    if (seen.has(x.email)) throw bad(400, `${clip(x.email, 60)} is in the list twice.`); seen.add(x.email);
    const owner = await store.get(`idx:email:${x.email}`); if (owner && owner !== q.id) throw bad(409, `${clip(x.email, 60)} already has another workspace.`);
  }
  const moved = Object.fromEntries(list.filter(x => x.was && x.was !== x.email && before.includes(x.was)).map(x => [x.was, x.email]));
  for (const e of before) if (!seen.has(e)) await store.del(`idx:email:${e}`);
  for (const x of list) await store.set(`idx:email:${x.email}`, q.id);
  c.contacts = list.map(({ name, email }) => ({ name, email }));
  await store.set(`client:${q.id}`, c);
  if (Object.keys(moved).length) {
    const evs = await eventsOf(q.id), tks = (await store.get(`tickets:${q.id}`)) || [];
    for (const e of evs) if (moved[e.by]) e.by = moved[e.by];
    for (const t of tks) if (moved[t.by]) t.by = moved[t.by];
    await saveEvents(q.id, evs); await store.set(`tickets:${q.id}`, tks);
  }
  const fresh = list.filter(x => !before.includes(x.email)).map(x => x.email);
  if (fresh.length) await send({ to: fresh, replyTo: set.studioEmail, subject: `${set.studio} · your portal email`,
    ...letter({ title: 'This email is now on your portal', lines: [`${c.name}: notifications from ${set.studio} now come to this address.`, fresh.includes(list[0].email) ? `Sign in with ${list[0].email} and your access code.` : `The login stays ${list[0].email}.`],
      button: { label: 'Open the portal', url: portal(req) } }) });
  await log(s.name, `updated the emails for ${c.name}: ${list.map(x => x.email).join(', ')}`, q.id);
  return { client: pubClient(c) };
};
H.staff['POST resetcode'] = async (req, res, s, q) => {
  const { c } = await bundle(q.id), code = newCode(); c.salt = newSalt(); c.codeHash = hashCode(code, c.salt);
  await store.set(`client:${q.id}`, c); await log(s.name, `made a new access code for ${c.name}`, q.id);
  return { code };
};
H.staff['PUT staffdata'] = async (req, res, s, q) => {
  const b = await readBody(req), { c, st } = await bundle(q.id);
  for (const k of Object.keys(b)) { const v = cleanStaff(k, b[k]); if (v !== undefined) st[k] = v; }
  await store.set(`staff:${q.id}`, st);
  if (b.note) await log(s.name, clip(b.note, 120), q.id);
  return { staff: st, summary: summarize({ c, answers: (await store.get(`answers:${q.id}`)) || emptyAnswers(), st, contract: await store.get(`contract:${q.id}`), tickets: (await store.get(`tickets:${q.id}`)) || [], events: await eventsOf(q.id) }) };
};
H.staff['PUT contract'] = async (req, res, s, q) => {
  const b = await readBody(req), { c, contract } = await bundle(q.id), set = await settings();
  const act = b.action || 'save';
  if (contract.status === 'signed' && act !== 'countersign' && act !== 'void') throw bad(409, 'The agreement is signed and locked.');
  if (b.text !== undefined) contract.text = clip(b.text, 40_000);
  if (act === 'send') { if (/\[start date\]|\[[^\]]*to be confirmed[^\]]*\]|\{\{\w+\}\}/.test(render(contract.text, vars(c, set)))) throw bad(400, 'There are unfilled placeholders in the text.'); contract.status = 'sent'; contract.sentAt = now(); c.status = c.status === 'invited' ? 'active' : c.status; await store.set(`client:${q.id}`, c); }
  if (act === 'void') { contract.status = 'void'; }
  if (act === 'reopen') { contract.status = 'draft'; }
  if (act === 'countersign') { if (contract.status !== 'signed') throw bad(409, 'The client has not signed yet.'); contract.countersign = { name: clip(b.name || s.name, 80), at: now() }; }
  contract.version = (contract.version || 1) + (act === 'save' ? 1 : 0);
  await store.set(`contract:${q.id}`, contract); await log(s.name, `agreement: ${act}`, q.id);
  return { contract: { ...contract, rendered: render(contract.text, vars(c, set)) } };
};
H.staff['POST message'] = async (req, res, s, q) => {
  const b = await readBody(req), text = clip(b.text, 3000).trim(); if (!text) throw bad(400, 'Say something first');
  await store.lpush(`msgs:${q.id}`, { from: 'staff', name: s.name, text, at: now() }); await store.ltrim(`msgs:${q.id}`, 0, 299);
  return { ok: true };
};
H.staff['DELETE client'] = async (req, res, s, q) => {
  const b = await readBody(req), { c } = await bundle(q.id);
  if (b.confirm !== c.name) throw bad(400, 'Type the client name to confirm.');
  for (const k of [`client:${q.id}`, `answers:${q.id}`, `staff:${q.id}`, `contract:${q.id}`, `msgs:${q.id}`, `tickets:${q.id}`, `events:${q.id}`, `feed:${q.id}`]) await store.del(k);
  await store.set('meetings', (await meetingsAll()).filter(m => m.cid !== q.id));
  for (const x of c.contacts || []) await store.del(`idx:email:${x.email}`);
  await store.srem('clients', q.id); await log(s.name, `deleted ${c.name}`);
  return { ok: true };
};
H.staff['GET team'] = async () => ({ team: ((await store.get('staffusers')) || []).map(({ id, name, at, temp, changedAt }) => ({ id, name, at, temp: !!temp, changedAt })) });
H.staff['POST team'] = async (req, res, s) => {
  const b = await readBody(req), name = clip(b.name, 40).trim(), code = clip(b.code, 100);
  if (name.length < 2) throw bad(400, 'Give the person a name.');
  if (code.trim().length < 6) throw bad(400, 'The code needs at least 6 characters.');
  const users = (await store.get('staffusers')) || [];
  if (users.some(x => x.name.toLowerCase() === name.toLowerCase())) throw bad(409, 'That name already has a code.');
  if (users.some(x => same(hashCode(code, x.salt), x.hash)) || (configured().staffCode && same(sha(code), sha(process.env.STAFF_CODE)))) throw bad(409, 'Pick a different code. This one is already in use.');
  const salt = newSalt(); users.push({ id: newId(5), name, salt, hash: hashCode(code, salt), at: now(), temp: true });
  await store.set('staffusers', users.slice(0, 30)); await log(s.name, `added ${name} to the staff with a temporary code`);
  return { ok: true };
};
H.staff['DELETE team'] = async (req, res, s) => {
  const b = await readBody(req), users = (await store.get('staffusers')) || [], u = users.find(x => x.id === b.id);
  if (!u) throw bad(404, 'Not found'); if (u.name === s.name) throw bad(400, 'You cannot remove yourself.');
  await store.set('staffusers', users.filter(x => x.id !== b.id)); await log(s.name, `removed ${u.name} from the staff`);
  return { ok: true };
};
// choose your own code: required after signing in with a temporary one, and open any time after that
H.staff['POST mycode'] = async (req, res, s) => {
  if (!s.uid) throw bad(400, 'You signed in with the team code. Personal codes are made in Settings, Staff team.');
  const b = await readBody(req), code = clip(b.code, 100);
  if (code.trim().length < 8) throw bad(400, 'Your code needs at least 8 characters.');
  const users = (await store.get('staffusers')) || [], u = users.find(x => x.id === s.uid);
  if (!u) throw bad(401, 'Sign in again.');
  if (same(hashCode(code, u.salt), u.hash)) throw bad(400, 'Pick a code different from the temporary one.');
  if (users.some(x => x.id !== u.id && same(hashCode(code, x.salt), x.hash)) || (configured().staffCode && same(sha(code), sha(process.env.STAFF_CODE)))) throw bad(409, 'Pick a different code. This one is already in use.');
  u.salt = newSalt(); u.hash = hashCode(code, u.salt); delete u.temp; u.changedAt = now();
  await store.set('staffusers', users);
  setSession(req, res, { role: 'staff', name: u.name, uid: u.id }, 60 * 60 * 24 * 7);
  await log(u.name, 'chose their own code');
  return { ok: true, name: u.name };
};
H.staff['GET settings'] = async () => settings();
H.staff['PUT settings'] = async (req) => {
  const b = await readBody(req), cur = await settings();
  const next = { ...cur, studio: clip(b.studio ?? cur.studio, 40), studioEmail: clip(b.studioEmail ?? cur.studioEmail, 120), bandBmId: clip(b.bandBmId ?? cur.bandBmId, 40).replace(/\D/g, ''), governingLaw: clip(b.governingLaw ?? cur.governingLaw, 120), contractTitle: clip(b.contractTitle ?? cur.contractTitle, 120) };
  await store.set('settings', next); return next;
};

// ---------- support: tickets ----------
// A ticket is one topic with its own thread. open = waiting on us, answered = waiting on the client, closed = solved.
const TCATS = { question: 'Question', problem: 'Problem', request: 'Request', billing: 'Billing', other: 'Other' };
const brief = t => { const l = t.thread.at(-1); return { id: t.id, no: t.no, subject: t.subject, cat: t.cat, priority: t.priority, status: t.status, updated: t.updated, unread: l?.from === 'client' && !(t.seenStaff >= l.at) }; };
const portal = req => { const host = req.headers['x-forwarded-host'] || req.headers.host || ''; return `${/^(localhost|127\.)/.test(host) ? 'http' : 'https'}://${host}/portal/`; };
const nameOf = (c, email) => c.contacts.find(x => x.email === email)?.name || c.name;
const emailsOf = c => c.contacts.map(x => x.email).filter(Boolean);
async function ticketOf(cid, id) { const all = (await store.get(`tickets:${cid}`)) || [], t = all.find(x => x.id === id); if (!t) throw bad(404, 'No such ticket'); return [all, t]; }
const saveTickets = (cid, all) => store.set(`tickets:${cid}`, all.slice(0, 150));
const toStudio = (req, cid, t, title, text, who, email, set, c) => send({ to: set.studioEmail, replyTo: email, subject: `${t.priority === 'urgent' ? 'URGENT · ' : ''}${t.thread.length > 1 ? 'Re: ' : ''}Ticket #${t.no} · ${c.name} · ${t.subject}`,
  ...letter({ title, lines: [`${TCATS[t.cat]}${t.priority === 'urgent' ? ', marked urgent' : ''}. From ${who} (${email}).`, `Subject: ${t.subject}`], quote: text, button: { label: 'Answer in the portal', url: `${portal(req)}#client/${cid}/tickets/${t.id}` } }) });

H.client['POST ticket'] = async (req, res, s) => {
  const b = await readBody(req), subject = clip(b.subject, 140).trim(), text = clip(b.text, 5000).trim();
  if (subject.length < 3) throw bad(400, 'Give the ticket a short subject.');
  if (!text) throw bad(400, 'Tell us what it is about.');
  const c = await store.get(`client:${s.cid}`), all = (await store.get(`tickets:${s.cid}`)) || [], set = await settings();
  if (all.filter(t => t.status !== 'closed').length >= 20) throw bad(429, 'You have 20 open tickets. Close the solved ones first.');
  const at = now(), who = nameOf(c, s.email);
  const t = { id: newId(6), no: await store.incr('seq:ticket'), subject, cat: TCATS[b.cat] ? b.cat : 'question', priority: b.priority === 'urgent' ? 'urgent' : 'normal', status: 'open', at, updated: at, by: s.email, seenClient: at, seenStaff: '', thread: [{ from: 'client', name: who, text, at }] };
  all.unshift(t); await saveTickets(s.cid, all); await log(c.name, `opened ticket #${t.no}: ${subject}`, s.cid);
  await toStudio(req, s.cid, t, `${c.name} opened ticket #${t.no}`, text, who, s.email, set, c);
  return { ticket: t };
};
H.client['POST reply'] = async (req, res, s) => {
  const b = await readBody(req), text = clip(b.text, 5000).trim(); if (!text) throw bad(400, 'Write something first.');
  const c = await store.get(`client:${s.cid}`), [all, t] = await ticketOf(s.cid, b.id), at = now(), who = nameOf(c, s.email), set = await settings();
  t.thread = [...t.thread, { from: 'client', name: who, text, at }].slice(-200); Object.assign(t, { status: 'open', updated: at, seenClient: at });
  await saveTickets(s.cid, all); await log(c.name, `replied on ticket #${t.no}`, s.cid);
  await toStudio(req, s.cid, t, `${who} replied on ticket #${t.no}`, text, who, s.email, set, c);
  return { ticket: t };
};
H.client['PUT ticket'] = async (req, res, s) => {
  const b = await readBody(req), [all, t] = await ticketOf(s.cid, b.id);
  if (['open', 'closed'].includes(b.status) && b.status !== t.status) { t.status = b.status; t.updated = now(); const c = await store.get(`client:${s.cid}`); await log(c.name, `${b.status === 'closed' ? 'closed' : 'reopened'} ticket #${t.no}`, s.cid); }
  if (b.seen) t.seenClient = now();
  await saveTickets(s.cid, all); return { ticket: t };
};
H.staff['POST reply'] = async (req, res, s, q) => {
  const b = await readBody(req), text = clip(b.text, 5000).trim(); if (!text) throw bad(400, 'Write something first.');
  const { c } = await bundle(q.id), [all, t] = await ticketOf(q.id, b.tid), at = now(), set = await settings();
  t.thread = [...t.thread, { from: 'staff', name: s.name, text, at }].slice(-200); Object.assign(t, { status: b.close ? 'closed' : 'answered', updated: at, seenStaff: at });
  await saveTickets(q.id, all); await log(s.name, `answered ticket #${t.no} for ${c.name}`, q.id);
  await send({ to: emailsOf(c), replyTo: set.studioEmail, subject: `Re: ${t.subject} (ticket #${t.no})`,
    ...letter({ title: `${set.studio} answered your ticket`, lines: [`Ticket #${t.no}: ${t.subject}`, `${s.name} wrote:`], quote: text, button: { label: 'Open the ticket', url: `${portal(req)}#support/${t.id}` },
      small: b.close ? 'We marked this ticket as solved. Reply in the portal to reopen it.' : 'Please reply in the portal, so the whole team sees it.' }) });
  return { ticket: t };
};
H.staff['PUT ticket'] = async (req, res, s, q) => {
  const b = await readBody(req), [all, t] = await ticketOf(q.id, b.tid);
  if (['open', 'answered', 'closed'].includes(b.status) && b.status !== t.status) { t.status = b.status; t.updated = now(); await log(s.name, `set ticket #${t.no} to ${b.status}`, q.id); }
  if (b.seen) t.seenStaff = now();
  await saveTickets(q.id, all); return { ticket: t };
};

// ---------- support: meetings ----------
// Clients pick a free slot from the hours set in Settings. The studio's Gmail gets an invite from the client
// (Yes / No buttons, and it lands in the calendar), plus a one-click Google Calendar link as a fallback.
function booking(s) { return { ...BOOKING, ...(s.booking || {}) }; }
async function meetingsAll() { return (await store.get('meetings')) || []; }
const upcoming = (all, cid) => all.filter(m => m.status === 'booked' && Date.parse(m.end) > Date.now() && (!cid || m.cid === cid)).sort((a, b) => a.start.localeCompare(b.start));
const saveMeetings = all => store.set('meetings', all.sort((a, b) => b.start.localeCompare(a.start)).slice(0, 600));

async function meetingMail(req, m, c, set, cfg, cancelledBy) {
  const at = `${when(m.start, cfg.tz)} (${cfg.tz.split('/').pop().replace('_', ' ')} time)`, title = `${c.name} × ${set.studio} · ${m.topic}`, cancel = !!cancelledBy;
  const details = [`Topic: ${m.topic}`, m.note && `Note: ${m.note}`, `Booked by ${m.byName} (${m.by}) in the ${set.studio} portal.`].filter(Boolean).join('\n');
  const guests = [...new Set([m.by, ...emailsOf(c)])], base = { uid: m.uid, seq: m.seq, start: m.start, end: m.end, title, description: details, status: cancel ? 'CANCELLED' : 'CONFIRMED' };
  const studioInvite = ics({ ...base, method: cancel ? 'CANCEL' : 'REQUEST', organizer: { name: m.byName, email: m.by }, attendees: [{ name: set.studio, email: set.studioEmail }] });
  await send({ to: set.studioEmail, replyTo: m.by, subject: cancel ? `Cancelled: ${c.name} · ${at}` : `Meeting booked: ${c.name} · ${at}`, invite: { method: cancel ? 'CANCEL' : 'REQUEST', content: studioInvite },
    ...letter({ title: cancel ? `${cancelledBy} cancelled the meeting with ${c.name}` : `${m.byName} from ${c.name} booked a meeting`, lines: [`${at}, ${Math.round((Date.parse(m.end) - Date.parse(m.start)) / 60000)} minutes.`, `Topic: ${m.topic}`], quote: m.note || undefined,
      button: cancel ? undefined : { label: 'Add to Google Calendar', url: gcalLink({ start: m.start, end: m.end, title, details, guests }) },
      small: cancel ? 'The slot is free again in the portal.' : 'The invite is attached: press Yes and it is in the calendar. If it does not show up, the button adds it with the client as a guest, and Google sends them the invite.' }) });
  const clientCopy = ics({ ...base, method: cancel ? 'CANCEL' : 'PUBLISH', organizer: { name: set.studio, email: set.studioEmail }, attendees: guests.map(email => ({ email })) });
  await send({ to: guests, replyTo: set.studioEmail, subject: cancel ? `Cancelled: your meeting with ${set.studio} on ${at}` : `Booked: your meeting with ${set.studio} on ${at}`, invite: { method: cancel ? 'CANCEL' : 'PUBLISH', content: clientCopy },
    ...letter({ title: cancel ? 'Your meeting is cancelled' : 'Your meeting is booked', lines: [at, `Topic: ${m.topic}`, cancel ? `Cancelled by ${cancelledBy}.` : 'The calendar file is attached. We send the video link before the call.'], button: { label: cancel ? 'Book another time' : 'See it in the portal', url: `${portal(req)}#meetings` } }) });
}
async function cancelMeeting(cid, mid, who) {
  const all = await meetingsAll(), m = all.find(x => x.id === mid && x.cid === cid);
  if (!m) throw bad(404, 'No such meeting'); if (m.status !== 'booked') throw bad(409, 'This meeting is already cancelled.');
  Object.assign(m, { status: 'cancelled', seq: (m.seq || 0) + 1, cancelledBy: who, cancelledAt: now() }); await saveMeetings(all); return m;
}

H.client['GET slots'] = async () => { const cfg = booking(await settings()); return { tz: cfg.tz, length: cfg.length, on: cfg.on, slots: cfg.on ? freeSlots(cfg, upcoming(await meetingsAll())) : [] }; };
H.client['POST meeting'] = async (req, res, s) => {
  const b = await readBody(req), set = await settings(), cfg = booking(set);
  if (!cfg.on) throw bad(409, 'Booking is closed right now. Open a ticket and we will find a time.');
  const all = await meetingsAll(), slot = freeSlots(cfg, upcoming(all)).find(x => x.start === b.start);
  if (!slot) throw bad(409, 'That time was just taken. Pick another one.');
  if (upcoming(all, s.cid).length >= cfg.max) throw bad(429, `You already have ${cfg.max} meetings booked. Cancel one to book another.`);
  const c = await store.get(`client:${s.cid}`), id = newId(8);
  const m = { id, uid: `${id}@portal.band`, seq: 0, cid: s.cid, client: c.name, start: slot.start, end: slot.end, topic: clip(b.topic, 100).trim() || 'Catch-up', note: clip(b.note, 1000).trim(), by: s.email, byName: nameOf(c, s.email), status: 'booked', at: now() };
  all.push(m); await saveMeetings(all); await log(c.name, `booked a meeting for ${when(m.start, cfg.tz)}`, s.cid);
  await meetingMail(req, m, c, set, cfg);
  return { meeting: m };
};
H.client['PUT meeting'] = async (req, res, s) => {
  const b = await readBody(req), set = await settings(), cfg = booking(set), c = await store.get(`client:${s.cid}`), who = nameOf(c, s.email);
  const m = await cancelMeeting(s.cid, b.id, who); await log(c.name, `cancelled the meeting on ${when(m.start, cfg.tz)}`, s.cid);
  await meetingMail(req, m, c, set, cfg, who); return { meeting: m };
};
H.staff['PUT meeting'] = async (req, res, s, q) => {
  const b = await readBody(req), set = await settings(), cfg = booking(set), { c } = await bundle(q.id);
  const m = await cancelMeeting(q.id, b.mid, s.name); await log(s.name, `cancelled the meeting with ${c.name} on ${when(m.start, cfg.tz)}`, q.id);
  await meetingMail(req, m, c, set, cfg, s.name); return { meeting: m };
};
H.staff['PUT booking'] = async (req) => {
  const b = await readBody(req), cur = await settings(), old = booking(cur), hm = (v, d) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : d, n = (v, lo, hi, d) => { const x = Math.round(Number(v)); return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d; };
  const next = { ...old, on: !!b.on, days: [...new Set((Array.isArray(b.days) ? b.days : []).map(Number).filter(d => d >= 0 && d <= 6))], from: hm(b.from, old.from), to: hm(b.to, old.to),
    length: [15, 20, 30, 45, 60].includes(Number(b.length)) ? Number(b.length) : old.length, notice: n(b.notice, 0, 336, old.notice), ahead: n(b.ahead, 1, 90, old.ahead), max: n(b.max, 1, 10, old.max),
    blocked: [].concat(b.blocked || []).flatMap(x => String(x).split(/[,\s]+/)).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x)).slice(0, 60) };
  if (next.from >= next.to) throw bad(400, 'The day has to end after it starts.');
  const all = { ...cur, booking: next }; await store.set('settings', all); return all;
};
H.staff['POST testmail'] = async (req, res, s) => {
  if (!mailReady()) throw bad(409, 'Email is not set up yet. Add GMAIL_USER and GMAIL_APP_PASSWORD in Vercel, then redeploy.');
  const set = await settings();
  if (!await send({ to: set.studioEmail, subject: `Test from the ${set.studio} portal`, ...letter({ title: 'Email works.', lines: [`${s.name} sent this test from the portal settings.`, 'New tickets, replies and meeting bookings arrive here.'] }) })) { const w = mailWho(); throw bad(502, `Gmail refused the sign-in as "${w.user}" with a ${w.passLength}-letter app password${w.passLength === 16 ? '' : ' (it should be 16)'}. Check both in Vercel.`); }
  return { ok: true };
};

// ---------- client events: launches, sales, openings we should plan ads around ----------
// The client adds them; staff set a status and leave a comment. new = not seen yet, planned = in our plan, live = ads running, done.
const ESTATES = ['new', 'planned', 'live', 'done'];
const ymd = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? String(v) : '';
const eventsOf = async cid => (await store.get(`events:${cid}`)) || [];
const saveEvents = (cid, all) => store.set(`events:${cid}`, all.sort((a, b) => a.start.localeCompare(b.start)).slice(-200));

H.client['POST event'] = async (req, res, s) => {
  const b = await readBody(req), c = await store.get(`client:${s.cid}`), all = await eventsOf(s.cid), set = await settings();
  const title = clip(b.title, 120).trim(), start = ymd(b.start), end = ymd(b.end);
  if (title.length < 2) throw bad(400, 'Give the event a name.');
  if (!start) throw bad(400, 'Pick the date of the event.');
  if (end && end < start) throw bad(400, 'The end date is before the start date.');
  const old = b.id ? all.find(e => e.id === b.id) : null; if (b.id && !old) throw bad(404, 'No such event');
  if (!old && all.length >= 200) throw bad(429, 'That is a lot of events. Remove old ones first.');
  const fields = { title, start, end, segment: clip(b.segment, 60).trim(), brand: clip(b.brand, 60).trim(), audience: clip(b.audience, 300).trim(), offer: clip(b.offer, 300).trim(), description: clip(b.description, 4000).trim(), link: url(b.link), updated: now() };
  const e = old ? Object.assign(old, fields) : { id: newId(6), ...fields, at: now(), by: s.email, status: 'new', comment: '' };
  if (!old) all.push(e); await saveEvents(s.cid, all);
  await log(c.name, `${old ? 'updated' : 'added'} the event "${title}" (${start})`, s.cid);
  const span = end && end !== start ? `${start} to ${end}` : start;
  await send({ to: set.studioEmail, replyTo: s.email, subject: `${old ? 'Event updated' : 'New event'}: ${c.name} · ${title} · ${span}`,
    ...letter({ title: `${nameOf(c, s.email)} ${old ? 'updated' : 'added'} an event`, lines: [`${title}, ${span}.`, ...[['Segment', e.segment], ['Brand', e.brand], ['Audience', e.audience], ['Offer', e.offer], ['Link', e.link]].filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`)],
      quote: e.description || undefined, button: { label: 'Open in the portal', url: `${portal(req)}#client/${s.cid}/events/${e.id}` } }) });
  return { event: e };
};
H.client['DELETE event'] = async (req, res, s) => {
  const b = await readBody(req), all = await eventsOf(s.cid), e = all.find(x => x.id === b.id); if (!e) throw bad(404, 'No such event');
  await saveEvents(s.cid, all.filter(x => x.id !== b.id)); const c = await store.get(`client:${s.cid}`); await log(c.name, `removed the event "${e.title}"`, s.cid);
  return { ok: true };
};
H.staff['PUT event'] = async (req, res, s, q) => {
  const b = await readBody(req), all = await eventsOf(q.id), e = all.find(x => x.id === b.eid); if (!e) throw bad(404, 'No such event');
  if (ESTATES.includes(b.status)) e.status = b.status; if (b.comment !== undefined) e.comment = clip(b.comment, 1000).trim();
  e.seen = now(); await saveEvents(q.id, all); await log(s.name, `set the event "${e.title}" to ${e.status}`, q.id);
  return { event: e };
};
// a conversation on each event. Our replies are emailed from the studio Gmail to the address the client submitted the event with,
// and each one records whether the email went out; the client opening their Events page marks our replies as seen.
const replyThread = e => { if (!e.replies) { e.replies = e.comment ? [{ id: newId(6), from: 'staff', name: 'band.', text: e.comment, at: e.seen || e.at }] : []; e.comment = ''; } return e.replies; };
H.staff['POST eventreply'] = async (req, res, s, q) => {
  const b = await readBody(req), text = clip(b.text, 4000).trim(); if (!text) throw bad(400, 'Write a reply first.');
  const all = await eventsOf(q.id), e = all.find(x => x.id === b.eid); if (!e) throw bad(404, 'No such event');
  const c = await store.get(`client:${q.id}`), set = await settings(), at = now();
  if (ESTATES.includes(b.status)) e.status = b.status;
  // the person who submitted the event, if they are still a contact; otherwise every contact on the account
  const to = emailsOf(c).includes(e.by) ? [e.by] : emailsOf(c);
  const r = { id: newId(6), from: 'staff', name: s.name, text, at, mailedTo: to };
  r.mailed = await send({ to, replyTo: set.studioEmail, subject: `Re: your event "${e.title}" · ${set.studio}`,
    ...letter({ title: `${set.studio} replied about your event`, lines: [`${e.title}, ${e.end && e.end !== e.start ? `${e.start} to ${e.end}` : e.start}.`, `${s.name} wrote:`], quote: text,
      button: { label: 'Reply on this event', url: `${portal(req)}#events/${e.id}` }, small: 'Reply under the event in the portal. We get an email the moment you do.' }) });
  replyThread(e).push(r); e.replies = e.replies.slice(-100); e.seen = at;
  await saveEvents(q.id, all); await log(s.name, `replied on the event "${e.title}"${r.mailed ? ` (emailed ${to.join(', ')})` : ' (not emailed)'}`, q.id);
  return { event: e };
};
H.client['POST eventreply'] = async (req, res, s) => {
  const b = await readBody(req), text = clip(b.text, 4000).trim(); if (!text) throw bad(400, 'Write something first.');
  const all = await eventsOf(s.cid), e = all.find(x => x.id === b.eid); if (!e) throw bad(404, 'No such event');
  const c = await store.get(`client:${s.cid}`), set = await settings(), at = now();
  replyThread(e).push({ id: newId(6), from: 'client', name: nameOf(c, s.email), email: s.email, text, at }); e.replies = e.replies.slice(-100); e.clientSeen = at; e.updated = at;
  await saveEvents(s.cid, all); await log(c.name, `replied on the event "${e.title}"`, s.cid);
  await send({ to: set.studioEmail, replyTo: s.email, subject: `Event reply: ${c.name} · ${e.title}`,
    ...letter({ title: `${nameOf(c, s.email)} replied on an event`, lines: [`${e.title}, ${e.start}.`], quote: text, button: { label: 'Reply on this event', url: `${portal(req)}#client/${s.cid}/events/${e.id}` } }) });
  return { event: e };
};
// the client opened their Events page: our replies so far count as seen
H.client['PUT eventseen'] = async (req, res, s) => {
  const all = await eventsOf(s.cid), at = now(); let n = 0;
  for (const e of all) if ((e.replies || []).some(r => r.from === 'staff' && (!e.clientSeen || r.at > e.clientSeen))) { e.clientSeen = at; n++; }
  if (n) await saveEvents(s.cid, all);
  return { ok: true, seen: n };
};

// ---------- feed: updates staff post for one client (tailored) or for every client (news) ----------
const KINDS = ['update', 'result', 'news', 'tip', 'heads-up'];
const feedKey = target => target === 'all' ? 'feed:all' : `feed:${target}`;
const feedOf = async target => (await store.get(feedKey(target))) || [];
const saveFeed = (target, all) => store.set(feedKey(target), all.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 300));
// what one client sees: their own posts plus the ones for everyone, pinned first, newest first
async function feedFor(cid) {
  const [mine, all] = await Promise.all([feedOf(cid), feedOf('all')]);
  return [...mine.map(p => ({ ...p, target: cid })), ...all.map(p => ({ ...p, target: 'all' }))].sort((a, b) => (b.pinned - a.pinned) || b.at.localeCompare(a.at));
}
async function checkTarget(t) { if (t === 'all') return null; if (!okId(t)) throw bad(400, 'Pick who the post is for.'); const c = await store.get(`client:${t}`); if (!c) throw bad(404, 'Unknown client'); return c; }
const cleanPost = b => {
  const title = clip(b.title, 140).trim(), body = clip(b.body, 6000).trim();
  if (title.length < 2) throw bad(400, 'Give the post a title.'); if (!body) throw bad(400, 'Write something in the post.');
  return { title, body, kind: KINDS.includes(b.kind) ? b.kind : 'update', brand: clip(b.brand, 60).trim(), link: url(b.link), linkLabel: clip(b.linkLabel, 40).trim(), image: url(b.image), pinned: !!b.pinned };
};
async function mailPost(req, p, clients, set) {
  for (const c of clients) await send({ to: emailsOf(c), replyTo: set.studioEmail, subject: `${set.studio} · ${p.title}`,
    ...letter({ title: p.title, lines: p.body.split(/\n{2,}/).slice(0, 6), button: { label: 'Read it in your portal', url: `${portal(req)}#feed` }, small: `Posted by ${p.by} for ${p.target === 'all' ? 'all our clients' : c.name}.` }) });
}

H.staff['GET feed'] = async () => {
  const ids = await store.smembers('clients'), posts = (await feedOf('all')).map(p => ({ ...p, target: 'all', client: 'All clients' }));
  for (const id of ids) { const c = await store.get(`client:${id}`); for (const p of await feedOf(id)) posts.push({ ...p, target: id, client: c?.name || '' }); }
  return { posts: posts.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 200) };
};
H.staff['POST post'] = async (req, res, s) => {
  const b = await readBody(req), target = String(b.target || ''), c = await checkTarget(target), set = await settings();
  const p = { id: newId(7), ...cleanPost(b), by: s.name, at: now(), target };
  const all = await feedOf(target); all.push(p); await saveFeed(target, all);
  await log(s.name, `posted "${p.title}" for ${c ? c.name : 'all clients'}`, c?.id);
  if (b.email) await mailPost(req, p, c ? [c] : (await Promise.all((await store.smembers('clients')).map(id => store.get(`client:${id}`)))).filter(x => x && x.status !== 'closed'), set);
  return { post: p };
};
H.staff['PUT post'] = async (req, res, s) => {
  const b = await readBody(req), target = String(b.target || ''); await checkTarget(target);
  const all = await feedOf(target), p = all.find(x => x.id === b.id); if (!p) throw bad(404, 'No such post');
  Object.assign(p, b.pinOnly ? { pinned: !!b.pinned } : cleanPost(b), { edited: now() }); await saveFeed(target, all);
  return { post: p };
};
H.staff['DELETE post'] = async (req, res, s) => {
  const b = await readBody(req), target = String(b.target || ''); await checkTarget(target);
  const all = await feedOf(target), p = all.find(x => x.id === b.id); if (!p) throw bad(404, 'No such post');
  await saveFeed(target, all.filter(x => x.id !== b.id)); await log(s.name, `removed the post "${p.title}"`);
  return { ok: true };
};
H.client['PUT feedseen'] = async (req, res, s) => {
  const a = (await store.get(`answers:${s.cid}`)) || emptyAnswers(); a.feedSeen = now(); await store.set(`answers:${s.cid}`, a);
  return { feedSeen: a.feedSeen };
};

// ---------- router ----------
export async function handle(req, res) {
  // On Vercel a rewrite sends every /api/... request here and puts the original path in ?__p=
  const u = new URL(req.url, 'http://x'), qp = u.searchParams.get('__p'), parts = (qp !== null ? qp : u.pathname.replace(/^\/api\/?/, '')).split('/').filter(Boolean);
  res.setHeader('cache-control', 'no-store'); res.setHeader('content-type', 'application/json; charset=utf-8'); res.setHeader('x-content-type-options', 'nosniff');
  const out = (code, o) => { res.statusCode = code; res.end(JSON.stringify(o)); };
  try {
    if (mode === 'none') throw bad(503, 'Storage is not connected. Add Upstash Redis to this Vercel project.');
    const m = req.method;
    if (m !== 'GET' && m !== 'HEAD' && req.headers['x-band'] !== '1') throw bad(403, 'Bad request');
    const [a, b, c] = parts;
    const s = sessionOf(req);
    let h, q = {}, key;
    if (a === 'client' && b) { if (s?.role !== 'client') throw bad(401, 'Sign in first'); h = H.client[`${m} ${b}`]; }
    else if (a === 'staff') {
      if (s?.role !== 'staff') throw bad(401, 'Sign in first');
      if (s.temp && `${m} ${b}` !== 'POST mycode') throw bad(403, 'Choose your own code first.');
      if (b === 'clients' && c) { const d = parts[3]; q.id = c; if (!okId(c)) throw bad(400, 'Bad id'); h = H.staff[`${m} ${d || 'client'}`]; }
      else h = H.staff[`${m} ${b}`];
    } else { key = `${m} ${parts.join('/')}`; h = H.open[key]; }
    if (!h) throw bad(404, 'Not found');
    return out(200, await h(req, res, s, q));
  } catch (e) {
    return out(e.code || 500, { error: e.code ? e.message : 'Something went wrong on our side.' }), e.code ? 0 : console.error(e);
  }
}

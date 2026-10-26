import { store, mode } from './store.js';
import { configured, sessionOf, setSession, clearSession, sha, same, hashCode, newCode, newId, newSalt } from './auth.js';
import { GROUPS, CHECKLIST, FORMS, TIMELINE, DEFAULT_SETTINGS, CONTRACT } from './seed.js';

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
  const [c, answers, st, contract, msgs] = await Promise.all([store.get(`client:${id}`), store.get(`answers:${id}`), store.get(`staff:${id}`), store.get(`contract:${id}`), store.lrange(`msgs:${id}`, 0, 199)]);
  if (!c) throw bad(404, 'Unknown client');
  return { c, answers: answers || emptyAnswers(), st: { ...emptyStaff(), ...(st || {}) }, contract, msgs: msgs.reverse() };
}
const items = (st) => [...CHECKLIST, ...(st.customItems || []).map(i => ({ ...i, custom: true }))].filter(i => !(st.hidden || []).includes(i.id));
function summarize({ c, answers, st, contract }) {
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
    contract: contract?.status || 'draft', lastActive: answers.updatedAt,
  };
}

// ---------- handlers ----------
const H = { client: {}, staff: {}, open: {} };

H.open['GET health'] = async () => ({ ok: true, mode, ...configured() });
H.open['POST login/staff'] = async (req, res) => {
  const cfg = configured(); if (!cfg.secret || !cfg.staffCode) throw bad(503, 'Staff login is not configured on this server yet.');
  const b = await readBody(req);
  if (await store.hit(`rl:s:${sha(ip(req))}`, 600) > 8) throw bad(429, 'Too many tries. Wait ten minutes.');
  if (!same(sha(clip(b.code, 200)), sha(process.env.STAFF_CODE))) throw bad(401, 'That code is not right.');
  const name = clip(b.name, 40).trim() || 'Staff';
  setSession(req, res, { role: 'staff', name }, 60 * 60 * 24 * 7);
  await log(name, 'signed in');
  return { role: 'staff', name };
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
  return { role: 'staff', name: s.name };
};
H.open['GET template'] = async (req) => { if (!sessionOf(req)) throw bad(401, 'Sign in first'); return { groups: GROUPS, checklist: CHECKLIST, forms: FORMS, timeline: TIMELINE, contract: CONTRACT }; };

// ---------- client ----------
const clientWorkspace = async id => {
  const { c, answers, st, contract, msgs } = await bundle(id), s = await settings(), v = vars(c, s);
  const visible = contract && ['sent', 'signed'].includes(contract.status);
  const sig = contract?.signature;
  return {
    client: pubClient(c), answers, staff: pubStaff(st), msgs, settings: { studio: s.studio, studioEmail: s.studioEmail, bandBmId: s.bandBmId }, summary: summarize({ c, answers, st, contract }),
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
  return { clients: rows, log: await store.lrange('log', 0, 59), settings: await settings(), mode };
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
  const { c, answers, st, contract, msgs } = await bundle(q.id), set = await settings();
  return { client: pubClient(c), answers, staff: st, contract: contract && { ...contract, rendered: render(contract.text, vars(c, set)) }, msgs, summary: summarize({ c, answers, st, contract }), settings: set };
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
  return { staff: st, summary: summarize({ c, answers: (await store.get(`answers:${q.id}`)) || emptyAnswers(), st, contract: await store.get(`contract:${q.id}`) }) };
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
  for (const k of [`client:${q.id}`, `answers:${q.id}`, `staff:${q.id}`, `contract:${q.id}`, `msgs:${q.id}`]) await store.del(k);
  for (const x of c.contacts || []) await store.del(`idx:email:${x.email}`);
  await store.srem('clients', q.id); await log(s.name, `deleted ${c.name}`);
  return { ok: true };
};
H.staff['GET settings'] = async () => settings();
H.staff['PUT settings'] = async (req) => {
  const b = await readBody(req), cur = await settings();
  const next = { ...cur, studio: clip(b.studio ?? cur.studio, 40), studioEmail: clip(b.studioEmail ?? cur.studioEmail, 120), bandBmId: clip(b.bandBmId ?? cur.bandBmId, 40).replace(/\D/g, ''), governingLaw: clip(b.governingLaw ?? cur.governingLaw, 120), contractTitle: clip(b.contractTitle ?? cur.contractTitle, 120) };
  await store.set('settings', next); return next;
};

// ---------- router ----------
export async function handle(req, res) {
  const u = new URL(req.url, 'http://x'), parts = u.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
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
      if (b === 'clients' && c) { const d = parts[3]; q.id = c; if (!okId(c)) throw bad(400, 'Bad id'); h = H.staff[`${m} ${d || 'client'}`]; }
      else h = H.staff[`${m} ${b}`];
    } else { key = `${m} ${parts.join('/')}`; h = H.open[key]; }
    if (!h) throw bad(404, 'Not found');
    return out(200, await h(req, res, s, q));
  } catch (e) {
    return out(e.code || 500, { error: e.code ? e.message : 'Something went wrong on our side.' }), e.code ? 0 : console.error(e);
  }
}

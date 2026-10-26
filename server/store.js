// One small storage layer, two engines.
//  · Vercel: Upstash Redis over REST (add it from the Vercel Marketplace; it sets KV_REST_API_URL / KV_REST_API_TOKEN).
//  · Local:  a JSON file in .data/ so the whole portal runs on a laptop with no account.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
export const mode = URL_ && TOKEN ? 'redis' : process.env.VERCEL ? 'none' : 'file';

const redis = async (...args) => {
  const res = await fetch(URL_, { method: 'POST', headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' }, body: JSON.stringify(args) });
  const j = await res.json();
  if (j.error) throw new Error(j.error);
  return j.result;
};

const FILE = join(process.cwd(), '.data', 'store.json');
let mem = null;
const load = () => {
  if (mem) return mem;
  try { mem = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : null; } catch { mem = null; }
  mem = mem || { kv: {}, sets: {}, lists: {}, ctr: {} };
  return mem;
};
const save = () => { mkdirSync(dirname(FILE), { recursive: true }); writeFileSync(FILE, JSON.stringify(mem)); };

export const store = {
  async get(k) {
    if (mode === 'redis') { const v = await redis('GET', k); return v == null ? null : JSON.parse(v); }
    const v = load().kv[k]; return v == null ? null : JSON.parse(v);
  },
  async set(k, v) {
    if (mode === 'redis') return void await redis('SET', k, JSON.stringify(v));
    load().kv[k] = JSON.stringify(v); save();
  },
  async del(k) {
    if (mode === 'redis') return void await redis('DEL', k);
    const d = load(); delete d.kv[k]; delete d.sets[k]; delete d.lists[k]; save();
  },
  async sadd(k, m) {
    if (mode === 'redis') return void await redis('SADD', k, m);
    const d = load(); d.sets[k] = [...new Set([...(d.sets[k] || []), m])]; save();
  },
  async srem(k, m) {
    if (mode === 'redis') return void await redis('SREM', k, m);
    const d = load(); d.sets[k] = (d.sets[k] || []).filter(x => x !== m); save();
  },
  async smembers(k) {
    if (mode === 'redis') return (await redis('SMEMBERS', k)) || [];
    return load().sets[k] || [];
  },
  async lpush(k, v) {
    if (mode === 'redis') return void await redis('LPUSH', k, JSON.stringify(v));
    const d = load(); (d.lists[k] = d.lists[k] || []).unshift(JSON.stringify(v)); save();
  },
  async ltrim(k, a, b) {
    if (mode === 'redis') return void await redis('LTRIM', k, a, b);
    const d = load(); d.lists[k] = (d.lists[k] || []).slice(a, b + 1); save();
  },
  async lrange(k, a, b) {
    if (mode === 'redis') return ((await redis('LRANGE', k, a, b)) || []).map(x => JSON.parse(x));
    return (load().lists[k] || []).slice(a, b === -1 ? undefined : b + 1).map(x => JSON.parse(x));
  },
  // a counter that forgets itself: used for login rate limits
  async hit(k, ttl) {
    if (mode === 'redis') { const n = await redis('INCR', k); if (n === 1) await redis('EXPIRE', k, ttl); return n; }
    const d = load(), now = Date.now(), c = d.ctr[k];
    if (!c || c.exp < now) { d.ctr[k] = { n: 1, exp: now + ttl * 1000 }; save(); return 1; }
    c.n++; save(); return c.n;
  },
};

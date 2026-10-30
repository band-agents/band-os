// Sessions are a signed cookie. Staff get in with the team code (STAFF_CODE, set in the host's environment, never in the repo) or a personal code;
// a personal code made in Settings is temporary until its owner signs in and chooses their own.
// Clients get in with their email and an access code a staff member made for them. Codes are stored as salted hashes.
import { createHmac, createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const SECRET = () => process.env.SESSION_SECRET || '';
export const configured = () => ({ secret: SECRET().length >= 24, staffCode: (process.env.STAFF_CODE || '').length >= 6 });

const b64 = b => Buffer.from(b).toString('base64url');
const unb64 = s => Buffer.from(s, 'base64url').toString('utf8');
const mac = s => createHmac('sha256', SECRET()).update(s).digest('base64url');

export function sign(payload, ttlSec) {
  const body = b64(JSON.stringify({ ...payload, exp: Date.now() + ttlSec * 1000 }));
  return `${body}.${mac(body)}`;
}
export function verify(token) {
  if (!token || !SECRET()) return null;
  const [body, sig] = String(token).split('.');
  if (!body || !sig) return null;
  const a = Buffer.from(sig), b = Buffer.from(mac(body));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try { const p = JSON.parse(unb64(body)); return p.exp > Date.now() ? p : null; } catch { return null; }
}

export const parseCookies = req => Object.fromEntries((req.headers.cookie || '').split(';').map(c => c.trim().split('=')).filter(c => c[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
export const sessionOf = req => verify(parseCookies(req).band_session);
export function setSession(req, res, payload, ttlSec) {
  const secure = (req.headers['x-forwarded-proto'] || '').includes('https') ? '; Secure' : '';
  res.setHeader('set-cookie', `band_session=${encodeURIComponent(sign(payload, ttlSec))}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${ttlSec}${secure}`);
}
export const clearSession = res => res.setHeader('set-cookie', 'band_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');

export const sha = s => createHash('sha256').update(s).digest('hex');
export const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };
export const hashCode = (code, salt) => sha(`${salt}:${SECRET()}:${String(code).trim().toUpperCase().replace(/[\s-]/g, '')}`);

// KXQ7-M2PD-9WFA: no 0/O/1/I so it can be read out loud
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const newCode = () => Array.from({ length: 3 }, () => Array.from(randomBytes(4), b => ALPHA[b % ALPHA.length]).join('')).join('-');
export const newId = (n = 8) => Array.from(randomBytes(n), b => ALPHA[b % ALPHA.length]).join('').toLowerCase();
export const newSalt = () => randomBytes(12).toString('hex');

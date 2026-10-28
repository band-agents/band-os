// Free meeting times, worked out in the studio's own time zone (Cairo by default, summer time included).
const parts = (d, tz) => Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(d).map(p => [p.type, p.value]));
const offset = (ms, tz) => { const p = parts(new Date(ms), tz); return Date.UTC(+p.year, p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000; };
// a wall-clock time in tz ("2026-11-03", "14:30") as a real moment
export const zoned = (ymd, hm, tz) => { const [y, m, d] = ymd.split('-').map(Number), [hh, mm] = hm.split(':').map(Number), g = Date.UTC(y, m - 1, d, hh, mm); return g - offset(g - offset(g, tz), tz); };
export const dayIn = (ms, tz) => { const p = parts(new Date(ms), tz); return `${p.year}-${p.month}-${p.day}`; };
export const when = (iso, tz) => new Date(iso).toLocaleString('en-GB', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });

export const BOOKING = { on: true, tz: 'Africa/Cairo', days: [0, 1, 2, 3, 4], from: '11:00', to: '17:00', length: 30, notice: 24, ahead: 21, max: 3, blocked: [] };

// every open slot from now to `ahead` days out, minus booked meetings and blocked dates
export function freeSlots(cfg, booked, now = Date.now()) {
  const len = cfg.length * 60000, earliest = now + cfg.notice * 3600000, blocked = new Set(cfg.blocked), [y, m, d] = dayIn(now, cfg.tz).split('-').map(Number), out = [];
  for (let i = 0; i <= cfg.ahead; i++) {
    const date = new Date(Date.UTC(y, m - 1, d + i)), ymd = date.toISOString().slice(0, 10);
    if (!cfg.days.includes(date.getUTCDay()) || blocked.has(ymd)) continue;
    for (let t = zoned(ymd, cfg.from, cfg.tz), end = zoned(ymd, cfg.to, cfg.tz); t + len <= end; t += len) {
      if (t < earliest || booked.some(b => t < Date.parse(b.end) && t + len > Date.parse(b.start))) continue;
      out.push({ day: ymd, start: new Date(t).toISOString(), end: new Date(t + len).toISOString() });
    }
  }
  return out;
}

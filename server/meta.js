// Meta (Facebook) Marketing API, just what the portal needs: list the ad accounts a token can see, pull one account's ads with their
// daily numbers, and pause / resume / stop an ad or change an ad set's daily budget.
// The token is META_TOKEN in the host's environment (a System User token). It travels in the Authorization header, never in a URL.
const BASE = () => (process.env.META_API_BASE || 'https://graph.facebook.com').replace(/\/$/, '');
const VER = () => process.env.META_API_VERSION ? '/' + String(process.env.META_API_VERSION).replace(/^\/|\/$/g, '') : '';
export const metaOn = () => !!process.env.META_TOKEN;
const fail = (code, message, meta) => Object.assign(new Error(message), { code, meta });

// "123456", "act_123456" and a pasted URL all become act_123456
export const normAct = v => { const m = String(v || '').match(/(?:act[_=])?(\d{5,20})/); return m ? 'act_' + m[1] : ''; };

async function g(path, { method = 'GET', params = {}, body } = {}) {
  if (!metaOn()) throw fail(503, 'Meta is not connected yet. Add META_TOKEN to the host.');
  const u = new URL(`${BASE()}${VER()}/${String(path).replace(/^\//, '')}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  return call(u, { method, body });
}
async function call(u, { method = 'GET', body } = {}) {
  let r;
  try {
    r = await fetch(u, { method, headers: { authorization: `Bearer ${process.env.META_TOKEN}`, ...(body ? { 'content-type': 'application/x-www-form-urlencoded' } : {}) }, body: body ? new URLSearchParams(body) : undefined, signal: AbortSignal.timeout(9000) });
  } catch { throw fail(502, 'Could not reach Meta. Try again in a moment.'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) {
    const e = j.error || {}, why = e.error_user_msg || e.message || `Meta answered ${r.status}`;
    throw fail(e.code === 190 ? 401 : 502, e.code === 190 ? 'The Meta token is no longer valid. Make a new one and update META_TOKEN.' : `Meta: ${why}`, e);
  }
  return j;
}
// follow Meta's paging, but only to Meta's own host so the token can never be sent anywhere else
async function all(path, params, max = 8) {
  let j = await g(path, { params }), out = [...(j.data || [])], n = 0;
  while (j.paging?.next && n++ < max) {
    const next = new URL(j.paging.next); if (next.origin !== new URL(BASE()).origin) break;
    next.searchParams.delete('access_token'); j = await call(next); out.push(...(j.data || []));
  }
  return out;
}

export async function metaWho() {
  const [me, accounts] = await Promise.all([g('me', { params: { fields: 'id,name' } }), all('me/adaccounts', { fields: 'account_id,name,account_status,currency,business{name}', limit: 100 }, 3)]);
  return { me: { id: me.id, name: me.name }, accounts: accounts.map(a => ({ id: 'act_' + a.account_id, name: a.name, status: a.account_status, currency: a.currency, business: a.business?.name || '' })) };
}

// Meta's delivery status, in the portal's words
export function mapStatus(effective, adset) {
  const e = String(effective || '').toUpperCase(), starts = adset?.start_time && Date.parse(adset.start_time) > Date.now();
  if (e === 'ACTIVE') return starts ? 'scheduled' : 'live';
  if (['PAUSED', 'ADSET_PAUSED', 'CAMPAIGN_PAUSED', 'DISAPPROVED', 'WITH_ISSUES'].includes(e)) return 'paused';
  if (['PENDING_REVIEW', 'IN_PROCESS', 'PREAPPROVED', 'PENDING_BILLING_INFO'].includes(e)) return 'scheduled';
  if (['ARCHIVED', 'DELETED', 'COMPLETED'].includes(e)) return 'ended';
  return 'paused';
}
// what counts as "a result", best first
const RESULT_PRIORITY = ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase', 'lead', 'onsite_conversion.lead_grouped', 'offsite_conversion.fb_pixel_lead', 'onsite_conversion.messaging_conversation_started_7d', 'link_click'];
const UNITS = { purchase: 'Orders', omni_purchase: 'Orders', 'offsite_conversion.fb_pixel_purchase': 'Orders', lead: 'Leads', 'onsite_conversion.lead_grouped': 'Leads', 'offsite_conversion.fb_pixel_lead': 'Leads', 'onsite_conversion.messaging_conversation_started_7d': 'Chats', link_click: 'Clicks' };
export const unitFor = t => UNITS[t] || 'Results';
const count = (actions, type) => (actions || []).filter(a => a.action_type === type).reduce((n, a) => n + Number(a.value || 0), 0);
const day = d => d.toISOString().slice(0, 10);

// one ad account: its ads, and per-day numbers for the last `days` days
export async function pullAds(act, days = 60) {
  const since = day(new Date(Date.now() - days * 864e5)), until = day(new Date());
  const [ads, rows] = await Promise.all([
    all(`${act}/ads`, { fields: 'id,name,effective_status,adset_id,adset{id,name,daily_budget,start_time,end_time},creative{title,body,call_to_action_type,thumbnail_url},preview_shareable_link', limit: 100 }, 6),
    all(`${act}/insights`, { level: 'ad', time_increment: 1, time_range: { since, until }, fields: 'ad_id,spend,impressions,reach,clicks,actions', limit: 500 }, 8),
  ]);
  const byAd = new Map();
  for (const r of rows) { if (!byAd.has(r.ad_id)) byAd.set(r.ad_id, []); byAd.get(r.ad_id).push(r); }
  return ads.map(a => {
    const list = byAd.get(a.id) || [], types = RESULT_PRIORITY.filter(t => list.some(r => count(r.actions, t) > 0)), type = types[0] || '';
    return {
      metaId: a.id, name: a.name || '', adsetId: a.adset_id || a.adset?.id || '', effective: a.effective_status, status: mapStatus(a.effective_status, a.adset),
      budget: a.adset?.daily_budget ? Number(a.adset.daily_budget) / 100 : 0, start: String(a.adset?.start_time || '').slice(0, 10), end: String(a.adset?.end_time || '').slice(0, 10),
      headline: a.creative?.title || '', text: a.creative?.body || '', cta: String(a.creative?.call_to_action_type || '').replace(/_/g, ' ').toLowerCase(), thumb: a.creative?.thumbnail_url || '', link: a.preview_shareable_link || '',
      resultType: type, unit: unitFor(type),
      days: list.map(r => ({ date: r.date_start, spend: Number(r.spend || 0), impressions: Number(r.impressions || 0), reach: Number(r.reach || 0), clicks: Number(r.clicks || 0), resultsBy: r.actions || [] })),
    };
  });
}
export const resultsOn = (day_, type) => count(day_.resultsBy, type);

// do something in the ad account
export async function metaDo(ad, type, value) {
  if (type === 'budget') {
    if (!ad.metaAdsetId) throw fail(409, 'This ad is not linked to a Meta ad set yet. Sync from Meta first.');
    return g(ad.metaAdsetId, { method: 'POST', body: { daily_budget: String(Math.round(Number(value) * 100)) } });
  }
  if (!ad.metaId) throw fail(409, 'This ad is not linked to a Meta ad yet. Sync from Meta first.');
  const status = { pause: 'PAUSED', resume: 'ACTIVE', stop: 'ARCHIVED' }[type]; if (!status) throw fail(400, 'Unknown action');
  return g(ad.metaId, { method: 'POST', body: { status } });
}

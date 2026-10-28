// Email through the studio's own Gmail. Set GMAIL_USER and GMAIL_APP_PASSWORD (a Google "app password", not the real one).
// Without them nothing is sent and the portal still works; each skipped email is printed to the server log instead.
import nodemailer from 'nodemailer';

const USER = () => (process.env.GMAIL_USER || '').trim(), PASS = () => (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
export const mailReady = () => !!(USER() && PASS());
let tx = null;

export async function send({ to, subject, text, html, replyTo, invite }) {
  const list = [].concat(to || []).filter(Boolean);
  if (!list.length) return false;
  if (!mailReady()) { console.log(`[mail skipped: no GMAIL_APP_PASSWORD] to ${list.join(', ')} · ${subject}`); return false; }
  tx = tx || nodemailer.createTransport({ service: 'gmail', auth: { user: USER(), pass: PASS() } });
  try {
    await tx.sendMail({ from: `"band." <${USER()}>`, to: list.join(', '), replyTo, subject, text, html,
      icalEvent: invite && { method: invite.method, content: invite.content, filename: 'meeting.ics' } });
    return true;
  } catch (e) { console.error('mail failed:', e.message); return false; }
}

/* one plain letter, as text and as simple html: a title, paragraphs, an optional quoted message and a button */
const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function letter({ title, lines = [], quote, button, small }) {
  const text = [title, '', ...lines, ...(quote ? ['', ...quote.split('\n').map(l => '> ' + l)] : []), ...(button ? ['', `${button.label}: ${button.url}`] : []), ...(small ? ['', small] : []), '', 'band.'].join('\n');
  const html = `<div style="font:15px/1.55 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#151515;max-width:560px">
    <p style="font-size:19px;font-weight:700;margin:0 0 14px">${h(title)}</p>${lines.map(l => `<p style="margin:0 0 10px">${h(l)}</p>`).join('')}
    ${quote ? `<div style="margin:16px 0;padding:12px 16px;background:#F4F4EE;border-left:3px solid #10A862;white-space:pre-wrap">${h(quote)}</div>` : ''}
    ${button ? `<p style="margin:20px 0"><a href="${h(button.url)}" style="display:inline-block;background:#0B0B0B;color:#fff;text-decoration:none;font-weight:700;padding:11px 20px;border-radius:999px">${h(button.label)}</a></p>` : ''}
    ${small ? `<p style="margin:16px 0 0;color:#777;font-size:13px">${h(small)}</p>` : ''}<p style="margin:22px 0 0;font-weight:700">band.</p></div>`;
  return { text, html };
}

/* calendar invites (.ics). Google and Outlook read these from the email itself. */
const stamp = d => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsText = s => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const fold = l => { const out = []; while (l.length > 74) { out.push(l.slice(0, 74)); l = ' ' + l.slice(74); } out.push(l); return out.join('\r\n'); };
export function ics({ method = 'REQUEST', uid, seq = 0, start, end, title, description, organizer, attendees = [], status = 'CONFIRMED' }) {
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//band.//portal//EN', 'CALSCALE:GREGORIAN', `METHOD:${method}`, 'BEGIN:VEVENT', `UID:${uid}`, `SEQUENCE:${seq}`,
    `DTSTAMP:${stamp(Date.now())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`, `SUMMARY:${icsText(title)}`, `DESCRIPTION:${icsText(description)}`,
    `ORGANIZER;CN=${icsText(organizer.name)}:mailto:${organizer.email}`,
    ...attendees.map(a => `ATTENDEE;CN=${icsText(a.name || a.email)};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${a.email}`),
    `STATUS:${status}`, 'TRANSP:OPAQUE', 'END:VEVENT', 'END:VCALENDAR'].map(fold).join('\r\n');
}
// a link that opens Google Calendar with the event filled in and the client already added as a guest
export const gcalLink = ({ start, end, title, details, guests = [] }) => 'https://calendar.google.com/calendar/render?' + new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${stamp(start)}/${stamp(end)}`, details, add: guests.join(',') });

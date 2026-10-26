import { $, esc, api, lockup, wordmark, drawIn, barcode, ic, toast } from './lib.js';

let bc = null;
export const shell = ({ tag, staff, name, extra = '' }) => `
  <header class="bar"><a class="logo" href="../" aria-label="band. home"><span style="display:block;width:20px;height:20px">${lockup('currentColor')}</span><b>band.</b><span class="tag mono ${staff ? 's' : ''}">${tag}</span></a>
    <span class="sp"></span>${extra}
    <button class="pill" id="palBtn" aria-label="Jump to">${ic('search')}<span>Jump to</span><kbd>⌘K</kbd></button>
    <span class="who"><i></i><span>${esc(name)}</span></span>
    <button class="ghostb" id="outBtn">Sign out</button></header>`;
export async function signOut() { try { await api('POST', 'logout', {}); } catch { } location.hash = ''; location.reload(); }

async function boot() {
  let me = { role: null };
  try { me = await api('GET', 'me'); } catch { }
  document.body.classList.toggle('staff', me.role === 'staff');
  if (me.role === 'client') return (await import('./client.js')).mount(me);
  if (me.role === 'staff') return (await import('./staff.js')).mount(me);
  login();
}

function login() {
  const el = $('#login'); el.hidden = false; $('#app').innerHTML = '';
  let mode = location.hash === '#staff' ? 'staff' : 'client';
  el.innerHTML = `<div class="stage">
    <div class="l"><div><canvas id="lcode" aria-hidden="true"></canvas><div class="wm" id="lwm"></div>
      <h1 id="lh"></h1><p id="lp"></p></div>
      <div class="meta mono"><i></i><span id="lstat">Private · sessions end when you sign out</span></div></div>
    <form class="r" id="lf" autocomplete="on">
      <div class="seg" role="tablist"><button type="button" data-m="client" role="tab">Client</button><button type="button" data-m="staff" role="tab">Staff</button></div>
      <div id="lfields"></div><div class="err" id="lerr" role="alert"></div>
      <button class="btn light" id="lgo" type="submit">Enter ${ic('arrow')}</button>
      <p class="small" id="lhelp"></p></form></div>`;
  $('#lwm').innerHTML = wordmark('#EDEDE6'); drawIn($('#lwm svg'), 900);
  bc?.stop(); bc = barcode($('#lcode'), { level: .6 });
  const paint = () => {
    $$m('.seg button').forEach(b => { b.classList.toggle('on', b.dataset.m === mode); b.setAttribute('aria-selected', b.dataset.m === mode); });
    $('#lh').innerHTML = mode === 'client' ? 'Your project,<br><span>in one place.</span>' : 'The studio<br><span>side.</span>';
    $('#lp').textContent = mode === 'client' ? 'What we need from you, your agreement, and how your ads are doing. Everything lives here.' : 'Clients, onboarding, agreements and results. Enter the staff code.';
    $('#lfields').innerHTML = mode === 'client'
      ? `<div class="fld"><label for="em">Email</label><input class="in" id="em" type="email" autocomplete="username" placeholder="you@company.com" required></div>
         <div class="fld" style="margin-top:14px"><label for="cd">Access code</label><input class="in code" id="cd" autocomplete="one-time-code" placeholder="XXXX-XXXX-XXXX" required spellcheck="false"></div>`
      : `<div class="fld"><label for="nm">Your name</label><input class="in" id="nm" autocomplete="name" placeholder="So the activity log knows who" required></div>
         <div class="fld" style="margin-top:14px"><label for="cd">Staff code</label><input class="in code" id="cd" type="password" autocomplete="current-password" placeholder="••••••••" required></div>`;
    $('#lhelp').textContent = mode === 'client' ? 'Your access code came from us in a message. Lost it? Ask us for a new one.' : 'Staff only. Every sign-in is logged.';
    $('#lerr').textContent = ''; $('#lfields input').focus();
    history.replaceState(null, '', mode === 'staff' ? '#staff' : location.pathname);
  };
  const $$m = s => [...el.querySelectorAll(s)];
  el.querySelectorAll('.seg button').forEach(b => b.onclick = () => { mode = b.dataset.m; paint(); });
  paint();
  api('GET', 'health').then(h => { if (!h.secret || !h.staffCode) $('#lstat').textContent = 'Server not configured yet'; }).catch(() => { $('#lstat').textContent = 'Server unreachable'; });
  $('#lf').onsubmit = async e => {
    e.preventDefault(); const go = $('#lgo'); go.disabled = true; $('#lerr').textContent = '';
    try {
      if (mode === 'client') await api('POST', 'login/client', { email: $('#em').value, code: $('#cd').value });
      else await api('POST', 'login/staff', { name: $('#nm').value, code: $('#cd').value });
      el.hidden = true; bc?.stop(); history.replaceState(null, '', location.pathname); boot();
    } catch (err) { $('#lerr').textContent = err.message; go.disabled = false; $('#cd').select(); }
  };
}

boot();

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
  if (me.role === 'staff' && me.mustChange) return chooseCode(me);
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
  api('GET', 'health').then(h => { if (!h.secret || !h.staffCode) $('#lstat').textContent = 'Server not configured yet'; }).catch(e => { $('#lstat').textContent = e.code === 503 ? 'Server setup not finished yet' : 'Server unreachable'; });
  $('#lf').onsubmit = async e => {
    e.preventDefault(); const go = $('#lgo'); go.disabled = true; $('#lerr').textContent = '';
    try {
      if (mode === 'client') await api('POST', 'login/client', { email: $('#em').value, code: $('#cd').value });
      else await api('POST', 'login/staff', { name: $('#nm').value, code: $('#cd').value });
      el.hidden = true; bc?.stop(); history.replaceState(null, '', location.pathname); boot();
    } catch (err) { $('#lerr').textContent = err.message; go.disabled = false; $('#cd').select(); }
  };
}

// signed in with a temporary code: choose your own before anything else opens
function chooseCode(me) {
  const el = $('#login'); el.hidden = false; $('#app').innerHTML = '';
  el.innerHTML = `<div class="stage">
    <div class="l"><div><canvas id="lcode" aria-hidden="true"></canvas><div class="wm" id="lwm"></div>
      <h1>Welcome,<br><span>${esc(me.name)}.</span></h1><p>You signed in with a temporary code. Choose your own to continue. Only you will know it.</p></div>
      <div class="meta mono"><i></i><span>Private · we store a hash, never the code</span></div></div>
    <form class="r" id="cf" autocomplete="on">
      <input type="text" autocomplete="username" value="${esc(me.name)}" hidden>
      <div class="fld"><label for="n1">Your new code</label><input class="in code" id="n1" type="password" autocomplete="new-password" minlength="8" placeholder="8 characters or more" required></div>
      <div class="fld" style="margin-top:14px"><label for="n2">Type it again</label><input class="in code" id="n2" type="password" autocomplete="new-password" required></div>
      <div class="err" id="cerr" role="alert"></div>
      <button class="btn light" id="cgo" type="submit">Save and enter ${ic('arrow')}</button>
      <p class="small"><a href="#" id="cout">Sign out</a> · the temporary code stops working once you save.</p></form></div>`;
  $('#lwm').innerHTML = wordmark('#EDEDE6'); drawIn($('#lwm svg'), 900);
  bc?.stop(); bc = barcode($('#lcode'), { level: .6 }); $('#n1').focus();
  $('#cout').onclick = e => { e.preventDefault(); signOut(); };
  $('#cf').onsubmit = async e => {
    e.preventDefault(); const go = $('#cgo'), a = $('#n1').value, b = $('#n2').value; $('#cerr').textContent = '';
    if (a.trim().length < 8) return void ($('#cerr').textContent = 'Your code needs at least 8 characters.');
    if (a !== b) return void ($('#cerr').textContent = 'The two codes are not the same.');
    go.disabled = true;
    try { await api('POST', 'staff/mycode', { code: a }); el.hidden = true; bc?.stop(); toast('Your code is saved'); boot(); }
    catch (err) { $('#cerr').textContent = err.message; go.disabled = false; }
  };
}

boot();

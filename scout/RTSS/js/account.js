// Account shared by RTSS and RDSS. Same file in both repos, keep them matched.
// It is the Field Twin account: the same email and password sign in to Field Twin, Inventory, RTSS and RDSS.
// Opened inside Field Twin, Field Twin hands over its sign in, so nothing is typed here.
// The survey server reads the key on each save and records which account saved it.
const IN_FIELD_TWIN = (() => {
  try { return window.parent !== window && new URLSearchParams(location.search).get('ft') === '1'; } catch (e) { return false; }
})();

const SUPABASE_URL = 'https://zasyjjoypkpvyqdueums.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inphc3lqam95cGtwdnlxZHVldW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMjk1NjQsImV4cCI6MjEwNjgwNTU2NH0.PZrUvG4qsTpMQeihXbbzaFYUAAJ9YV7F';
const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

let sb = null;
let user = null;        // { email } when signed in
let token = '';         // access key sent to the survey server
let viaFieldTwin = false;
const subs = [];

function emit() { subs.forEach(fn => { try { fn(account()); } catch (e) {} }); }
export function onAccount(fn) { subs.push(fn); }
export function account() { return { email: user ? user.email : '', viaFieldTwin, ready: Boolean(sb) || IN_FIELD_TWIN }; }
export function authHeader() { return token ? { Authorization: 'Bearer ' + token } : {}; }

// ===== INSIDE FIELD TWIN =====
function askFieldTwinAuth() {
  try { window.parent.postMessage({ rieAuthAsk: true }, '*'); } catch (e) {}
}
if (IN_FIELD_TWIN) {
  window.addEventListener('message', ev => {
    if (ev.source !== window.parent || !ev.data || !ev.data.rieAuth) return;
    const a = ev.data.rieAuth;
    viaFieldTwin = Boolean(a.token);
    token = a.token || '';
    user = a.token ? { email: a.email || '' } : null;
    emit();
  });
  askFieldTwinAuth();
  // the key lasts about an hour, Field Twin hands over a fresh one
  setInterval(askFieldTwinAuth, 10 * 60 * 1000);
}

// ===== ON ITS OWN =====
async function start() {
  if (IN_FIELD_TWIN) return;
  try {
    const lib = await import(LIB);
    sb = lib.createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    const take = ses => {
      token = ses ? ses.access_token : '';
      user = ses ? { email: ses.user.email || '' } : null;
      emit();
    };
    const r = await sb.auth.getSession();
    take(r.data && r.data.session);
    sb.auth.onAuthStateChange((ev, ses) => take(ses));
  } catch (e) {
    sb = null;
    emit();
  }
}
start();

export async function signIn(email, pass) {
  if (!sb) return 'The sign in service did not load. Check the connection and reopen the page.';
  const res = await sb.auth.signInWithPassword({ email, password: pass });
  if (res.error) return /invalid/i.test(res.error.message) ? 'That email and password did not match your Field Twin account. If the account has no password yet, set one in Field Twin under Account and profile.' : res.error.message;
  return '';
}

export async function signOut() {
  if (sb) await sb.auth.signOut();
  token = ''; user = null; emit();
}

// The account box at the bottom of the apps menu.
export function accountBox() {
  const box = document.createElement('div');
  box.className = 'acct';
  const draw = () => {
    box.replaceChildren();
    const head = document.createElement('div');
    head.className = 'drawer-head';
    head.textContent = 'Account';
    box.append(head);
    const a = account();
    const line = document.createElement('p');
    line.className = 'hint';
    if (a.viaFieldTwin) {
      line.textContent = 'Signed in through Field Twin as ' + a.email + '.';
      box.append(line);
      return;
    }
    if (IN_FIELD_TWIN) {
      line.textContent = 'Field Twin is not signed in. Sign in there under Account and profile and this page uses the same account.';
      box.append(line);
      return;
    }
    if (a.email) {
      line.textContent = 'Signed in as ' + a.email + '. Saves are marked with this account.';
      const out = document.createElement('button');
      out.type = 'button';
      out.textContent = 'Sign out';
      out.addEventListener('click', async () => { await signOut(); draw(); });
      box.append(line, out);
      return;
    }
    line.textContent = 'Use your Field Twin email and password. The same account works in Field Twin, Inventory, RTSS and RDSS.';
    const em = document.createElement('input');
    em.type = 'email'; em.placeholder = 'Email'; em.autocomplete = 'email'; em.setAttribute('aria-label', 'Email');
    const pw = document.createElement('input');
    pw.type = 'password'; pw.placeholder = 'Password'; pw.autocomplete = 'current-password'; pw.setAttribute('aria-label', 'Password');
    const msg = document.createElement('p');
    msg.className = 'hint';
    const go = document.createElement('button');
    go.type = 'button';
    go.className = 'primary';
    go.textContent = 'Sign in';
    go.addEventListener('click', async () => {
      if (!em.value.trim() || !pw.value) { msg.textContent = 'Type your email and password.'; return; }
      go.disabled = true; go.textContent = 'Signing in';
      const err = await signIn(em.value.trim(), pw.value);
      go.disabled = false; go.textContent = 'Sign in';
      if (err) { msg.textContent = err; return; }
      draw();
    });
    box.append(line, em, pw, go, msg);
  };
  draw();
  onAccount(() => { if (box.isConnected && !box.querySelector('input:focus')) draw(); });
  return box;
}

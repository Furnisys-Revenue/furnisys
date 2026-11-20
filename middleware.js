// configurator.furnisys.co.in: login-gated 3D configurator.
// Every other host (www.furnisys.co.in etc.) passes straight through untouched,
// except that the private /data/ folder is never served anywhere.
import usersFile from './data/configurator-users.json';

const COOKIE = 'fc_session';
const MAX_AGE = 60 * 60 * 24 * 30; // stay signed in for 30 days
const enc = new TextEncoder();

function b64u(bytes) {
  let s = '';
  bytes.forEach(b => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}
function findUser(id) {
  id = String(id || '').trim().toLowerCase();
  return (usersFile.users || []).find(u => u.id === id && u.active !== false);
}
async function hmacKey() {
  const secret = process.env.CONFIGURATOR_AUTH_SECRET;
  if (!secret || secret.length < 16) throw new Error('auth secret missing');
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function makeToken(id) {
  const payload = b64u(enc.encode(JSON.stringify({ u: id, exp: Math.floor(Date.now() / 1000) + MAX_AGE })));
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(), enc.encode(payload)));
  return payload + '.' + b64u(sig);
}
async function sessionUser(request) {
  const m = (request.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + COOKIE + '=([^;]+)'));
  if (!m) return null;
  const [payload, sig] = m[1].split('.');
  if (!payload || !sig) return null;
  const ok = await crypto.subtle.verify('HMAC', await hmacKey(), fromB64(sig), enc.encode(payload));
  if (!ok) return null;
  const data = JSON.parse(new TextDecoder().decode(fromB64(payload)));
  if (!data.exp || data.exp < Date.now() / 1000) return null;
  return findUser(data.u) || null; // removed or blocked users lose access immediately
}
async function checkPassword(user, password) {
  const key = await crypto.subtle.importKey('raw', enc.encode(String(password || '')), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromB64(user.salt), iterations: user.iter }, key, 256));
  const want = fromB64(user.hash);
  if (want.length !== bits.length) return false;
  let diff = 0;
  for (let i = 0; i < bits.length; i++) diff |= bits[i] ^ want[i];
  return diff === 0;
}
const json = (obj, status = 200, headers = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } });
const rewrite = (url, path) =>
  new Response(null, { headers: { 'x-middleware-rewrite': new URL(path, url).toString(), 'cache-control': 'no-store' } });

export default async function middleware(request) {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/data/') || url.pathname.startsWith('/scripts/')) {
    return new Response('Not found', { status: 404 });
  }
  const host = (request.headers.get('host') || '').toLowerCase();
  if (!host.startsWith('configurator.')) return;

  try {
    const p = url.pathname;
    if (p === '/api/login' && request.method === 'POST') {
      let body = {};
      try { body = await request.json(); } catch (e) {}
      const user = findUser(body.userId);
      const ok = user ? await checkPassword(user, body.password) : false;
      if (!ok) return json({ ok: false, error: 'Wrong user ID or password.' }, 401);
      const token = await makeToken(user.id);
      return json({ ok: true }, 200, {
        'set-cookie': `${COOKIE}=${token}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`
      });
    }
    if (p === '/logout') {
      return new Response(null, { status: 302, headers: {
        location: '/', 'set-cookie': `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`
      } });
    }
    if (p === '/' || p === '') {
      const user = await sessionUser(request);
      return rewrite(url, user ? '/_configurator/app' : '/_configurator/gate');
    }
    if (p.startsWith('/_configurator/gate')) return;
    if (p.startsWith('/_configurator/')) {
      // The configurator file itself is only reachable through "/" after sign-in.
      return Response.redirect(new URL('/', url).toString(), 302);
    }
    return Response.redirect('https://www.furnisys.co.in' + p + url.search, 307);
  } catch (e) {
    // Fail closed: show the sign-in screen rather than the configurator.
    return rewrite(url, '/_configurator/gate');
  }
}

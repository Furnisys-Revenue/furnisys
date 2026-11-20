// Adds (or resets) a configurator user, generates a password, and writes the welcome email.
// Used by .github/workflows/configurator-add-user.yml. Never stores the password in plain text.
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { randomBytes, randomInt, pbkdf2Sync } from 'node:crypto';

const FILE = 'data/configurator-users.json';
const ITER = 20000;
const name = (process.env.IN_NAME || '').trim();
const email = (process.env.IN_EMAIL || '').trim().toLowerCase();
const company = (process.env.IN_COMPANY || '').trim();
let id = (process.env.IN_USER_ID || '').trim().toLowerCase();
const outDir = process.env.RUNNER_TEMP || '/tmp';

if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { console.error('Name and a valid email are required.'); process.exit(1); }

const db = JSON.parse(readFileSync(FILE, 'utf8'));
db.users ||= [];
const existing = db.users.find(u => u.email === email);
if (!id) id = existing ? existing.id : (email.split('@')[0].replace(/[^a-z0-9._-]/g, '') || 'user');
if (!/^[a-z0-9._-]{3,40}$/.test(id)) { console.error('User ID must be 3-40 characters: letters, numbers, dot, dash, underscore.'); process.exit(1); }
if (!existing) { let base = id, n = 2; while (db.users.some(u => u.id === id)) id = base + n++; }
else id = existing.id;

const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
const password = Array.from({ length: 12 }, () => alphabet[randomInt(alphabet.length)]).join('');
const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, ITER, 32, 'sha256');
const b64u = b => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const record = { id, name, email, company, salt: b64u(salt), hash: b64u(hash), iter: ITER,
  created: existing ? existing.created : new Date().toISOString().slice(0, 10), active: true };
if (existing) Object.assign(existing, record); else db.users.push(record);
writeFileSync(FILE, JSON.stringify(db, null, 2) + '\n');

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
writeFileSync(`${outDir}/welcome.html`, `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1b2430;max-width:560px">
<p>Dear ${esc(name)},</p>
<p>Thank you for your interest in Furnisys. Your access to the <b>Furnisys 3D Configurator</b> is ready.</p>
<table style="border-collapse:collapse;margin:16px 0;background:#f2f3f5;border-radius:8px">
<tr><td style="padding:10px 16px;color:#5b6675">Link</td><td style="padding:10px 16px"><a href="https://configurator.furnisys.co.in/">configurator.furnisys.co.in</a></td></tr>
<tr><td style="padding:10px 16px;color:#5b6675">User ID</td><td style="padding:10px 16px;font-family:monospace;font-size:16px"><b>${esc(id)}</b></td></tr>
<tr><td style="padding:10px 16px;color:#5b6675">Password</td><td style="padding:10px 16px;font-family:monospace;font-size:16px"><b>${esc(password)}</b></td></tr>
</table>
<p>Open the link, sign in under <i>Already have a login?</i>, and you'll stay signed in on that device for 30 days.</p>
<p>Please keep these details private. For any help, reply to this email or call +91 70457 63012.</p>
<p>Regards,<br>Team Furnisys<br><a href="https://www.furnisys.co.in/">www.furnisys.co.in</a></p></div>`);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `user_id=${id}\naction=${existing ? 'reset' : 'added'}\n`);
console.log(`${existing ? 'Reset password for' : 'Added'} user ${id} (${email})`);

// Shared Zoho CRM helpers for the website's serverless functions.
// Region: Furnisys CRM runs on crm.zoho.com (US data centre). Override with env vars if that ever changes.
const ACCOUNTS = process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.com';
const API = process.env.ZOHO_API_URL || 'https://www.zohoapis.com';

let tokenCache = { token: null, exp: 0 };
let fieldCache = { fields: null, exp: 0 };

async function accessToken() {
  if (tokenCache.token && Date.now() < tokenCache.exp) return tokenCache.token;
  const { ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN } = process.env;
  if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET || !ZOHO_REFRESH_TOKEN) throw new Error('Zoho credentials are not set in Vercel');
  const body = new URLSearchParams({ refresh_token: ZOHO_REFRESH_TOKEN, client_id: ZOHO_CLIENT_ID, client_secret: ZOHO_CLIENT_SECRET, grant_type: 'refresh_token' });
  const r = await fetch(`${ACCOUNTS}/oauth/v2/token`, { method: 'POST', body });
  const j = await r.json();
  if (!j.access_token) throw new Error('Token refresh failed: ' + JSON.stringify(j));
  tokenCache = { token: j.access_token, exp: Date.now() + ((j.expires_in || 3600) - 120) * 1000 };
  return j.access_token;
}

async function zoho(path, opts = {}) {
  const t = await accessToken();
  const r = await fetch(`${API}${path}`, { ...opts, headers: { Authorization: `Zoho-oauthtoken ${t}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
  const text = await r.text();
  let j; try { j = JSON.parse(text); } catch { j = { raw: text }; }
  return { status: r.status, json: j };
}

async function leadFields() {
  if (fieldCache.fields && Date.now() < fieldCache.exp) return fieldCache.fields;
  const { json } = await zoho('/crm/v8/settings/fields?module=Leads');
  if (!json.fields) throw new Error('Could not read Leads fields: ' + JSON.stringify(json));
  // mandatory flags live on the layout: use the default (or first active) Leads layout
  try {
    const lay = await zoho('/crm/v8/settings/layouts?module=Leads');
    const layouts = (lay.json && lay.json.layouts) || [];
    const pick = (process.env.ZOHO_LEAD_LAYOUT && layouts.find(l => l.name === process.env.ZOHO_LEAD_LAYOUT || l.id === process.env.ZOHO_LEAD_LAYOUT))
      || layouts.find(l => l.status === 'active' && /standard/i.test(l.name)) || layouts.find(l => l.status === 'active') || layouts[0];
    if (pick) {
      const req = new Set();
      for (const sec of pick.sections || []) for (const f of sec.fields || []) if (f.required) req.add(f.api_name);
      for (const f of json.fields) f.required = f.required || req.has(f.api_name);
      json.fields.layout = { id: pick.id, name: pick.name };
    }
  } catch (e) { /* layouts are optional; system_mandatory still applies */ }
  fieldCache = { fields: json.fields, exp: Date.now() + 30 * 60 * 1000 };
  return json.fields;
}

async function exchangeGrant(code) {
  const { ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET } = process.env;
  const body = new URLSearchParams({ code, client_id: ZOHO_CLIENT_ID, client_secret: ZOHO_CLIENT_SECRET, grant_type: 'authorization_code' });
  const r = await fetch(`${ACCOUNTS}/oauth/v2/token`, { method: 'POST', body });
  return r.json();
}

module.exports = { zoho, leadFields, exchangeGrant, accessToken };

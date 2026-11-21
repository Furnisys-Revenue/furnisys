// One-time Zoho setup page, protected by the SETUP_KEY environment variable.
//   /api/zoho-setup?key=SETUP_KEY            -> paste the grant code, get the refresh token
//   /api/zoho-setup?key=SETUP_KEY&check=1    -> confirm the connection and list Leads fields (mandatory first)
const { exchangeGrant, leadFields } = require('../lib/zoho');

const page = (body) => `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Zoho setup</title><style>body{font:16px/1.5 system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 16px;color:#1d2433}h1{color:#003377}
input,textarea{width:100%;padding:10px;font:inherit;border:1px solid #bbb;border-radius:8px;box-sizing:border-box}button{margin-top:12px;padding:10px 18px;background:#da1818;color:#fff;border:0;border-radius:8px;font:inherit;cursor:pointer}
code,pre{background:#f3f5f8;padding:2px 6px;border-radius:6px;word-break:break-all;white-space:pre-wrap}.ok{color:#0a7a34}.bad{color:#da1818}table{border-collapse:collapse;width:100%;font-size:14px}td,th{border-bottom:1px solid #e3e6ea;padding:6px;text-align:left;vertical-align:top}</style>${body}`;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  const url = new URL(req.url, 'https://x');
  const key = url.searchParams.get('key') || '';
  if (!process.env.SETUP_KEY || key !== process.env.SETUP_KEY) { res.status(403).send(page('<h1>Not allowed</h1><p>Add <code>?key=</code> with your setup key.</p>')); return; }
  const missing = ['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET'].filter(k => !process.env[k]);
  if (missing.length) { res.status(200).send(page(`<h1>Almost there</h1><p class="bad">Add these in Vercel first: ${missing.join(', ')}. Then redeploy.</p>`)); return; }

  if (url.searchParams.get('check')) {
    try {
      const f = await leadFields();
      const rows = f.sort((x, y) => (y.system_mandatory || y.required ? 1 : 0) - (x.system_mandatory || x.required ? 1 : 0))
        .map(x => `<tr><td>${x.field_label}${x.system_mandatory || x.required ? ' <b class="bad">*</b>' : ''}</td><td><code>${x.api_name}</code></td><td>${x.data_type}</td><td>${(x.pick_list_values || []).map(o => o.display_value).filter(v => v !== '-None-').slice(0, 12).join(', ')}</td></tr>`).join('');
      res.status(200).send(page(`<h1 class="ok">Connected to Zoho CRM</h1><p>Leads fields (* = mandatory):</p><table><tr><th>Label</th><th>API name</th><th>Type</th><th>Options</th></tr>${rows}</table>`));
    } catch (e) { res.status(200).send(page(`<h1 class="bad">Not connected yet</h1><pre>${String(e.message || e)}</pre>`)); }
    return;
  }

  if (req.method === 'POST') {
    let code = '';
    const b = req.body;
    if (b && typeof b === 'object') code = b.code || ''; else if (typeof b === 'string') code = new URLSearchParams(b).get('code') || '';
    const j = await exchangeGrant(code.trim());
    if (j.refresh_token) {
      res.status(200).send(page(`<h1 class="ok">Done. Copy your refresh token</h1><p>Add it in Vercel as <code>ZOHO_REFRESH_TOKEN</code>, then redeploy. This page will not show it again.</p><pre>${j.refresh_token}</pre>
<p>After redeploying, open <code>/api/zoho-setup?key=YOUR_KEY&amp;check=1</code> to confirm the connection.</p>`));
    } else {
      res.status(200).send(page(`<h1 class="bad">That didn't work</h1><p>The code may have expired (it lasts a few minutes). Generate a new one and try again.</p><pre>${JSON.stringify(j)}</pre><p><a href="?key=${encodeURIComponent(key)}">Try again</a></p>`));
    }
    return;
  }

  res.status(200).send(page(`<h1>Connect the website to Zoho CRM</h1>
<p>Paste the code from Zoho API Console → Self Client → Generate Code, within a few minutes of generating it.</p>
<form method="post"><textarea name="code" rows="3" required placeholder="1000.xxxxxxxx.xxxxxxxx"></textarea><button type="submit">Get refresh token</button></form>`));
};

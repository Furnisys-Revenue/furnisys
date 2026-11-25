// POST /api/indexnow : tells Bing, Yandex and other IndexNow engines about every URL in the sitemap.
// No input is accepted; it only ever submits this site's own sitemap URLs. Key file: /5162b04f838a90c32642b57f47c8f211.txt
const KEY = '5162b04f838a90c32642b57f47c8f211';
const HOST = 'www.furnisys.co.in';
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'POST only' }); return; }
  try {
    const xml = await (await fetch('https://' + HOST + '/sitemap.xml')).text();
    const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]).filter(u => u.startsWith('https://' + HOST));
    const r = await fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: HOST, key: KEY, keyLocation: 'https://' + HOST + '/' + KEY + '.txt', urlList }) });
    res.status(200).json({ ok: r.status === 200 || r.status === 202, status: r.status, submitted: urlList.length });
  } catch (e) { res.status(500).json({ ok: false, error: String(e) }); }
};

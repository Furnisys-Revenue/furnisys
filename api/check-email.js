// GET /api/check-email?d=domain : does this email domain exist and accept mail (MX record, or A record as fallback)?
// Answers ok:true on DNS errors other than "does not exist", so a slow DNS never blocks a real enquiry.
const dns = require('dns').promises;
module.exports = async (req, res) => {
  const d = String((req.query && req.query.d) || '').toLowerCase().trim();
  const send = ok => { res.setHeader('Cache-Control', 'public, max-age=86400'); res.status(200).json({ ok }); };
  if (!/^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(d)) return send(false);
  try {
    const mx = await dns.resolveMx(d);
    const real = (mx || []).filter(m => m.exchange && m.exchange !== '.');
    if (real.length) return send(true);
    if ((mx || []).length) return send(false); // null MX: domain says it takes no mail
  } catch (e) {
    if (e.code === 'ENOTFOUND') return send(false);
    if (e.code !== 'ENODATA') return send(true);
  }
  try { const a = await dns.resolve4(d); return send(a.length > 0); }
  catch (e) { return send(!['ENOTFOUND', 'ENODATA'].includes(e.code)); }
};

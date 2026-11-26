// TEMPORARY (delete after checking): GET /api/lead-check lists the Leads fields the website writes the form page into.
// Returns only those fields' labels, API names and types, nothing else from CRM.
const { leadFields, zoho } = require('../lib/zoho');
const norm = s => String(s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
const PAGE = ['referrer', 'lead source page', 'website page', 'source page', 'lead page', 'landing page', 'page url', 'form page', 'lead page url', 'first visited url', 'form type', 'campaign'];
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.query && /^\d{10,25}$/.test(req.query.id || '')) { const r = await zoho('/crm/v8/Leads/' + req.query.id + '?fields=Lead_Source_Page,Last_Name'); const d = r.json && r.json.data && r.json.data[0]; res.status(200).json({ ok: true, Lead_Source_Page: d && d.Lead_Source_Page, test: d && /delete/.test(d.Last_Name || '') }); return; }
    const fields = await leadFields();
    const hits = fields.filter(f => PAGE.includes(norm(f.field_label)) || /referr|page|visited/i.test(f.api_name))
      .map(f => ({ label: f.field_label, api: f.api_name, type: f.data_type, read_only: !!(f.read_only || f.field_read_only), length: f.length }));
    res.status(200).json({ ok: true, hits });
  } catch (e) { res.status(500).json({ ok: false, error: String(e.message || e) }); }
};

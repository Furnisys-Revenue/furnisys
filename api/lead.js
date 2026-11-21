// POST /api/lead : creates a Lead in Zoho CRM from the website's four forms
// (enquiry, partner, match, support). Every mandatory Leads field is filled, from the visitor's answer
// where one exists and from a sensible default otherwise, so CRM never rejects the record.
const { zoho, leadFields } = require('../lib/zoho');

const FORM_LABEL = { enquiry: 'Enquiry', partner: 'Partner application', match: 'Partner match', support: 'Support' };
// form answer key -> CRM field labels it can fill (first match in the Leads layout wins for each label)
const ANSWER_TO_LABELS = {
  first: ['First Name'], last: ['Last Name'], email: ['Email'], phone: ['Mobile', 'Phone'], company: ['Company'],
  city: ['City'], state: ['State (customer)', 'State'], industry: ['Sector', 'Industry'], need: ['Workspace Type (New)', 'Workspace Type', 'Requirement'],
  qty: ['Workstations'], when: ['Buying Timeline'], biz: ['Business Type'], ptype: ['Partner Program'], years: ['Years in Business'],
  sells: ['Industries Sold To'], web: ['Website'], partner: ['Preferred Partner'], order: ['Order Number'], qtype: ['Query Type'], product: ['Product'],
};
const FIXED = { 'Lead Source': 'Website', 'Lead Origin': 'Marketing', 'Rating': 'MQL', 'Form Type': null /* set per form */ };

const norm = s => String(s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();

function bestOption(field, wanted) {
  const opts = (field.pick_list_values || []).map(o => o.display_value || o.actual_value).filter(v => v && v !== '-None-');
  if (!opts.length) return wanted;
  if (wanted) {
    const w = norm(wanted);
    let hit = opts.find(o => norm(o) === w) || opts.find(o => norm(o).startsWith(w) || w.startsWith(norm(o)));
    if (!hit) {
      const words = w.split(' ').filter(x => x.length > 2);
      let best = null, score = 0;
      for (const o of opts) { const n = norm(o); const s = words.filter(x => n.includes(x)).length; if (s > score) { score = s; best = o; } }
      hit = best;
    }
    if (hit) return hit;
  }
  return opts.find(o => /other|not specified|general|website|unknown/i.test(o)) || opts[0];
}

function valueFor(field, raw) {
  const type = field.data_type;
  if (type === 'picklist') return bestOption(field, raw);
  if (type === 'multiselectpicklist') return [bestOption(field, raw)];
  if (type === 'integer' || type === 'bigint') { const n = parseInt(String(raw || '').replace(/[^0-9]/g, ''), 10); return Number.isFinite(n) ? n : 0; }
  if (type === 'double' || type === 'currency' || type === 'decimal') return parseFloat(raw) || 0;
  if (type === 'boolean') return false;
  if (type === 'date') return new Date().toISOString().slice(0, 10);
  if (type === 'datetime') return new Date().toISOString().replace(/\.\d+Z$/, '+00:00');
  if (type === 'email') return raw || '';
  return String(raw || '').slice(0, field.length || 255);
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'POST only' }); return; }
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b || {};
  const a = b.answers || {};
  const type = FORM_LABEL[b.type] ? b.type : 'enquiry';

  // spam: honeypot filled, or submitted faster than a person could type
  if (b.hp || (b.elapsed && b.elapsed < 2500)) { res.status(200).json({ ok: true }); return; }
  const miss = ['first', 'last', 'email', 'phone', 'company'].filter(k => !String(a[k] || '').trim());
  if (miss.length || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(a.email || ''))) { res.status(400).json({ ok: false, error: 'Missing or invalid fields', miss }); return; }

  try {
    const fields = await leadFields();
    const byLabel = {};
    for (const f of fields) { const k = norm(f.field_label); if (!byLabel[k]) byLabel[k] = f; }
    const rec = {};
    const used = new Set();
    const put = (label, raw) => { const f = byLabel[norm(label)]; if (!f || rec[f.api_name] !== undefined || f.read_only || f.field_read_only) return false; rec[f.api_name] = valueFor(f, raw); used.add(f.api_name); return true; };

    for (const [k, labels] of Object.entries(ANSWER_TO_LABELS)) {
      if (!String(a[k] || '').trim()) continue;
      for (const l of labels) put(l, a[k]);
    }
    put('Form Type', FORM_LABEL[type]);
    for (const [l, v] of Object.entries(FIXED)) if (v) put(l, v);

    const lines = Object.entries(a).filter(([, v]) => String(v || '').trim()).map(([k, v]) => `${b.labels && b.labels[k] ? b.labels[k] : k}: ${v}`);
    lines.push(`Form: ${FORM_LABEL[type]}`, `Page: ${b.page || ''}`);
    if (b.utm) lines.push(`Campaign: ${b.utm}`);
    put('Description', lines.join('\n'));
    if (b.page) put('Source Page', b.page);

    // fill every other mandatory field so CRM accepts the record
    for (const f of fields) {
      if (!f.system_mandatory && !(f.required)) continue;
      if (rec[f.api_name] !== undefined || f.read_only || f.field_read_only) continue;
      const hint = /enquiry|inquiry/i.test(f.field_label) ? FORM_LABEL[type] : /department|function/i.test(f.field_label) ? 'Not specified' : /size/i.test(f.field_label) ? '' : 'Website';
      rec[f.api_name] = valueFor(f, hint);
    }

    if (fields.layout) rec.Layout = { id: fields.layout.id };
    const { status, json } = await zoho('/crm/v8/Leads', { method: 'POST', body: JSON.stringify({ data: [rec], trigger: ['workflow', 'approval', 'blueprint'] }) });
    const d = json && json.data && json.data[0];
    if (d && d.status === 'success') { res.status(200).json({ ok: true, id: d.details && d.details.id }); return; }
    console.error('Zoho rejected lead', status, JSON.stringify(json));
    res.status(502).json({ ok: false, error: 'CRM rejected the record', detail: d || json });
  } catch (e) {
    console.error('Lead error', e);
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
};

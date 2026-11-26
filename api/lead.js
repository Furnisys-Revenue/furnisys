// POST /api/lead : creates a Lead in Zoho CRM from the website's four forms
// (enquiry, partner, match, support), mapped to the Furnisys Leads layout (checked 21 Nov 2026).
// Any other mandatory field that appears later is filled with a safe default so CRM never rejects the record.
const { zoho, leadFields } = require('../lib/zoho');

const FORM_LABEL = { enquiry: 'Website enquiry', partner: 'Partner application', match: 'Partner match request', support: 'Support request', catalogue: 'Catalogue request', brochure: 'Brochure request' };
const PAGE_LABELS = ['referrer', 'lead source page', 'website page', 'source page', 'lead page', 'landing page', 'page url', 'form page', 'lead page url'];
const norm = s => String(s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();

function options(f) { return (f.pick_list_values || []).map(o => o.display_value || o.actual_value).filter(v => v && v !== '-None-'); }
function pick(f, wanted, fallback) {
  const opts = options(f);
  if (!opts.length) return wanted || fallback || '';
  for (const w of [].concat(wanted || [], fallback || [])) {
    const n = norm(w);
    const hit = opts.find(o => norm(o) === n) || opts.find(o => norm(o).startsWith(n) || n.startsWith(norm(o)));
    if (hit) return hit;
  }
  return opts.find(o => /^other|^misc/i.test(o)) || opts[0];
}
const today = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
const nowIST = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().replace(/\.\d+Z$/, '+05:30');

// website answer -> CRM values
const SECTOR = { 'education': 'Education Sector', 'government': 'Government', 'healthcare': 'Health Care Sector', 'construction': 'Heavy & Civil Engineering Construction', 'power': 'Electric Utilities' };
const LISTA = { 'manufacturing': 'Manufacturing', 'aerospace': 'Aerospace & Aviation', 'automotive': 'Automotive & Agricultural Dealers', 'oil': 'Oil, Gas and Mining',
  'power': 'Power Generation', 'healthcare': 'Healthcare', 'education': 'Education and Training', 'government': 'Government, Military & Law Enforcement',
  'metalworking': 'Metalworking', 'construction': 'Jobsite Solutions', 'gems': 'Manufacturing', 'electronics': 'Manufacturing' };
const key = s => (norm(s).split(' ')[0] || '');
function workspace(ind) { const k = key(ind); return k === 'education' ? 'Education' : k === 'healthcare' ? 'Lab' : ['oil', 'power', 'construction', 'metalworking'].includes(k) ? 'Workshop' : 'Manufacturing'; }
function firstNum(s) { const m = String(s || '').match(/\d+/); return m ? parseInt(m[0], 10) : null; }
const isProject = a => /complete line|lab or workshop/i.test(a.need || '') || (firstNum(a.qty) || 0) >= 26;
const subCat = a => /configurable/i.test(a.item || '') && !/pre-?configured/i.test(a.item || '') ? 'Configurable' : /pre-?configured/i.test(a.item || '') ? 'Preconfigured' : null;
function orgSize(a) { const n = firstNum(a.qty); return n == null ? 'Medium' : n >= 50 ? 'Large' : n >= 11 ? 'Medium' : 'Small'; }
function matrix(a) { const n = firstNum(a.qty) || 0; return isProject(a) || n >= 26 ? 'High Value' : n >= 5 ? 'Primary' : 'Easy to buy'; }
const PRODUCTS = { 'workbenches': 'Workbench/Workstation', 'storage': 'Base Cabinet', 'trolleys': 'Tool Trolley' };
const ORGTYPE = { 'tool': 'Distributor', 'instrument': 'Distributor', 'furniture': 'Dealer', 'lean': 'Consultant - Lean', 'system': 'Reseller', 'architect': 'Architect' };

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'POST only' }); return; }
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b || {};
  const a = Object.fromEntries(Object.entries(b.answers || {}).map(([k, v]) => [k, String(v || '').trim()]));
  const type = FORM_LABEL[b.type] ? b.type : 'enquiry';

  // never drop silently: browsers can autofill hidden fields, so suspected bots are kept but flagged
  const suspect = !!b.hp || (b.elapsed && b.elapsed < 1500);
  const need = ['catalogue', 'brochure'].includes(type) ? ['first', 'last', 'email'] : ['first', 'last', 'email', 'phone', 'company'];
  const miss = need.filter(k => !a[k]);
  if (miss.length || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a.email)) { res.status(400).json({ ok: false, error: 'Missing or invalid fields', miss }); return; }

  try {
    const fields = await leadFields();
    const F = Object.fromEntries(fields.map(f => [f.api_name, f]));
    const rec = {};
    const set = (api, val) => { const f = F[api]; if (!f || val === undefined || val === null || val === '') return; rec[api] = f.data_type === 'multiselectpicklist' ? [].concat(val) : val; };
    const setPick = (api, wanted, fallback) => { const f = F[api]; if (f) set(api, pick(f, wanted, fallback)); };

    // contact
    set('First_Name', a.first); if (!a.company) a.company = 'Not provided'; set('Last_Name', a.last); set('Email', a.email); set('Mobile', a.phone); set('Company', a.company || 'Not provided');
    set('City', a.city); set('State', a.state);
    if (a.web) set('Website', /^https?:/i.test(a.web) ? a.web : 'https://' + a.web);
    // source and stage
    setPick('Lead_Source', 'Website'); setPick('Lead_Origin', 'Marketing Orignated Lead'); setPick('Rating', 'MQL');
    setPick('Portal_Lead_Type', 'Lead Form'); setPick('Lead_Stage1', 'Raw Leads');
    set('Lead_Date', today()); set('Lead_Enquiry_Date', nowIST());
    // qualification
    const ind = a.industry || (type === 'partner' ? 'Manufacturing' : 'Manufacturing');
    setPick('Lead_State', (a.state || '').replace(/ NCR$/, ''), 'Maharashtra');
    setPick('Sector', SECTOR[key(ind)] || 'Manufacturing', 'Manufacturing');
    setPick('Industry_Lista_Intl', LISTA[key(ind)] || 'Manufacturing');
    setPick('Workspace', workspace(ind), 'Manufacturing');
    setPick('Workspace_Type_New', workspace(ind), 'Manufacturing');
    setPick('Department_Function', type === 'support' ? 'Maintenance' : 'Other', 'Other');
    setPick('Enquiry_Category', isProject(a) ? 'Project' : 'Product');
    setPick('Enqiry_Sub_Category', subCat(a) || (isProject(a) ? 'Configurable' : 'Preconfigured'));
    setPick('Enquiry_Type', 'Standard');
    setPick('Organization_Size', orgSize(a), 'Medium');
    setPick('Product_Matrix', matrix(a), 'Primary');
    if (firstNum(a.qty) != null) set('Workbench_Qty', firstNum(a.qty));
    const prod = PRODUCTS[key(a.need)]; if (prod && F.Products1) { const v = pick(F.Products1, prod); if (norm(v) === norm(prod)) set('Products1', v); }
    // partner applications
    if (type === 'partner') {
      if (/aggregator/i.test(a.ptype)) setPick('Channel_Partners_Type', 'Aggregator Partner');
      else if (/expert/i.test(a.ptype)) setPick('Channel_Partners_Type', 'Expert Partner');
      const ot = ORGTYPE[key(a.biz)]; if (ot) setPick('Industry_Type', ot, 'Other');
    }
    // optional custom fields, filled automatically once they exist in Leads (matched by label)
    const byLabel = l => fields.find(f => norm(f.field_label) === norm(l));
    const pagePath = String(b.page || '').replace(/^https?:\/\//, '').replace(/^[^/]*/, '').replace(/\.html$/, '').split('?')[0] || '/';
    const pageUrl = 'https://www.furnisys.co.in' + pagePath;
    // the page the form was sent from: written to every page field that exists (Referrer, Lead Source Page, Website Page...)
    if (b.page) for (const f of fields) {
      if (f.read_only || f.field_read_only || rec[f.api_name] !== undefined) continue;
      const lab = norm(f.field_label), api = norm(f.api_name);
      if (!(PAGE_LABELS.includes(lab) || api === 'referrer')) continue;
      if (f.data_type === 'picklist' || f.data_type === 'multiselectpicklist') continue;
      const v = f.data_type === 'website' || lab === 'referrer' || api === 'referrer' ? pageUrl : pagePath;
      set(f.api_name, v.slice(0, f.length || 255));
    }
    for (const [labels, val] of [[['Website Page', 'Source Page', 'Lead Page', 'Landing Page'], pagePath],
                                 [['Form Type', 'Website Form'], FORM_LABEL[type]],
                                 [['Campaign', 'UTM Campaign', 'Website Campaign'], b.utm || '']]) {
      if (!val) continue;
      for (const l of labels) { const f = byLabel(l); if (f && rec[f.api_name] === undefined) { if (f.data_type === 'picklist' || f.data_type === 'multiselectpicklist') setPick(f.api_name, val); else set(f.api_name, String(val).slice(0, f.length || 255)); break; } }
    }
    // attribution captured on arrival (first touch / last touch), FUR-011
    const at = (b.attr && typeof b.attr === 'object') ? b.attr : {};
    const tq = t => t ? Object.entries(t).map(([k, v]) => `${k}=${v}`).join('&') : '';
    if (at.landing) set('First_Visited_URL', 'https://www.furnisys.co.in' + String(at.landing).slice(0, 200));
    const campaign = tq(at.last || at.first) || b.utm || '';
    if (campaign) { const f = byLabel('Campaign') || byLabel('UTM Campaign'); if (f && rec[f.api_name] === undefined) set(f.api_name, campaign.slice(0, f.length || 255)); }
    const attrLines = [];
    if (at.landing) attrLines.push(`First page visited: ${at.landing}`);
    if (at.first_referrer) attrLines.push(`Came from: ${at.first_referrer}`);
    if (at.first) attrLines.push(`First campaign: ${tq(at.first)}`);
    if (at.last && tq(at.last) !== tq(at.first)) attrLines.push(`Latest campaign: ${tq(at.last)}`);
    // everything the visitor said, readable, in Description
    const L = b.labels || {};
    const lines = [`${FORM_LABEL[type]} from the website`].concat(suspect ? ['[Check: possible spam - hidden field filled or form sent very fast]'] : []).concat(['']).concat(Object.entries(a).filter(([, v]) => v).map(([k, v]) => `${L[k] || k}: ${v}`));
    lines.push('', `Page: ${b.page || ''}`); if (attrLines.length) lines.push(...attrLines); if (b.utm) lines.push(`Campaign: ${b.utm}`);
    set('Description', lines.join('\n'));

    // safety net: fill any other mandatory field added to the layout later
    for (const f of fields) {
      if (!(f.system_mandatory || f.required) || rec[f.api_name] !== undefined || f.read_only || f.field_read_only) continue;
      const t = f.data_type;
      if (t === 'picklist' || t === 'multiselectpicklist') set(f.api_name, pick(f, 'Other'));
      else if (t === 'date') set(f.api_name, today());
      else if (t === 'datetime') set(f.api_name, nowIST());
      else if (t === 'integer' || t === 'bigint' || t === 'double') set(f.api_name, 0);
      else if (t === 'boolean') rec[f.api_name] = false;
      else if (!['ownerlookup', 'lookup'].includes(t)) set(f.api_name, 'Website');
    }
    if (fields.layout) rec.Layout = { id: fields.layout.id };

    const { status, json } = await zoho('/crm/v8/Leads', { method: 'POST', body: JSON.stringify({ data: [rec], trigger: ['workflow', 'approval', 'blueprint'] }) });
    const d = json && json.data && json.data[0];
    if (d && d.status === 'success') { res.status(200).json({ ok: true, id: d.details && d.details.id }); return; }
    console.error('Zoho rejected lead', status, JSON.stringify(json), JSON.stringify(rec));
    res.status(502).json({ ok: false, error: 'CRM rejected the record', detail: d || json });
  } catch (e) {
    console.error('Lead error', e);
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
};

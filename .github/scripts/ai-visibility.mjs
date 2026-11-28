// Weekly AI-answer visibility check for Furnisys.
// Asks each configured engine the same 10 buyer questions (web search on) and records
// whether Furnisys / Fabtech India is mentioned, where it first appears, and whether
// furnisys.co.in is cited. Writes ai-visibility/<date>.json and ai-visibility/latest.md.
import fs from 'node:fs';

const QUESTIONS = [
  'Who are the best industrial workbench manufacturers in India?',
  'Which companies make ESD workstations in India? I need ESD-safe workbenches for an electronics assembly line.',
  'Recommend suppliers of modular assembly line workstations for an automotive components plant in Pune.',
  'Which Indian manufacturer makes a heavy duty industrial workbench rated for 1000 kg?',
  'Who manufactures drawer type tool storage cabinets for factories in India?',
  'Which companies supply workbenches and lab workstations for ITI and polytechnic training labs in India?',
  'Should I buy a modular workstation system or get workbenches fabricated locally for my factory in India? Which Indian companies offer modular systems?',
  'Who makes steel staff lockers for factory workers in India?',
  'Which Indian suppliers provide workstations for aerospace or defence R&D labs and maintenance workshops?',
  'Who supplies flow racks and kitting workstations for lean manufacturing in India?',
];
const BRAND = /furnisys|fabtech india/i;

const env = process.env;
const ENGINES = [
  {
    name: 'ChatGPT (OpenAI API, web search)', key: env.OPENAI_API_KEY, model: env.OPENAI_MODEL || 'gpt-5-mini',
    async ask(q) {
      const r = await post('https://api.openai.com/v1/responses',
        { Authorization: `Bearer ${this.key}` },
        { model: this.model, tools: [{ type: 'web_search' }], input: q });
      const msgs = (r.output || []).filter(o => o.type === 'message');
      const parts = msgs.flatMap(m => m.content || []).filter(c => c.type === 'output_text');
      const text = r.output_text || parts.map(p => p.text).join('\n');
      const urls = parts.flatMap(p => (p.annotations || []).map(a => a.url).filter(Boolean));
      return { text, urls };
    },
  },
  {
    name: 'Gemini (Google API, Google Search grounding)', key: env.GEMINI_API_KEY, model: env.GEMINI_MODEL || 'gemini-2.5-flash',
    async ask(q) {
      const r = await post(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
        { 'x-goog-api-key': this.key },
        { contents: [{ parts: [{ text: q }] }], tools: [{ google_search: {} }] });
      const c = (r.candidates || [])[0] || {};
      const text = ((c.content || {}).parts || []).map(p => p.text || '').join('\n');
      const urls = (((c.groundingMetadata || {}).groundingChunks) || []).map(g => (g.web || {}).uri + ' ' + ((g.web || {}).title || '')).filter(Boolean);
      return { text, urls };
    },
  },
  {
    name: 'Perplexity (API)', key: env.PERPLEXITY_API_KEY, model: env.PERPLEXITY_MODEL || 'sonar',
    async ask(q) {
      const r = await post('https://api.perplexity.ai/chat/completions',
        { Authorization: `Bearer ${this.key}` },
        { model: this.model, messages: [{ role: 'user', content: q }] });
      const text = (((r.choices || [])[0] || {}).message || {}).content || '';
      const urls = r.citations || (r.search_results || []).map(s => s.url);
      return { text, urls };
    },
  },
];

async function post(url, headers, body) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
    const txt = await res.text();
    if (res.ok) return JSON.parse(txt);
    if (attempt === 3 || (res.status < 500 && res.status !== 429)) throw new Error(`HTTP ${res.status}: ${txt.slice(0, 300)}`);
    await new Promise(r => setTimeout(r, 5000 * attempt));
  }
}

// Position: count list items / bold names before the first Furnisys mention.
function analyse(text, urls) {
  const mentioned = BRAND.test(text);
  let position = null;
  if (mentioned) {
    const lines = text.split('\n').filter(l => /^\s*(\d+[.)]|[-*•]|\|)/.test(l) || /\*\*[^*]+\*\*/.test(l));
    const idx = lines.findIndex(l => BRAND.test(l));
    position = idx >= 0 ? idx + 1 : null;
  }
  const cited = (urls || []).some(u => /furnisys/i.test(u || ''));
  const m = text.match(new RegExp(`[^.\\n]{0,160}(${BRAND.source})[^.\\n]{0,200}`, 'i'));
  return { mentioned, position, cited, snippet: m ? m[0].trim() : '' };
}

const date = new Date().toISOString().slice(0, 10);
const results = { date, questions: QUESTIONS, engines: [] };
for (const e of ENGINES) {
  const out = { engine: e.name, model: e.model, status: 'ok', answers: [] };
  if (!e.key) { out.status = 'skipped: no API key saved'; results.engines.push(out); continue; }
  for (const q of QUESTIONS) {
    try {
      const { text, urls } = await e.ask(q);
      out.answers.push({ question: q, ...analyse(text, urls), urls: (urls || []).slice(0, 15), answer: text });
    } catch (err) {
      out.answers.push({ question: q, error: String(err.message || err) });
    }
  }
  results.engines.push(out);
}

fs.mkdirSync('ai-visibility', { recursive: true });
fs.writeFileSync(`ai-visibility/${date}.json`, JSON.stringify(results, null, 1));

let md = `# AI answer visibility — ${date}\n\nSame 10 buyer questions every week, asked through each engine's API with web search on (no login, no chat history).\n"Position" counts list items/bold names before Furnisys first appears (1 = first). "Cited" = furnisys.co.in among the sources.\n\n`;
const head = '| # | Question | ' + results.engines.map(e => e.engine.split(' (')[0]).join(' | ') + ' |\n|---|---|' + results.engines.map(() => '---').join('|') + '|\n';
md += head;
QUESTIONS.forEach((q, i) => {
  const cells = results.engines.map(e => {
    if (e.status !== 'ok') return 'not run';
    const a = e.answers[i];
    if (a.error) return 'error';
    if (!a.mentioned) return a.cited ? 'not named, site cited' : 'no';
    return `yes${a.position ? ' #' + a.position : ''}${a.cited ? ', cited' : ''}`;
  });
  md += `| ${i + 1} | ${q} | ${cells.join(' | ')} |\n`;
});
md += '\n**Score:** ' + results.engines.map(e => e.status !== 'ok' ? `${e.engine.split(' (')[0]}: ${e.status}` :
  `${e.engine.split(' (')[0]} ${e.answers.filter(a => a.mentioned).length}/10 mentioned (${e.answers.filter(a => a.position && a.position <= 3).length} in top 3), ${e.answers.filter(a => a.cited).length} cite furnisys.co.in` +
  (e.answers.some(a => a.error) ? `, ${e.answers.filter(a => a.error).length} errors` : '')).join(' · ') + '\n\n';
md += '## What each engine said about Furnisys\n\n';
for (const e of results.engines) {
  if (e.status !== 'ok') continue;
  md += `### ${e.engine} — model ${e.model}\n`;
  e.answers.forEach((a, i) => {
    if (a.error) md += `- Q${i + 1}: error — ${a.error.slice(0, 160)}\n`;
    else if (a.snippet) md += `- Q${i + 1}: "${a.snippet.replace(/\s+/g, ' ')}"\n`;
  });
  md += '\n';
}
md += `Full answers and sources: ai-visibility/${date}.json\n`;
fs.writeFileSync('ai-visibility/latest.md', md);
console.log(md);

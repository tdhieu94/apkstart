'use strict';
(function (root) {
  const LANGS = ['vi', 'zh'];
  const HAN = /[㐀-鿿]/;
  const tables = {};

  function normalize(s) {
    return s.replace(/\s+/g, ' ').trim();
  }

  function escapeRe(s) {
    return s.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
  }

  function build(dict) {
    const exact = new Map();
    const patterns = [];
    for (const [k, v] of Object.entries(dict)) {
      exact.set(normalize(k), v);
      if (/\{\d+\}/.test(k)) {
        const order = [];
        const re = normalize(k).split(/(\{\d+\})/).map((part) => {
          const m = /^\{(\d+)\}$/.exec(part);
          if (!m) return escapeRe(part);
          order.push(Number(m[1]));
          return '([\\s\\S]*?)';
        }).join('');
        patterns.push({ re: new RegExp(`^${re}$`), order, value: v, weight: k.replace(/\{\d+\}/g, '').length });
      }
    }
    patterns.sort((a, b) => b.weight - a.weight);
    return { exact, patterns, cache: new Map() };
  }

  const SEGMENT = /(（[^（）]*）|「[^「」]*」|《[^《》]*》|[，。；：！？、]| · | → | \/ |(?<=[\x21-\x7e]) (?=[㐀-鿿]))/;
  const PUNCT = { '，': ', ', '。': '. ', '；': '; ', '：': ': ', '！': '! ', '？': '? ', '、': ', ' };
  const WRAP = { '（': [' (', ')'], '「': ['"', '"'], '《': ['"', '"'] };

  function segment(table, part) {
    if (PUNCT[part]) return PUNCT[part];
    const whole = lookup(table, part);
    if (whole !== part) return whole;
    const w = WRAP[part[0]];
    if (w && part.length > 2) return w[0] + lookup(table, part.slice(1, -1)) + w[1];
    return part;
  }

  function direct(table, key) {
    const hit = table.exact.get(key);
    if (hit !== undefined) return hit;
    for (const p of table.patterns) {
      const m = p.re.exec(key);
      if (!m) continue;
      const args = {};
      p.order.forEach((n, i) => { args[n] = lookup(table, m[i + 1]); });
      return p.value.replace(/\{(\d+)\}/g, (_, n) => (args[n] !== undefined ? args[n] : ''));
    }
    return undefined;
  }

  function lookup(table, text) {
    const key = normalize(text);
    if (!key || !HAN.test(key)) return text;
    if (table.cache.has(key)) return table.cache.get(key);
    let out = direct(table, key);
    if (out === undefined && /\n/.test(text)) {
      out = text.split('\n').map((line) => lookup(table, line)).join('\n');
    }
    if (out === undefined) {
      const parts = key.split(SEGMENT).filter(Boolean);
      if (parts.length > 1) {
        const pieces = [];
        for (let i = 0; i < parts.length;) {
          let j = parts.length - (i === 0 ? 1 : 0);
          for (; j > i + 1; j--) {
            const raw = parts.slice(i, j).join('');
            const cand = normalize(raw);
            const hit = HAN.test(cand) ? direct(table, cand) : undefined;
            if (hit !== undefined) { pieces.push(/^\s/.test(raw) ? ` ${hit}` : hit); break; }
          }
          if (j > i + 1) { i = j; continue; }
          pieces.push(segment(table, parts[i]));
          i += 1;
        }
        const joined = pieces.reduce((acc, p) => (/[.;:!?,)]$/.test(acc) && /^[\p{L}\p{N}]/u.test(p) ? `${acc} ${p}` : acc + p), '');
        if (joined !== key) out = joined.replace(/\s{2,}/g, ' ').trim();
      }
    }
    if (out === undefined) out = text;
    table.cache.set(key, out);
    return out;
  }

  function tr(text, lang) {
    if (typeof text !== 'string' || lang === 'zh' || !tables[lang]) return text;
    const lead = /^\s*/.exec(text)[0];
    const trail = /\s*$/.exec(text)[0];
    const out = lookup(tables[lang], text);
    return out === text ? text : lead + out.trim() + trail;
  }

  function resolve(pref, systemLocale) {
    if (LANGS.includes(pref)) return pref;
    return /^zh/i.test(systemLocale || '') ? 'zh' : 'vi';
  }

  function register(lang, dict) {
    tables[lang] = build(dict);
  }

  const api = { LANGS, tr, resolve, register };
  if (typeof module !== 'undefined' && module.exports) {
    register('vi', require('./vi'));
    module.exports = api;
  } else {
    if (root.I18N_VI) register('vi', root.I18N_VI);
    root.I18N = api;
  }
})(typeof window !== 'undefined' ? window : this);

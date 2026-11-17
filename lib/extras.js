// Merges the "Insider's view" notes and situation questions into lessons.
let cache;
export const loadExtras = () => (cache ||= Promise.all([import("/content/insider-a.js"), import("/content/insider-b.js")]).then(([a, b]) => ({ ...a.default, ...b.default })));

/** Returns a copy of lesson L with .insider and the situation question appended to .quiz */
export function withExtras(L, x) {
  if (!x) return L;
  const [use, line, file, sit] = x;
  const out = { ...L };
  if (use) out.insider = { use, line, file };
  if (sit) { const [situation, q, opts, ans, why] = sit; out.quiz = [...(L.quiz || []), [`<span class="sit"><b>Situation</b>${situation}</span>${q}`, opts, ans, why]]; }
  return out;
}

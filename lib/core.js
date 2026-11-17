// Core helpers. No framework: plain DOM and SVG.

/** h("div.card#id", {onclick, style:{...}, ...attrs}, ...children) */
export function h(tag, attrs, ...kids) {
  const [, name = "div", rest = ""] = /^([a-z0-9-]+)?(.*)$/i.exec(tag);
  const el = document.createElement(name);
  for (const m of rest.matchAll(/([.#])([\w-]+)/g)) m[1] === "." ? el.classList.add(m[2]) : (el.id = m[2]);
  if (attrs != null && (typeof attrs !== "object" || attrs instanceof Node || Array.isArray(attrs))) kids.unshift(attrs), (attrs = null);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "style" && typeof v === "object") for (const [sk, sv] of Object.entries(v)) sk.startsWith("--") ? el.style.setProperty(sk, sv) : (el.style[sk] = sv);
    else if (k === "html") el.innerHTML = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const k of kids.flat(Infinity)) if (k != null && k !== false) el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  return el;
}

const SVGNS = "http://www.w3.org/2000/svg";
/** s("rect", {x, y, ...}, ...children) creates an SVG element */
export function s(tag, attrs = {}, ...kids) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "text") el.textContent = v;
    else el.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k) el.append(k);
  return el;
}

export const esc = (x) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const sum = (a) => a.reduce((x, y) => x + y, 0);
export const range = (n) => [...Array(n).keys()];

/** Seeded RNG (mulberry32) so simulations are reproducible. */
export function rng(seed = 42) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.int = (n) => Math.floor(next() * n);
  next.pick = (arr) => arr[Math.floor(next() * arr.length)];
  next.gauss = () => { let u = 0, v = 0; while (!u) u = next(); while (!v) v = next(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  return next;
}

// ---- number formats: money people read numbers, so make them readable ----
const nf = (d) => new Intl.NumberFormat("en-US", { maximumFractionDigits: d, minimumFractionDigits: d });
/** 1234 -> "1,234"; d = decimals */
export const num = (n, d = 0) => (Number.isFinite(n) ? nf(d).format(n) : "–");
/** $1.2M, $340K, $12.50 */
export function money(n, d) {
  if (!Number.isFinite(n)) return "–";
  const a = Math.abs(n), sg = n < 0 ? "−" : "";
  if (a >= 1e12) return `${sg}$${(a / 1e12).toFixed(d ?? 1)}T`;
  if (a >= 1e9) return `${sg}$${(a / 1e9).toFixed(d ?? 1)}B`;
  if (a >= 1e6) return `${sg}$${(a / 1e6).toFixed(d ?? 1)}M`;
  if (a >= 1e4) return `${sg}$${(a / 1e3).toFixed(d ?? 0)}K`;
  return `${sg}$${nf(d ?? (a < 100 && a % 1 ? 2 : 0)).format(a)}`;
}
/** 0.1234 -> "12.3%" */
export const pct = (x, d = 1) => (Number.isFinite(x) ? `${(x * 100).toFixed(d)}%` : "–");
export const times = (x, d = 1) => (Number.isFinite(x) ? `${x.toFixed(d)}×` : "–");

export const reducedMotion = () => { const m = document.documentElement.dataset.motion; return m === "reduce" || (m !== "full" && matchMedia("(prefers-reduced-motion: reduce)").matches); };

/** Progress and practice state, stored per browser. Storage can be blocked: always optional. */
export const store = {
  key: "eco:v1",
  read() { try { return JSON.parse(localStorage.getItem(this.key) || "{}"); } catch { return {}; } },
  write(all) { try { localStorage.setItem(this.key, JSON.stringify(all)); } catch {} },
  get(k, d) { const v = this.read()[k]; return v === undefined ? d : v; },
  set(k, v) { const all = this.read(); all[k] = v; this.write(all); },
};
export const done = (id) => !!store.get(`done:${id}`);

/** A pausable animation loop that only runs while the element is on screen. */
export function loop(fn, el) {
  let raf = 0, last = 0, on = false, visible = true;
  const io = el && "IntersectionObserver" in window ? new IntersectionObserver(([e]) => (visible = e.isIntersecting)) : null;
  io?.observe(el);
  const tick = (t) => {
    if (!on) return;
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
    last = t;
    if (visible && !document.hidden) fn(dt);
    raf = requestAnimationFrame(tick);
  };
  return {
    start() { if (!on) { on = true; last = 0; raf = requestAnimationFrame(tick); } },
    stop() { on = false; cancelAnimationFrame(raf); },
    get running() { return on; },
  };
}

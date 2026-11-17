// Reusable interactive pieces. Every lesson is built from these.
import { h } from "./core.js";
import { burst, penny } from "./pixel.js";

let uid = 0;
const id = (p) => `${p}-${++uid}`;

/** Labelled range input. el.value reads and writes. */
export function slider({ label, min, max, step = 1, value, fmt = (v) => v, onInput, hint }) {
  const iid = id("sl");
  const out = h("output.sl-val", { for: iid }, fmt(value));
  const input = h("input", { type: "range", id: iid, min, max, step, value });
  const paint = () => input.style.setProperty("--fill", `${((+input.value - min) / (max - min)) * 100}%`);
  input.addEventListener("input", () => { out.textContent = fmt(+input.value); paint(); onInput?.(+input.value); });
  paint();
  const el = h("div.slider", h("label", { for: iid }, h("span", label), out), input, hint && h("small.hint", hint));
  Object.defineProperty(el, "value", { get: () => +input.value, set: (v) => { input.value = v; out.textContent = fmt(+v); paint(); } });
  return el;
}

/** Segmented control. options: [{value, label}] or strings */
export function seg({ label, options, value, onChange }) {
  const opts = options.map((o) => (typeof o === "object" ? o : { value: o, label: o }));
  let cur = value ?? opts[0].value;
  const btns = opts.map((o) => h("button", { type: "button", "aria-pressed": String(o.value === cur), onclick: () => set(o.value, true) }, o.label));
  function set(v, fire) { cur = v; btns.forEach((b, i) => b.setAttribute("aria-pressed", String(opts[i].value === v))); if (fire) onChange?.(v); }
  const el = h("div.seg-wrap", label && h("span.seg-label", label), h("div.seg", { role: "group", "aria-label": label || "Options" }, btns));
  Object.defineProperty(el, "value", { get: () => cur, set: (v) => set(v, false) });
  return el;
}

export const button = (label, onclick, kind = "") => h(`button.btn${kind ? "." + kind : ""}`, { type: "button", onclick }, label);

/** Stat tiles: [{label, value, tone?}] -> {el, set(i, value, tone)} */
export function stats(items) {
  const vals = items.map((it) => h("div.stat-v", it.value ?? "–"));
  const tiles = items.map((it, i) => h("div.stat", { "data-tone": it.tone || "" }, h("div.stat-l", it.label), vals[i]));
  return {
    el: h("div.stats", tiles),
    set(i, v, tone) { if (vals[i].textContent !== String(v)) { vals[i].textContent = v; vals[i].classList.remove("tick"); void vals[i].offsetWidth; vals[i].classList.add("tick"); } if (tone !== undefined) tiles[i].dataset.tone = tone; },
  };
}

/** A simulation panel: controls on a coloured strip, the picture below. */
export function stage({ title, controls = [], body = [], note }) {
  return h("div.stage",
    title && h("div.stage-t", h("span.dot"), title),
    controls.length ? h("div.stage-controls", controls) : null,
    h("div.stage-body", body),
    note && h("p.stage-note", { html: note }));
}

/** Predict-then-reveal: commit before the picture tells you. */
export function predict({ q, options, answer, why, onAnswer }) {
  const body = h("div.predict-body");
  const opts = options.map((o, i) => h("button.choice", { type: "button", onclick: () => choose(i) }, h("span.choice-k", String.fromCharCode(65 + i)), h("span", { html: o })));
  function choose(i) {
    opts.forEach((b, j) => { b.disabled = true; b.classList.toggle("right", j === answer); b.classList.toggle("wrong", j === i && i !== answer); });
    body.replaceChildren(h("p.verdict", i === answer ? "Nailed it." : `Not quite: it's ${String.fromCharCode(65 + answer)}.`), h("div.why", { html: why }));
    if (i === answer) burst(opts[i]);
    onAnswer?.(i === answer);
  }
  return h("div.predict", h("div.eyebrow", "Guess first"), h("p.q", { html: q }), h("div.choices", opts), body);
}

/** A numeric exercise: type an answer, get it checked within a tolerance. */
export function calc({ q, answer, tol = 0.01, unit = "", hint, why, onAnswer }) {
  const inp = h("input.calc-in", { type: "text", inputmode: "decimal", placeholder: "your answer", "aria-label": "Your answer" });
  const out = h("div.calc-out");
  let tries = 0;
  const check = () => {
    const v = parseFloat(String(inp.value).replace(/[$,%×x\s]/g, ""));
    if (!Number.isFinite(v)) { out.replaceChildren(h("p.muted", "Type a number first.")); return; }
    tries++;
    const ok = Math.abs(v - answer) <= Math.max(Math.abs(answer) * tol, 1e-9);
    out.replaceChildren(
      h("p.verdict", ok ? "Correct." : tries < 2 ? "Not yet. Try once more." : "Here's how it works out:"),
      (ok || tries >= 2) && why ? h("div.why", { html: why }) : null,
      !ok && tries < 2 && hint ? h("p.muted", { html: "Hint: " + hint }) : null);
    inp.dataset.state = ok ? "right" : "wrong";
    if (ok) burst(inp);
    if (ok || tries >= 2) onAnswer?.(ok);
  };
  inp.addEventListener("keydown", (e) => e.key === "Enter" && check());
  return h("div.calc", h("div.eyebrow", "Work it out"), h("p.q", { html: q }), h("div.calc-row", inp, unit && h("span.calc-unit", unit), button("Check", check, "primary")), out);
}

export function callout(kind, title, html) {
  return h(`aside.callout.${kind}`, h("b", title), h("div", { html }));
}

/** Simple table. rows: arrays of strings/nodes */
export function table(headers, rows, { cls = "" } = {}) {
  return h("div.tbl-wrap", h(`table.t${cls ? "." + cls : ""}`,
    headers && h("thead", h("tr", headers.map((x) => h("th", { html: x })))),
    h("tbody", rows.map((r) => h("tr", r.map((x) => (x instanceof Node ? h("td", x) : h("td", { html: String(x) }))))))));
}

/** Horizontal bars: [{label, value, color, note}] */
export function bars(items, { max, fmt = (v) => v } = {}) {
  const top = max ?? Math.max(1e-9, ...items.map((i) => Math.abs(i.value)));
  return h("div.bars", items.map((it) => h("div.bar-row", h("span.bar-l", it.label), h("span.bar-t", h("span.bar-f", { style: { width: `${Math.min(100, (Math.abs(it.value) / top) * 100)}%`, background: it.color || "var(--wc)" } })), h("span.bar-v", fmt(it.value)))));
}

/** Step through a story: steps [{t, html, on?}] */
export function stepper(steps) {
  let i = 0;
  const title = h("div.step-t"), body = h("div.step-b"), count = h("span.step-n");
  const prev = button("← Back", () => go(i - 1)), next = button("Next →", () => go(i + 1), "primary");
  const dots = h("div.step-dots", steps.map((_, k) => h("button", { type: "button", "aria-label": `Step ${k + 1}`, onclick: () => go(k) })));
  function go(k) {
    i = Math.max(0, Math.min(steps.length - 1, k));
    title.textContent = steps[i].t; body.innerHTML = steps[i].html; count.textContent = `${i + 1} / ${steps.length}`;
    prev.disabled = i === 0; next.disabled = i === steps.length - 1;
    [...dots.children].forEach((d, k2) => d.classList.toggle("on", k2 <= i));
    steps[i].on?.();
  }
  const el = h("div.stepper", h("div.step-head", title, count), body, h("div.step-nav", prev, dots, next));
  queueMicrotask(() => go(0));
  return el;
}

/** Flip cards: [[front, back]] */
export function flips(cards) {
  return h("div.flips", cards.map(([f, b]) => h("button.flip", { type: "button", onclick: (e) => e.currentTarget.toggleAttribute("data-on") }, h("span.flip-f", { html: f }), h("span.flip-b", { html: b }))));
}

/** A formula with its parts explained on hover/tap. parts: [[text, explain]] */
export function formula(parts, caption) {
  return h("figure.formula", h("div.f-line", parts.map(([t, x]) => (x ? h("span.f-part", { tabindex: 0, "data-x": x }, t) : h("span.f-op", t)))), caption && h("figcaption", { html: caption }));
}

/** Mascot speech bubble */
export function say(html, mood = "happy") {
  return h("div.say", h("span.say-m", { html: penny(mood) }), h("div.say-b", { html }));
}

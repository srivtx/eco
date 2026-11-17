// World 12: Mind & money. Behavioural economics and applied psychology.
import { h, s, usd, num, pct, rng, clamp } from "../lib/core.js";
import { slider, seg, stats, stage, predict, calc, callout, table, bars, button, flips, stepper, formula } from "../lib/ui.js";
import { plot, columns, curve } from "../lib/chart.js";

const W = "var(--wc)";

/* ---------- 1. Fast and slow: base rates on a field of 1,000 people ---------- */
function bayesGrid() {
  let prev = 1, sens = 90, fp = 9;
  const svg = s("svg", { viewBox: "0 0 400 250", class: "chart dots", role: "img", "aria-label": "1,000 people sorted by test result" });
  const st = stats([{ label: "Test positive" }, { label: "…and actually sick" }, { label: "Chance you're sick if positive" }]);
  const key = h("div.legend", [["#e11d48", "Sick, test positive"], ["#fda4af", "Sick, missed"], ["#f5c518", "Healthy, false alarm"], ["var(--line)", "Healthy, test negative"]].map(([c, t]) => h("span", h("i", { style: { background: c } }), t)));
  const draw = () => {
    const sick = Math.round(prev * 10), tp = Math.round((sick * sens) / 100), fn = sick - tp;
    const fpN = Math.round(((1000 - sick) * fp) / 100), tn = 1000 - sick - fpN;
    const kinds = [...Array(tp).fill("#e11d48"), ...Array(fn).fill("#fda4af"), ...Array(fpN).fill("#f5c518"), ...Array(tn).fill("var(--line)")];
    svg.replaceChildren(...kinds.map((c, i) => s("rect", { x: (i % 40) * 10 + 1, y: Math.floor(i / 40) * 10 + 1, width: 8, height: 8, rx: 2, fill: c })));
    st.set(0, num(tp + fpN)); st.set(1, num(tp)); st.set(2, pct(tp / Math.max(1, tp + fpN), 0), tp / Math.max(1, tp + fpN) < 0.5 ? "bad" : "good");
  };
  const c = [
    slider({ label: "How common the disease is", min: 0.1, max: 30, step: 0.1, value: prev, fmt: (x) => `${x}%`, onInput: (x) => { prev = x; draw(); } }),
    slider({ label: "Test catches the sick", min: 50, max: 100, value: sens, fmt: (x) => `${x}%`, onInput: (x) => { sens = x; draw(); } }),
    slider({ label: "False alarms in the healthy", min: 0, max: 30, value: fp, fmt: (x) => `${x}%`, onInput: (x) => { fp = x; draw(); } }),
  ];
  draw();
  return stage({ title: "1,000 people take a 90%-accurate test", controls: c, body: [key, h("div.chartbox", svg), st.el], note: "System 1 hears \"90% accurate\" and answers \"90% likely sick\". Count the dots instead: when a disease is rare, most positives are false alarms. Same maths for fraud alerts, drug tests, and \"this stock-picker called the last crash\"." });
}

function crt() {
  return stepper([
    { t: "Question 1", html: "<p>A bat and a ball cost <b>$1.10</b> together. The bat costs <b>$1.00 more</b> than the ball. How much is the ball?</p><p class='muted'>Your first answer is probably 10¢. Check: bat would be $1.10, total $1.20. The right answer is <b>5¢</b> (bat $1.05).</p>" },
    { t: "Question 2", html: "<p>5 machines take 5 minutes to make 5 widgets. How long would 100 machines take to make 100 widgets?</p><p class='muted'>Not 100. Each machine makes one widget in 5 minutes, so <b>5 minutes</b>.</p>" },
    { t: "Question 3", html: "<p>A patch of lily pads doubles in size every day. It takes 48 days to cover the lake. How long to cover half?</p><p class='muted'>Not 24. One doubling before full: <b>47 days</b>. (Compounding again: most of the growth arrives at the end.)</p>" },
    { t: "What happened", html: "<p>This is Shane Frederick's <b>Cognitive Reflection Test</b>. Fewer than half of students at elite universities get all three. The fast answer arrives first and <i>feels</i> right; checking it takes effort that we ration. That's System 1 versus System 2.</p>" },
  ]);
}

/* ---------- 2. Prospect theory ---------- */
const pv = (x, a, lam) => (x >= 0 ? Math.pow(x, a) : -lam * Math.pow(-x, a));
const pw = (p, g) => Math.pow(p, g) / Math.pow(Math.pow(p, g) + Math.pow(1 - p, g), 1 / g);

function valueFn() {
  let lam = 2.25, a = 0.88;
  const p = plot({ height: 280, x: [-1000, 1000], y: [-1800, 800], xLabel: "gain or loss ($)", yLabel: "how it feels", xFmt: (x) => usd(x), yFmt: (x) => num(x), label: "Prospect theory value function" });
  const st = stats([{ label: "Win $500 feels" }, { label: "Lose $500 feels" }, { label: "Pain ÷ pleasure" }]);
  const draw = () => {
    p.draw({ series: [{ name: "Felt value", color: W, width: 4, pts: curve((x) => pv(x, a, lam), -1000, 1000, 200) }, { name: "If losses felt like gains (λ = 1)", color: "var(--ink-3)", dash: "5 5", pts: curve((x) => pv(x, a, 1), -1000, 1000, 200) }], vlines: [{ x: 0, label: "reference point" }], dots: [{ x: 500, y: pv(500, a, lam), color: "var(--up)", r: 7 }, { x: -500, y: pv(-500, a, lam), color: "var(--down)", r: 7 }] });
    st.set(0, `+${num(pv(500, a, lam))}`, "good"); st.set(1, num(pv(-500, a, lam)), "bad"); st.set(2, `${num(lam, 2)}×`, "accent");
  };
  const c = [slider({ label: "Loss aversion λ", min: 1, max: 4, step: 0.05, value: lam, fmt: (x) => x.toFixed(2), onInput: (x) => { lam = x; draw(); } }), slider({ label: "Diminishing sensitivity α", min: 0.4, max: 1, step: 0.02, value: a, fmt: (x) => x.toFixed(2), onInput: (x) => { a = x; draw(); } })];
  draw();
  return stage({ title: "Kahneman & Tversky's value function", controls: c, body: [p.el, st.el], note: "Three features: we judge <b>changes</b> from a reference point, not wealth; losses loom about <b>2× larger</b> than gains; and sensitivity fades (going from $0 to $100 feels bigger than $1,000 to $1,100). Defaults are their 1992 estimates." });
}

function coinBet() {
  let win = 150;
  const st = stats([{ label: "Expected value" }, { label: "How it feels (λ = 2.25)" }, { label: "Most people" }]);
  const draw = () => {
    const ev = 0.5 * win - 50, feel = 0.5 * pv(win, 0.88, 1) + 0.5 * pv(-100, 0.88, 2.25);
    st.set(0, usd(ev), ev > 0 ? "good" : "bad"); st.set(1, num(feel), feel > 0 ? "good" : "bad"); st.set(2, feel > 0 ? "Accept" : "Refuse", feel > 0 ? "good" : "bad");
  };
  const sl = slider({ label: "Heads you win…", min: 100, max: 400, step: 10, value: win, fmt: (x) => usd(x), hint: "Tails you lose $100.", onInput: (x) => { win = x; draw(); } });
  draw();
  return stage({ title: "Would you take this coin flip?", controls: [sl], body: [st.el, h("p.muted", { html: "Every bet above $100 has positive expected value. Most people only accept once the win reaches about <b>$200-250</b>. That gap is loss aversion, and it's why investors check portfolios, see red, and sell at the bottom (<b>myopic loss aversion</b>, Benartzi & Thaler 1995)." })] });
}

function weighting() {
  let g = 0.61;
  const p = plot({ height: 260, x: [0, 1], y: [0, 1], xLabel: "real probability", yLabel: "decision weight", xFmt: (x) => pct(x, 0), yFmt: (x) => pct(x, 0), label: "Probability weighting" });
  const draw = () => p.draw({ series: [{ name: "How we weight it", color: W, width: 4, pts: curve((x) => pw(Math.max(1e-6, Math.min(1 - 1e-6, x)), g), 0, 1, 120) }, { name: "Rational", color: "var(--ink-3)", dash: "5 5", pts: [[0, 0], [1, 1]] }], dots: [{ x: 0.01, y: pw(0.01, g), r: 6, color: "#f5c518", label: `1% feels like ${pct(pw(0.01, g), 0)}` }, { x: 0.99, y: pw(0.99, g), r: 6, color: "var(--down)", label: `99% → ${pct(pw(0.99, g), 0)}` }] });
  const sl = slider({ label: "Distortion γ (1 = none)", min: 0.3, max: 1, step: 0.01, value: g, fmt: (x) => x.toFixed(2), onInput: (x) => { g = x; draw(); } });
  draw();
  return stage({ title: "Tiny chances feel bigger than they are", controls: [sl], body: [p.el], note: "Overweighting long shots explains lottery tickets, meme options and \"lottery-like\" stocks that earn poor returns. Underweighting near-certainties explains why people pay a lot to go from 99% to 100% safe (the <b>certainty effect</b>), the basis of much insurance pricing." });
}

/* ---------- 3. Anchoring ---------- */
function anchorSim() {
  let anchor = 65, pull = 35;
  const truth = 28, box = h("div"), st = stats([{ label: "Average guess" }, { label: "True answer" }, { label: "Pulled by the anchor" }]);
  const draw = () => {
    const r = rng(7), g = Array.from({ length: 400 }, () => clamp(truth + r.gauss() * 12 + (pull / 100) * (anchor - truth), 0, 100));
    const bins = Array(10).fill(0); g.forEach((v) => bins[Math.min(9, Math.floor(v / 10))]++);
    box.replaceChildren(columns(bins.map((b, i) => ({ label: `${i * 10}s`, value: b, color: anchor >= i * 10 && anchor < i * 10 + 10 ? "#f5c518" : W, show: b ? String(b) : "" })), { height: 190, label: "Guesses by bucket" }));
    const m = g.reduce((a, b) => a + b, 0) / g.length;
    st.set(0, `${num(m)}%`, "accent"); st.set(1, `${truth}%`); st.set(2, `${m > truth ? "+" : ""}${num(m - truth)} pts`, Math.abs(m - truth) > 5 ? "bad" : "good");
  };
  const c = [slider({ label: "The wheel landed on", min: 0, max: 100, value: anchor, fmt: (x) => `${x}`, onInput: (x) => { anchor = x; draw(); } }), slider({ label: "How sticky anchors are", min: 0, max: 70, value: pull, fmt: (x) => `${x}%`, onInput: (x) => { pull = x; draw(); } })];
  draw();
  return stage({ title: "Spin a wheel, then guess the % of UN members in Africa", controls: c, body: [box, st.el], note: "400 simulated people. In Tversky & Kahneman's 1974 study, a rigged wheel showing 10 led to a median guess of 25%; showing 65 led to 45%. The number was obviously random and it still moved the answer. People adjust away from an anchor, but not far enough." });
}

function frameSim() {
  let frame = "gain";
  const out = h("div");
  const draw = () => {
    const g = frame === "gain";
    out.replaceChildren(h("p", { html: g ? "<b>Programme A</b>: 200 of 600 people <b>will be saved</b>.<br><b>Programme B</b>: 1/3 chance all 600 are saved, 2/3 chance nobody is." : "<b>Programme C</b>: 400 of 600 people <b>will die</b>.<br><b>Programme D</b>: 1/3 chance nobody dies, 2/3 chance all 600 die." }),
      bars([{ label: g ? "Safe (A)" : "Safe (C)", value: g ? 72 : 22, color: "var(--up)" }, { label: g ? "Gamble (B)" : "Gamble (D)", value: g ? 28 : 78, color: "var(--down)" }], { max: 100, fmt: (v) => `${v}%` }));
  };
  const sg = seg({ label: "Same facts, worded as", options: [{ value: "gain", label: "Lives saved" }, { value: "loss", label: "Lives lost" }], value: frame, onChange: (x) => { frame = x; draw(); } });
  draw();
  return stage({ title: "The Asian disease problem (1981)", controls: [sg], body: [out], note: "A and C are identical; so are B and D. Framed as gains, people play safe. Framed as losses, they gamble. Prospect theory in one picture: risk-averse for gains, risk-seeking for losses." });
}

/* ---------- 4. Sunk costs ---------- */
function sunkSim() {
  let spent = 8, more = 4, pay = 3;
  const st = stats([{ label: "Already spent (gone either way)" }, { label: "Extra cost to finish" }, { label: "Payoff if finished" }, { label: "Right call" }]);
  const box = h("div");
  const draw = () => {
    const go = pay > more;
    st.set(0, `$${spent}M`); st.set(1, `$${more}M`); st.set(2, `$${pay}M`); st.set(3, go ? "Finish it" : "Walk away", go ? "good" : "bad");
    box.replaceChildren(columns([{ label: "Finish", value: pay - more - spent, color: go ? "var(--up)" : "var(--down)", show: usd(pay - more - spent) + "M" }, { label: "Stop now", value: -spent, color: !go ? "var(--up)" : "var(--down)", show: usd(-spent) + "M" }], { height: 180, fmt: (v) => usd(v) + "M", label: "Total outcome" }));
  };
  const c = [slider({ label: "Spent so far", min: 0, max: 20, value: spent, fmt: (x) => `$${x}M`, onInput: (x) => { spent = x; draw(); } }), slider({ label: "Cost to finish", min: 1, max: 10, value: more, fmt: (x) => `$${x}M`, onInput: (x) => { more = x; draw(); } }), slider({ label: "Value when done", min: 0, max: 15, value: pay, fmt: (x) => `$${x}M`, onInput: (x) => { pay = x; draw(); } })];
  draw();
  return stage({ title: "A half-built project", controls: c, body: [st.el, box], note: "Move \"spent so far\" all the way: the right call never changes. Only <b>future</b> costs and benefits matter. Yet the more we've sunk, the harder it is to stop (Concorde, failing acquisitions, the 4-hour film you've already sat through 2 hours of)." });
}

/* ---------- 5. Present bias ---------- */
function discountSim() {
  let beta = 0.7, delta = 0.995;
  const p = plot({ height: 260, x: [0, 60], y: [0, 1], xLabel: "days from now", yLabel: "how much $1 feels worth", xFmt: (x) => `${num(x)}d`, yFmt: (x) => `${num(x * 100)}¢`, label: "Discount curves" });
  const st = stats([{ label: "$100 today vs $110 tomorrow" }, { label: "$100 in 30d vs $110 in 31d" }, { label: "Verdict" }]);
  const draw = () => {
    const d = (t) => (t === 0 ? 1 : beta * Math.pow(delta, t));
    p.draw({ series: [{ name: "Present-biased (β-δ)", color: W, width: 4, pts: [[0, 1], ...curve((t) => beta * Math.pow(delta, t), 0.01, 60, 120)] }, { name: "Consistent (exponential)", color: "var(--ink-3)", dash: "5 5", pts: curve((t) => Math.pow(delta, t), 0, 60) }] });
    const now = 100 > 110 * d(1), later = 100 * d(30) > 110 * d(31);
    st.set(0, now ? "Take $100 now" : "Wait for $110", now ? "warn" : "good"); st.set(1, later ? "Take $100" : "Wait for $110", later ? "warn" : "good");
    st.set(2, now && !later ? "Preference reversal!" : "Consistent", now && !later ? "bad" : "good");
  };
  const c = [slider({ label: "β: extra weight on \"now\" (1 = none)", min: 0.4, max: 1, step: 0.01, value: beta, fmt: (x) => x.toFixed(2), onInput: (x) => { beta = x; draw(); } }), slider({ label: "δ: daily patience", min: 0.95, max: 1, step: 0.001, value: delta, fmt: (x) => x.toFixed(3), onInput: (x) => { delta = x; draw(); } })];
  draw();
  return stage({ title: "Today is special", controls: c, body: [p.el, st.el], note: "Look a month out and you'd happily wait a day for 10% more. Make it today versus tomorrow and you grab the $100. The plan was made by patient future-you; the decision is made by impatient present-you. Laibson's <b>β-δ model</b> captures this with one extra number." });
}

function smarter() {
  let mode = "standard";
  const box = h("div");
  const data = { standard: [3.5, 3.5, 3.5, 3.5], smart: [3.5, 6.5, 9.4, 11.6] };
  const draw = () => box.replaceChildren(columns(["Start", "After 1 raise", "After 2", "After 3"].map((l, i) => ({ label: l, value: data[mode][i], color: W, show: `${data[mode][i]}%` })), { height: 190, max: 14, fmt: (v) => `${v}%`, label: "Savings rate" }));
  const sg = seg({ label: "Plan", options: [{ value: "standard", label: "Ask once" }, { value: "smart", label: "Save More Tomorrow" }], value: mode, onChange: (x) => { mode = x; draw(); } });
  draw();
  return stage({ title: "A fix that uses the bias", controls: [sg], body: [box], note: "Thaler & Benartzi (2004): workers pre-commit to raise savings <i>at each future pay rise</i>, so it never feels like a loss today. Average savings rates rose from 3.5% to 13.6% over four raises. Commitment beats willpower." });
}

/* ---------- 6. Herds ---------- */
function cascadeSim() {
  let acc = 65, seed = 1;
  const row = h("div.casc"), st = stats([{ label: "Chose the right option" }, { label: "Cascade started at person" }, { label: "Wrong herds in 200 runs" }]);
  const run = (p, r) => {
    let up = 0; const acts = [], sigs = []; let start = 0;
    for (let i = 0; i < 24; i++) {
      const sig = r() < p ? 1 : 0; sigs.push(sig);
      let a;
      if (up >= 2) { a = 1; start ||= i + 1; } else if (up <= -2) { a = 0; start ||= i + 1; } else a = up === 0 ? sig : up > 0 ? (sig ? 1 : r() < 0.5 ? 1 : 0) : (sig ? (r() < 0.5 ? 1 : 0) : 0);
      if (Math.abs(up) < 2) up += a ? 1 : -1;
      acts.push(a);
    }
    return { acts, sigs, start };
  };
  const draw = () => {
    const r = rng(seed), o = run(acc / 100, r);
    row.replaceChildren(...o.acts.map((a, i) => h("span.casc-c", { "data-a": a, title: `Person ${i + 1}: private hint said ${o.sigs[i] ? "A" : "B"}, chose ${a ? "A" : "B"}` }, h("b", a ? "A" : "B"), h("small", o.sigs[i] ? "a" : "b"))));
    st.set(0, `${o.acts.filter(Boolean).length} / 24`); st.set(1, o.start ? `#${o.start}` : "none");
    const r2 = rng(99); let wrong = 0; for (let k = 0; k < 200; k++) { const x = run(acc / 100, r2); if (x.acts.slice(-5).every((v) => v === 0)) wrong++; }
    st.set(2, pct(wrong / 200, 0), wrong > 20 ? "bad" : "warn");
  };
  const c = [slider({ label: "How reliable each person's private hint is", min: 51, max: 95, value: acc, fmt: (x) => `${x}%`, onInput: (x) => { acc = x; draw(); } }), button("New crowd", () => { seed++; draw(); }, "primary")];
  draw();
  return stage({ title: "An information cascade: restaurant A is really better", controls: c, body: [h("p.muted", { html: "Each person gets a private hint (small letter) and sees everyone before them choose (big letter). Once two more people pick one side, it's rational to ignore your own hint and follow." }), row, st.el], note: "Nobody here is foolish: each follows the evidence they see. But once a herd forms, private information stops flowing, so a few early wrong guesses can lock in a wrong crowd. Bikhchandani, Hirshleifer & Welch (1992). Markets, fashions and bank runs share this shape." });
}

function beauty() {
  let lvl = 1.5;
  const box = h("div"), st = stats([{ label: "Average guess" }, { label: "Winning number (⅔ of avg)" }]);
  const draw = () => {
    const r = rng(3), gs = Array.from({ length: 300 }, () => { const k = Math.max(0, Math.round(lvl + r.gauss() * 1.1)); return r() < 0.08 ? r() * 100 : clamp(50 * Math.pow(2 / 3, k) + r.gauss() * 4, 0, 100); });
    const bins = Array(10).fill(0); gs.forEach((v) => bins[Math.min(9, Math.floor(v / 10))]++);
    const m = gs.reduce((a, b) => a + b, 0) / gs.length;
    box.replaceChildren(columns(bins.map((b, i) => ({ label: `${i * 10}`, value: b, color: Math.floor((m * 2) / 30) === i ? "#f5c518" : W, show: b ? String(b) : "" })), { height: 180, label: "Guesses" }));
    st.set(0, num(m, 1)); st.set(1, num((m * 2) / 3, 1), "accent");
  };
  const sl = slider({ label: "How many steps ahead the crowd thinks", min: 0, max: 6, step: 0.5, value: lvl, fmt: (x) => `${x}`, onInput: (x) => { lvl = x; draw(); } });
  draw();
  return stage({ title: "Keynes's beauty contest: guess ⅔ of the average", controls: [sl], body: [box, st.el], note: "Level 0 guesses 50. Level 1 guesses 33. Level 2, 22. Perfect logic says 0. Real crowds (FT readers, 1997) average around 2 levels: winning number about 13. Keynes's point: investors aren't picking the best company, they're guessing what <i>other people</i> will think is best." });
}

/* ---------- 7. Nudges ---------- */
function defaultSim() {
  let dflt = "out", inertia = 70;
  const box = h("div"), st = stats([{ label: "Enrolled in pension" }, { label: "Avg pot at 65 (per worker)" }]);
  const draw = () => {
    const keen = 100 - inertia, enrolled = dflt === "in" ? keen * 0.6 : dflt === "active" ? 75 + keen * 0.15 : 100 - keen * 0.12;
    box.replaceChildren(bars([{ label: "Opt-in (must sign up)", value: keen * 0.6, color: dflt === "in" ? W : "var(--line)" }, { label: "Active choice (must pick)", value: 75 + keen * 0.15, color: dflt === "active" ? W : "var(--line)" }, { label: "Opt-out (enrolled unless you leave)", value: 100 - keen * 0.12, color: dflt === "out" ? W : "var(--line)" }], { max: 100, fmt: (v) => `${num(v)}%` }));
    st.set(0, `${num(enrolled)}%`, enrolled > 80 ? "good" : "bad"); st.set(1, usd((enrolled / 100) * 310000), "accent");
  };
  const c = [seg({ label: "The default", options: [{ value: "in", label: "Opt-in" }, { value: "active", label: "Active choice" }, { value: "out", label: "Opt-out" }], value: dflt, onChange: (x) => { dflt = x; draw(); } }), slider({ label: "How many never touch the form", min: 0, max: 95, value: inertia, fmt: (x) => `${x}%`, onInput: (x) => { inertia = x; draw(); } })];
  draw();
  return stage({ title: "Same workers, same choices, different default", controls: c, body: [box, st.el], note: "Madrian & Shea (2001): moving a US firm's 401(k) to automatic enrolment raised participation among new hires from 37% to 86%. The UK's 2012 auto-enrolment took private-sector pension membership from about 42% to over 85%. Nothing was banned, nothing was paid." });
}

/* ---------- 8. Persuasion: the decoy ---------- */
function decoySim() {
  let on = true;
  const box = h("div");
  const draw = () => {
    const rows = on ? [["Web only · $59", 16], ["Print only · $125 (decoy)", 0], ["Print + web · $125", 84]] : [["Web only · $59", 68], ["Print + web · $125", 32]];
    box.replaceChildren(bars(rows.map(([l, v], i) => ({ label: l, value: v, color: l.includes("decoy") ? "#f5c518" : i === rows.length - 1 ? W : "var(--ink-3)" })), { max: 100, fmt: (v) => `${v}%` }),
      h("p.muted", { html: on ? `Revenue per 100 readers: <b>${usd(16 * 59 + 84 * 125)}</b>` : `Revenue per 100 readers: <b>${usd(68 * 59 + 32 * 125)}</b>` }));
  };
  const sg = seg({ label: "Show the print-only option?", options: [{ value: "y", label: "Yes" }, { value: "n", label: "No" }], value: "y", onChange: (x) => { on = x === "y"; draw(); } });
  draw();
  return stage({ title: "The Economist subscription test (Ariely)", controls: [sg], body: [box], note: "Nobody picks the decoy. It exists to make print + web look like a free upgrade. Adding an option nobody wants moved 52% of people to the expensive one. This is the <b>asymmetric dominance</b> effect: the cinema \"medium\" popcorn that's 50¢ less than the large." });
}

function charm() {
  let p = 4.99;
  const st = stats([{ label: "Left digit" }, { label: "Feels like" }]);
  const sl = slider({ label: "Price tag", min: 3.5, max: 6, step: 0.01, value: p, fmt: (x) => `$${x.toFixed(2)}`, onInput: (x) => { p = x; draw(); } });
  const draw = () => { st.set(0, `$${Math.floor(p)}`); st.set(1, `"about $${Math.floor(p)}"`, p % 1 > 0.9 ? "accent" : ""); };
  draw();
  return stage({ title: "Charm pricing", controls: [sl], body: [st.el], note: "We read left to right and anchor on the first digit, so $4.99 lands closer to $4 than to $5. A clothing-catalogue test found $39 outsold both $34 and $44 (Anderson & Simester 2003). Luxury brands do the opposite: round prices ($5,000) signal quality." });
}

/* ---------- 9. Negotiation ---------- */
function zopaSim() {
  let sell = 7000, buy = 9000, first = 11000;
  const p = plot({ height: 150, x: [4000, 14000], y: [0, 1], xFmt: (x) => usd(x), yFmt: () => "", hover: false, yTicks: 0, label: "Bargaining zone" });
  const st = stats([{ label: "ZOPA" }, { label: "Likely deal" }, { label: "Your share of the surplus" }]);
  const draw = () => {
    const z = buy - sell, deal = z > 0 ? clamp(sell + z * 0.5 + (first - (sell + buy) / 2) * 0.25, sell, buy) : NaN;
    p.draw({ bands: z > 0 ? [{ x0: sell, x1: buy, color: "var(--up)", opacity: 0.18 }] : [], vlines: [{ x: sell }, { x: buy }, { x: first, color: W }], custom: (g, sx, sy) => [[sell, 0.92, "seller's floor", "end"], [buy, 0.78, "buyer's ceiling", "start"], [first, 0.2, "your ask", "start"]].forEach(([x, y, t, a]) => g.append(s("text", { x: sx(x) + (a === "end" ? -6 : 6), y: sy(y), "text-anchor": a, class: "lbl strong", text: t }))), dots: Number.isFinite(deal) ? [{ x: deal, y: 0.5, r: 9, color: "#f5c518", label: `deal ≈ ${usd(deal)}` }] : [] });
    st.set(0, z > 0 ? usd(z) : "No deal possible", z > 0 ? "good" : "bad"); st.set(1, Number.isFinite(deal) ? usd(deal) : "–"); st.set(2, Number.isFinite(deal) ? pct((deal - sell) / z, 0) : "–", "accent");
  };
  const c = [slider({ label: "Seller won't go below", min: 4000, max: 12000, step: 250, value: sell, fmt: usd, onInput: (x) => { sell = x; draw(); } }), slider({ label: "Buyer won't go above", min: 4000, max: 12000, step: 250, value: buy, fmt: usd, onInput: (x) => { buy = x; draw(); } }), slider({ label: "You're selling. Your opening ask", min: 6000, max: 14000, step: 250, value: first, fmt: usd, onInput: (x) => { first = x; draw(); } })];
  draw();
  return stage({ title: "Selling a used car", controls: c, body: [p.el, st.el], note: "The <b>ZOPA</b> (zone of possible agreement) runs from the seller's walk-away price to the buyer's. If they don't overlap, no clever tactic creates a deal. Inside it, an ambitious but defensible first offer anchors where the deal lands (Galinsky & Mussweiler 2001)." });
}

function hagglGame() {
  let reserve, ask, round, over;
  const log = h("div.game-log"), st = stats([{ label: "Seller's ask" }, { label: "Round" }, { label: "Result" }]);
  const r = rng(5);
  let offer = 6000;
  const sl = slider({ label: "Your offer", min: 4000, max: 12000, step: 100, value: offer, fmt: usd, onInput: (x) => { offer = x; } });
  const reset = () => { reserve = 7200 + Math.round(r() * 15) * 100; ask = 11000; round = 1; over = false; log.replaceChildren(h("div", "Seller: \"It's $11,000. Great car.\"")); upd(); };
  const upd = () => { st.set(0, usd(ask)); st.set(1, `${Math.min(round, 6)} / 6`); };
  const say = (t) => { log.append(h("div", t)); log.scrollTop = 1e6; };
  const make = () => {
    if (over) return;
    say(`You: \"I'll pay ${usd(offer)}.\"`);
    if (offer >= ask) { over = true; st.set(2, `Deal at ${usd(offer)}`, "warn"); say(`Seller: \"Deal!\" (You could have paid as little as ${usd(reserve)}.)`); return; }
    if (offer >= reserve && (round >= 4 || offer >= (ask + reserve) / 2)) { over = true; st.set(2, `Deal at ${usd(offer)}`, offer < reserve + 800 ? "good" : "warn"); say(`Seller: \"Fine, deal.\" Their secret floor was ${usd(reserve)}.`); return; }
    if (round >= 6) { over = true; st.set(2, "Seller walked", "bad"); say(`Seller: \"We're too far apart.\" Their floor was ${usd(reserve)}.`); return; }
    const gap = ask - Math.max(offer, reserve);
    ask = Math.max(reserve, Math.round((ask - gap * (offer < reserve - 1500 ? 0.12 : 0.35)) / 100) * 100);
    round++; upd();
    say(offer < reserve - 1500 ? `Seller: \"That's insulting. ${usd(ask)}.\"` : `Seller: \"I can do ${usd(ask)}.\"`);
  };
  reset();
  return stage({ title: "Haggle with a seller (secret floor somewhere $7,200-8,700)", controls: [sl, button("Make offer", make, "primary"), button("New seller", () => { st.set(2, "–", ""); reset(); })], body: [st.el, log], note: "Concessions shrink as the seller nears their floor: <b>watch the size of their steps</b>, not just the numbers. Lowballing too hard slows them down; offering too fast leaves money on the table." });
}

export default {
  "two-systems": {
    principle: "Your brain runs <em>two systems</em>: a fast, automatic one that answers instantly, and a slow, effortful one that checks. Most money mistakes are System 1 answering a System 2 question.",
    hook: "<p>Economics used to assume people were <i>Homo economicus</i>: perfectly rational, always maximising. In the 1970s two psychologists, Daniel Kahneman and Amos Tversky, started cataloguing the predictable ways real people aren't. Kahneman won the 2002 Nobel prize in economics. Behavioural economics was born.</p>",
    parts: [
      { h: "Answer fast", sim: crt },
      { h: "The two systems", sim: () => table(["", "System 1", "System 2"], [["Speed", "Instant, automatic", "Slow, deliberate"], ["Effort", "None", "Tiring; easily depleted"], ["Good at", "Faces, language, patterns, routine", "Maths, logic, rules, checking"], ["Fails at", "Statistics, rare events, framing", "Being switched on at all"], ["Example", "2 + 2 = ?", "17 × 24 = ?"]]),
        after: "<p>System 1 isn't stupid: it drives your car and reads faces. It just uses <b>heuristics</b> (shortcuts) that misfire in predictable ways. Behavioural economics is largely a map of those misfires.</p>" },
      { h: "Where System 1 fails hardest: base rates", sim: bayesGrid },
      { h: "A field guide to shortcuts", sim: () => flips([["Availability", "Judging how likely something is by how easily examples come to mind. Plane crashes feel common; diabetes doesn't."], ["Representativeness", "Judging by resemblance, ignoring base rates. \"Linda is a feminist bank teller\" feels likelier than \"bank teller\". It can't be."], ["Affect heuristic", "If it feels good, it seems low-risk and high-reward. We like nuclear power less, so we think it's riskier."], ["Confirmation bias", "Seeking evidence that agrees with you. Fatal for investment theses."], ["Hindsight bias", "\"I knew it all along.\" Makes the past look predictable and the future look easier than it is."], ["Halo effect", "One good trait colours the rest. A charismatic CEO's strategy seems smarter."], ["WYSIATI", "\"What you see is all there is.\" System 1 builds a confident story from whatever evidence is in front of it."], ["Law of small numbers", "Trusting tiny samples. A fund up 3 years running proves little."]]) },
    ],
    job: "<p>Investors build <b>checklists</b> and pre-mortems to force System 2 on. Consultants and product teams run A/B tests instead of trusting intuition. Banks, insurers and regulators use behavioural insights units (the UK's \"Nudge Unit\" started in 2010). Recruiters are trained against halo effects with structured interviews.</p>",
    terms: [["System 1 / System 2", "Fast intuitive thinking vs slow deliberate thinking."], ["Heuristic", "A mental shortcut that's usually good enough."], ["Cognitive bias", "A systematic, predictable error in judgment."], ["Base-rate neglect", "Ignoring how common something is overall."], ["Availability heuristic", "Judging likelihood by how easily examples come to mind."], ["Confirmation bias", "Favouring information that supports what you believe."], ["Bounded rationality", "Herbert Simon's idea: we decide well enough with limited time and attention."]],
    quiz: [
      ["A disease affects 1 in 1,000. A test is 99% sensitive with a 5% false positive rate. You test positive. Roughly how likely are you to be sick?", ["99%", "95%", "About 2%"], 2, "~1 true positive vs ~50 false alarms per 1,000 people."],
      ["\"Shark attacks feel common because they're always in the news\" is…", ["Anchoring", "The availability heuristic", "Loss aversion"], 1, "Easy-to-recall examples inflate perceived frequency."],
      ["Which system does a 17 × 24 sum need?", ["System 1", "System 2", "Neither"], 1, "Effortful calculation is System 2's job."],
    ],
    recap: [["Two systems", "Fast intuition, slow checking."], ["Heuristics", "Useful shortcuts with predictable failures."], ["Base rates", "Rare things stay rare after one signal."]],
    see: ["prospect", "anchoring", "risk", "herding"],
  },

  prospect: {
    principle: "We feel <em>gains and losses relative to a reference point</em>, and losses hurt about twice as much as equal gains please.",
    hook: "<p>Offer someone a coin flip: heads they win $150, tails they lose $100. The maths says take it. Most people refuse. This simple fact, <b>loss aversion</b>, explains why investors hold losing stocks too long, why \"discounts\" sell better than \"surcharges\", and why a pay cut is far more upsetting than a missed raise.</p>",
    parts: [
      { h: "The value function", sim: valueFn },
      { h: "Would you flip?", sim: coinBet },
      { h: "Probabilities get bent too", sim: weighting },
      { h: "The fourfold pattern", sim: () => table(["", "Gains", "Losses"], [["<b>High probability</b>", "Risk-averse: take the sure thing (settle a strong lawsuit)", "Risk-seeking: gamble to avoid a sure loss (hold a losing stock)"], ["<b>Low probability</b>", "Risk-seeking: buy lottery tickets", "Risk-averse: buy insurance"]]),
        after: "<p>Combining the value curve with probability weighting predicts all four behaviours. Standard expected utility can't explain lottery <i>and</i> insurance buying by the same person.</p>" },
      { h: "In markets: the disposition effect", sim: () => predict({ q: "You own two stocks: one up 40%, one down 40%. You need cash. Which do most people sell?", options: ["The winner", "The loser", "Half of each"], answer: 0, why: "<p>Selling the winner \"locks in\" a gain; selling the loser makes a paper loss real. Odean (1998) found individual investors were about 50% more likely to sell winners than losers, and the losers they kept went on to underperform the winners they sold. Taxes usually argue for the opposite.</p>" }) },
    ],
    job: "<p>Wealth managers coach clients through drawdowns because loss aversion drives panic selling. Product teams frame prices as avoided losses (\"don't lose your discount\"). Traders use hard <b>stop-losses</b> to beat the urge to hold losers. Negotiators frame offers as what the other side stands to lose. Insurers price on the certainty effect.</p>",
    terms: [["Prospect theory", "Kahneman & Tversky's model of decisions under risk (1979)."], ["Loss aversion", "Losses feel about 2× as strong as equal gains."], ["Reference point", "The baseline against which gains and losses are judged."], ["Probability weighting", "Overweighting small probabilities, underweighting large ones."], ["Certainty effect", "Overvaluing outcomes that are certain."], ["Disposition effect", "Selling winners too early and holding losers too long."], ["Endowment effect", "Valuing something more just because you own it."]],
    quiz: [
      ["With λ = 2, losing $100 feels like…", ["Losing $50", "Winning $100 in reverse", "Twice as bad as winning $100 feels good"], 2, "That's what λ measures."],
      ["People buy both lottery tickets and insurance because they…", ["Are irrational at random", "Overweight small probabilities", "Love risk"], 1, "Tiny chances of big wins and big losses both loom large."],
      ["The disposition effect predicts investors will…", ["Sell losers first", "Sell winners first", "Never sell"], 1, "Realising a loss hurts, so they hold losers."],
    ],
    recap: [["Reference point", "Changes, not totals."], ["λ ≈ 2", "Losses loom larger."], ["Fourfold", "Risk attitude flips with gains/losses and odds."]],
    see: ["two-systems", "mental-accounting", "persuasion", "risk"],
  },

  anchoring: {
    principle: "The <em>first number you see</em> drags your estimate toward it, even when it's random. And how a choice is <em>worded</em> changes which one you pick.",
    hook: "<p>Real-estate agents shown the same house with different list prices valued it differently, by around 10%, and swore the list price hadn't influenced them (Northcraft & Neale, 1987). Judges given a higher prosecutor's demand hand down longer sentences. A $3,000 watch in the window makes the $800 one look reasonable.</p>",
    parts: [
      { h: "Spin the wheel", sim: anchorSim },
      { h: "Frames", sim: frameSim },
      { h: "Anchors everywhere", sim: () => flips([["List price", "Starts every house and car negotiation."], ["\"Was $199, now $99\"", "The crossed-out price is an anchor, real or not."], ["Salary history", "Why some places ban asking for it: it anchors your offer."], ["52-week high", "Investors anchor on past prices: \"it was $80, so $40 is cheap.\""], ["Analyst targets", "Forecasts cluster near last year's number."], ["Menu decoys", "A $90 steak makes the $45 fish look moderate."]]) },
      { h: "Practise: frame it", sim: () => predict({ q: "Which label sells more beef, with identical meat?", options: ["25% fat", "75% lean", "No difference"], answer: 1, why: "<p>Levin & Gaeth (1988): \"75% lean\" was rated better tasting and less greasy, even after people ate it. Positive frames attract; negative frames repel. Same with \"95% survival\" vs \"5% mortality\" for surgery.</p>" }) },
    ],
    job: "<p>Bankers set the anchor in M&A by naming a price first in the pitch. Consultants frame recommendations as losses avoided. Salespeople show the premium option first. Analysts guard against anchoring by building valuations from scratch before looking at the market price. Pollsters know that question wording swings results by 10+ points.</p>",
    terms: [["Anchoring", "Estimates pulled toward an initial number."], ["Insufficient adjustment", "Moving away from an anchor, but not enough."], ["Framing effect", "Different choices from the same facts described differently."], ["Gain frame / loss frame", "Describing outcomes as what's won vs what's lost."], ["Reference price", "The price a buyer expects; sets whether a deal feels good."]],
    quiz: [
      ["An obviously random number still shifts estimates. Why?", ["People are told to use it", "Insufficient adjustment from a starting point", "It contains information"], 1, "We start at the anchor and adjust too little."],
      ["\"90% survive\" vs \"10% die\" lead to different choices. That's…", ["Anchoring", "Framing", "Herding"], 1, "Same facts, different frame."],
      ["The best defence against anchoring in valuation is to…", ["Look at the share price first", "Form your own estimate before seeing the market's", "Average the two"], 1, "Independent estimates first, then compare."],
    ],
    recap: [["Anchor", "First number wins."], ["Adjust", "Always too little."], ["Frame", "Wording picks the winner."]],
    see: ["prospect", "negotiation", "persuasion", "pricing"],
  },

  "mental-accounting": {
    principle: "Money is fungible, but we <em>sort it into mental jars</em> with different rules. And we let money that's already gone steer decisions it shouldn't.",
    hook: "<p>People keep savings earning 1% while carrying credit-card debt at 22%. Tax refunds get spent on holidays; salary gets budgeted. Gamblers bet \"house money\" more freely. Richard Thaler named this <b>mental accounting</b> and won the 2017 Nobel prize partly for it.</p>",
    parts: [
      { h: "Sunk costs", sim: sunkSim },
      { h: "Which jar?", sim: () => stepper([
        { t: "The theatre ticket", html: "<p>You arrive at the theatre and discover you've <b>lost your $50 ticket</b>. Do you buy another?</p><p class='muted'>Most say no: the \"theatre\" account is already spent.</p>" },
        { t: "The lost cash", html: "<p>Now you arrive and discover you've <b>lost a $50 note</b>. Do you still buy a ticket?</p><p class='muted'>Most say yes. But you're $50 poorer in both cases. Only the jar changed (Tversky & Kahneman 1981).</p>" },
        { t: "House money", html: "<p>Investors after a big gain take more risk with \"the market's money\". After a loss they either freeze or gamble to \"get back to even\" (the <b>break-even effect</b>).</p>" },
        { t: "The fix", html: "<p>Ask: <i>if I had this money in cash right now, would I make this choice?</i> Ignore which jar it came from and what's already spent.</p>" },
      ]) },
      { h: "Practise", sim: () => calc({ q: "You have $5,000 in savings at 1% and $5,000 of card debt at 22%. Paying the card off with savings changes your yearly interest by how much (in $)?", answer: 1050, tol: 0.01, unit: "$", why: "<p>You lose 1% × 5,000 = $50 of interest earned and save 22% × 5,000 = $1,100 of interest paid: <b>+$1,050</b> a year. Many people won't, because \"savings\" feels untouchable.</p>" }) },
    ],
    job: "<p>CFOs and PE boards fight sunk-cost thinking with <b>zero-based budgeting</b> and kill criteria for projects. Investors ask \"would I buy this today at this price?\" instead of anchoring on purchase price. Fintech apps use the jar instinct for good (\"pots\" and round-up savings). Casinos convert money to chips so it stops feeling like money.</p>",
    terms: [["Mental accounting", "Treating money differently depending on its source or label."], ["Fungibility", "Any dollar can substitute for any other."], ["Sunk cost", "Money already spent that can't be recovered."], ["Sunk cost fallacy", "Letting sunk costs drive future decisions."], ["House money effect", "Taking more risk with recent gains."], ["Zero-based budgeting", "Justifying every cost from scratch each period."]],
    quiz: [
      ["A project has cost $10M. Finishing costs $5M more and returns $4M. You should…", ["Finish: we're nearly there", "Stop: future cost exceeds future benefit", "Spend $10M more"], 1, "Only the $5M vs $4M matters."],
      ["A $1,000 tax refund is spent faster than a $1,000 raise. That's…", ["Loss aversion", "Mental accounting", "Anchoring"], 1, "Windfalls go into a \"fun\" jar."],
      ["Casinos use chips partly because…", ["They're lighter", "Chips feel less like real money", "They're required by law"], 1, "A different mental account makes spending easier."],
    ],
    recap: [["Jars", "Money gets labels."], ["Sunk", "Spent is spent; look forward."], ["Test", "Would I do this with fresh cash?"]],
    see: ["opportunity", "margin", "prospect", "present-bias"],
  },

  "present-bias": {
    principle: "We treat <em>now as special</em>: patient about the future in general, impatient about today in particular. So plans made for later collapse when later arrives.",
    hook: "<p>In January, gyms sell annual memberships to people who plan to go three times a week. DellaVigna & Malmendier (2006) found members paid about $17 per visit when $10 pay-as-you-go passes were available. Future-you buys the membership; present-you skips the session.</p>",
    parts: [
      { h: "The reversal", sim: discountSim },
      { h: "Tie your hands", sim: smarter },
      { h: "Commitment devices", sim: () => flips([["Ulysses", "Had himself tied to the mast to hear the Sirens. The original commitment device."], ["Auto-transfer", "Move savings out on payday before you see them."], ["Pension lock-ups", "Penalties for early withdrawal protect future-you."], ["StickK and bets", "Put money on the line that you'll lose if you quit."], ["Mortgages", "A forced savings plan most people stick to."], ["Pay-later traps", "BNPL and teaser rates exploit present bias the other way."]]) },
      { h: "Practise", sim: () => predict({ q: "Which is the best sign of present bias, rather than just impatience?", options: ["Preferring $100 now to $200 in a year", "Choosing $110 in 31 days over $100 in 30, but $100 today over $110 tomorrow", "Never saving"], answer: 1, why: "<p>Impatience alone can be perfectly consistent. The giveaway is a <b>preference reversal</b>: the same one-day wait is worth it in a month, but not today.</p>" }) },
    ],
    job: "<p>Pension designers build in auto-escalation and lock-ups. Consumer lenders and regulators study how teaser rates, BNPL and subscriptions exploit it. Public health uses commitment contracts. Companies suffer present bias too: <b>short-termism</b> means cutting R&D to hit this quarter's earnings.</p>",
    terms: [["Present bias", "Overweighting the present relative to any future date."], ["Hyperbolic discounting", "Discount rates that fall the further out you look."], ["β-δ model", "Exponential discounting plus a one-off penalty on anything not now."], ["Time inconsistency", "Preferring a plan now but abandoning it later."], ["Commitment device", "A way to lock in future behaviour."], ["Short-termism", "Sacrificing long-run value for near-term results."]],
    quiz: [
      ["Exponential discounters…", ["Never reverse preferences over time", "Always prefer now", "Can't save"], 0, "A constant rate keeps relative values the same as dates approach."],
      ["Save More Tomorrow works mainly because…", ["It pays a bonus", "Increases happen in the future and with pay rises", "It's compulsory"], 1, "It asks future-you, and never feels like a loss."],
      ["Gym members paying $17 per visit when passes cost $10 shows…", ["Overconfidence about future self-control", "Loss aversion", "Anchoring"], 0, "Naïve about their own present bias."],
    ],
    recap: [["Now ≠ later", "Today gets a bonus."], ["Reversal", "Good plans, bad follow-through."], ["Commit", "Design so the default is the plan."]],
    see: ["pv", "personal", "nudges", "compound"],
  },

  herding: {
    principle: "Copying others is often <em>rational one person at a time</em>, and still produces crowds that are confidently wrong. Add overconfidence and you get bubbles.",
    hook: "<p>\"When the music stops, in terms of liquidity, things will be complicated. But as long as the music is playing, you've got to get up and dance.\" Citigroup's CEO said that in July 2007. He knew the risk. So did everyone. Each was right to dance while others danced, and together they built the 2008 crisis.</p>",
    parts: [
      { h: "Watch a cascade form", sim: cascadeSim },
      { h: "Thinking about thinking", sim: beauty },
      { h: "Overconfidence", sim: () => bars([{ label: "Drivers who think they're above average", value: 93 }, { label: "Fund managers who think they're above average", value: 74 }, { label: "Most active traders' returns vs least active (yearly gap)", value: 7, color: "var(--down)" }], { max: 100, fmt: (v) => `${v}%` }),
        after: "<p>Svenson (1981): 93% of US drivers rated themselves above the median. Montier (2006): 74% of 300 fund managers thought they were above average. Barber & Odean (2000): households that traded most earned 11.4% a year vs 18.5% for the market. Overconfidence makes people trade too much, concentrate too much, and ignore base rates.</p>" },
      { h: "Practise", sim: () => predict({ q: "Why can a bubble keep inflating even when most investors think prices are too high?", options: ["They're all irrational", "Each expects to sell to someone else before the fall (the greater fool)", "Central banks require it"], answer: 1, why: "<p>If you think others will keep buying, buying is rational for you. Shorting is risky because \"markets can remain irrational longer than you can remain solvent\" (attributed to Keynes). These are the <b>limits to arbitrage</b>.</p>" }) },
    ],
    job: "<p>Fund managers face <b>career risk</b>: being wrong alone is worse than being wrong with the crowd, so they hug benchmarks. Contrarian investors try to exploit herds. Central banks watch for credit-fuelled herding. Risk managers stress-test for crowded trades that everyone exits at once (the 2007 quant quake).</p>",
    terms: [["Herding", "Copying others' actions."], ["Information cascade", "People ignore private info and follow predecessors."], ["Overconfidence", "Overestimating your knowledge or skill."], ["Beauty contest", "Keynes's metaphor: guess what others will guess."], ["Greater fool theory", "Buying overvalued assets expecting to sell to someone else."], ["Limits to arbitrage", "Why smart money can't always correct mispricing."], ["Career risk", "The cost of being wrong alone."]],
    quiz: [
      ["In an information cascade, people follow the crowd because…", ["They're stupid", "Others' choices outweigh their own private signal", "They're paid to"], 1, "It's rational given what they observe."],
      ["In \"guess ⅔ of the average\", fully rational players who know everyone is rational guess…", ["33", "22", "0"], 2, "Iterating ⅔ forever reaches zero."],
      ["Barber & Odean found the most active traders…", ["Beat the market", "Did worst", "Matched the market"], 1, "Trading costs and overconfidence ate returns."],
    ],
    recap: [["Cascade", "Rational copying, fragile crowds."], ["Beauty contest", "Guess the guessers."], ["Overconfident", "Trade less, diversify more."]],
    see: ["bubbles", "active-passive", "game-theory", "bank-run"],
  },

  nudges: {
    principle: "There's no neutral way to present a choice. <em>Defaults, order and effort</em> change what people pick, without banning or paying anything.",
    hook: "<p>Countries where you must <i>opt in</i> to be an organ donor have consent rates around 4-27%. Neighbours where you must <i>opt out</i> have rates above 85%, often near 99% (Johnson & Goldstein, 2003). The people aren't that different. The form is.</p>",
    parts: [
      { h: "The power of the default", sim: defaultSim },
      { h: "Make it EAST", sim: () => flips([["Easy", "Cut friction. Pre-fill forms. Every extra step loses people."], ["Attractive", "Make the good choice stand out. Personalise. Use rewards."], ["Social", "Tell people what others do: \"9 out of 10 people pay their tax on time\" raised UK tax payments."], ["Timely", "Prompt at the moment of decision: pay day, new job, check-out."]]),
        after: "<p>The UK Behavioural Insights Team's framework. The tax-letter test raised on-time payment by about 5 percentage points, bringing in millions at almost no cost.</p>" },
      { h: "Dark patterns", sim: () => table(["Trick", "How it works"], [["Roach motel", "Easy to subscribe, hard to cancel."], ["Confirmshaming", "\"No thanks, I don't like saving money.\""], ["Drip pricing", "Fees revealed only at checkout."], ["Fake urgency", "A countdown that resets."], ["Pre-ticked boxes", "Defaults working against you (banned for consent in the EU)."]]),
        after: "<p>Same tools, opposite intent. Regulators (the FTC, the UK CMA, the EU's DSA) increasingly fine these. Thaler's rule: <i>nudge for good</i>, and make it easy to opt out.</p>" },
    ],
    job: "<p>Governments run nudge units in 200+ public bodies worldwide. Banks and fintechs design onboarding around defaults. Product managers run A/B tests on every word of a checkout flow. Consultants redesign HR benefits and pensions. Compliance teams check designs against consumer-protection rules on dark patterns.</p>",
    terms: [["Nudge", "Changing the choice architecture without forbidding options or changing incentives much."], ["Choice architecture", "How choices are presented."], ["Default effect", "People stick with the pre-set option."], ["Libertarian paternalism", "Steering choices while keeping freedom to choose."], ["Friction", "Effort a choice requires."], ["Dark pattern", "Design that tricks users against their interest."], ["Social norm", "What people believe others do; a powerful nudge."]],
    quiz: [
      ["Auto-enrolment works mainly because of…", ["Higher interest", "Inertia and the default effect", "Tax law"], 1, "Most people never change the default."],
      ["\"Most people in your town pay on time\" uses which EAST lever?", ["Easy", "Social", "Timely"], 1, "Social norms."],
      ["A nudge must…", ["Forbid bad choices", "Keep the other options easily available", "Pay people"], 1, "Otherwise it's a mandate, not a nudge."],
    ],
    recap: [["Defaults", "The quiet superpower."], ["EAST", "Easy, Attractive, Social, Timely."], ["Ethics", "Nudge for good; easy exit."]],
    see: ["present-bias", "incentives", "persuasion", "personal"],
  },

  persuasion: {
    principle: "Prices and pitches are read by System 1. <em>Decoys, digits, scarcity and social proof</em> change what people choose, often more than the product does.",
    hook: "<p>Williams-Sonoma's $275 bread maker sold slowly. Then it added a bigger $429 model, which barely sold, and sales of the $275 one nearly doubled. The expensive model didn't need to sell. It needed to make the cheaper one look sensible.</p>",
    parts: [
      { h: "The decoy", sim: decoySim },
      { h: "Charm prices", sim: charm },
      { h: "Cialdini's principles", sim: () => flips([["Reciprocity", "Give first (a free sample, a useful report) and people feel they owe you."], ["Commitment & consistency", "Small yeses lead to big yeses. Free trials, \"sign this petition\"."], ["Social proof", "\"Bestseller\", reviews, \"1,203 people bought this today\"."], ["Authority", "Experts, credentials, a white coat."], ["Liking", "We buy from people we like and who are like us."], ["Scarcity", "\"Only 2 left\". Loss aversion makes missing out hurt."], ["Unity", "Shared identity: \"people like us do this\"."]]) },
      { h: "Pricing tricks consultants actually use", sim: () => table(["Tactic", "Mechanism", "Example"], [["Good-better-best", "Anchoring + compromise effect: people avoid extremes", "Most pick the middle tier"], ["Bundling", "Hides individual prices; one payment hurts once", "Cable TV, Microsoft 365"], ["Pain of paying", "Card and subscriptions feel less like spending than cash", "Uber hides the meter"], ["Price per day", "Small units sound small", "\"Less than a coffee a day\""], ["Free", "Zero is special: demand jumps far more than at $0.01", "Free shipping thresholds"]]) },
      { h: "Practise", sim: () => predict({ q: "A café sells small coffee $3 and large $5. Most buy small. Which added option is most likely to shift buyers to large?", options: ["Extra-large at $5.50", "Medium at $4.75", "Mini at $2"], answer: 1, why: "<p>A medium at $4.75 is nearly the price of the large, so the large looks like a steal (asymmetric dominance). An extra-large would make <i>large</i> the safe middle too: that's the compromise effect.</p>" }) },
    ],
    job: "<p>Pricing consultants (Simon-Kucher, McKinsey's pricing practice) design tiers and bundles. SaaS companies test plan pages endlessly. Marketers use social proof and scarcity. Fundraisers and IR teams use reciprocity and authority. Regulators watch for fake scarcity and fake reviews.</p>",
    terms: [["Decoy effect", "An inferior option that makes another look better."], ["Compromise effect", "Preferring the middle option."], ["Charm pricing", "Prices ending in 9 or 99."], ["Left-digit bias", "Over-weighting the first digit of a number."], ["Social proof", "Following what others do."], ["Scarcity principle", "Things seem more valuable when rare."], ["Zero-price effect", "Free is valued far more than a tiny price."]],
    quiz: [
      ["A decoy works by…", ["Being bought often", "Being clearly worse than one target option", "Being cheapest"], 1, "It's dominated, making the target shine."],
      ["$2.99 feels closer to $2 than $3 because of…", ["Left-digit bias", "Loss aversion", "Herding"], 0, "We anchor on the first digit."],
      ["\"Bestseller\" badges use…", ["Reciprocity", "Authority", "Social proof"], 2, "Others chose it, so it must be good."],
    ],
    recap: [["Decoy", "Sell the option next to it."], ["Digits", "Left one counts most."], ["Six levers", "Reciprocity, consistency, proof, authority, liking, scarcity."]],
    see: ["pricing", "anchoring", "prospect", "nudges"],
  },

  negotiation: {
    principle: "Your power in a negotiation comes from <em>your best alternative</em>. The deal lands somewhere between both sides' walk-away points, and anchors decide where.",
    hook: "<p>Every job offer, house purchase, supplier contract and M&A deal is a negotiation. Harvard's Fisher & Ury (<i>Getting to Yes</i>, 1981) and decades of experiments boil it down to a few ideas you can use tomorrow.</p>",
    parts: [
      { h: "Map the zone", sim: zopaSim },
      { h: "Play it", sim: hagglGame },
      { h: "The core ideas", sim: () => flips([["BATNA", "Best Alternative To a Negotiated Agreement. What you'll do if this fails. Improve it before you negotiate."], ["Reservation price", "Your walk-away number, set by your BATNA."], ["ZOPA", "Overlap between both sides' reservation prices."], ["Anchor", "First offers set the range. Go first if you know the value; ambitious but justifiable."], ["Interests vs positions", "\"$90k\" is a position. \"I need to cover rent and want growth\" is an interest. Trade on interests."], ["Logrolling", "Trade things you value less for things you value more. Creates value instead of splitting it."], ["Distributive vs integrative", "Splitting a fixed pie vs growing it."]]) },
      { h: "Practise", sim: () => calc({ q: "You'll sell your car for no less than $7,000. A buyer will pay up to $9,500. How big is the ZOPA (in $)?", answer: 2500, tol: 0.001, unit: "$", why: "<p>$9,500 − $7,000 = <b>$2,500</b> of surplus to split. Where it lands depends on anchors, information and patience.</p>" }) },
      { h: "Who should go first?", sim: () => predict({ q: "You know little about the asset's value; the other side knows a lot. Who should make the first offer?", options: ["You, aggressively", "Let them go first, then counter", "Neither"], answer: 1, why: "<p>Anchoring helps whoever goes first, <i>if</i> they're well informed. If you're not, their first offer reveals information and you avoid anchoring yourself badly. Then re-anchor with your counter.</p>" }) },
    ],
    job: "<p>M&A bankers run auctions to strengthen the seller's BATNA. PE deal teams negotiate price, terms and management packages. Procurement teams negotiate with suppliers; consultants advise on both. Lawyers draft the term sheets. Everyone negotiates their own salary: always know your BATNA (another offer).</p>",
    terms: [["BATNA", "Best alternative to a negotiated agreement."], ["Reservation price", "The worst deal you'd accept."], ["ZOPA", "Zone of possible agreement."], ["Anchoring (in negotiation)", "Using a first offer to set the range."], ["Integrative bargaining", "Creating value by trading across issues."], ["Distributive bargaining", "Dividing a fixed amount."], ["Winner's curse", "Winning an auction by overpaying."]],
    quiz: [
      ["Your BATNA mainly determines…", ["Your opening offer", "Your reservation price", "The other side's ZOPA"], 1, "You won't accept less than your best alternative."],
      ["If the seller's floor is $10k and the buyer's ceiling $8k…", ["They'll meet at $9k", "No deal is possible", "The buyer pays $10k"], 1, "No ZOPA."],
      ["\"I'll give you a longer contract if you cut the price\" is…", ["Distributive", "Logrolling", "Anchoring"], 1, "Trading across issues."],
    ],
    recap: [["BATNA", "Power comes from alternatives."], ["ZOPA", "Deal lives between walk-aways."], ["Anchor", "Go first if you know the value."]],
    see: ["anchoring", "game-theory", "accretion", "ib"],
  },
};

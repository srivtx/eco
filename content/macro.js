// World 4: The whole economy.
import { h, money, num, pct, clamp, rng } from "../lib/core.js";
import { slider, seg, stats, stage, predict, calc, callout, table, bars, button, flips, stepper } from "../lib/ui.js";
import { plot, columns, donut } from "../lib/chart.js";

const W = "var(--wc)";

/* ---------------- GDP builder ---------------- */
function gdpSim() {
  const v = { C: 18, I: 5, G: 4.5, X: 3, M: 3.8 };
  const box = h("div"), st = stats([{ label: "GDP" }, { label: "Net exports" }, { label: "Consumption share" }]);
  const draw = () => {
    const gdp = v.C + v.I + v.G + v.X - v.M;
    box.replaceChildren(donut([{ name: "Consumption (C)", v: v.C, color: "#3b82f6" }, { name: "Investment (I)", v: v.I, color: "#22c55e" }, { name: "Government (G)", v: v.G, color: "#f5c518" }, { name: "Net exports (NX)", v: Math.max(0, v.X - v.M), color: "#ec4899" }], { center: money(gdp * 1e12), sub: "GDP" }));
    st.set(0, money(gdp * 1e12)); st.set(1, money((v.X - v.M) * 1e12), v.X < v.M ? "bad" : "good"); st.set(2, pct(v.C / gdp, 0));
  };
  const mk = (k, label, max) => slider({ label, min: 0, max, step: 0.1, value: v[k], fmt: (x) => `$${x}T`, onInput: (x) => { v[k] = x; draw(); } });
  draw();
  return stage({ title: "Build a GDP (roughly the US)", controls: [mk("C", "Consumption: households buying stuff", 30), mk("I", "Investment: firms' machines, new homes", 10), mk("G", "Government purchases", 10), mk("X", "Exports", 6), mk("M", "Imports (subtracted)", 6)], body: [box, st.el], note: "GDP = C + I + G + (X − M). Imports are subtracted because they're already counted inside C, I and G but weren't produced here. Defaults are close to US 2024 numbers (~$29T)." });
}

/* ---------------- labour force ---------------- */
function labourSim() {
  let disc = 0;
  const box = h("div"), st = stats([{ label: "Unemployment rate" }, { label: "Participation rate" }, { label: "Employment-to-population" }]);
  const draw = () => {
    const adults = 260, employed = 160, unemployed = 8 - disc * 0.9, notIn = adults - employed - unemployed;
    const lf = employed + unemployed;
    box.replaceChildren(bars([{ label: "Adults (16+)", value: adults, color: "var(--ink-3)" }, { label: "Labour force", value: lf, color: "#3b82f6" }, { label: "Employed", value: employed, color: "var(--good)" }, { label: "Unemployed (looking)", value: unemployed, color: "var(--bad)" }, { label: "Not in labour force", value: notIn, color: "var(--line)" }], { fmt: (x) => `${num(x, 1)}M` }));
    st.set(0, pct(unemployed / lf), unemployed / lf < 0.04 ? "good" : ""); st.set(1, pct(lf / adults)); st.set(2, pct(employed / adults));
  };
  const a = slider({ label: "Unemployed who give up looking (millions)", min: 0, max: 5, step: 0.5, value: 0, onInput: (x) => { disc = x; draw(); } });
  draw();
  return stage({ title: "Who counts as unemployed?", controls: [a], body: [box, st.el], note: "You're <b>unemployed</b> only if you have no job <i>and</i> looked for one recently. Give up looking and you leave the labour force: the unemployment rate <b>falls</b>, though nothing got better. That's why economists also watch participation and the employment-to-population ratio." });
}
function phillipsSim() {
  const data = [[1961, 6.7, 1.1], [1965, 4.5, 1.6], [1968, 3.6, 4.2], [1969, 3.5, 5.5], [1974, 5.6, 11], [1975, 8.5, 9.1], [1979, 5.8, 11.3], [1980, 7.2, 13.5], [1982, 9.7, 6.2], [1986, 7.0, 1.9], [1990, 5.6, 5.4], [1995, 5.6, 2.8], [2000, 4.0, 3.4], [2003, 6.0, 2.3], [2007, 4.6, 2.8], [2009, 9.3, -0.4], [2012, 8.1, 2.1], [2015, 5.3, 0.1], [2019, 3.7, 1.8], [2020, 8.1, 1.2], [2022, 3.6, 8.0], [2024, 4.0, 2.9]];
  let era = "60s";
  const p = plot({ height: 290, x: [3, 10], y: [-1, 14], xLabel: "unemployment %", yLabel: "inflation %", xFmt: (v) => `${num(v)}%`, yFmt: (v) => `${num(v)}%`, hover: false, label: "US Phillips curve" });
  const draw = () => {
    const pick = { "60s": [1961, 1969], "70s": [1970, 1982], all: [1900, 2100] }[era];
    p.draw({ dots: data.map(([y, u, i]) => ({ x: u, y: i, r: 6, color: y >= pick[0] && y <= pick[1] ? (era === "70s" ? "var(--bad)" : W) : "var(--line)", label: y >= pick[0] && y <= pick[1] ? String(y) : "", dx: 8, dy: -6 })),
      series: era === "60s" ? [{ name: "", color: W, pts: [[3.4, 6], [4.5, 2], [6.8, 0.9]], noHover: true }] : [] });
  };
  const sg = seg({ label: "Show", options: [{ value: "60s", label: "1960s" }, { value: "70s", label: "1970s stagflation" }, { value: "all", label: "Everything" }], value: era, onChange: (v) => { era = v; draw(); } });
  draw();
  return stage({ title: "The Phillips curve: a trade-off that broke", controls: [sg], body: [p.el], note: "Approximate US annual data. In the 1960s lower unemployment came with higher inflation: a neat curve. In the 1970s oil shocks and rising expectations brought both high inflation <i>and</i> high unemployment: <b>stagflation</b>. The trade-off only holds if inflation expectations stay anchored." });
}

/* ---------------- business cycle ---------------- */
function cycleSim() {
  const pts = []; for (let t = 0; t <= 100; t++) pts.push([t, 100 + t * 0.6 + 6 * Math.sin(t / 8) + (t > 60 && t < 72 ? -(t - 60) * 0.9 + Math.max(0, t - 66) * 1.8 : 0)]);
  const trend = pts.map(([t]) => [t, 100 + t * 0.6]);
  const p = plot({ height: 260, x: [0, 100], y: [90, 170], xLabel: "time (quarters)", yLabel: "real GDP", xFmt: (v) => Math.round(v), yFmt: (v) => num(v), label: "Business cycle" });
  p.draw({ series: [{ name: "Real GDP", color: W, pts }, { name: "Trend (potential)", color: "var(--ink-3)", pts: trend, dash: "6 5" }], bands: [{ x0: 60, x1: 69, color: "var(--bad)", opacity: 0.18, label: "recession" }], dots: [{ x: 12, y: pts[12][1], color: "#ffc21a", label: "peak", r: 6 }, { x: 37, y: pts[37][1], color: "var(--surface)", label: "trough", r: 6 }] });
  return stage({ title: "Expansion, peak, contraction, trough", body: [p.el], note: "A common rule of thumb calls two quarters of falling real GDP a <b>recession</b>. Official US dating (by the NBER) looks at jobs, income, spending and production together. Since 1945 the average US expansion has lasted about five years, recessions about ten months." });
}
function indicatorGame() {
  const items = [["Yield curve inverting", "leading"], ["Building permits", "leading"], ["Stock prices", "leading"], ["Industrial production", "coincident"], ["Payroll employment", "coincident"], ["Unemployment rate", "lagging"], ["Core inflation", "lagging"], ["New jobless claims", "leading"], ["Consumer confidence", "leading"], ["Bank loan delinquencies", "lagging"]];
  let i = 0, score = 0;
  const q = h("p.q"), out = h("p.muted"), st = stats([{ label: "Score" }, { label: "Indicator" }]);
  const show = () => { if (i >= items.length) { q.textContent = `Done: ${score}/${items.length}.`; return; } q.textContent = `Is "${items[i][0]}" leading, coincident or lagging?`; st.set(1, `${i + 1} / ${items.length}`); };
  const guess = (g) => { if (i >= items.length) return; const ok = g === items[i][1]; if (ok) score++; out.innerHTML = `${ok ? "✓" : "✗"} <b>${items[i][0]}</b> is ${items[i][1]}.`; st.set(0, String(score)); i++; show(); };
  show(); st.set(0, "0");
  return stage({ title: "Sort the indicators", body: [q, h("div.game-btns", button("Leading", () => guess("leading"), "primary"), button("Coincident", () => guess("coincident")), button("Lagging", () => guess("lagging"))), out, st.el], note: "<b>Leading</b> indicators turn before the economy does; <b>coincident</b> move with it; <b>lagging</b> confirm the turn afterwards." });
}

/* ---------------- fiscal ---------------- */
function multiplierSim() {
  let mpc = 0.75, spend = 100;
  const st = stats([{ label: "Multiplier 1 ÷ (1 − MPC)" }, { label: "Total boost to GDP" }]);
  const box = h("div");
  const draw = () => {
    const items = []; let x = spend;
    for (let r = 0; r < 10; r++) { items.push({ label: r === 0 ? "Gov't" : `Round ${r + 1}`, value: x, color: r === 0 ? "#f5c518" : W }); x *= mpc; }
    box.replaceChildren(columns(items, { height: 200, fmt: (v) => `$${num(v)}B`, max: spend }));
    st.set(0, `${num(1 / (1 - mpc), 1)}×`); st.set(1, `$${num(spend / (1 - mpc))}B`, "good");
  };
  const a = slider({ label: "Marginal propensity to consume (MPC)", min: 0.1, max: 0.95, step: 0.05, value: mpc, onInput: (v) => { mpc = v; draw(); } });
  const b = slider({ label: "Government spends", min: 10, max: 500, step: 10, value: spend, fmt: (v) => `$${v}B`, onInput: (v) => { spend = v; draw(); } });
  draw();
  return stage({ title: "The spending multiplier", controls: [a, b], body: [box, st.el], note: "The government pays a builder; the builder spends 75% at shops; shopkeepers spend 75% of that... Real-world multipliers are much smaller than this textbook version (estimates mostly 0.5-2) because of taxes, imports, savings, and central banks raising rates in response." });
}
function debtSim() {
  let r = 3, g = 4, deficit = 3, start = 100;
  const p = plot({ height: 260, x: [0, 30], y: [0, 250], xLabel: "years", yLabel: "debt % of GDP", xFmt: (v) => Math.round(v), yFmt: (v) => `${num(v)}%`, label: "Debt dynamics" });
  const st = stats([{ label: "Debt in 30 years" }, { label: "r − g" }, { label: "Primary balance needed to stabilise" }]);
  const draw = () => {
    let d = start; const pts = [[0, d]];
    for (let t = 1; t <= 30; t++) { d = d * (1 + r / 100) / (1 + g / 100) + deficit; pts.push([t, d]); }
    p.draw({ y: [0, Math.max(250, ...pts.map((x) => x[1])) * 1.05], series: [{ name: "Debt/GDP", color: W, pts, area: true }], hlines: [{ y: start, label: "today" }] });
    const need = (start * (r - g)) / (100 + g);
    st.set(0, `${num(pts.at(-1)[1])}%`, pts.at(-1)[1] > start + 10 ? "bad" : "good"); st.set(1, `${r - g > 0 ? "+" : ""}${num(r - g, 1)}%`, r > g ? "bad" : "good"); st.set(2, need > 0 ? `${num(need, 1)}% surplus` : `${num(-need, 1)}% deficit is fine`);
  };
  const a = slider({ label: "Interest rate on debt (r)", min: 0, max: 8, step: 0.25, value: r, fmt: (v) => `${v}%`, onInput: (v) => { r = v; draw(); } });
  const b = slider({ label: "Nominal GDP growth (g)", min: 0, max: 8, step: 0.25, value: g, fmt: (v) => `${v}%`, onInput: (v) => { g = v; draw(); } });
  const c = slider({ label: "Primary deficit (before interest)", min: -3, max: 8, step: 0.5, value: deficit, fmt: (v) => `${v}% of GDP`, onInput: (v) => { deficit = v; draw(); } });
  draw();
  return stage({ title: "Will the debt explode?", controls: [a, b, c], body: [p.el, st.el], note: "The key number is <b>r − g</b>. If the economy grows faster than the interest rate, debt/GDP can shrink even with modest deficits. If rates rise above growth, the same deficits snowball. That's why the 2022 rate rises worried finance ministers." });
}

/* ---------------- tariffs ---------------- */
function tariffSim() {
  let tariff = 0;
  const A = 12, B = 0.1, C = 1, Dd = 0.1, world = 4;
  const p = plot({ height: 300, x: [0, 120], y: [0, 12], xLabel: "tonnes of steel", yLabel: "price", xFmt: (v) => num(v), yFmt: (v) => `$${num(v)}`, label: "A tariff on steel" });
  const st = stats([{ label: "Imports" }, { label: "Buyers lose" }, { label: "Domestic producers gain" }, { label: "Tariff revenue" }, { label: "Deadweight loss" }]);
  const draw = () => {
    const P = world + tariff, qd = (A - P) / B, qs = Math.max(0, (P - C) / Dd), qd0 = (A - world) / B, qs0 = (world - C) / Dd;
    const imp = Math.max(0, qd - qs);
    const csLoss = (qd + qd0) / 2 * tariff, psGain = (qs + qs0) / 2 * tariff, rev = imp * tariff, dwl = csLoss - psGain - rev;
    p.draw({ series: [{ name: "Domestic demand", color: "#3b82f6", pts: [[0, A], [A / B, 0]] }, { name: "Domestic supply", color: "#ff7a45", pts: [[0, C], [110, C + Dd * 110]] }, { name: "World price + tariff", color: "var(--ink)", pts: [[0, P], [120, P]], width: 3 }],
      areas: tariff > 0 ? [{ pts: [[qs, P], [qd, P], [qd, world], [qs, world]], color: "#f5c518", opacity: 0.45 }, { pts: [[qs0, world], [qs, P], [qs, world]], color: "var(--bad)", opacity: 0.4 }, { pts: [[qd, P], [qd0, world], [qd, world]], color: "var(--bad)", opacity: 0.4 }] : [],
      hlines: [{ y: world, label: "world price" }], dots: [{ x: qs, y: P, color: "#ff7a45", r: 6, label: "made here" }, { x: qd, y: P, color: "#3b82f6", r: 6, label: "bought" }] });
    st.set(0, num(imp)); st.set(1, `$${num(csLoss)}`, tariff ? "bad" : ""); st.set(2, `$${num(psGain)}`, tariff ? "good" : ""); st.set(3, `$${num(rev)}`); st.set(4, `$${num(dwl)}`, dwl > 0.5 ? "bad" : "");
  };
  const a = slider({ label: "Tariff per tonne", min: 0, max: 5, step: 0.25, value: tariff, fmt: (v) => `$${v}`, onInput: (v) => { tariff = v; draw(); } });
  draw();
  return stage({ title: "Put a tariff on imported steel", controls: [a], body: [p.el, st.el], note: "Yellow: tariff revenue. Red triangles: deadweight losses, from inefficient domestic production and from buyers who stop buying. Buyers' losses always exceed producers' gains plus revenue. Studies of the 2018 US tariffs found Americans paid nearly all of them." });
}

/* ---------------- growth race ---------------- */
function growthRace() {
  let g1 = 2, g2 = 5, years = 50;
  const p = plot({ height: 260, x: [0, 100], y: [0, 100], xLabel: "years", yLabel: "income per person", xFmt: (v) => Math.round(v), yFmt: (v) => money(v * 1000), label: "Growth race" });
  const st = stats([{ label: "Rich country after" }, { label: "Catching-up country after" }, { label: "Catch-up year" }]);
  const draw = () => {
    const a = (t) => 40 * Math.pow(1 + g1 / 100, t), b = (t) => 5 * Math.pow(1 + g2 / 100, t);
    const pa = [], pb = []; for (let t = 0; t <= years; t++) { pa.push([t, a(t)]); pb.push([t, b(t)]); }
    const cross = g2 > g1 ? Math.log(40 / 5) / Math.log((1 + g2 / 100) / (1 + g1 / 100)) : Infinity;
    p.draw({ x: [0, years], y: [0, Math.max(a(years), b(years)) * 1.08], series: [{ name: `Rich, ${g1}%/yr`, color: "#3b82f6", pts: pa }, { name: `Catching up, ${g2}%/yr`, color: W, pts: pb }], vlines: cross <= years ? [{ x: cross, label: "overtakes" }] : [] });
    st.set(0, money(a(years) * 1000)); st.set(1, money(b(years) * 1000)); st.set(2, Number.isFinite(cross) ? `year ${num(cross)}` : "never", Number.isFinite(cross) ? "good" : "bad");
  };
  const s1 = slider({ label: "Rich country growth", min: 0, max: 4, step: 0.25, value: g1, fmt: (v) => `${v}%`, onInput: (v) => { g1 = v; draw(); } });
  const s2 = slider({ label: "Poor country growth", min: 0, max: 10, step: 0.25, value: g2, fmt: (v) => `${v}%`, onInput: (v) => { g2 = v; draw(); } });
  const s3 = slider({ label: "Years", min: 10, max: 100, value: years, onInput: (v) => { years = v; draw(); } });
  draw();
  return stage({ title: "Income $40k vs $5k: how long to catch up?", controls: [s1, s2, s3], body: [p.el, st.el], note: "Small differences in growth rates become enormous over decades. South Korea grew around 7% a year from 1960 to 1990 and went from poorer than Ghana to rich. That's the rule of 70 at work: 7% doubles income every 10 years." });
}
function solowSim() {
  let sv = 25;
  const p = plot({ height: 260, x: [0, 200], y: [0, 30], xLabel: "capital per worker", yLabel: "per worker", xFmt: (v) => num(v), yFmt: (v) => num(v), label: "Solow model" });
  const st = stats([{ label: "Steady-state capital" }, { label: "Steady-state output" }, { label: "Consumption per worker" }]);
  const draw = () => {
    const f = (k) => 3 * Math.pow(k, 0.4), dep = 0.08, s = sv / 100;
    const kStar = Math.pow((3 * s) / dep, 1 / 0.6);
    const pts = (fn) => Array.from({ length: 101 }, (_, i) => [i * 2, fn(i * 2)]);
    p.draw({ series: [{ name: "Output y = f(k)", color: "#3b82f6", pts: pts(f) }, { name: "Saving s·f(k)", color: W, pts: pts((k) => s * f(k)) }, { name: "Wear and tear δk", color: "var(--bad)", pts: pts((k) => dep * k), dash: "6 5" }],
      dots: kStar < 200 ? [{ x: kStar, y: s * f(kStar), color: "#ffc21a", r: 7, label: "steady state" }] : [] });
    st.set(0, num(kStar, 1)); st.set(1, num(f(kStar), 1)); st.set(2, num((1 - s) * f(kStar), 2));
  };
  const a = slider({ label: "Savings rate", min: 5, max: 80, value: sv, fmt: (v) => `${v}%`, onInput: (v) => { sv = v; draw(); } });
  draw();
  return stage({ title: "Why saving more only gets you so far (Solow)", controls: [a], body: [p.el, st.el], note: "Machines wear out. Each extra machine adds less output (diminishing returns), so capital stops growing where saving just covers wear and tear. Saving more raises the <i>level</i> of income, not the long-run <i>growth rate</i>. Lasting growth needs better technology and ideas." });
}

export default {
  gdp: {
    principle: "GDP is <em>the market value of everything produced in a country in a year</em>. Spending, income and production are three views of the same total.",
    hook: "<p>Your spending is someone else's income. Add up all spending on final goods and services in a country and you get the same number as adding up all incomes, which equals the value of everything produced. That one number, GDP, is the scoreboard every politician, central banker and investor checks.</p>",
    parts: [
      { h: "C + I + G + NX", sim: gdpSim },
      { h: "Real versus nominal", html: "<p><b>Nominal GDP</b> uses today's prices. If prices rise 5% and nothing else changes, nominal GDP rises 5%: not real growth. <b>Real GDP</b> strips out price changes, so it measures actual stuff produced. Headlines about \"the economy grew 2%\" mean real GDP.</p>",
        sim: () => calc({ q: "Nominal GDP grew 7% and the GDP price index (deflator) rose 4%. What was real growth, roughly?", answer: 3, tol: 0.05, unit: "%", why: "<p>Real ≈ nominal − inflation = 7 − 4 = <b>3%</b> (exactly 1.07 ÷ 1.04 − 1 = 2.9%).</p>" }) },
      { h: "What GDP misses", sim: () => flips([["Unpaid work", "Childcare and cooking at home: zero GDP. Hire a nanny: GDP rises."], ["The black economy", "Cash jobs and illegal trade aren't counted (some countries estimate them)."], ["Wellbeing and leisure", "Working 60 hours instead of 40 raises GDP; are you happier?"], ["Pollution and depletion", "Cutting a forest adds GDP; losing the forest subtracts nothing."], ["Distribution", "GDP per person can rise while most people's income stalls."], ["Free digital goods", "Wikipedia, maps, search: huge value, little GDP."]]),
        after: "<p><b>GDP per person</b> (often adjusted for <b>purchasing power parity</b>) is the usual living-standards comparison. GNI adds income from abroad; it's bigger than GDP for Ireland's neighbours and much smaller than GDP for Ireland itself, where multinationals book profits.</p>" },
    ],
    job: "<p>Macro strategists forecast GDP to call rates, currencies and stocks. Consultants size markets as a share of GDP, and investors in emerging markets bet on GDP-per-person growth (a middle class buying cars, insurance, travel). Earnings of the stock market as a whole roughly track nominal GDP over long periods.</p>",
    terms: [["GDP", "Market value of all final goods and services produced in a country in a period."], ["Nominal GDP", "GDP at current prices."], ["Real GDP", "GDP adjusted for price changes."], ["GDP deflator", "Price index used to convert nominal to real GDP."], ["GDP per capita", "GDP divided by population."], ["GNI", "Gross national income: GDP plus net income from abroad."]],
    quiz: [
      ["A US shopper buys a $1,000 TV made in Korea. US GDP changes by…", ["+$1,000", "$0: it adds to C and subtracts as imports", "−$1,000"], 1, "C rises $1,000, M rises $1,000, so GDP is unchanged (aside from the US retailer's margin)."],
      ["Which is NOT counted in GDP?", ["A new factory", "A second-hand car sold between friends", "A teacher's salary"], 1, "Used goods were counted when first made. Only new production counts."],
      ["Real GDP grows when…", ["Prices rise", "More goods and services are produced", "The currency strengthens"], 1, "Real GDP measures quantity, with price changes stripped out."],
    ],
    recap: [["C+I+G+NX", "The spending recipe for GDP."], ["Real", "Strip out prices to see true growth."], ["Not wellbeing", "GDP misses unpaid work, nature and distribution."]],
    see: ["jobs", "cycle", "growth", "fiscal"],
  },

  jobs: {
    principle: "Unemployment counts <em>people looking for work who can't find it</em>, and in the short run there's often a trade-off between jobs and inflation.",
    hook: "<p>The monthly US jobs report moves trillions of dollars of assets within seconds. Not because one number matters so much, but because jobs drive spending, wages drive inflation, and the central bank watches both.</p>",
    parts: [
      { h: "Who counts", sim: labourSim },
      { h: "Three kinds of unemployment", sim: () => flips([["Frictional", "Between jobs, searching. Normal and even healthy."], ["Structural", "Skills or location don't match jobs: coal miners when mines close."], ["Cyclical", "Not enough demand: recessions. This is what policy fights."], ["Natural rate", "Frictional + structural. Maybe 4-5% in the US. Below it, wages and prices heat up."]]) },
      { h: "Jobs vs inflation", html: "<p>When unemployment is very low, employers compete for workers, wages rise, firms pass costs on: inflation. That's the <em>Phillips curve</em>.</p>", sim: phillipsSim,
        after: "<p>Its cousin, <em>Okun's law</em>: each 1% of GDP growth below trend raises unemployment by roughly half a point. Recessions show up in job losses fast.</p>" },
    ],
    job: "<p>Traders position around payrolls (nonfarm payrolls, first Friday of every month in the US). Economists at banks forecast them. HR and strategy consultants read labour tightness to advise on wage budgets. In equity research, labour costs are the biggest expense for services firms, so wage growth hits margins directly.</p>",
    terms: [["Labour force", "People working or actively looking for work."], ["Unemployment rate", "Unemployed ÷ labour force."], ["Participation rate", "Labour force ÷ working-age population."], ["Discouraged worker", "Wants a job but stopped looking, so isn't counted as unemployed."], ["Natural rate of unemployment", "The rate when the economy is at full capacity; frictional + structural."], ["Phillips curve", "Short-run trade-off between unemployment and inflation."], ["Stagflation", "High inflation and high unemployment at the same time."]],
    quiz: [
      ["A laid-off worker stops looking for a job. The unemployment rate…", ["Rises", "Falls", "Stays the same"], 1, "They leave the labour force, so they're no longer counted as unemployed."],
      ["Which type of unemployment do central banks try to reduce?", ["Frictional", "Structural", "Cyclical"], 2, "Cyclical unemployment comes from weak demand, which rate cuts can help."],
      ["Stagflation broke the simple Phillips curve because…", ["Unemployment and inflation rose together", "Inflation fell to zero", "Unemployment vanished"], 0, "Supply shocks and expectations pushed both up at once."],
    ],
    recap: [["Looking", "Unemployed = no job + actively searching."], ["Three kinds", "Frictional, structural, cyclical."], ["Trade-off", "Phillips curve: holds only with anchored expectations."]],
    see: ["gdp", "cycle", "inflation", "central-bank"],
  },

  cycle: {
    principle: "Economies don't grow in a straight line. <em>They overshoot and fall back</em>, and spotting the turn early is worth a fortune.",
    hook: "<p>Booms breed optimism, optimism breeds borrowing, borrowing breeds excess, and excess ends in a bust. Every investor, CEO and central banker is trying to answer one question: where are we in the cycle?</p>",
    parts: [
      { h: "The four phases", sim: cycleSim },
      { h: "What causes recessions?", html: "<ul><li><b>Monetary tightening</b>: central banks raise rates to kill inflation (1981-82).</li><li><b>Financial crises</b>: banks stop lending after a credit bust (2008). These recessions are deeper and longer.</li><li><b>Supply shocks</b>: oil price spikes (1973, 1979, 1990).</li><li><b>Demand collapses</b>: pandemic lockdowns (2020), the dot-com bust in investment (2001).</li></ul><p>Investment is the swing factor: it's a small slice of GDP but moves much more than consumption.</p>",
        sim: () => predict({ q: "Which part of GDP usually falls the most, in percentage terms, in a recession?", options: ["Consumption of food", "Business investment and housing", "Government spending"], answer: 1, why: "<p>Firms postpone machines and buildings; families delay new homes. Investment can fall 10-20% while consumption falls 1-2%. That's why construction and capital-goods stocks are called <i>cyclicals</i>.</p>" }) },
      { h: "Reading the turn", sim: indicatorGame },
    ],
    job: "<p>Asset managers <b>rotate sectors</b> through the cycle: cyclicals (industrials, banks, materials) early on, defensives (utilities, healthcare, consumer staples) late. PE firms try to buy at troughs and sell at peaks: deals done in 2009-10 had some of the best returns ever. Credit analysts watch default cycles. Consultants build scenario plans (\"base case, downside, severe downside\").</p>",
    terms: [["Business cycle", "The rise and fall of economic activity around its trend."], ["Recession", "A broad, significant decline in economic activity."], ["Expansion", "The phase when output and jobs are growing."], ["Leading indicator", "A data series that tends to turn before the economy."], ["Cyclical stock", "A company whose profits swing strongly with the economy."], ["Defensive stock", "A company whose demand holds up in recessions."]],
    quiz: [
      ["Which is a leading indicator?", ["Unemployment rate", "Building permits", "Core inflation"], 1, "Permits come before construction, which comes before activity."],
      ["Financial-crisis recessions tend to be…", ["Shorter", "Deeper and longer", "The same"], 1, "Damaged banks and debt overhangs slow the recovery (Reinhart and Rogoff)."],
      ["Late in a cycle, investors often shift towards…", ["Cyclical stocks", "Defensive stocks", "More leverage"], 1, "Defensives hold up better if a downturn comes."],
    ],
    recap: [["4 phases", "Expansion, peak, contraction, trough."], ["Investment", "Swings far more than consumption."], ["Lead", "Watch leading indicators to spot the turn."]],
    see: ["gdp", "yield-curve", "central-bank", "bubbles"],
  },

  fiscal: {
    principle: "Governments tax, spend and borrow. <em>Debt is sustainable when the economy grows faster than the interest on it.</em>",
    hook: "<p>The US government spends about $6.8 trillion a year and owes over $35 trillion. Is that a disaster or fine? The answer depends less on the size of the number than on two rates: what the debt costs, and how fast the economy grows.</p>",
    parts: [
      { h: "The multiplier", html: "<p>When the government spends in a slump, the money gets re-spent. How much depends on the <em>marginal propensity to consume</em>: the share of each extra dollar people spend.</p>", sim: multiplierSim },
      { h: "Deficits and debt", html: "<p>The <b>deficit</b> is one year's overspend; the <b>debt</b> is the pile of all past deficits. What matters is debt relative to GDP (the tax base). Play with the debt dynamics.</p>", sim: debtSim },
      { h: "Automatic stabilisers and crowding out", html: "<p>In a recession, tax revenue falls and unemployment benefits rise automatically, cushioning the fall: <em>automatic stabilisers</em>. On the other side, heavy government borrowing in a strong economy can push up interest rates and <em>crowd out</em> private investment.</p>",
        sim: () => table(["Country", "Debt % GDP (approx 2024)", "Note"], [["Japan", "~250%", "Mostly owed to domestic savers and the central bank"], ["Italy", "~135%", "Euro member: can't print its own currency"], ["USA", "~120%", "Borrows in the world's reserve currency"], ["UK", "~100%", "Gilts crisis in 2022 shows markets can bite"], ["Germany", "~63%", "Constitutional \"debt brake\""], ["Switzerland", "~38%", "Also a debt brake"]]),
        after: "<p>A country borrowing in its <i>own</i> currency can't be forced to default (it can always print), but printing risks inflation. Countries borrowing in someone else's currency (Argentina in dollars, Greece in euros) can and do default.</p>" },
    ],
    job: "<p>Sovereign bond traders and rating agencies live on debt sustainability. Policy economists at the IMF run exactly the debt simulation above for every country. Public-sector consultants advise on budgets, and investors track fiscal stimulus because it shows up in demand for everything from cement to software.</p>",
    terms: [["Fiscal policy", "Government use of taxes and spending to influence the economy."], ["Budget deficit", "Spending above revenue in a year."], ["National debt", "The total stock of government borrowing."], ["Multiplier", "How much GDP changes per $1 of government spending or tax change."], ["Automatic stabilisers", "Taxes and benefits that cushion downturns without new laws."], ["Crowding out", "Government borrowing raising rates and squeezing private investment."], ["r − g", "Interest rate minus growth rate: the key to debt sustainability."]],
    quiz: [
      ["With an MPC of 0.8, the textbook multiplier is…", ["0.8", "5", "1.25"], 1, "1 ÷ (1 − 0.8) = 5. Real-world multipliers are much smaller."],
      ["Debt/GDP falls without a surplus when…", ["The interest rate exceeds growth", "Growth exceeds the interest rate enough to offset the primary deficit", "Never"], 1, "If g > r, the debt ratio shrinks with modest deficits."],
      ["Unemployment benefits rising automatically in a recession are an example of…", ["Crowding out", "Automatic stabilisers", "Quantitative easing"], 1, "They kick in without any new decision."],
    ],
    recap: [["1 ÷ (1 − MPC)", "The textbook spending multiplier."], ["r − g", "Decides whether debt snowballs."], ["Own currency", "Matters for whether default is possible."]],
    see: ["gdp", "central-bank", "inflation", "bond-basics"],
  },

  "trade-macro": {
    principle: "A trade deficit isn't a scorecard of losing. <em>It's the mirror image of foreign money flowing in</em>, and a tariff is a tax mostly paid at home.",
    hook: "<p>Politicians talk about trade deficits as if a country is \"losing\". But if you buy more from your grocer than she buys from you, you aren't losing to your grocer. The real story is in the balance of payments, where every dollar has to go somewhere.</p>",
    parts: [
      { h: "A tariff, step by step", sim: tariffSim },
      { h: "The balance of payments always balances", html: "<p>Every international transaction has two sides. If the US imports $100 more than it exports, foreigners end up with $100 they must invest somewhere, often US bonds, stocks or property. So:</p><p><b>Current account deficit = financial account surplus.</b></p><p>And a deeper identity: <b>current account = national savings − investment</b>. A country that invests more than it saves must borrow from abroad, which shows up as a trade deficit. To shrink the deficit you must save more or invest less; tariffs alone rarely do it.</p>",
        sim: () => predict({ q: "A country slaps big tariffs on imports but its savings and investment don't change. What happens to the trade deficit, most likely?", options: ["It vanishes", "It changes little: the currency, exports and other imports adjust", "It doubles"], answer: 1, why: "<p>If S − I is unchanged, the current account is unchanged. Tariffs cut some imports, but the currency tends to strengthen and exports fall (also retaliation). The deficit mostly persists. The 2018-19 US tariffs didn't shrink the overall trade deficit.</p>" }) },
      { h: "Why countries protect anyway", sim: () => flips([["Infant industry", "Shield a young industry until it can compete (South Korea's shipbuilding)."], ["National security", "Don't depend on rivals for chips, steel, energy, drugs."], ["Jobs in one place", "Gains are spread thin; losses hit specific towns hard."], ["Retaliation", "Tariffs as a bargaining chip."], ["Dumping", "Foreign firms selling below cost to kill local rivals."]]) },
    ],
    job: "<p>Supply-chain consultants model tariff scenarios and \"near-shoring\" (moving production from China to Mexico or Vietnam). Investors price which firms bear tariffs. Macro funds trade currencies on current-account trends: big deficits funded by \"hot money\" make currencies vulnerable when the money stops flowing (Turkey, Argentina).</p>",
    terms: [["Tariff", "A tax on imports."], ["Quota", "A cap on the quantity of imports."], ["Trade balance", "Exports minus imports of goods and services."], ["Current account", "Trade balance plus income and transfers from abroad."], ["Financial account", "Net flows of investment across borders; mirrors the current account."], ["Dumping", "Selling exports below cost or home price."]],
    quiz: [
      ["Who mostly pays a tariff on imported steel?", ["The foreign steelmaker", "Domestic steel buyers through higher prices", "Nobody"], 1, "Prices rise at home; studies of recent tariffs found domestic buyers paid most of them."],
      ["A country runs a current account deficit. That means it…", ["Is losing money", "Receives net investment inflows from abroad", "Must default"], 1, "The deficit is financed by foreigners investing in it."],
      ["Current account = …", ["Exports − imports only", "National savings − investment", "Government deficit"], 1, "A core macro identity."],
    ],
    recap: [["Mirror", "Current account deficit = capital inflow."], ["S − I", "Savings minus investment drives the balance."], ["Home tax", "Tariffs are mostly paid by domestic buyers."]],
    see: ["trade", "fx", "gdp", "price-controls"],
  },

  growth: {
    principle: "Over decades, <em>productivity is almost everything</em>: how much each hour of work produces.",
    hook: "<p>The average person in 1800 lived about as well as the average person in 1000 BC. Then something happened, and income per person in rich countries rose roughly 20-fold. Paul Krugman: \"Productivity isn't everything, but in the long run it is almost everything.\"</p>",
    parts: [
      { h: "The power of a few percent", sim: growthRace },
      { h: "Machines alone aren't enough", sim: solowSim },
      { h: "So what makes countries rich?", sim: () => flips([["Ideas and technology", "Steam, electricity, computers. Ideas aren't used up: everyone can use them at once."], ["Human capital", "Education, health, skills."], ["Institutions", "Property rights, rule of law, low corruption. Acemoglu and Robinson's Nobel-winning argument."], ["Capital", "Machines and infrastructure, with diminishing returns."], ["Openness", "Trade and foreign investment spread ideas."], ["Demographics", "A growing working-age population adds output; ageing subtracts."]]),
        after: "<p>Compare North and South Korea: same culture, same geography until 1945, then different institutions. Today South Korea's income per person is more than 20 times the North's.</p>" },
    ],
    job: "<p>Long-term investors bet on growth stories: India's demographics, AI-driven productivity. Development economists at the World Bank and consultancies advise governments on reforms. Every DCF has a <b>terminal growth rate</b> (usually 2-3%, around long-run nominal GDP growth), and assuming a company grows faster than the economy forever is a classic modelling mistake.</p>",
    terms: [["Productivity", "Output per hour of work."], ["Capital deepening", "More machines per worker."], ["Diminishing returns", "Each extra unit of an input adds less output."], ["Steady state", "Where capital per worker stops growing."], ["Total factor productivity", "Growth not explained by more capital or labour: mostly technology and efficiency."], ["Catch-up growth", "Poor countries can grow faster by adopting existing technology."]],
    quiz: [
      ["At 3.5% growth, income doubles roughly every…", ["10 years", "20 years", "35 years"], 1, "70 ÷ 3.5 = 20 years."],
      ["In the Solow model, a higher savings rate permanently raises…", ["The growth rate", "The level of income, not the long-run growth rate", "Nothing"], 1, "Diminishing returns stop capital accumulation; only technology lifts growth permanently."],
      ["Which best explains North vs South Korea's divergence?", ["Geography", "Institutions", "Culture"], 1, "Same geography and culture, very different institutions."],
    ],
    recap: [["70 ÷ g", "Small growth gaps compound into huge income gaps."], ["Ideas", "Technology is the only lasting engine."], ["Institutions", "Rules of the game decide who gets rich."]],
    see: ["compound", "gdp", "trade", "scarcity"],
  },
};

// World 13: Consultant's toolkit. How strategy people structure problems and do the maths.
import { h, s, usd, num, pct, clamp } from "../lib/core.js";
import { slider, seg, stats, stage, predict, calc, callout, table, bars, button, flips, stepper, formula } from "../lib/ui.js";
import { plot, columns, curve, waterfall } from "../lib/chart.js";

const W = "var(--wc)";
const M = (x, d = 1) => `${usd(x, d)}M`;

/* ---------- MECE: a live profit tree ---------- */
function profitTree() {
  const base = { price: 120, vol: 10, vc: 70, fc: 300 };
  const v = { ...base };
  const box = h("div.tree");
  const node = (name, val, was, fmt, kids = [], good = 1) => {
    const d = val - was, tone = Math.abs(d) < 1e-9 ? "" : d * good > 0 ? "up" : "down";
    return h("div.tn", h("div.tn-box", { "data-tone": tone }, h("small", name), h("b", fmt(val)), Math.abs(d) > 1e-9 ? h("em", `${d > 0 ? "+" : "−"}${fmt(Math.abs(d)).replace("−", "")}`) : null), kids.length ? h("div.tn-kids", kids) : null);
  };
  const draw = () => {
    const rev = v.price * v.vol, was = base.price * base.vol, vcT = v.vc * v.vol, vcW = base.vc * base.vol;
    box.replaceChildren(node("Profit", rev - vcT - v.fc, was - vcW - base.fc, M, [
      node("Revenue", rev, was, M, [node("Price / unit", v.price, base.price, (x) => usd(x)), node("Units (M)", v.vol, base.vol, (x) => num(x, 1))]),
      node("Costs", vcT + v.fc, vcW + base.fc, M, [node("Variable", vcT, vcW, M, [node("Cost / unit", v.vc, base.vc, (x) => usd(x), [], -1)], -1), node("Fixed", v.fc, base.fc, M, [], -1)], -1),
    ]));
  };
  const c = [
    slider({ label: "Price", min: 80, max: 160, value: v.price, fmt: (x) => usd(x), onInput: (x) => { v.price = x; draw(); } }),
    slider({ label: "Units sold (M)", min: 5, max: 15, step: 0.5, value: v.vol, fmt: (x) => num(x, 1), onInput: (x) => { v.vol = x; draw(); } }),
    slider({ label: "Variable cost / unit", min: 40, max: 110, value: v.vc, fmt: (x) => usd(x), onInput: (x) => { v.vc = x; draw(); } }),
    slider({ label: "Fixed costs ($M)", min: 100, max: 600, step: 10, value: v.fc, fmt: (x) => `$${x}M`, onInput: (x) => { v.fc = x; draw(); } }),
  ];
  draw();
  return stage({ title: "The profit tree: find the branch that broke", controls: c, body: [box], note: "Every box splits into children that <b>add up to it</b> and <b>don't overlap</b>. Move any slider and the change flows up. In a real case you do this in reverse: start at \"profit fell\" and drill down until one leaf explains it." });
}

function meceQuiz() {
  return predict({ q: "Which split of \"all customers\" is MECE?", options: ["Young, students, wealthy", "Under 30, 30-60, over 60", "Online buyers, loyal buyers, new buyers"], answer: 1, why: "<p>Age bands cover everyone exactly once. The others overlap (a student can be young and wealthy) or leave gaps (who's left out of online, loyal and new?). MECE: <b>Mutually Exclusive, Collectively Exhaustive</b>. Barbara Minto's rule at McKinsey.</p>" });
}

/* ---------- Market sizing ---------- */
function sizingSim() {
  let pop = 8.5, adult = 80, drink = 60, cups = 1.4, price = 4;
  const box = h("div"), st = stats([{ label: "Cups per day" }, { label: "Market per year" }]);
  const draw = () => {
    const a = pop * adult / 100, d = a * drink / 100, c = d * cups, yr = c * price * 365;
    box.replaceChildren(bars([{ label: "People", value: pop }, { label: "Adults", value: a }, { label: "Coffee drinkers", value: d }, { label: "Cups a day", value: c, color: "#f5c518" }], { max: Math.max(pop, c), fmt: (x) => `${num(x, 1)}M` }));
    st.set(0, `${num(c, 1)}M`); st.set(1, `$${num(yr / 1000, 1)}B`, "accent");
  };
  const c = [
    slider({ label: "City population", min: 1, max: 20, step: 0.5, value: pop, fmt: (x) => `${x}M`, onInput: (x) => { pop = x; draw(); } }),
    slider({ label: "Adults", min: 60, max: 90, value: adult, fmt: (x) => `${x}%`, onInput: (x) => { adult = x; draw(); } }),
    slider({ label: "Of whom drink coffee", min: 20, max: 90, value: drink, fmt: (x) => `${x}%`, onInput: (x) => { drink = x; draw(); } }),
    slider({ label: "Cups per drinker per day", min: 0.5, max: 4, step: 0.1, value: cups, fmt: (x) => num(x, 1), onInput: (x) => { cups = x; draw(); } }),
    slider({ label: "Average price (all cups, home and café)", min: 0.5, max: 6, step: 0.25, value: price, fmt: (x) => usd(x, 2), onInput: (x) => { price = x; draw(); } }),
  ];
  draw();
  return stage({ title: "How big is New York's coffee market?", controls: c, body: [box, st.el], note: "<b>Top-down</b>: start with a big population and filter. Say every assumption out loud and round aggressively. The interviewer cares about your structure and sanity checks, not the exact answer. Then cross-check <b>bottom-up</b>: number of cafés × cups per café per day × price." });
}

function tamSam() {
  let sam = 35, som = 12;
  const svg = s("svg", { viewBox: "0 0 360 240", class: "chart tam", role: "img", "aria-label": "TAM SAM SOM circles" });
  const st = stats([{ label: "TAM" }, { label: "SAM" }, { label: "SOM" }]);
  const draw = () => {
    const tam = 40, R = 110, r2 = R * Math.sqrt(sam / 100), r3 = R * Math.sqrt((sam * som) / 10000);
    svg.replaceChildren(
      s("circle", { cx: 180, cy: 120, r: R, fill: W, "fill-opacity": 0.18, stroke: "var(--ink)", "stroke-width": 2 }),
      s("circle", { cx: 180, cy: 120 + R - r2, r: r2, fill: W, "fill-opacity": 0.4, stroke: "var(--ink)", "stroke-width": 2 }),
      s("circle", { cx: 180, cy: 120 + R - r3, r: Math.max(2, r3), fill: "#f5c518", stroke: "var(--ink)", "stroke-width": 2 }),
      s("text", { x: 180, y: 30, "text-anchor": "middle", class: "lbl strong", text: "TAM: everyone who could ever buy" }),
      s("text", { x: 180, y: 120 + R - 2 * r2 + 16, "text-anchor": "middle", class: "lbl strong", text: "SAM" }),
      r3 > 14 ? s("text", { x: 180, y: 120 + R - r3 + 4, "text-anchor": "middle", class: "lbl strong", text: "SOM" }) : null);
    st.set(0, `$${tam}B`); st.set(1, `$${num((tam * sam) / 100, 1)}B`); st.set(2, `$${num((tam * sam * som) / 10000, 2)}B`, "accent");
  };
  const c = [slider({ label: "Share you can serve (SAM / TAM)", min: 5, max: 100, value: sam, fmt: (x) => `${x}%`, onInput: (x) => { sam = x; draw(); } }), slider({ label: "Share you can win (SOM / SAM)", min: 1, max: 40, value: som, fmt: (x) => `${x}%`, onInput: (x) => { som = x; draw(); } })];
  draw();
  return stage({ title: "TAM, SAM, SOM for a project-management app", controls: c, body: [h("div.chartbox", svg), st.el], note: "<b>TAM</b> (total addressable market): all spending on the problem worldwide. <b>SAM</b> (serviceable): the part your product, language and channels can reach. <b>SOM</b> (obtainable): what you can realistically win in 3-5 years. Investors distrust pitch decks that only show TAM." });
}

/* ---------- Unit economics ---------- */
function ltvSim() {
  let arpu = 50, gm = 75, churn = 3, cac = 600;
  const p = plot({ height: 260, x: [0, 48], y: [-800, 2000], xLabel: "months since signup", yLabel: "cumulative profit per customer", xFmt: (x) => `${num(x)}m`, yFmt: (x) => usd(x), label: "Customer payback" });
  const st = stats([{ label: "Lifetime (avg)" }, { label: "LTV" }, { label: "LTV ÷ CAC" }, { label: "Payback" }]);
  const draw = () => {
    const m = arpu * gm / 100, life = 100 / churn, ltv = m * life;
    let cum = -cac, pay = null; const pts = [[0, -cac]];
    for (let t = 1; t <= 48; t++) { cum += m * Math.pow(1 - churn / 100, t - 1); pts.push([t, cum]); if (pay == null && cum >= 0) pay = t; }
    p.draw({ y: [Math.min(-200, -cac * 1.1), Math.max(500, ltv - cac, cum) * 1.1], series: [{ name: "Cumulative profit", color: W, width: 4, pts, area: true }], hlines: [{ y: 0, label: "break-even" }], vlines: pay ? [{ x: pay, label: `paid back: month ${pay}` }] : [] });
    const r = ltv / cac;
    st.set(0, `${num(life)} months`); st.set(1, usd(ltv)); st.set(2, `${num(r, 1)}×`, r >= 3 ? "good" : r >= 1 ? "warn" : "bad"); st.set(3, pay ? `${pay} months` : "never (48m+)", pay && pay <= 12 ? "good" : pay ? "warn" : "bad");
  };
  const c = [
    slider({ label: "Revenue per customer per month", min: 10, max: 200, step: 5, value: arpu, fmt: usd, onInput: (x) => { arpu = x; draw(); } }),
    slider({ label: "Gross margin", min: 20, max: 95, value: gm, fmt: (x) => `${x}%`, onInput: (x) => { gm = x; draw(); } }),
    slider({ label: "Monthly churn", min: 0.5, max: 15, step: 0.5, value: churn, fmt: (x) => `${x}%`, onInput: (x) => { churn = x; draw(); } }),
    slider({ label: "Cost to acquire (CAC)", min: 50, max: 2000, step: 50, value: cac, fmt: usd, onInput: (x) => { cac = x; draw(); } }),
  ];
  draw();
  return stage({ title: "Is this subscription business any good?", controls: c, body: [p.el, st.el], note: "Each customer starts in a hole (CAC) and climbs out with monthly gross profit, shrinking as some cancel. <b>LTV = monthly gross profit ÷ churn</b>. Rules of thumb for SaaS: LTV/CAC above 3, payback under 12-18 months. Push churn to 10% and watch a \"growing\" startup burn cash forever." });
}

function contribution() {
  let aov = 35, cogs = 14, deliv = 7, fees = 4, disc = 3;
  const box = h("div"), st = stats([{ label: "Contribution per order" }, { label: "Contribution margin" }]);
  const draw = () => {
    const cm = aov - cogs - deliv - fees - disc;
    box.replaceChildren(waterfall([{ label: "Basket", value: aov, total: true }, { label: "Food cost", value: -cogs }, { label: "Delivery", value: -deliv }, { label: "Payment + packaging", value: -fees }, { label: "Discounts", value: -disc }, { label: "Contribution", value: cm, total: true, color: cm >= 0 ? "var(--up)" : "var(--down)" }], { height: 230, fmt: (v) => usd(v), label: "Unit economics of an order" }));
    st.set(0, usd(cm, 2), cm >= 0 ? "good" : "bad"); st.set(1, pct(cm / aov), cm >= 0 ? "good" : "bad");
  };
  const c = [slider({ label: "Average order", min: 15, max: 60, value: aov, fmt: usd, onInput: (x) => { aov = x; draw(); } }), slider({ label: "Courier cost", min: 2, max: 12, value: deliv, fmt: usd, onInput: (x) => { deliv = x; draw(); } }), slider({ label: "Promo discount", min: 0, max: 12, value: disc, fmt: usd, onInput: (x) => { disc = x; draw(); } })];
  draw();
  return stage({ title: "One grocery delivery order", controls: c, body: [box, st.el], note: "<b>Contribution</b> is what one more unit adds after the costs that scale with it. If it's negative, growth makes losses bigger. Many 2021 quick-commerce startups had negative contribution per order and died when cheap funding ended." });
}

/* ---------- Frameworks: five forces radar ---------- */
function forces() {
  const names = ["Rivalry", "New entrants", "Substitutes", "Buyer power", "Supplier power"];
  const presets = { airlines: [5, 3, 3, 5, 5], software: [3, 2, 2, 2, 1], pharma: [3, 1, 2, 3, 2], grocery: [5, 3, 2, 4, 3] };
  let v = [...presets.airlines];
  const svg = s("svg", { viewBox: "0 0 360 300", class: "chart radar", role: "img", "aria-label": "Five forces radar" });
  const st = stats([{ label: "Average threat" }, { label: "Industry profits likely" }]);
  const sliders = names.map((n, i) => slider({ label: n, min: 1, max: 5, value: v[i], fmt: (x) => ["", "very weak", "weak", "medium", "strong", "very strong"][x], onInput: (x) => { v[i] = x; draw(); } }));
  const pt = (i, r) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; return [180 + r * Math.cos(a), 155 + r * Math.sin(a)]; };
  const draw = () => {
    svg.replaceChildren();
    for (let k = 1; k <= 5; k++) svg.append(s("polygon", { points: names.map((_, i) => pt(i, k * 22).join(",")).join(" "), fill: "none", class: "gl" }));
    names.forEach((n, i) => { const [x, y] = pt(i, 128); svg.append(s("line", { x1: 180, y1: 155, x2: pt(i, 110)[0], y2: pt(i, 110)[1], class: "gl" }), s("text", { x, y: y + 4, "text-anchor": x < 170 ? "end" : x > 190 ? "start" : "middle", class: "lbl strong", text: n })); });
    svg.append(s("polygon", { points: v.map((x, i) => pt(i, x * 22).join(",")).join(" "), fill: W, opacity: 0.35, stroke: W, "stroke-width": 3 }));
    v.forEach((x, i) => { const [a, b] = pt(i, x * 22); svg.append(s("circle", { cx: a, cy: b, r: 5, fill: W, stroke: "var(--ink)", "stroke-width": 2 })); });
    const avg = v.reduce((a, b) => a + b, 0) / 5;
    st.set(0, `${num(avg, 1)} / 5`); st.set(1, avg >= 3.8 ? "Thin" : avg >= 2.6 ? "Average" : "Fat", avg >= 3.8 ? "bad" : avg >= 2.6 ? "warn" : "good");
  };
  const sg = seg({ label: "Industry", options: Object.keys(presets).map((k) => ({ value: k, label: k[0].toUpperCase() + k.slice(1) })), value: "airlines", onChange: (k) => { v = [...presets[k]]; sliders.forEach((sl, i) => (sl.value = v[i])); draw(); } });
  draw();
  return stage({ title: "Porter's five forces", controls: [sg, ...sliders], body: [h("div.chartbox", svg), st.el], note: "Michael Porter (1979): an industry's profits depend less on how good its firms are than on five structural forces. Airlines: brutal rivalry, powerful suppliers (Boeing, Airbus, unions, airports) and price-comparing buyers. Warren Buffett joked a far-sighted capitalist should have shot down the Wright brothers." });
}

function bcg() {
  const units = [["Search ads", 1.8, 4, 40], ["Cloud", 0.6, 28, 18], ["Hardware", 0.3, 3, 6], ["New AI app", 0.15, 45, 4], ["Video", 1.4, 15, 22]];
  const p = plot({ height: 280, x: [0.1, 4], y: [-5, 50], xLog: true, xLabel: "relative market share (log)", yLabel: "market growth", xFmt: (x) => `${num(x, 1)}×`, yFmt: (x) => `${num(x)}%`, hover: false, label: "BCG matrix" });
  p.draw({ hlines: [{ y: 10 }], vlines: [{ x: 1 }], custom: (g, sx, sy) => {
    [["Question marks", 0.12, 47, "start"], ["Stars", 3.8, 47, "end"], ["Dogs", 0.12, -2, "start"], ["Cash cows", 3.8, -2, "end"]].forEach(([t, x, y, a]) => g.append(s("text", { x: sx(x), y: sy(y), "text-anchor": a, class: "al", text: t })));
    units.forEach(([n, x, y, r]) => g.append(s("circle", { cx: sx(x), cy: sy(y), r: 6 + Math.sqrt(r) * 3, fill: W, "fill-opacity": 0.55, stroke: "var(--ink)", "stroke-width": 2 }), s("text", { x: sx(x), y: sy(y) - 10 - Math.sqrt(r) * 3, "text-anchor": "middle", class: "lbl strong", text: n })));
  } });
  return stage({ title: "BCG growth-share matrix (a made-up tech group)", body: [p.el], note: "Bubble size = revenue. <b>Cash cows</b> (high share, slow market) fund <b>question marks</b> (fast market, low share) in the hope they become <b>stars</b>. <b>Dogs</b> get fixed, sold or closed. Boston Consulting Group, 1970: crude, but it still frames portfolio reviews." });
}

/* ---------- Pricing ---------- */
function priceOpt() {
  let price = 60, vc = 20, mode = "one";
  const a = 200, b = 2; // demand q = a - b*p (thousands)
  const p = plot({ height: 270, x: [0, 100], y: [0, 120], xLabel: "units (thousands)", yLabel: "price", xFmt: (x) => num(x), yFmt: (x) => usd(x), label: "Demand and pricing" });
  const st = stats([{ label: "Units sold" }, { label: "Revenue" }, { label: "Profit" }, { label: "Profit-max single price" }]);
  const pr = (q) => (a - q) / b;
  const draw = () => {
    const best = (a / b + vc) / 2;
    const areas = [];
    let units, rev, prof;
    if (mode === "one") {
      units = Math.max(0, a - b * price); rev = units * price; prof = units * (price - vc);
      areas.push({ pts: [[0, vc], [0, price], [units, price], [units, vc]], color: "var(--up)", opacity: 0.35, label: "profit", lx: units / 2, ly: (price + vc) / 2 });
      areas.push({ pts: [[0, price], [0, a / b], [units, price]], color: "#f5c518", opacity: 0.3, label: "", lx: 0, ly: 0 });
    } else if (mode === "two") {
      const p1 = Math.max(price, best + 15), q1 = Math.max(0, a - b * p1), q2 = Math.max(q1, a - b * price);
      units = q2; rev = q1 * p1 + (q2 - q1) * price; prof = q1 * (p1 - vc) + (q2 - q1) * (price - vc);
      areas.push({ pts: [[0, vc], [0, p1], [q1, p1], [q1, price], [q2, price], [q2, vc]], color: "var(--up)", opacity: 0.35, label: "profit", lx: q1 / 2 + 5, ly: (price + vc) / 2 });
    } else {
      units = Math.max(0, a - b * vc); rev = units * (vc + (a / b - vc) / 2); prof = (units * (a / b - vc)) / 2;
      areas.push({ pts: [[0, vc], [0, a / b], [units, vc]], color: "var(--up)", opacity: 0.35, label: "profit", lx: units / 3, ly: vc + (a / b - vc) / 3 });
    }
    p.draw({ series: [{ name: "Demand", color: W, width: 4, pts: curve(pr, 0, a, 50).filter(([x]) => x <= 100) }, { name: "Cost per unit", color: "var(--ink-3)", dash: "5 5", pts: [[0, vc], [100, vc]] }], areas, hlines: mode === "one" ? [{ y: price, label: `price ${usd(price)}` }] : [] });
    st.set(0, `${num(units)}k`); st.set(1, `$${num(rev / 1000, 2)}M`); st.set(2, `$${num(prof / 1000, 2)}M`, "accent"); st.set(3, usd(best));
  };
  const c = [seg({ label: "Pricing", options: [{ value: "one", label: "One price" }, { value: "two", label: "Two tiers" }, { value: "perfect", label: "Everyone pays their max" }], value: mode, onChange: (x) => { mode = x; draw(); } }),
    slider({ label: "Price (or lower tier)", min: 20, max: 100, value: price, fmt: usd, onInput: (x) => { price = x; draw(); } }),
    slider({ label: "Cost per unit", min: 0, max: 60, value: vc, fmt: usd, onInput: (x) => { vc = x; draw(); } })];
  draw();
  return stage({ title: "Find the best price, then charge different people differently", controls: c, body: [p.el, st.el], note: "With one price, raising it loses buyers; lowering it gives money away to people who'd have paid more (yellow). The profit-maximising single price is halfway between cost and the top of the demand curve here. <b>Price discrimination</b> (tiers, student discounts, airline fare classes, coupons) captures more of that yellow triangle." });
}

function evc() {
  let cur = 100, save = 60, switching = 15, price = 130;
  const box = h("div"), st = stats([{ label: "Value to customer (EVC)" }, { label: "Customer's surplus at your price" }]);
  const draw = () => {
    const e = cur + save - switching;
    box.replaceChildren(waterfall([{ label: "Rival's price", value: cur, total: true }, { label: "Extra value", value: save }, { label: "Switching cost", value: -switching }, { label: "EVC", value: e, total: true, color: W }, { label: "Your price", value: price, total: true, color: price <= e ? "var(--up)" : "var(--down)" }], { height: 220, fmt: (v) => usd(v), label: "Economic value to customer" }));
    st.set(0, usd(e)); st.set(1, usd(e - price), e - price >= 0 ? "good" : "bad");
  };
  const c = [slider({ label: "Extra value your product creates", min: 0, max: 150, step: 5, value: save, fmt: usd, onInput: (x) => { save = x; draw(); } }), slider({ label: "Switching cost for the buyer", min: 0, max: 60, step: 5, value: switching, fmt: usd, onInput: (x) => { switching = x; draw(); } }), slider({ label: "Your price", min: 60, max: 260, step: 5, value: price, fmt: usd, onInput: (x) => { price = x; draw(); } })];
  draw();
  return stage({ title: "Value-based pricing: what is it worth to them?", controls: c, body: [box, st.el], note: "<b>Cost-plus</b> starts from your cost. <b>Value-based</b> starts from the buyer's next-best alternative plus the extra value you create, minus what switching costs them. Price somewhere below EVC so the buyer still gains. Price above it and they won't switch." });
}

/* ---------- Break-even ---------- */
function breakevenSim() {
  let fc = 200, vc = 30, price = 50;
  const p = plot({ height: 270, x: [0, 25], y: [0, 1200], xLabel: "units sold (thousands)", yLabel: "$ thousands", xFmt: (x) => num(x), yFmt: (x) => usd(x), label: "Break-even chart" });
  const st = stats([{ label: "Contribution / unit" }, { label: "Break-even" }, { label: "Margin of safety at 15k units" }]);
  const draw = () => {
    const cm = price - vc, be = cm > 0 ? fc / cm : Infinity;
    p.draw({ series: [{ name: "Revenue", color: W, width: 4, pts: [[0, 0], [25, price * 25]] }, { name: "Total cost", color: "var(--down)", width: 3, pts: [[0, fc], [25, fc + vc * 25]] }, { name: "Fixed cost", color: "var(--ink-3)", dash: "5 5", pts: [[0, fc], [25, fc]] }], dots: Number.isFinite(be) && be <= 25 ? [{ x: be, y: price * be, color: "#f5c518", r: 9, label: `${num(be, 1)}k units` }] : [] });
    st.set(0, usd(cm)); st.set(1, Number.isFinite(be) ? `${num(be, 1)}k units` : "never", be <= 15 ? "good" : "bad"); st.set(2, Number.isFinite(be) ? pct((15 - be) / 15, 0) : "–", be <= 15 ? "good" : "bad");
  };
  const c = [slider({ label: "Fixed costs ($k)", min: 0, max: 500, step: 10, value: fc, fmt: (x) => `$${x}k`, onInput: (x) => { fc = x; draw(); } }), slider({ label: "Variable cost / unit", min: 5, max: 60, value: vc, fmt: usd, onInput: (x) => { vc = x; draw(); } }), slider({ label: "Price", min: 10, max: 80, value: price, fmt: usd, onInput: (x) => { price = x; draw(); } })];
  draw();
  return stage({ title: "Where revenue crosses cost", controls: c, body: [p.el, st.el], note: "<b>Break-even units = fixed costs ÷ contribution per unit.</b> Below it you lose money on every month; above it each unit adds its full contribution to profit." });
}

function opLev() {
  let chg = 10;
  const box = h("div"), st = stats([{ label: "Software-like firm (high fixed)" }, { label: "Retailer-like firm (low fixed)" }]);
  const draw = () => {
    const f = (fc, vcr) => { const r0 = 1000, p0 = r0 * (1 - vcr) - fc, r1 = r0 * (1 + chg / 100), p1 = r1 * (1 - vcr) - fc; return [p0, p1, (p1 / p0 - 1) * 100]; };
    const a = f(700, 0.1), b = f(100, 0.8);
    box.replaceChildren(columns([{ label: "High fixed: profit change", value: a[2], color: a[2] >= 0 ? "var(--up)" : "var(--down)", show: `${a[2] >= 0 ? "+" : ""}${num(a[2])}%` }, { label: "Low fixed: profit change", value: b[2], color: b[2] >= 0 ? "var(--up)" : "var(--down)", show: `${b[2] >= 0 ? "+" : ""}${num(b[2])}%` }], { height: 200, fmt: (v) => `${num(v)}%`, label: "Profit change" }));
    st.set(0, `DOL ${num((1000 * 0.9) / a[0], 1)}×`); st.set(1, `DOL ${num((1000 * 0.2) / b[0], 1)}×`);
  };
  const sl = slider({ label: "Sales change", min: -30, max: 30, value: chg, fmt: (x) => `${x > 0 ? "+" : ""}${x}%`, onInput: (x) => { chg = x; draw(); } });
  draw();
  return stage({ title: "Same $1,000 sales, same $100 profit, different cost structures", controls: [sl], body: [box, st.el], note: "<b>Degree of operating leverage (DOL) = contribution ÷ operating profit.</b> High fixed costs mean profits swing several times harder than sales, in both directions. That's why airlines, chipmakers and software firms boom and bust harder than supermarkets." });
}

/* ---------- The case ---------- */
function caseRun() {
  return stepper([
    { t: "1 · The prompt", html: "<p><b>Client</b>: SkyLow, a budget airline. <b>Problem</b>: \"Revenue grew, but profit fell. The CEO wants to know why and what to do.\"</p><p class='muted'>First, clarify: what's the goal (restore margin? by when?), the geography, any constraints. Restate the problem in one sentence.</p>" },
    { t: "2 · Structure", html: "<p>Draw the profit tree before asking for data:</p><p><b>Profit</b> = (Fare × Passengers + ancillary) − (Fuel + Labour + Airport + Fleet + Other).</p><p class='muted'>Hypothesis first: \"I suspect fares fell faster than passenger growth helped, perhaps due to a new competitor.\" Hypothesis-driven, not boil-the-ocean.</p>" },
    { t: "3 · The data", html: "<p>The interviewer hands over the exhibit (next section). Spot what moved: passengers +8%, but the average fare −5.5%. Fuel and labour rose with volume.</p>" },
    { t: "4 · The maths", html: "<p>Work out this year's profit from the exhibit, then say what it means: \"Profit fell X%, margin fell from 15% to Y%.\"</p><p class='muted'>Always state units and round sensibly. Interviewers watch for clean, out-loud maths.</p>" },
    { t: "5 · Dig deeper", html: "<p>Why did fares fall? You ask, and learn a rival entered three of SkyLow's busiest routes. On those routes fares fell 15%; elsewhere they were flat. So the problem is <b>competitive</b>, concentrated, and measurable.</p>" },
    { t: "6 · Recommend", html: "<p>Lead with the answer (the <b>pyramid principle</b>), then three reasons or actions, then risks and next steps. See the synthesis below.</p>" },
  ]);
}

export default {
  mece: {
    principle: "Break any messy problem into pieces that are <em>mutually exclusive and collectively exhaustive</em>: no overlaps, no gaps. Then you can find the cause instead of guessing.",
    hook: "<p>A client says \"our profits are down\". A junior analyst lists twelve possible reasons. A good consultant draws a tree: profit is revenue minus cost; revenue is price times volume; and so on. Within minutes they know which branch to check first. That's the whole trick, and it works on any problem.</p>",
    parts: [
      { h: "Drill the tree", sim: profitTree },
      { h: "Spot the MECE split", sim: meceQuiz },
      { h: "Kinds of trees", sim: () => flips([["Profit tree", "Profit = revenue − costs; split each until you reach things you can measure."], ["Issue tree", "Break a question into sub-questions. \"Should we enter India?\" → Is the market attractive? Can we win? Is it worth it?"], ["Hypothesis tree", "Start with an answer and list what must be true for it to hold. Faster; risks confirmation bias."], ["Driver tree", "A KPI split into its operational drivers. Revenue per store = traffic × conversion × basket."], ["Process split", "Steps in order: awareness → consideration → purchase → loyalty."], ["Internal / external", "Is it us (operations, pricing) or the world (market, competitors, regulation)?"]]) },
      { h: "The pyramid principle", html: "<p>Barbara Minto, McKinsey's first female consultant, taught: <b>start with the answer</b>, then group 3 supporting arguments, each backed by data. Executives read the first line. Make it count.</p>",
        sim: () => predict({ q: "Which is the best first line for a slide?", options: ["Q3 analysis of regional performance", "Revenue overview", "Southern stores lost $40M because two competitors opened; we should close 12 of them"], answer: 2, why: "<p>An <b>action title</b> states the conclusion. The chart below it is the evidence. A reader skimming only titles should get the whole story.</p>" }) },
    ],
    job: "<p>Every strategy consulting case starts with a tree. Analysts at MBB (McKinsey, BCG, Bain) build issue trees on day one, then a <b>workplan</b> assigning each branch. PE due-diligence teams use the same structure to test an investment thesis. Corporate strategy and finance teams use driver trees for budgets and KPIs.</p>",
    terms: [["MECE", "Mutually exclusive, collectively exhaustive."], ["Issue tree", "A question broken into sub-questions."], ["Hypothesis-driven", "Starting with a likely answer and testing it."], ["Pyramid principle", "Answer first, then supporting arguments."], ["Action title", "A slide headline stating the takeaway."], ["Driver tree", "A metric decomposed into what causes it."], ["80/20 rule", "Most of the effect usually comes from a few causes."]],
    quiz: [
      ["Mutually exclusive means…", ["No overlaps", "No gaps", "Exactly three branches"], 0, "Each item fits in only one bucket."],
      ["Collectively exhaustive means…", ["No overlaps", "Nothing left out", "All branches are equal size"], 1, "Together the buckets cover everything."],
      ["Profit fell; price, costs and mix are flat; volume fell. Next branch to drill?", ["Fixed costs", "Volume: market size vs market share", "Price"], 1, "Volume = market × share: is the market shrinking or are we losing share?"],
    ],
    recap: [["No overlaps", "Mutually exclusive."], ["No gaps", "Collectively exhaustive."], ["Answer first", "Pyramid principle."]],
    see: ["case", "sizing", "pnl", "frameworks"],
  },

  sizing: {
    principle: "You can estimate almost anything by <em>chaining reasonable assumptions</em> and multiplying. Structure beats precision.",
    hook: "<p>\"How many piano tuners are there in Chicago?\" Enrico Fermi asked his students questions like this. Today, consultants and VC investors ask \"how big is this market?\" every week, usually with no good data. The answer is a chain of guesses you can defend.</p>",
    parts: [
      { h: "Top-down estimate", sim: sizingSim },
      { h: "TAM, SAM, SOM", sim: tamSam },
      { h: "Ways in", sim: () => table(["Approach", "How", "Example"], [["Top-down (population)", "Population × % who buy × frequency × price", "Coffee in NYC"], ["Bottom-up (supply)", "Number of sellers × capacity × utilisation × price", "Cafés × cups each"], ["Value-based", "Number of users × value of the problem solved", "Hours saved × wage"], ["Analogue", "Scale a known market by a ratio", "UK market ≈ US × 0.2"]]),
        after: "<p>Use two approaches and compare. If they're within 2-3×, you're probably in the right ballpark. If not, one of your assumptions is wrong, and finding which one is valuable.</p>" },
      { h: "Practise", sim: () => calc({ q: "330M Americans, 2.5 per household. 60% of households own a car each lasting 12 years. How many million cars are bought per year (to the nearest million)? (Ignore second cars.)", answer: 6.6, tol: 0.08, unit: "M", why: "<p>330 ÷ 2.5 = 132M households × 60% = 79M cars ÷ 12 years ≈ <b>6.6M</b> a year. Real US new-car sales are about 15M (multi-car households, fleets): a good example of a sanity check telling you which assumption to fix.</p>" }) },
    ],
    job: "<p>Strategy consultants size markets for market-entry and growth cases. VC analysts check founders' TAM claims. PE teams size markets in commercial due diligence. Product managers estimate demand before building. Case interviews almost always include a sizing question.</p>",
    terms: [["TAM", "Total addressable market."], ["SAM", "Serviceable addressable market."], ["SOM", "Serviceable obtainable market."], ["Fermi estimate", "Rough estimate from chained assumptions."], ["Top-down", "Start from a big population and narrow."], ["Bottom-up", "Build from units of supply or customers."], ["Sanity check", "Comparing against a known number."]],
    quiz: [
      ["Which is usually the smallest?", ["TAM", "SAM", "SOM"], 2, "SOM is the slice you can actually win."],
      ["Bottom-up sizing for gyms would start from…", ["Population", "Number of gyms × members × fee", "GDP"], 1, "Supply-side units."],
      ["Two methods give $2B and $20B. You should…", ["Average them", "Find the assumption that's off", "Pick the bigger"], 1, "A 10× gap means a broken assumption."],
    ],
    recap: [["Chain", "Population → filters → frequency → price."], ["Two ways", "Top-down vs bottom-up."], ["Sanity check", "Compare with something known."]],
    see: ["mece", "unit-economics", "vc", "gdp"],
  },

  "unit-economics": {
    principle: "A business works if <em>each customer or unit is profitable</em> once you count the cost of getting them. Growth multiplies whatever the unit economics are, good or bad.",
    hook: "<p>WeWork grew to over 700 locations and a $47B private valuation, then nearly collapsed: most locations lost money. MoviePass sold monthly unlimited cinema for $9.95 while paying cinemas full price per ticket. Growth looked great. Each unit lost money. Unit economics is the first thing an investor checks.</p>",
    parts: [
      { h: "LTV and CAC", sim: ltvSim },
      { h: "One order, end to end", sim: contribution },
      { h: "The formulas", sim: () => formula([["LTV", "Lifetime value: total gross profit from a customer"], ["=", ""], ["ARPU × margin", "Monthly gross profit per customer"], ["÷", ""], ["churn", "Monthly % of customers who cancel. 1 ÷ churn = average lifetime in months"]], "Simple version. Better versions discount future months and use cohort data instead of averages.") },
      { h: "Practise", sim: () => calc({ q: "Customers pay $40/month at 80% gross margin, and 4% cancel each month. CAC is $400. What's LTV ÷ CAC?", answer: 2, tol: 0.01, unit: "×", why: "<p>Monthly gross profit = $32. Lifetime = 1 ÷ 0.04 = 25 months. LTV = $800. LTV/CAC = <b>2×</b>: below the 3× rule of thumb. Fix churn or CAC first.</p>" }) },
    ],
    job: "<p>VC and growth equity investors live on cohort charts, CAC payback and net revenue retention. Startup CFOs report these monthly to the board. Consultants run unit-economics deep dives for retailers (per store), delivery firms (per order) and telcos (per subscriber). PE teams check them in due diligence.</p>",
    terms: [["Unit economics", "Revenue and costs per unit (customer, order, store)."], ["CAC", "Customer acquisition cost."], ["LTV / CLV", "Lifetime value: total profit from a customer."], ["Churn", "Share of customers lost per period."], ["Payback period", "Months to recover CAC."], ["Contribution margin", "Revenue minus variable costs per unit."], ["Cohort", "A group of customers who joined at the same time."], ["Net revenue retention", "Revenue this year from last year's customers ÷ last year's revenue from them."]],
    quiz: [
      ["Monthly churn of 5% implies average customer life of…", ["5 months", "20 months", "95 months"], 1, "1 ÷ 0.05 = 20."],
      ["Negative contribution margin means growth…", ["Fixes it via scale", "Makes losses bigger", "Has no effect"], 1, "Each extra unit loses money."],
      ["Which improves LTV/CAC?", ["Higher churn", "Cheaper acquisition", "Lower gross margin"], 1, "Lower CAC raises the ratio."],
    ],
    recap: [["LTV", "Margin ÷ churn."], ["3×", "LTV/CAC rule of thumb."], ["Contribution", "Must be positive per unit."]],
    see: ["breakeven", "pricing", "vc", "margin"],
  },

  frameworks: {
    principle: "Frameworks are <em>checklists for not forgetting things</em>. They don't give answers; they make sure you looked everywhere.",
    hook: "<p>Strategy firms have published hundreds of frameworks. Most practitioners use the same handful, and the best use them invisibly: as a mental checklist that shapes the issue tree, not as boxes to fill in on a slide.</p>",
    parts: [
      { h: "Five forces", sim: forces },
      { h: "Portfolio: the BCG matrix", sim: bcg },
      { h: "The rest of the toolbox", sim: () => flips([["3Cs", "Company, Customers, Competitors. Ohmae's quick scan for any strategy question."], ["4Ps", "Product, Price, Place, Promotion. The marketing mix."], ["SWOT", "Strengths, Weaknesses (internal); Opportunities, Threats (external)."], ["PESTEL", "Political, Economic, Social, Technological, Environmental, Legal: the macro scan."], ["Value chain", "Porter: inbound logistics, operations, outbound, marketing, service + support activities. Where is value created?"], ["Ansoff matrix", "Grow via existing/new products × existing/new markets. Diversification is riskiest."], ["7S", "McKinsey: Strategy, Structure, Systems, Shared values, Style, Staff, Skills."], ["Generic strategies", "Porter: cost leadership, differentiation, or focus. \"Stuck in the middle\" is worst."]]) },
      { h: "Practise", sim: () => predict({ q: "A client asks whether to launch an existing product in Brazil. Which Ansoff quadrant?", options: ["Market penetration", "Market development", "Product development", "Diversification"], answer: 1, why: "<p>Existing product, new market = <b>market development</b>. Risks: local competitors, regulation, distribution. Pair with a PESTEL scan of Brazil and five forces of the local industry.</p>" }) },
    ],
    job: "<p>Consultants use these to scope projects and structure workshops. Corporate strategy teams use them in annual planning. PE commercial due diligence uses five forces and the value chain to test whether a target's margins will last. Equity analysts use them to judge <b>moats</b>.</p>",
    terms: [["Five forces", "Rivalry, entrants, substitutes, buyer power, supplier power."], ["Moat", "A durable competitive advantage (Buffett's term)."], ["BCG matrix", "Market growth vs relative share: stars, cows, question marks, dogs."], ["SWOT", "Strengths, weaknesses, opportunities, threats."], ["Value chain", "The activities that create value in a firm."], ["Ansoff matrix", "Four growth strategies by product/market novelty."], ["Barriers to entry", "Things that stop new firms entering."]],
    quiz: [
      ["High supplier power means…", ["Suppliers capture more of the profit", "Suppliers are weak", "Prices fall"], 0, "Few, strong suppliers can raise input prices."],
      ["A cash cow has…", ["High share in a fast-growing market", "High share in a slow-growing market", "Low share, slow market"], 1, "It generates cash without much reinvestment."],
      ["Which is internal in SWOT?", ["Opportunities", "Threats", "Strengths"], 2, "Strengths and weaknesses are internal."],
    ],
    recap: [["Five forces", "Structure sets profits."], ["BCG", "Fund stars with cows."], ["Checklist", "Frameworks prevent blind spots."]],
    see: ["competition", "mece", "case", "pricing"],
  },

  pricing: {
    principle: "Price is the <em>most powerful profit lever</em>: a 1% price rise often adds more profit than a 1% cut in costs or rise in volume. Set it by value, not by cost.",
    hook: "<p>McKinsey analysed the S&P 1500 and found a 1% price rise, with volume unchanged, raised operating profit by about 8%. Yet many firms set prices with a spreadsheet of cost plus 30%. Pricing is where economics, psychology and strategy meet.</p>",
    parts: [
      { h: "One price vs many", sim: priceOpt },
      { h: "Value-based pricing", sim: evc },
      { h: "Strategies", sim: () => table(["Strategy", "How", "Where you see it"], [["Cost-plus", "Cost + fixed mark-up", "Contracts, commodities"], ["Value-based", "Price to the customer's value", "B2B software, pharma"], ["Penetration", "Low price to win share fast", "Streaming launches"], ["Skimming", "High price first, cut later", "iPhones, games consoles"], ["Freemium", "Free tier, pay for more", "Spotify, Dropbox"], ["Dynamic", "Price moves with demand", "Airlines, Uber surge"], ["Tiered (good-better-best)", "Menus that segment buyers", "SaaS plans"], ["Razor and blades", "Cheap base, profitable refills", "Printers, consoles"]]) },
      { h: "Practise", sim: () => calc({ q: "A firm sells 1,000 units at $100 with $80 variable cost and no fixed costs. It raises price 5%. How many units can it lose before profit falls (break-even volume)?", answer: 200, tol: 0.01, unit: "units", why: "<p>Profit now: 1,000 × $20 = $20,000. New margin: $105 − $80 = $25. Units needed: 20,000 ÷ 25 = 800. It can lose <b>200 units (20%)</b> and still break even. Thin-margin firms gain most from price.</p>" }) },
    ],
    job: "<p>Pricing specialists at consultancies and in-house (revenue management at airlines and hotels, pricing teams at SaaS firms) run elasticity studies and A/B tests. PE firms treat pricing as a quick win after buying a company. Pharma pricing teams negotiate with governments on value per quality-adjusted life year.</p>",
    terms: [["Price elasticity", "% change in quantity ÷ % change in price."], ["Price discrimination", "Charging different buyers different prices."], ["Consumer surplus", "Value to buyers above what they pay."], ["EVC", "Economic value to the customer."], ["Value-based pricing", "Price set by value delivered."], ["Revenue management", "Dynamic pricing of perishable capacity."], ["Price skimming / penetration", "High-then-low vs low-to-win launch prices."]],
    quiz: [
      ["Student discounts are…", ["Charity", "Price discrimination", "Cost-plus"], 1, "Segmenting by willingness to pay."],
      ["Value-based pricing starts from…", ["Your cost", "The customer's alternative and extra value", "The competitor's cost"], 1, "What it's worth to the buyer."],
      ["Why is price such a strong lever?", ["It flows almost entirely to profit", "It reduces costs", "It raises volume"], 0, "Extra price per unit adds straight to margin."],
    ],
    recap: [["1% price", "≈ 8% profit (typical)."], ["Value", "Price to the alternative + extra value."], ["Segment", "Different prices capture more surplus."]],
    see: ["elasticity", "persuasion", "competition", "unit-economics"],
  },

  breakeven: {
    principle: "Fixed costs create a <em>break-even point</em>. Below it you lose money; above it, profits climb fast. The more fixed costs, the wilder the swings.",
    hook: "<p>A cinema costs nearly the same to run whether 10 or 300 people come. An airline flight costs almost the same with 120 or 180 passengers. For these businesses the last few customers are almost pure profit, and losing them is almost pure loss.</p>",
    parts: [
      { h: "Find break-even", sim: breakevenSim },
      { h: "Operating leverage", sim: opLev },
      { h: "Practise", sim: () => calc({ q: "Fixed costs $600k a year, price $40, variable cost $25. Break-even units (thousands)?", answer: 40, tol: 0.01, unit: "k units", why: "<p>Contribution $15. 600,000 ÷ 15 = <b>40,000 units</b>.</p>" }) },
      { h: "Levers to lower break-even", sim: () => flips([["Raise price", "Bigger contribution per unit. Fastest lever, if demand allows."], ["Cut variable cost", "Cheaper inputs, better procurement, less waste."], ["Turn fixed into variable", "Lease instead of buy, outsource, pay commission instead of salary."], ["Cut fixed cost", "Close sites, share services, renegotiate rent."], ["Raise utilisation", "Sell the empty seats: off-peak pricing, new customers."]]) },
    ],
    job: "<p>Every business plan and project finance model has a break-even. Consultants run cost-structure analyses (\"variabilise the cost base\"). Credit analysts check how far sales can fall before a borrower can't pay interest. PE buyers like high operating leverage with rising sales and fear it in a downturn, especially when financial leverage is stacked on top.</p>",
    terms: [["Fixed cost", "Doesn't change with volume (rent, salaries)."], ["Variable cost", "Rises with each unit (materials, commission)."], ["Contribution margin", "Price − variable cost per unit."], ["Break-even point", "Volume where profit is zero."], ["Margin of safety", "How far sales can fall before losses."], ["Operating leverage", "Sensitivity of profit to sales, driven by fixed costs."], ["Utilisation", "Share of capacity used."]],
    quiz: [
      ["Break-even units =", ["Fixed ÷ price", "Fixed ÷ (price − variable cost)", "Variable ÷ fixed"], 1, "Fixed costs ÷ contribution per unit."],
      ["Higher fixed costs make profits…", ["More stable", "More sensitive to sales", "Unaffected"], 1, "Operating leverage."],
      ["Outsourcing manufacturing usually…", ["Raises fixed costs", "Turns fixed costs into variable ones", "Raises break-even"], 1, "You pay per unit instead of owning the factory."],
    ],
    recap: [["F ÷ (P − V)", "Break-even units."], ["Fixed costs", "Amplify swings."], ["Variabilise", "Lower risk in a downturn."]],
    see: ["unit-economics", "pnl", "leverage", "cycle"],
  },

  case: {
    principle: "A case is <em>structure + maths + judgment</em>: clarify, build a tree, test hypotheses with data, then lead with a recommendation.",
    hook: "<p>Case interviews are how consulting firms, and increasingly PE funds, tech strategy teams and start-ups, hire. They mimic real work: an ambiguous problem, partial data, a busy executive. Here's a full profitability case, the most common type.</p>",
    parts: [
      { h: "Walk through it", sim: caseRun },
      { h: "The exhibit", sim: () => table(["", "Last year", "This year", "Change"], [["Passengers", "10.0M", "10.8M", "+8%"], ["Average fare", "$200", "$189", "−5.5%"], ["Revenue", "$2,000M", "$2,041M", "+2%"], ["Fuel", "$600M", "$640M", "+7%"], ["Labour", "$500M", "$530M", "+6%"], ["Airport, fleet & other", "$600M", "$621M", "+3.5%"], ["Profit", "$300M", "?", "?"]]) },
      { h: "Do the maths", sim: () => calc({ q: "Using the exhibit, what's this year's profit in $M?", answer: 250, tol: 0.01, unit: "$M", why: "<p>Costs: 640 + 530 + 621 = $1,791M. Profit: 2,041 − 1,791 = <b>$250M</b>, down 17%. Margin fell from 15% to about 12%.</p>" }) },
      { h: "Read the signal", sim: () => predict({ q: "Passengers +8%, fares −5.5%, fuel +7%. Which is the most useful next question?", options: ["What's the CEO's background?", "Where did fares fall: everywhere, or on specific routes?", "What colour are the planes?"], answer: 1, why: "<p>Segment the biggest driver. Here fares fell 15% on three routes where a competitor entered, and were flat elsewhere. Now the problem is specific and fixable.</p>" }) },
      { h: "The synthesis", sim: () => callout("tip", "Say it like a partner", "<p><b>Answer:</b> profit fell 17% because a new competitor cut fares on our three biggest routes, while fuel and labour rose with volume.</p><p><b>Recommendation:</b> (1) redeploy capacity to uncontested routes, (2) grow ancillary revenue, (3) hedge fuel and renegotiate leases.</p><p><b>Risks and next steps:</b> rival may follow us; build route-level P&amp;L this week.</p>") },
      { h: "Other case types", sim: () => flips([["Market entry", "Is the market attractive? Can we win? How do we enter (build, buy, partner)? Is it worth it?"], ["M&A", "Strategic fit, synergies, valuation, integration risk. Ties to accretion/dilution."], ["Growth", "Organic (new products, markets, pricing) vs inorganic (acquisitions)."], ["New product launch", "Customer need, market size, economics, go-to-market."], ["Cost reduction", "Map costs by type and driver; benchmark; prioritise by size and ease."], ["Pricing", "Cost, competitor and value-based views."], ["Operations", "Bottlenecks, capacity, utilisation, process steps."], ["Market sizing", "Top-down and bottom-up, with sanity checks."]]) },
    ],
    job: "<p>MBB, Tier-2 firms, Big Four strategy arms and in-house strategy teams all hire through cases. PE firms use modelling tests and investment cases. The same flow runs every real engagement: a kick-off to clarify, an issue tree and workplan, analyses, then a steering-committee deck that starts with the answer.</p>",
    terms: [["Case interview", "A simulated business problem used in hiring."], ["Clarifying questions", "Questions that pin down the objective and scope."], ["Hypothesis", "A testable best guess at the answer."], ["Exhibit", "A chart or table given during a case."], ["Synthesis", "The final answer, reasons and next steps."], ["Steerco", "Steering committee: the client executives a project reports to."]],
    quiz: [
      ["What comes first in a case?", ["Calculations", "Clarifying the objective", "The recommendation"], 1, "Make sure you're solving the right problem."],
      ["A good recommendation starts with…", ["Background", "The answer", "Methodology"], 1, "Pyramid principle."],
      ["Revenue +2%, costs +5.5%. Profit…", ["Rose", "Fell", "Can't tell without levels"], 2, "Depends on margins: with costs 85% of revenue it falls; with tiny costs it could still rise."],
    ],
    recap: [["Clarify", "Objective, scope, constraints."], ["Tree + data", "Hypothesis-driven drilling."], ["Answer first", "Then reasons, risks, next steps."]],
    see: ["mece", "sizing", "frameworks", "pnl"],
  },
};

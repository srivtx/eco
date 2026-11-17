// World 2: Markets.
import { h, money, num, pct, clamp, rng } from "../lib/core.js";
import { slider, seg, stats, stage, predict, calc, callout, table, bars, button, flips, stepper } from "../lib/ui.js";
import { plot } from "../lib/chart.js";

const W = "var(--wc)", D = "#3b82f6", S = "#ff7a45";

// linear demand P = a − bQ, supply P = c + dQ
const eq = (a, b, c, d) => { const q = (a - c) / (b + d); return { q, p: a - b * q }; };

/* ---------------- supply & demand ---------------- */
function sdSim() {
  let dShift = 0, sShift = 0, showSurplus = true;
  const base = { a: 10, b: 0.08, c: 2, d: 0.06 };
  const p = plot({ height: 320, x: [0, 120], y: [0, 12], xLabel: "cups of coffee a day", yLabel: "price", xFmt: (v) => num(v), yFmt: (v) => money(v), label: "Supply and demand for coffee" });
  const st = stats([{ label: "Price" }, { label: "Cups sold" }, { label: "Buyer surplus" }, { label: "Seller surplus" }]);
  const draw = () => {
    const a = base.a + dShift, c = base.c - sShift;
    const e = eq(a, base.b, c, base.d), e0 = eq(base.a, base.b, base.c, base.d);
    const dem = [[0, a], [a / base.b, 0]], sup = [[0, c], [120, c + base.d * 120]];
    const cs = 0.5 * e.q * (a - e.p), ps = 0.5 * e.q * (e.p - c);
    p.draw({
      series: [{ name: "Demand (what buyers want)", color: D, pts: dem, label: "D", labelAt: 0, dx: 8, dy: 14 }, { name: "Supply (what sellers offer)", color: S, pts: sup, label: "S", dx: -16, dy: -6 }],
      areas: showSurplus ? [{ pts: [[0, a], [e.q, e.p], [0, e.p]], color: D, opacity: 0.25 }, { pts: [[0, c], [e.q, e.p], [0, e.p]], color: S, opacity: 0.25 }] : [],
      dots: [{ x: e.q, y: e.p, color: "#ffc21a", label: `${money(e.p)} · ${num(e.q)} cups`, r: 9 }, ...(dShift || sShift ? [{ x: e0.q, y: e0.p, color: "var(--surface)", r: 6, label: "before", dx: -54 }] : [])],
      hlines: [{ y: e.p }], vlines: [{ x: e.q }],
    });
    st.set(0, money(e.p), e.p > e0.p + 0.01 ? "bad" : e.p < e0.p - 0.01 ? "good" : ""); st.set(1, num(e.q)); st.set(2, money(cs)); st.set(3, money(ps));
  };
  const a = slider({ label: "Demand shift (tastes, income, trends)", min: -4, max: 4, step: 0.5, value: 0, fmt: (v) => (v > 0 ? `+${v}` : v), onInput: (v) => { dShift = v; draw(); } });
  const b = slider({ label: "Supply shift (costs, technology, weather)", min: -4, max: 4, step: 0.5, value: 0, fmt: (v) => (v > 0 ? `+${v}` : v), onInput: (v) => { sShift = v; draw(); } });
  const ev = h("div.game-btns",
    button("☕ Coffee goes viral", () => { a.value = 3; dShift = 3; b.value = 0; sShift = 0; draw(); }),
    button("🌧 Drought in Brazil", () => { b.value = -3; sShift = -3; a.value = 0; dShift = 0; draw(); }),
    button("🤖 Robot baristas", () => { b.value = 3; sShift = 3; a.value = 0; dShift = 0; draw(); }),
    button("📉 Recession", () => { a.value = -3; dShift = -3; b.value = 0; sShift = 0; draw(); }),
    button("Reset", () => { a.value = 0; b.value = 0; dShift = sShift = 0; draw(); }));
  const sg = seg({ label: "Show surplus", options: [{ value: true, label: "On" }, { value: false, label: "Off" }], value: true, onChange: (v) => { showSurplus = v; draw(); } });
  draw();
  return stage({ title: "The coffee market", controls: [a, b, sg], body: [ev, p.el, st.el], note: "Blue triangle: <b>consumer surplus</b>, what buyers would have paid minus what they did. Orange triangle: <b>producer surplus</b>, what sellers got minus their lowest acceptable price. Markets maximise the sum when nothing gets in the way." });
}

/* ---------------- elasticity ---------------- */
function elasticSim() {
  let e = 1, cut = 10;
  const goods = { 0.2: "petrol, insulin, salt", 0.5: "cigarettes, electricity", 1: "clothing, restaurant meals", 2: "one brand of cereal", 3.5: "a specific airline route with rivals" };
  const p = plot({ height: 280, x: [0, 200], y: [0, 20], xLabel: "units sold", yLabel: "price", xFmt: (v) => num(v), yFmt: (v) => money(v), label: "Demand and revenue" });
  const st = stats([{ label: "Price" }, { label: "Units sold" }, { label: "Revenue" }, { label: "Revenue change" }]);
  const ex = h("p.muted");
  const draw = () => {
    // constant-elasticity demand through (100 units, $10): Q = 100 (P/10)^−e
    const Q = (P) => 100 * Math.pow(P / 10, -e);
    const P1 = 10 * (1 - cut / 100), q0 = 100, q1 = Q(P1);
    const pts = []; for (let P = 20; P >= 2; P -= 0.25) pts.push([Q(P), P]);
    p.draw({ series: [{ name: "Demand", color: D, pts: pts.filter(([x]) => x <= 200).sort((a, b) => a[0] - b[0]) }],
      areas: [{ pts: [[0, 0], [q0, 0], [q0, 10], [0, 10]], color: "var(--ink-3)", opacity: 0.15 }, { pts: [[0, 0], [q1, 0], [q1, P1], [0, P1]], color: W, opacity: 0.35 }],
      dots: [{ x: q0, y: 10, color: "var(--surface)", label: "before", r: 6 }, { x: Math.min(q1, 200), y: P1, color: "#ffc21a", label: "after", r: 8 }] });
    const r0 = 1000, r1 = P1 * q1;
    st.set(0, money(P1)); st.set(1, num(q1)); st.set(2, money(r1)); st.set(3, `${r1 >= r0 ? "+" : ""}${pct(r1 / r0 - 1)}`, r1 >= r0 ? "good" : "bad");
    const k = Object.keys(goods).map(Number).reduce((a, b) => (Math.abs(b - e) < Math.abs(a - e) ? b : a));
    ex.innerHTML = `Elasticity ${e}: a 1% price change moves quantity by about ${e}%. ${e < 1 ? "<b>Inelastic</b>: cutting the price loses revenue." : e > 1 ? "<b>Elastic</b>: cutting the price wins revenue." : "<b>Unit elastic</b>: revenue barely moves."} Real goods near here: <i>${goods[k]}</i>.`;
  };
  const a = slider({ label: "Price elasticity of demand", min: 0.2, max: 3.5, step: 0.1, value: e, onInput: (v) => { e = v; draw(); } });
  const b = slider({ label: "Price cut", min: 0, max: 50, value: cut, fmt: (v) => `${v}%`, onInput: (v) => { cut = v; draw(); } });
  draw();
  return stage({ title: "Cut the price: does revenue rise?", controls: [a, b], body: [p.el, st.el, ex], note: "Grey box: revenue before (price × quantity). Coloured box: revenue after. Whether a price cut pays depends entirely on elasticity." });
}

/* ---------------- price controls & taxes ---------------- */
function controlSim() {
  let mode = "ceiling", level = 4, tax = 2;
  const A = 10, B = 0.08, C = 2, Dd = 0.06;
  const p = plot({ height: 320, x: [0, 120], y: [0, 12], xLabel: "flats rented", yLabel: "rent (hundreds)", xFmt: (v) => num(v), yFmt: (v) => `$${num(v)}`, label: "Price controls" });
  const st = stats([{ label: "Price people pay" }, { label: "Trades that happen" }, { label: "Shortage / surplus" }, { label: "Deadweight loss" }]);
  const msg = h("p.muted");
  const draw = () => {
    const e = eq(A, B, C, Dd), dem = [[0, A], [A / B, 0]], sup = [[0, C], [120, C + Dd * 120]];
    const qd = (P) => (A - P) / B, qs = (P) => (P - C) / Dd, pd = (Q) => A - B * Q, ps = (Q) => C + Dd * Q;
    let q = e.q, price = e.p, gap = 0, dwl = 0, extra = { areas: [], hlines: [], dots: [] };
    if (mode === "ceiling" && level < e.p) {
      q = qs(level); price = level; gap = qd(level) - q; dwl = 0.5 * (e.q - q) * (pd(q) - ps(q));
      extra.hlines = [{ y: level, label: `ceiling ${level}`, color: "var(--bad)" }];
      extra.areas = [{ pts: [[q, pd(q)], [e.q, e.p], [q, ps(q)]], color: "var(--bad)", opacity: 0.4 }];
      extra.dots = [{ x: q, y: level, color: S, r: 6, label: "supplied" }, { x: qd(level), y: level, color: D, r: 6, label: "wanted" }];
      msg.innerHTML = `Landlords offer ${num(q)} flats; renters want ${num(qd(level))}. <b>Shortage of ${num(gap)}</b>. Someone still decides who gets one: queues, connections, key money under the table, or worse upkeep.`;
    } else if (mode === "floor" && level > e.p) {
      q = qd(level); price = level; gap = -(qs(level) - q); dwl = 0.5 * (e.q - q) * (pd(q) - ps(q));
      extra.hlines = [{ y: level, label: `floor ${level}`, color: "var(--bad)" }];
      extra.areas = [{ pts: [[q, pd(q)], [e.q, e.p], [q, ps(q)]], color: "var(--bad)", opacity: 0.4 }];
      extra.dots = [{ x: q, y: level, color: D, r: 6, label: "bought" }, { x: qs(level), y: level, color: S, r: 6, label: "offered" }];
      msg.innerHTML = `Sellers want to sell ${num(qs(level))}, buyers take ${num(q)}: <b>surplus of ${num(-gap)}</b>. This is the minimum-wage and farm-price-support picture (whether the floor binds hard in practice is a live debate).`;
    } else if (mode === "tax") {
      q = (A - C - tax) / (B + Dd); price = pd(q); const got = price - tax; dwl = 0.5 * (e.q - q) * tax;
      extra.areas = [{ pts: [[0, price], [q, price], [q, got], [0, got]], color: "#8b5cf6", opacity: 0.3, label: `tax raised ${money(tax * q * 100)}`, lx: q / 2, ly: (price + got) / 2 }, { pts: [[q, price], [e.q, e.p], [q, got]], color: "var(--bad)", opacity: 0.45 }];
      extra.hlines = [{ y: price, label: "buyers pay" }, { y: got, label: "sellers keep" }];
      const buyerShare = (price - e.p) / tax;
      msg.innerHTML = `Buyers pay ${money((price - e.p) * 100)} more; sellers keep ${money((e.p - got) * 100)} less. Buyers bear <b>${pct(buyerShare, 0)}</b> of the tax. It doesn't matter who legally pays it: the side that's <i>less able to walk away</i> bears more. That's <b>tax incidence</b>.`;
    } else msg.innerHTML = "This control doesn't bind: the market price already obeys it, so nothing changes. Move the line past the market price.";
    p.draw({ series: [{ name: "Demand", color: D, pts: dem }, { name: "Supply", color: S, pts: sup }], ...extra, dots: [...extra.dots, { x: e.q, y: e.p, color: "var(--surface)", r: 5 }] });
    st.set(0, `$${num(price * 100)}`); st.set(1, num(q)); st.set(2, gap > 0 ? `short ${num(gap)}` : gap < 0 ? `excess ${num(-gap)}` : "none", gap ? "bad" : ""); st.set(3, money(dwl * 100), dwl > 0.01 ? "bad" : "");
  };
  const lv = slider({ label: "Control level (rent, hundreds)", min: 1, max: 11, step: 0.5, value: level, onInput: (v) => { level = v; draw(); } });
  const tx = slider({ label: "Tax per flat (hundreds)", min: 0, max: 6, step: 0.5, value: tax, onInput: (v) => { tax = v; draw(); } });
  const md = seg({ label: "Policy", options: [{ value: "ceiling", label: "Price ceiling" }, { value: "floor", label: "Price floor" }, { value: "tax", label: "Tax" }], value: mode, onChange: (v) => { mode = v; draw(); } });
  draw();
  return stage({ title: "Overrule the market", controls: [md, lv, tx], body: [p.el, st.el, msg], note: "The red triangle is <b>deadweight loss</b>: trades that would have helped both sides but no longer happen. It's value that simply disappears." });
}

/* ---------------- externalities & commons ---------------- */
function pollutionSim() {
  let harm = 3, tax = 0;
  const p = plot({ height: 300, x: [0, 120], y: [0, 14], xLabel: "tonnes of steel", yLabel: "$ per tonne (hundreds)", xFmt: (v) => num(v), yFmt: (v) => num(v), label: "Pollution externality" });
  const st = stats([{ label: "Made (market)" }, { label: "Best for society" }, { label: "Overproduction" }, { label: "Damage nobody paid for" }]);
  const draw = () => {
    const A = 12, B = 0.08, C = 2, Dd = 0.06;
    const qm = (A - C - tax) / (B + Dd), qs = (A - C - harm) / (B + Dd);
    const social = [[0, C + harm], [120, C + harm + Dd * 120]];
    p.draw({ series: [{ name: "Demand (benefit to buyers)", color: D, pts: [[0, A], [A / B, 0]] }, { name: "Private cost (what the mill pays)", color: S, pts: [[0, C + tax], [120, C + tax + Dd * 120]] }, { name: "Social cost (incl. smoke)", color: "var(--bad)", pts: social, dash: "7 5" }],
      areas: qm > qs + 0.1 ? [{ pts: [[qs, A - B * qs], [qm, A - B * qm], [qm, C + harm + Dd * qm]], color: "var(--bad)", opacity: 0.4 }] : [],
      dots: [{ x: qm, y: A - B * qm, color: "#ffc21a", r: 8, label: "market" }, { x: qs, y: A - B * qs, color: "var(--good)", r: 7, label: "best", dx: -40 }] });
    st.set(0, num(qm)); st.set(1, num(qs)); st.set(2, num(Math.max(0, qm - qs)), qm > qs + 0.5 ? "bad" : "good"); st.set(3, money(harm * qm * 100 - tax * qm * 100 > 0 ? (harm - Math.min(tax, harm)) * qm * 100 : 0));
  };
  const a = slider({ label: "Harm from smoke per tonne", min: 0, max: 6, step: 0.5, value: harm, onInput: (v) => { harm = v; draw(); } });
  const b = slider({ label: "Carbon / pollution tax per tonne", min: 0, max: 6, step: 0.5, value: tax, onInput: (v) => { tax = v; draw(); } });
  draw();
  return stage({ title: "A steel mill upwind of a town", controls: [a, b], body: [p.el, st.el], note: "Set the tax equal to the harm and the market lands on the social optimum by itself. That's a <b>Pigouvian tax</b>: make the polluter pay the cost they push onto others." });
}
function commonsSim() {
  let boats = 6;
  const p = plot({ height: 240, x: [0, 30], y: [0, 1000], xLabel: "year", yLabel: "fish in the lake", xFmt: (v) => Math.round(v), yFmt: (v) => num(v), label: "Fish stock" });
  const st = stats([{ label: "Fish left after 30 years" }, { label: "Total catch" }, { label: "Catch per boat" }]);
  const draw = () => {
    let fish = 800, total = 0; const pts = [];
    for (let y = 0; y <= 30; y++) { pts.push([y, fish]); const catchN = Math.min(fish, boats * 25 * (fish / 800)); total += catchN; fish = Math.max(0, fish - catchN); fish += 0.35 * fish * (1 - fish / 1000); }
    p.draw({ series: [{ name: "Fish", color: W, pts, area: true }] });
    st.set(0, num(pts.at(-1)[1]), pts.at(-1)[1] < 100 ? "bad" : "good"); st.set(1, num(total)); st.set(2, num(total / boats));
  };
  const a = slider({ label: "Boats on the lake", min: 1, max: 20, value: boats, onInput: (v) => { boats = v; draw(); } });
  draw();
  return stage({ title: "The tragedy of the commons", controls: [a], body: [p.el, st.el], note: "Each boat catches more by fishing harder, but every fish it takes is one fewer that breeds. Past about 8 boats, the stock collapses and <i>total</i> catch falls. Nobody owns the lake, so nobody protects it. Fixes: quotas you can trade, ownership, or community rules (Elinor Ostrom won a Nobel for showing communities often manage commons well)." });
}

/* ---------------- monopoly ---------------- */
function monoSim() {
  let mc = 2, mode = "mono";
  const A = 10, B = 0.08;
  const p = plot({ height: 300, x: [0, 125], y: [0, 11], xLabel: "units", yLabel: "price", xFmt: (v) => num(v), yFmt: (v) => money(v), label: "Monopoly" });
  const st = stats([{ label: "Price" }, { label: "Units" }, { label: "Profit" }, { label: "Deadweight loss" }]);
  const draw = () => {
    const qc = (A - mc) / B, qm = (A - mc) / (2 * B), pm = A - B * qm;
    const q = mode === "mono" ? qm : qc, price = mode === "mono" ? pm : mc;
    p.draw({ series: [{ name: "Demand", color: D, pts: [[0, A], [A / B, 0]] }, { name: "Marginal revenue", color: "#8b5cf6", pts: [[0, A], [A / (2 * B), 0]], dash: "6 5" }, { name: "Marginal cost", color: S, pts: [[0, mc], [125, mc]] }],
      areas: mode === "mono" ? [{ pts: [[0, pm], [qm, pm], [qm, mc], [0, mc]], color: "#ffc21a", opacity: 0.45, label: "monopoly profit", lx: qm / 2, ly: (pm + mc) / 2 }, { pts: [[qm, pm], [qc, mc], [qm, mc]], color: "var(--bad)", opacity: 0.4 }] : [],
      dots: [{ x: q, y: price, color: "#ffc21a", r: 8, label: mode === "mono" ? "monopoly" : "competition" }] });
    st.set(0, money(price)); st.set(1, num(q)); st.set(2, money(mode === "mono" ? (pm - mc) * qm : 0), mode === "mono" ? "good" : ""); st.set(3, money(mode === "mono" ? 0.5 * (qc - qm) * (pm - mc) : 0), mode === "mono" ? "bad" : "");
  };
  const a = slider({ label: "Marginal cost", min: 0.5, max: 6, step: 0.5, value: mc, fmt: (v) => money(v), onInput: (v) => { mc = v; draw(); } });
  const b = seg({ label: "Market", options: [{ value: "comp", label: "Many sellers" }, { value: "mono", label: "One seller" }], value: mode, onChange: (v) => { mode = v; draw(); } });
  draw();
  return stage({ title: "One seller sets the price", controls: [b, a], body: [p.el, st.el], note: "A monopolist sells where <b>marginal revenue = marginal cost</b>. To sell one more unit it must cut the price on <i>every</i> unit, so marginal revenue falls twice as fast as demand. Result: higher price, fewer units, a fat profit, and a deadweight loss." });
}

/* ---------------- game theory: prisoner's dilemma tournament ---------------- */
const PAY = { CC: [3, 3], CD: [0, 5], DC: [5, 0], DD: [1, 1] };
const STRATS = {
  "Always cooperate": () => "C",
  "Always defect": () => "D",
  "Tit for tat": (me, them) => (them.length ? them.at(-1) : "C"),
  "Grudger": (me, them) => (them.includes("D") ? "D" : "C"),
  "Random": (me, them, r) => (r() < 0.5 ? "C" : "D"),
  "Tit for two tats": (me, them) => (them.length > 1 && them.at(-1) === "D" && them.at(-2) === "D" ? "D" : "C"),
};
function pdGame() {
  let mine = [], theirs = [], score = [0, 0];
  const opp = "Tit for tat";
  const log = h("div.game-log"), st = stats([{ label: "You" }, { label: "Them" }, { label: "Round" }]);
  const play = (m) => {
    if (mine.length >= 10) return;
    const t = STRATS[opp](theirs, mine, Math.random);
    const [a, b] = PAY[m + t]; score[0] += a; score[1] += b; mine.push(m); theirs.push(t);
    log.prepend(h("div", `Round ${mine.length}: you ${m === "C" ? "cooperate" : "defect"}, they ${t === "C" ? "cooperate" : "defect"} → you +${a}, them +${b}`));
    st.set(0, String(score[0])); st.set(1, String(score[1])); st.set(2, `${mine.length} / 10`);
    if (mine.length === 10) log.prepend(h("div", h("b", `Done. You scored ${score[0]}. Two always-cooperators would score 30 each.`)));
  };
  const reset = () => { mine = []; theirs = []; score = [0, 0]; log.replaceChildren(h("div.muted", "Your opponent's strategy is secret. Ten rounds.")); st.set(0, "0"); st.set(1, "0"); st.set(2, "0 / 10"); };
  reset();
  const matrix = table(["", "They cooperate", "They defect"], [["<b>You cooperate</b>", "3 , 3", "0 , 5"], ["<b>You defect</b>", "5 , 0", "1 , 1"]]);
  return stage({ title: "Prisoner's dilemma · play 10 rounds", body: [matrix, h("div.game-btns", button("🤝 Cooperate", () => play("C"), "primary"), button("🗡 Defect", () => play("D")), button("New game", reset)), st.el, log], note: "Whatever they do, defecting pays you more in a single round. So both defect and get 1 each, when both cooperating would have given 3. Individually rational, collectively dumb: that's the dilemma." });
}
function tournament() {
  const names = Object.keys(STRATS); let rounds = 50;
  const box = h("div");
  const run = () => {
    const tot = Object.fromEntries(names.map((n) => [n, 0])), r = rng(7);
    for (const a of names) for (const b of names) {
      const ha = [], hb = [];
      for (let i = 0; i < rounds; i++) { const ma = STRATS[a](ha, hb, r), mb = STRATS[b](hb, ha, r); tot[a] += PAY[ma + mb][0]; ha.push(ma); hb.push(mb); }
    }
    const sorted = names.map((n) => ({ label: n, value: tot[n] / names.length })).sort((x, y) => y.value - x.value);
    box.replaceChildren(bars(sorted.map((x, i) => ({ ...x, color: i === 0 ? "#ffc21a" : x.label.includes("defect") ? "var(--bad)" : W })), { fmt: (v) => num(v) }));
  };
  const sl = slider({ label: "Rounds per match", min: 1, max: 200, value: rounds, onInput: (v) => { rounds = v; run(); } });
  run();
  return stage({ title: "A tournament: every strategy plays every other", controls: [sl], body: [box], note: "Average score per match. With one round, defecting wins. With many rounds, <b>nice but retaliating</b> strategies like tit-for-tat come out on top, as Robert Axelrod found in his famous 1980 computer tournaments. The shadow of the future makes cooperation pay." });
}

/* ---------------- lemons ---------------- */
function lemonsSim() {
  let lemons = 30;
  const p = plot({ height: 260, x: [0, 8], y: [0, 100], xLabel: "round", yLabel: "% of cars that are good", xFmt: (v) => Math.round(v), yFmt: (v) => `${Math.round(v)}%`, label: "Used car market unravelling" });
  const st = stats([{ label: "Price buyers offer (round 1)" }, { label: "Good cars left after 8 rounds" }, { label: "Verdict" }]);
  const draw = () => {
    // good cars worth $10k to buyers ($8k to sellers), lemons worth $4k (3k to sellers). Buyers can't tell; they pay the average.
    let good = 100 - lemons, bad = lemons; const pts = []; let first;
    for (let r = 0; r <= 8; r++) {
      const share = good / (good + bad || 1); pts.push([r, share * 100]);
      const price = share * 10 + (1 - share) * 4; if (r === 0) first = price;
      if (price < 8) good *= 0.55; // owners of good cars won't sell below $8k, so many withdraw
    }
    p.draw({ series: [{ name: "Good cars for sale", color: "var(--good)", pts, area: true }] });
    st.set(0, money(first * 1000)); st.set(1, `${Math.round(pts.at(-1)[1])}%`); st.set(2, pts.at(-1)[1] < 20 ? "Market of lemons" : "Survives", pts.at(-1)[1] < 20 ? "bad" : "good");
  };
  const a = slider({ label: "Share of lemons at the start", min: 0, max: 60, value: lemons, fmt: (v) => `${v}%`, onInput: (v) => { lemons = v; draw(); } });
  draw();
  return stage({ title: "The market for lemons", controls: [a], body: [p.el, st.el], note: "A good car is worth $10k to buyers and $8k to its owner; a lemon $4k and $3k. Buyers can't tell them apart, so they offer the average. If that's under $8k, good-car owners leave, the average falls further, and so on. With 1 in 3 lemons the market already starts to unravel." });
}

export default {
  "supply-demand": {
    principle: "A price is where what buyers will pay meets what sellers will accept. <em>Move either side and the price moves.</em>",
    hook: "<p>Nobody sets the price of coffee. Millions of drinkers, farmers, roasters and cafés each make tiny decisions, and out pops a price that tells everyone what to do: plant more, drink less, open a café. Two curves explain most of it.</p>",
    parts: [
      { h: "Two curves", html: "<p><b>Demand</b> slopes down: at lower prices, more people buy and each buys more. <b>Supply</b> slopes up: at higher prices, more sellers find it worth producing. Where they cross is the <em>equilibrium</em>: the one price where the amount people want equals the amount offered. Try the events, then drag the shifts yourself.</p>", sim: sdSim },
      { h: "Shift the curve or slide along it?", html: "<p>The most common mistake in economics: confusing a <em>change in demand</em> (the whole curve moves because something other than price changed) with a <em>change in quantity demanded</em> (moving along the curve because the price changed).</p><ul><li><b>Demand shifters</b>: income, tastes, prices of substitutes (tea) and complements (milk), expectations, number of buyers.</li><li><b>Supply shifters</b>: input costs, technology, weather, number of sellers, taxes and subsidies.</li></ul>",
        sim: () => predict({ q: "The price of tea doubles. What happens in the coffee market?", options: ["Coffee demand shifts right: price and quantity rise", "Coffee supply shifts left", "Nothing: tea is a different market"], answer: 0, why: "<p>Tea is a <em>substitute</em>. Some tea drinkers switch, so demand for coffee rises at every price: the demand curve shifts right, pushing up both price and quantity. Try +2 on the demand slider above.</p>" }) },
      { h: "Prices are signals", html: "<p>Friedrich Hayek's big idea (1945): a price packs scattered knowledge into one number. When a drought hits Brazil, a café in Oslo doesn't need to know why coffee got pricier. The price tells it to economise, and tells farmers in Vietnam to plant more. No planner could gather all that information. That's why economists get nervous when prices are frozen: it's like switching off the signal.</p>",
        sim: () => calc({ q: "Demand: P = 10 − 0.08Q. Supply: P = 2 + 0.06Q. What is the equilibrium quantity Q?", answer: 57.14, tol: 0.01, hint: "Set the two prices equal: 10 − 0.08Q = 2 + 0.06Q.", why: "<p>10 − 0.08Q = 2 + 0.06Q → 8 = 0.14Q → <b>Q ≈ 57.1</b>, and P = 10 − 0.08 × 57.1 ≈ $5.43.</p>" }) },
    ],
    job: "<p>Every commodity analyst, every pricing team and every consultant doing a market study is drawing these curves, often without saying so. \"What's driving prices?\" means \"which curve shifted?\" Oil traders watch OPEC (supply) and Chinese growth (demand). Housing analysts watch rates (demand) and building permits (supply). In interviews: <i>always say which curve moves and why</i>.</p>",
    terms: [["Demand curve", "How much buyers want at each price. Slopes down."], ["Supply curve", "How much sellers offer at each price. Slopes up."], ["Equilibrium", "The price where quantity demanded equals quantity supplied."], ["Consumer surplus", "What buyers would have paid minus what they paid."], ["Producer surplus", "What sellers received minus the least they'd have accepted."], ["Substitute", "A good used instead of another (tea for coffee)."], ["Complement", "A good used with another (milk with coffee)."]],
    quiz: [
      ["A new machine halves the cost of roasting coffee. What happens?", ["Demand shifts right; price rises", "Supply shifts right; price falls and quantity rises", "Supply shifts left; price rises"], 1, "Lower costs make sellers offer more at every price: supply shifts right. More coffee, cheaper."],
      ["Coffee prices rise and people buy less. Is that a shift in demand?", ["Yes, demand fell", "No: it's a movement along the demand curve caused by price", "It's a shift in supply"], 1, "A price change moves you along the curve. Shifts come from other things: income, tastes, substitutes."],
      ["Demand and supply both shift right. What do we know for sure?", ["Price rises", "Quantity rises; price could go either way", "Both fall"], 1, "Both shifts push quantity up. They push price in opposite directions, so the result depends on which shift is bigger."],
    ],
    recap: [["Cross", "Price settles where demand meets supply."], ["Shift vs slide", "Other things shift curves; price slides along them."], ["Signal", "Prices carry information no planner could gather."]],
    see: ["elasticity", "price-controls", "scarcity", "order-book"],
  },

  elasticity: {
    principle: "Elasticity measures <em>how much people react</em> to a price change. It decides who wins from price cuts, and who pays taxes.",
    hook: "<p>If petrol goes up 10%, people grumble and keep driving. If one cereal brand goes up 10%, shoppers grab the one next to it. That difference, how sensitive quantity is to price, is <em>elasticity</em>, and it's the first number any pricing team wants.</p>",
    parts: [
      { h: "Cut the price, see the revenue", sim: elasticSim, html: "<p>Elasticity = % change in quantity ÷ % change in price (ignoring the minus sign). Above 1 is <b>elastic</b>: people respond a lot. Below 1 is <b>inelastic</b>: they barely flinch.</p>" },
      { h: "What makes demand elastic?", html: "<ul><li><b>Substitutes</b>: lots of close alternatives → elastic (one brand of cola).</li><li><b>Necessity</b>: insulin, electricity, petrol in the short run → inelastic.</li><li><b>Share of budget</b>: a 10% rise on salt goes unnoticed; on rent it hurts.</li><li><b>Time</b>: given years, people buy electric cars and move closer to work, so long-run demand is more elastic than short-run.</li><li><b>How you define the market</b>: \"food\" is inelastic; \"Brand X yoghurt\" is very elastic.</li></ul>",
        sim: () => predict({ q: "A city raises bus fares 20% and ridership falls 6%. What happens to fare revenue?", options: ["It rises: demand is inelastic (0.3)", "It falls", "It stays the same"], answer: 0, why: "<p>Elasticity = 6% ÷ 20% = 0.3, inelastic. Revenue ≈ 1.20 × 0.94 = 1.128: <b>up about 13%</b>. But fewer riders means more cars, so the city must weigh revenue against congestion.</p>" }) },
      { h: "Other elasticities", html: "<ul><li><b>Income elasticity</b>: how demand changes with income. Positive for <i>normal goods</i>, above 1 for <i>luxuries</i> (cruises), negative for <i>inferior goods</i> (instant noodles, bus travel).</li><li><b>Cross-price elasticity</b>: how demand for A responds to B's price. Positive for substitutes, negative for complements. Competition regulators use this to define markets.</li><li><b>Supply elasticity</b>: how fast producers can respond. Housing supply is very inelastic in cities, which is why demand booms turn into price booms.</li></ul>",
        sim: () => calc({ q: "A shop raises the price of a sandwich from $5.00 to $5.50 and daily sales fall from 200 to 170. What's the price elasticity of demand?", answer: 1.5, tol: 0.02, hint: "% change in quantity is −15%; % change in price is +10%.", why: "<p>Quantity −15%, price +10% → elasticity = 15 ÷ 10 = <b>1.5</b>: elastic. Revenue fell from $1,000 to $935.</p>" }) },
    ],
    job: "<p>Pricing consultants estimate elasticities from experiments and past data to find where revenue or profit peaks. Investors call low elasticity <b>pricing power</b>: the ability to raise prices without losing customers, which is Warren Buffett's single favourite test of a business. Governments tax inelastic goods (petrol, tobacco, alcohol) because people keep buying, so the tax raises money reliably.</p>",
    terms: [["Price elasticity of demand", "% change in quantity ÷ % change in price."], ["Elastic", "Elasticity above 1: quantity reacts a lot."], ["Inelastic", "Elasticity below 1: quantity barely reacts."], ["Income elasticity", "How demand responds to income changes."], ["Inferior good", "Something people buy less of as they get richer."], ["Pricing power", "Raising prices without losing many customers: low elasticity for your product."]],
    quiz: [
      ["Demand is elastic. A firm cuts its price. Revenue…", ["Falls", "Rises", "Is unchanged"], 1, "When demand is elastic, the % gain in quantity beats the % drop in price, so revenue rises."],
      ["Which is likely the MOST elastic?", ["Salt", "Insulin", "A particular brand of bottled water"], 2, "Close substitutes everywhere make a single brand very price-sensitive."],
      ["Why is demand for petrol more elastic over 10 years than over 1 month?", ["Petrol gets cheaper", "People have time to change cars, homes and habits", "It isn't"], 1, "Long-run adjustments (EVs, moving, transit) make people more responsive over time."],
    ],
    recap: [["% / %", "Elasticity = % change in quantity over % change in price."], [">1 vs <1", "Elastic: cut prices to grow revenue. Inelastic: raise them."], ["Pricing power", "Investors' favourite moat is low elasticity."]],
    see: ["supply-demand", "price-controls", "pricing", "competition"],
  },

  "price-controls": {
    principle: "When a law fixes a price away from where the market would put it, <em>the amount traded shrinks and someone has to ration</em>.",
    hook: "<p>Rent control, minimum wages, fuel subsidies, taxes on sugar: governments overrule prices all the time, usually for good reasons. Economics doesn't say never do it. It says: know the side effects, because they follow from the curves as reliably as gravity.</p>",
    parts: [
      { h: "Ceilings, floors, taxes", html: "<p>Pick a policy and push it past the market price. A <b>ceiling</b> caps the price (rent control). A <b>floor</b> sets a minimum (minimum wage, farm price supports). A <b>tax</b> drives a wedge between what buyers pay and sellers keep.</p>", sim: controlSim },
      { h: "Who really pays a tax?", html: "<p>Lawmakers decide who <i>sends</i> the money to the government. The curves decide who <i>bears</i> it. Whichever side is less elastic (less able to switch away) ends up paying more. Payroll taxes split \"half and half\" on paper fall mostly on workers, because labour supply is fairly inelastic.</p>",
        sim: () => predict({ q: "Cigarette demand is very inelastic; supply is elastic. A $1 tax per pack is levied on manufacturers. Who bears most of it?", options: ["Manufacturers, who legally pay it", "Smokers, through higher prices", "It's split exactly 50/50"], answer: 1, why: "<p>Smokers can't easily walk away, so manufacturers pass nearly the whole $1 on in the price. The legal payer is irrelevant to the <em>economic incidence</em>.</p>" }) },
      { h: "The rent control story", html: "<p>Rent control helps current tenants: lower rent, more security. The costs show up slowly: fewer new rental buildings, landlords converting flats to condos, less maintenance, and tenants who never move (because their cheap flat is gone if they do). A famous San Francisco study (Diamond, McQuade, Qian 2019) found rent control cut rental supply in affected buildings by 15%, pushing up rents city-wide. Most economists see it as a classic case of helping insiders at outsiders' expense, though some see value in stability for neighbourhoods.</p>",
        sim: () => callout("myth", "The minimum wage debate is not settled", "<p>The simple floor diagram predicts unemployment. Real studies (Card and Krueger's 1994 New Jersey fast-food study, and many since) often find small job losses from moderate rises, because employers with hiring power (<i>monopsony</i>) were paying below the competitive wage anyway. Big rises relative to local wages are riskier. The honest answer: it depends on how high the floor is.</p>") },
    ],
    job: "<p>Policy consultants, regulators and economists at think tanks estimate deadweight losses and incidence before laws pass. In industry, firms model what a tariff, sugar tax or price cap does to their margins and volumes. Investors track regulatory risk: a price cap on energy bills or drug prices can wipe billions off a company's value overnight.</p>",
    terms: [["Price ceiling", "A legal maximum price. Binding if below equilibrium: causes shortages."], ["Price floor", "A legal minimum price. Binding if above equilibrium: causes surpluses."], ["Deadweight loss", "Value lost because mutually beneficial trades don't happen."], ["Tax incidence", "Who actually bears a tax's burden, regardless of who pays it."], ["Black market", "Illegal trade that springs up when legal prices are held too low or goods are banned."], ["Monopsony", "A market with one dominant buyer, like a single big employer in a town."]],
    quiz: [
      ["A price ceiling set ABOVE the market price…", ["Causes a shortage", "Has no effect", "Causes a surplus"], 1, "It doesn't bind: the market price is already below the cap."],
      ["A tax on a good with perfectly inelastic demand is borne by…", ["Sellers", "Buyers", "Split evenly"], 1, "If buyers will buy the same amount whatever the price, sellers can pass the entire tax on."],
      ["What is deadweight loss?", ["The tax revenue", "Trades that would have benefited both sides but no longer happen", "Profits lost by sellers"], 1, "Tax revenue is a transfer. Deadweight loss is pure waste: value nobody gets."],
    ],
    recap: [["Shortage", "Binding ceilings create queues and black markets."], ["Incidence", "The less elastic side pays more of any tax."], ["Triangle", "Deadweight loss: value that just vanishes."]],
    see: ["supply-demand", "elasticity", "externalities", "fiscal"],
  },

  externalities: {
    principle: "When a cost or benefit falls on people <em>outside the deal</em>, the market gets the quantity wrong.",
    hook: "<p>A steel mill sells steel. The buyer pays, the mill gets paid, everyone's happy. Except the town downwind breathing the smoke, who never agreed to anything. That cost is an <em>externality</em>, and it's the main reason economists, even free-market ones, support things like carbon taxes.</p>",
    parts: [
      { h: "Smoke nobody pays for", html: "<p>The mill only counts its own costs, so it makes too much. Add the harm to the town to get the true <em>social cost</em>. Then try a tax.</p>", sim: pollutionSim },
      { h: "Good externalities too", html: "<p>Externalities can be positive. Your vaccination protects strangers. Your education makes coworkers more productive. A beautiful garden lifts your neighbours' house prices. Markets <i>under</i>-produce these, which is why governments subsidise vaccines, research and schools.</p>",
        sim: () => flips([["Negative externality", "Pollution, traffic, noise, antibiotic resistance. Market makes <b>too much</b>."], ["Positive externality", "Vaccines, research, education. Market makes <b>too little</b>."], ["Pigouvian tax", "Tax equal to the harm: the polluter pays the true cost."], ["Coase theorem", "If property rights are clear and bargaining is cheap, people can fix externalities themselves."]]) },
      { h: "The commons and public goods", html: "<p>Two special cases. A <b>common resource</b> (fish, groundwater, the atmosphere) is used up by each user but nobody can be excluded. Each user takes too much: the <em>tragedy of the commons</em>.</p>", sim: commonsSim,
        after: "<p>A <b>public good</b> is the opposite: nobody can be excluded <i>and</i> one person's use doesn't reduce another's (defence, lighthouses, basic research, clean air). Because you can enjoy it without paying, everyone waits for others to pay: the <em>free-rider problem</em>. So public goods are usually funded by taxes.</p>" },
    ],
    job: "<p>ESG investing, carbon markets (like the EU's cap-and-trade system, where emission permits trade at a market price) and climate risk modelling are all about pricing externalities. Consultants advise companies on carbon costs that are coming, and investors stress-test portfolios for carbon prices of $100+ a tonne. A whole job family (sustainability strategy) exists because externalities are moving onto balance sheets.</p>",
    terms: [["Externality", "A cost or benefit that falls on people outside a transaction."], ["Social cost", "Private cost plus the external cost to everyone else."], ["Pigouvian tax", "A tax equal to the external harm, so the market gets the right quantity."], ["Cap and trade", "A fixed total of pollution permits that firms can buy and sell."], ["Tragedy of the commons", "Shared resources get overused because each user ignores the cost to others."], ["Public good", "Non-excludable and non-rival: everyone can use it at once."], ["Free rider", "Someone who benefits without paying."]],
    quiz: [
      ["With a negative externality and no policy, the market produces…", ["Too little", "Too much", "The right amount"], 1, "Producers ignore costs they push onto others, so they make more than is best for society."],
      ["The best size for a pollution tax is…", ["As high as possible", "Equal to the external harm per unit", "Zero: let the market decide"], 1, "Set it to the harm and private and social costs line up."],
      ["Street lighting is a classic public good because…", ["It's provided by government", "Nobody can be excluded and one person's use doesn't reduce another's", "It's cheap"], 1, "Non-excludable and non-rival. Who provides it is a consequence, not the definition."],
    ],
    recap: [["Outside the deal", "Externalities hit third parties."], ["Tax = harm", "Pigouvian taxes fix the quantity."], ["Free riders", "Public goods need collective funding."]],
    see: ["price-controls", "game-theory", "incentives", "fiscal"],
  },

  competition: {
    principle: "Competition squeezes profits towards zero. <em>Lasting profits need something that stops rivals copying you</em>: a moat.",
    hook: "<p>Open a coffee shop next to a busy station and make big profits, and within a year three more shops open next door. Your profits get competed away. But Google has made huge profits for 20 years. What's different? That's the question every investor and strategist asks about every business.</p>",
    parts: [
      { h: "The market structure spectrum", html: "<p>Markets range from cutthroat to cosy:</p>",
        sim: () => table(["Structure", "Sellers", "Price power", "Example"], [["<b>Perfect competition</b>", "Many, identical products", "None: price takers", "Wheat, currencies"], ["<b>Monopolistic competition</b>", "Many, different products", "A little (brand)", "Restaurants, clothes"], ["<b>Oligopoly</b>", "A few big ones", "A lot, if they don't fight", "Airlines, telecoms, cloud"], ["<b>Monopoly</b>", "One", "Maximum", "Local water utility, a patented drug"]]) },
      { h: "One seller sets the price", html: "<p>A monopolist doesn't take the market price; it picks a point on the demand curve. Compare it with a competitive market.</p>", sim: monoSim },
      { h: "Moats: why some profits last", html: "<p>Warren Buffett's word for a durable advantage is a <em>moat</em>. The main kinds:</p>",
        sim: () => flips([["Network effects", "Each user makes it more valuable for others: Visa, WhatsApp, marketplaces."], ["Switching costs", "Painful to leave: your bank, Salesforce, an ERP system."], ["Scale economies", "Bigger = cheaper per unit: Amazon logistics, Costco."], ["Intangibles", "Brands (Coca-Cola), patents (pharma), licences."], ["Cost advantage", "Unique access to cheap inputs or a process: a low-cost mine."], ["Efficient scale", "The market only fits one or two players: an airport, a pipeline."]]),
        after: "<p>Regulators watch the other side: <b>antitrust</b> (competition law) blocks mergers that create too much power and punishes cartels. In oligopolies, firms are tempted to collude on prices, which is illegal (and, as the next lesson shows, unstable anyway).</p>" },
    ],
    job: "<p>\"Does it have a moat?\" is the first question in equity research and private equity diligence. Consultants map industry structure with <b>Porter's five forces</b> (toolkit world). Bankers advise on mergers that must pass antitrust review. High margins without a moat are a red flag: they invite competitors.</p>",
    terms: [["Perfect competition", "Many sellers of identical products: no one can set the price."], ["Oligopoly", "A market dominated by a few firms."], ["Monopoly", "One seller with no close substitutes."], ["Marginal revenue", "Extra revenue from selling one more unit."], ["Moat", "A durable competitive advantage that protects profits."], ["Network effect", "A product gets more valuable as more people use it."], ["Antitrust", "Laws that protect competition: merger control, anti-cartel rules."]],
    quiz: [
      ["A monopolist chooses output where…", ["Price = marginal cost", "Marginal revenue = marginal cost", "Average cost is lowest"], 1, "MR = MC maximises profit. Price is then read off the demand curve, above MC."],
      ["Which is the clearest example of a network effect?", ["A cheaper factory", "A payment network accepted by more shops as more people carry its card", "A famous brand"], 1, "More users attract more merchants, which attract more users: a loop."],
      ["In perfect competition in the long run, economic profit tends to…", ["Grow", "Zero", "Become negative forever"], 1, "Profits attract entrants until the extra profit is competed away."],
    ],
    recap: [["MR = MC", "How a monopolist picks its quantity."], ["Moats", "Network effects, switching costs, scale, intangibles."], ["Zero", "Competition drives economic profit toward zero."]],
    see: ["game-theory", "frameworks", "pricing", "multiples"],
  },

  "game-theory": {
    principle: "When your best move depends on what others do, <em>think about their incentives before choosing yours</em>.",
    hook: "<p>Two petrol stations on the same corner. Each could cut prices to steal customers. If both do, both lose. If both hold, both profit. If one cuts, it wins big. What happens? Game theory is the study of exactly these situations, and it runs through pricing, auctions, negotiations, nuclear policy and cartels.</p>",
    parts: [
      { h: "The prisoner's dilemma", html: "<p>Each round you and an opponent choose to cooperate or defect. Points are in the table. Can you figure out their strategy?</p>", sim: pdGame },
      { h: "Repeated games change everything", html: "<p>Played once, defecting wins. Played many times, reputation matters. Run a tournament between classic strategies.</p>", sim: tournament,
        after: "<p>This is why cartels like OPEC wobble: each member is tempted to pump more than its quota (defect) when prices are high. And it's why long-term business relationships run on trust that would be irrational in a one-off deal.</p>" },
      { h: "Nash equilibrium", html: "<p>A <em>Nash equilibrium</em> is a set of choices where nobody can do better by changing their own move alone. Both defecting is a Nash equilibrium of the prisoner's dilemma, even though it's worse for both. Equilibria don't have to be good; they just have to be stable.</p>",
        sim: () => predict({ q: "Two firms each choose a high or low advertising budget. If both go high, they cancel out and each earns $4M. Both low: $6M each. One high, one low: high earns $8M, low earns $2M. What's the Nash equilibrium?", options: ["Both low", "Both high", "One high, one low"], answer: 1, why: "<p>Whatever the rival does, going high pays more ($8M vs $6M if they go low; $4M vs $2M if they go high). So both go high and earn $4M each, worse than $6M. That's why cigarette firms secretly welcomed the 1971 US TV advertising ban: it enforced the \"both low\" outcome they couldn't reach alone.</p>" }) },
    ],
    job: "<p>Strategy consultants game out competitor responses (\"if we cut prices, what will they do?\"). Bankers design auctions for selling companies, where bidders' strategies matter. Regulators use game theory to design spectrum auctions that raised hundreds of billions. In negotiation and M&A, thinking one step ahead of the other side's incentives is the whole skill.</p>",
    terms: [["Game theory", "The study of strategic decisions where payoffs depend on others' choices."], ["Prisoner's dilemma", "A game where individual incentives lead to a worse outcome for everyone."], ["Dominant strategy", "A move that's best whatever the other player does."], ["Nash equilibrium", "Nobody can gain by changing only their own move."], ["Tit for tat", "Cooperate first, then copy the opponent's last move."], ["Cartel", "Firms colluding on price or output. Illegal in most places, and unstable."]],
    quiz: [
      ["In a one-shot prisoner's dilemma, the dominant strategy is…", ["Cooperate", "Defect", "Random"], 1, "Defecting pays more whatever the other does, in a single round."],
      ["Why can cooperation survive in repeated games?", ["People are nice", "Future punishment for defecting outweighs the one-time gain", "Rules forbid defection"], 1, "The shadow of the future: defect now and you lose cooperation later."],
      ["A Nash equilibrium is always the best outcome for everyone.", ["True", "False"], 1, "Mutual defection is a Nash equilibrium and worse for both than mutual cooperation."],
    ],
    recap: [["Dilemma", "Individually rational can be collectively bad."], ["Repeat", "Repeated games reward nice-but-firm strategies."], ["Nash", "Stable is not the same as good."]],
    see: ["competition", "negotiation", "incentives", "bank-run"],
  },

  information: {
    principle: "When one side knows more than the other, <em>markets can break down</em> unless someone finds a way to signal or check.",
    hook: "<p>Why does a new car lose 20% of its value the moment you drive it off the lot? Partly because buyers of used cars think: \"If it's so good, why are you selling it?\" George Akerlof won a Nobel Prize for showing that this suspicion alone can destroy a market.</p>",
    parts: [
      { h: "The market for lemons", html: "<p>Sellers know if their car is good or a lemon. Buyers don't. Set how many lemons there are and watch what happens to the good cars.</p>", sim: lemonsSim },
      { h: "Adverse selection and moral hazard", html: "<p>Two problems from hidden information, both huge in insurance and finance:</p><ul><li><b>Adverse selection</b> (hidden <i>type</i>, before the deal): people who know they're risky are keenest to buy insurance; borrowers who'll accept any rate are often the riskiest.</li><li><b>Moral hazard</b> (hidden <i>action</i>, after the deal): once insured, people take less care. Once a bank knows it'll be bailed out, it takes more risk.</li></ul>",
        sim: () => predict({ q: "A bank raises its loan interest rate from 8% to 15%. Which borrowers are most likely to still apply?", options: ["The safest ones", "The riskiest ones, who don't expect to repay in full anyway", "Exactly the same mix"], answer: 1, why: "<p>Safe borrowers find 15% too expensive and leave. Gamblers don't mind because they may never pay. Higher rates can <i>raise</i> defaults. That's why banks ration credit (refuse loans) instead of just raising rates: Stiglitz and Weiss, 1981.</p>" }) },
      { h: "Fixes: signals, screens, skin in the game", sim: () => table(["Fix", "Who acts", "Examples"], [["<b>Signalling</b>", "The informed side proves quality with a costly action", "Warranties, degrees, a founder investing their own money, a company paying dividends"], ["<b>Screening</b>", "The uninformed side makes people reveal themselves", "Insurance deductibles, credit scores, due diligence, menus of contracts"], ["<b>Reputation</b>", "Repeat players protect their name", "Brands, reviews, auditors"], ["<b>Skin in the game</b>", "Make the agent share the downside", "Co-pays, PE managers investing in their own funds, risk retention rules"]]),
        after: "<p>The <em>principal-agent problem</em> is the same idea inside firms: shareholders (principals) can't see everything managers (agents) do. Much of corporate governance, from boards to stock-based pay, exists to manage it.</p>" },
    ],
    job: "<p><b>Due diligence</b>, the weeks of checking before any PE deal or acquisition, is a fight against asymmetric information: the seller knows the company's problems, the buyer doesn't. Bankers use <b>reps and warranties</b> (promises in the contract) and <b>earn-outs</b> (paying part of the price later, based on results) to make sellers put their money where their mouth is. VCs rely on signals because startups have no track record.</p>",
    terms: [["Asymmetric information", "One side of a deal knows more than the other."], ["Adverse selection", "Hidden information before a deal attracts the worst risks."], ["Moral hazard", "Being protected from risk makes people take more of it."], ["Signalling", "A costly action that credibly shows quality."], ["Screening", "Designing choices so people reveal what they know."], ["Principal-agent problem", "When the person acting has different goals from the person they act for."], ["Due diligence", "Investigating a business before buying or investing."]],
    quiz: [
      ["After getting full car insurance, a driver parks carelessly. That's…", ["Adverse selection", "Moral hazard", "Signalling"], 1, "A hidden action after the contract: moral hazard."],
      ["A used-car dealer offers a 3-year warranty. Economically, that's…", ["Screening", "A signal of quality", "Moral hazard"], 1, "Only sellers of good cars can afford to offer long warranties, so it signals quality."],
      ["Why might a lender refuse a loan rather than charge a higher rate?", ["It's illegal to charge more", "Higher rates attract riskier borrowers", "Banks don't like profit"], 1, "Adverse selection: high rates drive away safe borrowers."],
    ],
    recap: [["Lemons", "Hidden quality can unravel a market."], ["Before / after", "Adverse selection before, moral hazard after."], ["Signal", "Costly actions make promises credible."]],
    see: ["incentives", "game-theory", "crisis-2008", "pe-fund"],
  },
};

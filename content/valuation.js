// World 7: Valuation & corporate finance.
import { h, money, num, pct, clamp } from "../lib/core.js";
import { slider, seg, stats, stage, predict, calc, callout, table, bars, button, flips, stepper, formula } from "../lib/ui.js";
import { plot, columns, waterfall } from "../lib/chart.js";

const W = "var(--wc)";
const B = (x) => `${x < 0 ? "−" : ""}$${num(Math.abs(x), Math.abs(x) < 10 ? 1 : 0)}B`;

/* ---------------- EV bridge ---------------- */
function evSim() {
  const v = { px: 50, sh: 2, debt: 40, cash: 15, pref: 0, mino: 5 };
  const box = h("div"), st = stats([{ label: "Equity value (market cap)" }, { label: "Enterprise value" }, { label: "Net debt" }]);
  const draw = () => {
    const eq = v.px * v.sh, ev = eq + v.debt - v.cash + v.pref + v.mino;
    box.replaceChildren(waterfall([{ label: "Market cap", value: eq, total: true, color: "#8b5cf6" }, { label: "+ Debt", value: v.debt }, { label: "− Cash", value: -v.cash }, { label: "+ Preferred", value: v.pref }, { label: "+ Minority int.", value: v.mino }, { label: "= EV", value: ev, total: true, color: W }], { fmt: B, label: "Equity to enterprise value bridge" }));
    st.set(0, B(eq)); st.set(1, B(ev)); st.set(2, B(v.debt - v.cash));
  };
  const mk = (k, label, max, fmt) => slider({ label, min: 0, max, value: v[k], fmt, onInput: (x) => { v[k] = x; draw(); } });
  draw();
  return stage({ title: "From share price to enterprise value", controls: [mk("px", "Share price", 150, (x) => `$${x}`), mk("sh", "Shares (billions)", 10, (x) => `${x}B`), mk("debt", "Debt ($B)", 150, B), mk("cash", "Cash ($B)", 80, B), mk("pref", "Preferred stock ($B)", 30, B), mk("mino", "Minority interest ($B)", 30, B)], body: [box, st.el], note: "EV is what you'd pay to buy the whole business, free of its financing: the equity, plus the debt you take on, minus the cash you get. It's independent of how the company is financed, which is why multiples like EV/EBITDA compare companies with different debt levels." });
}

/* ---------------- football field ---------------- */
function footballSim() {
  const peers = [["Peer A", 9.5, 18], ["Peer B", 11, 22], ["Peer C", 8, 15], ["Peer D", 12.5, 26], ["Peer E", 10, 20]];
  let ebitda = 500, ni = 200, net = 1000, shares = 40;
  const box = h("div"), tbl = h("div");
  const draw = () => {
    const ev = peers.map((p) => p[1]).sort((a, b) => a - b), pe = peers.map((p) => p[2]).sort((a, b) => a - b);
    const q = (a, t) => a[0] + (a.at(-1) - a[0]) * t;
    const perShare = (evx) => (evx * ebitda - net) / shares;
    const rows = [
      ["52-week trading range", 95, 140, "#64748b"],
      ["Trading comps (EV/EBITDA)", perShare(q(ev, 0.25)), perShare(q(ev, 0.75)), W],
      ["Trading comps (P/E)", (q(pe, 0.25) * ni) / shares, (q(pe, 0.75) * ni) / shares, "#8b5cf6"],
      ["Precedent deals (control premium)", perShare(q(ev, 0.25)) * 1.3, perShare(q(ev, 0.75)) * 1.3, "#ec4899"],
      ["DCF (WACC 8-10%, g 2-3%)", 105, 160, "#0ea5e9"],
      ["LBO (20-25% IRR)", 90, 120, "#c2853a"],
    ];
    const lo = 40, hi = 220, sx = (v) => `${((clamp(v, lo, hi) - lo) / (hi - lo)) * 100}%`;
    box.replaceChildren(h("div.ff", rows.map(([n, a, b, c]) => h("div.ff-row", h("span.ff-l", n), h("div.ff-t", h("i", { style: { left: sx(a), width: `calc(${sx(b)} - ${sx(a)})`, background: c } }, h("b.ff-a", `$${num(a)}`), h("b.ff-b", `$${num(b)}`))))), h("div.ff-row", h("span"), h("div.ff-axis", [50, 100, 150, 200].map((v) => h("span", { style: { left: sx(v) } }, `$${v}`))))));
    tbl.replaceChildren(table(["Peer", "EV/EBITDA", "P/E"], peers.map(([n, a, b]) => [n, `${a}×`, `${b}×`])));
  };
  const c = [slider({ label: "Target EBITDA ($M)", min: 200, max: 900, step: 10, value: ebitda, onInput: (x) => { ebitda = x; draw(); } }), slider({ label: "Target net income ($M)", min: 100, max: 500, step: 10, value: ni, onInput: (x) => { ni = x; draw(); } }), slider({ label: "Net debt ($M)", min: 0, max: 3000, step: 50, value: net, onInput: (x) => { net = x; draw(); } })];
  draw();
  return stage({ title: "The football field", controls: c, body: [box, tbl], note: "Bankers show every method as a bar of value per share (here using the peers' middle half). Where the bars overlap is the defensible range. A precedent-transaction bar sits higher because buyers pay a <b>control premium</b>." });
}

/* ---------------- WACC ---------------- */
function waccSim() {
  const v = { rf: 4, beta: 1.1, erp: 5.5, kd: 6, tax: 25, dw: 30 };
  const st = stats([{ label: "Cost of equity (CAPM)" }, { label: "After-tax cost of debt" }, { label: "WACC" }]);
  const p = plot({ height: 240, x: [0, 80], y: [4, 16], xLabel: "debt % of capital", yLabel: "cost", xFmt: (x) => `${num(x)}%`, yFmt: (x) => `${num(x)}%`, label: "WACC vs leverage" });
  const draw = () => {
    const curve = [], ke = [], kd = [];
    for (let d = 0; d <= 80; d += 2) {
      const L = d / 100, betaL = v.beta * (1 + (1 - v.tax / 100) * (L / (1 - L + 1e-9))) / (1 + (1 - v.tax / 100) * (v.dw / 100 / (1 - v.dw / 100)));
      const keL = v.rf + betaL * v.erp, kdL = v.kd + Math.max(0, d - 40) * 0.12;
      curve.push([d, (1 - L) * keL + L * kdL * (1 - v.tax / 100)]); ke.push([d, keL]); kd.push([d, kdL * (1 - v.tax / 100)]);
    }
    const Ke = v.rf + v.beta * v.erp, Kd = v.kd * (1 - v.tax / 100), w = (1 - v.dw / 100) * Ke + (v.dw / 100) * Kd;
    p.draw({ y: [0, 20], series: [{ name: "Cost of equity", color: "#8b5cf6", pts: ke }, { name: "After-tax cost of debt", color: "#0ea5e9", pts: kd }, { name: "WACC", color: W, pts: curve, width: 4 }], dots: [{ x: v.dw, y: w, color: "#ffc21a", r: 8, label: `${num(w, 1)}%` }] });
    st.set(0, `${num(Ke, 1)}%`); st.set(1, `${num(Kd, 1)}%`); st.set(2, `${num(w, 2)}%`, "accent");
  };
  const mk = (k, label, min, max, step, fmt) => slider({ label, min, max, step, value: v[k], fmt, onInput: (x) => { v[k] = x; draw(); } });
  draw();
  return stage({ title: "Build a WACC", controls: [mk("rf", "Risk-free rate (10y government bond)", 0, 8, 0.25, (x) => `${x}%`), mk("beta", "Beta (how much it swings with the market)", 0.3, 2.5, 0.05, (x) => x.toFixed(2)), mk("erp", "Equity risk premium", 3, 8, 0.25, (x) => `${x}%`), mk("kd", "Pre-tax cost of debt", 2, 12, 0.25, (x) => `${x}%`), mk("tax", "Tax rate", 0, 40, 1, (x) => `${x}%`), mk("dw", "Debt as % of capital", 0, 80, 1, (x) => `${x}%`)], body: [p.el, st.el], note: "Debt is cheaper (lenders get paid first, and interest is tax-deductible), so adding some lowers WACC. But more debt makes equity riskier (higher beta) and eventually debt itself gets expensive. WACC bottoms out somewhere in the middle." });
}

/* ---------------- DCF ---------------- */
function dcfSim() {
  const v = { rev: 1000, g: 8, m: 20, tax: 25, reinv: 35, wacc: 9, tg: 2.5, net: 500, sh: 100 };
  const tbl = h("div"), sens = h("div"), box = h("div"), st = stats([{ label: "Enterprise value" }, { label: "Terminal value share of EV" }, { label: "Equity value" }, { label: "Value per share" }]);
  const value = (wacc, tg) => {
    let rev = v.rev, pv = 0, fcf = 0; const rows = [];
    for (let t = 1; t <= 5; t++) {
      rev *= 1 + v.g / 100 * (1 - (t - 1) * 0.12);
      const ebit = (rev * v.m) / 100, nopat = ebit * (1 - v.tax / 100); fcf = nopat * (1 - v.reinv / 100);
      const df = 1 / Math.pow(1 + wacc / 100, t); pv += fcf * df; rows.push([t, rev, ebit, nopat, fcf, df, fcf * df]);
    }
    const tv = (fcf * (1 + tg / 100)) / ((wacc - tg) / 100), pvtv = tv / Math.pow(1 + wacc / 100, 5);
    return { ev: pv + pvtv, pv, pvtv, tv, rows };
  };
  const draw = () => {
    const r = value(v.wacc, v.tg), eq = r.ev - v.net;
    tbl.replaceChildren(table(["$M", "Y1", "Y2", "Y3", "Y4", "Y5"], [["Revenue", ...r.rows.map((x) => num(x[1]))], ["EBIT", ...r.rows.map((x) => num(x[2]))], ["NOPAT (after tax)", ...r.rows.map((x) => num(x[3]))], ["<b>Free cash flow</b>", ...r.rows.map((x) => `<b>${num(x[4])}</b>`)], ["Discount factor", ...r.rows.map((x) => num(x[5], 3))], ["PV of FCF", ...r.rows.map((x) => num(x[6]))]]));
    box.replaceChildren(waterfall([{ label: "PV of 5 yrs FCF", value: r.pv, total: true, color: "#0ea5e9" }, { label: "+ PV of terminal", value: r.pvtv, color: W }, { label: "= EV", value: r.ev, total: true, color: "#6366f1" }, { label: "− Net debt", value: -v.net }, { label: "= Equity", value: eq, total: true, color: eq > 0 ? "var(--up)" : "var(--down)" }], { fmt: (x) => `${x < 0 ? "−" : ""}$${num(Math.abs(x))}M`, height: 210 }));
    st.set(0, `$${num(r.ev)}M`); st.set(1, pct(r.pvtv / r.ev, 0), r.pvtv / r.ev > 0.75 ? "warn" : ""); st.set(2, `$${num(eq)}M`); st.set(3, `$${num(eq / v.sh, 2)}`, "accent");
    const ws = [v.wacc - 1, v.wacc - 0.5, v.wacc, v.wacc + 0.5, v.wacc + 1], gs = [v.tg - 1, v.tg - 0.5, v.tg, v.tg + 0.5, v.tg + 1];
    const base = eq / v.sh;
    sens.replaceChildren(h("div.eyebrow", "Sensitivity: value per share"), h("div.tbl-wrap", h("table.t.sens", h("thead", h("tr", h("th", "WACC ↓ / g →"), gs.map((g) => h("th", `${num(g, 1)}%`)))), h("tbody", ws.map((w) => h("tr", h("th", `${num(w, 1)}%`), gs.map((g) => { if (w <= g + 0.25) return h("td.n", "n/a"); const x = (value(w, g).ev - v.net) / v.sh, d = clamp((x / base - 1) * 2.5, -1, 1); return h("td.n", { style: { background: `color-mix(in srgb, ${d >= 0 ? "#22c55e" : "#e5484d"} ${Math.abs(d) * 55}%, var(--surface))`, fontWeight: w === v.wacc && g === v.tg ? 800 : 500 } }, `$${num(x, 0)}`); })))))));
  };
  const mk = (k, label, min, max, step, fmt) => slider({ label, min, max, step, value: v[k], fmt, onInput: (x) => { v[k] = x; draw(); } });
  draw();
  return stage({ title: "A five-year DCF", controls: [mk("rev", "Revenue today ($M)", 200, 3000, 50, (x) => `$${x}M`), mk("g", "Revenue growth (fades over time)", 0, 30, 1, (x) => `${x}%`), mk("m", "EBIT margin", 2, 45, 1, (x) => `${x}%`), mk("reinv", "Reinvestment (capex + working capital, % of NOPAT)", 0, 90, 5, (x) => `${x}%`), mk("wacc", "WACC", 5, 15, 0.25, (x) => `${x}%`), mk("tg", "Terminal growth", 0, 4, 0.25, (x) => `${x}%`), mk("net", "Net debt ($M)", 0, 3000, 50, (x) => `$${x}M`)], body: [tbl, box, st.el, sens] });
}

/* ---------------- capital structure ---------------- */
function leverageSim() {
  let debt = 50;
  const p = plot({ height: 260, x: [-10, 30], y: [-60, 80], xLabel: "return on assets (business result)", yLabel: "return on equity", xFmt: (x) => `${num(x)}%`, yFmt: (x) => `${num(x)}%`, label: "Leverage magnifies" });
  const st = stats([{ label: "Debt share" }, { label: "ROE in a good year (ROA 15%)" }, { label: "ROE in a bad year (ROA −5%)" }]);
  const draw = () => {
    const d = debt / 100, kd = 6, roe = (roa) => ((roa - d * kd) / (1 - d + 1e-9));
    p.draw({ series: [{ name: "No debt", color: "var(--ink-3)", pts: [[-10, -10], [30, 30]], dash: "6 5" }, { name: `${debt}% debt`, color: W, pts: [[-10, roe(-10)], [30, roe(30)]], width: 4 }], hlines: [{ y: 0 }] });
    st.set(0, `${debt}%`); st.set(1, pct(roe(15) / 100, 0), "good"); st.set(2, pct(roe(-5) / 100, 0), "bad");
  };
  const a = slider({ label: "Debt share of funding (interest 6%)", min: 0, max: 90, value: debt, fmt: (x) => `${x}%`, onInput: (x) => { debt = x; draw(); } });
  draw();
  return stage({ title: "Leverage cuts both ways", controls: [a], body: [p.el, st.el], note: "Debt makes the line steeper: good years get better for shareholders, bad years much worse. The business is the same; only the split of its results changes." });
}
function mmSim() {
  let tax = 25, distress = 40;
  const p = plot({ height: 260, x: [0, 90], y: [80, 130], xLabel: "debt % of capital", yLabel: "firm value", xFmt: (x) => `${num(x)}%`, yFmt: (x) => num(x), label: "Trade-off theory" });
  const draw = () => {
    const pts = [], ts = [];
    for (let d = 0; d <= 90; d += 2) { const shield = (tax / 100) * d * 0.6, dc = (distress / 100) * Math.pow(Math.max(0, d - 20) / 70, 2.2) * 60; ts.push([d, 100 + shield]); pts.push([d, 100 + shield - dc]); }
    const best = pts.reduce((m, x) => (x[1] > m[1] ? x : m));
    p.draw({ series: [{ name: "No taxes (Modigliani-Miller)", color: "var(--ink-3)", pts: [[0, 100], [90, 100]], dash: "6 5" }, { name: "With the tax shield only", color: "#0ea5e9", pts: ts, dash: "3 4" }, { name: "Tax shield − distress costs", color: W, pts, width: 4 }], dots: [{ x: best[0], y: best[1], color: "#ffc21a", r: 8, label: `best ≈ ${best[0]}% debt` }] });
  };
  const a = slider({ label: "Corporate tax rate", min: 0, max: 40, value: tax, fmt: (x) => `${x}%`, onInput: (x) => { tax = x; draw(); } });
  const b = slider({ label: "How costly is financial distress?", min: 0, max: 100, value: distress, fmt: (x) => `${x}%`, onInput: (x) => { distress = x; draw(); } });
  draw();
  return stage({ title: "Is there a best amount of debt?", controls: [a, b], body: [p.el], note: "Modigliani and Miller (1958): without taxes and bankruptcy costs, financing doesn't change a firm's value at all. Add taxes, and debt helps (interest is deductible). Add distress costs, and too much debt hurts. Stable cash-flow firms (utilities) can carry more; risky ones (biotech) carry little." });
}

/* ---------------- payouts ---------------- */
function payoutSim() {
  let mode = "buyback", amt = 20, px = 50;
  const st = stats([{ label: "Share price after" }, { label: "Shares outstanding" }, { label: "EPS" }, { label: "Your wealth (100 shares)" }]);
  const draw = () => {
    const shares = 100, ni = 400, cash = amt * 10; // $M
    let sharesAfter = shares, pxAfter = px, yourCash = 0;
    if (mode === "dividend") { pxAfter = px - cash / shares; yourCash = (cash / shares) * 100; }
    else { sharesAfter = shares - cash / px; pxAfter = px; }
    const lostInt = cash * 0.04 * 0.75; // cash no longer earning interest
    st.set(0, `$${num(pxAfter, 2)}`); st.set(1, `${num(sharesAfter, 1)}M`); st.set(2, `$${num((ni - lostInt) / sharesAfter / 10, 2)}`, mode === "buyback" ? "good" : ""); st.set(3, money(pxAfter * 100 + yourCash));
  };
  const a = seg({ label: "Return cash by", options: [{ value: "dividend", label: "Dividend" }, { value: "buyback", label: "Buyback" }], value: mode, onChange: (x) => { mode = x; draw(); } });
  const b = slider({ label: "Cash returned (% of market cap)", min: 0, max: 40, value: amt, fmt: (x) => `${x}%`, onInput: (x) => { amt = x; draw(); } });
  draw();
  return stage({ title: "Dividend or buyback?", controls: [a, b], body: [st.el], note: "Ignoring taxes, your wealth is the same either way: a dividend drops the share price by the cash paid out; a buyback leaves the price but shrinks the share count (so EPS rises). Differences come from taxes, signalling, flexibility, and whether the shares are bought cheaply." });
}

/* ---------------- M&A accretion / dilution ---------------- */
function adSim() {
  const v = { ape: 20, tpe: 25, prem: 30, stock: 50, rate: 6, syn: 10 };
  const st = stats([{ label: "Acquirer EPS before" }, { label: "Pro forma EPS" }, { label: "Accretion / dilution" }, { label: "Purchase price" }]);
  const msg = h("p.muted");
  const draw = () => {
    const aNI = 1000, aSh = 1000, aPx = (aNI / aSh) * v.ape; // $1 EPS
    const tNI = 200, tEq = tNI * v.tpe, price = tEq * (1 + v.prem / 100);
    const stockPart = price * v.stock / 100, cashPart = price - stockPart;
    const newSh = stockPart / aPx, intCost = cashPart * (v.rate / 100) * 0.75;
    const ni = aNI + tNI + (v.syn / 100) * tNI * 2 * 0.75 - intCost, eps = ni / (aSh + newSh);
    const d = eps / 1 - 1;
    st.set(0, "$1.00"); st.set(1, `$${num(eps, 3)}`); st.set(2, `${d >= 0 ? "+" : ""}${pct(d)}`, d >= 0 ? "good" : "bad"); st.set(3, `$${num(price / 1000, 2)}B`);
    msg.innerHTML = `Rule of thumb: an all-stock deal is accretive if the acquirer's P/E (${v.ape}×) is above the P/E it pays (${num(v.tpe * (1 + v.prem / 100), 1)}× incl. premium). Cash is accretive if the after-tax interest rate (${num(v.rate * 0.75, 1)}%) is below the target's earnings yield (${num(100 / (v.tpe * (1 + v.prem / 100)), 1)}%). <b>Accretive doesn't mean value-creating</b>: that needs synergies worth more than the premium.`;
  };
  const mk = (k, label, min, max, step, fmt) => slider({ label, min, max, step, value: v[k], fmt, onInput: (x) => { v[k] = x; draw(); } });
  draw();
  return stage({ title: "Will the deal raise our earnings per share?", controls: [mk("ape", "Acquirer P/E", 8, 40, 1, (x) => `${x}×`), mk("tpe", "Target P/E (before premium)", 8, 40, 1, (x) => `${x}×`), mk("prem", "Takeover premium", 0, 80, 5, (x) => `${x}%`), mk("stock", "Paid in stock (rest cash, borrowed)", 0, 100, 10, (x) => `${x}%`), mk("rate", "Interest rate on new debt", 2, 12, 0.5, (x) => `${x}%`), mk("syn", "Cost synergies (% of target costs)", 0, 30, 1, (x) => `${x}%`)], body: [st.el, msg] });
}

export default {
  ev: {
    principle: "Enterprise value is <em>the price of the whole business</em>, whoever funded it. Equity value is just the owners' slice.",
    hook: "<p>You buy a house for $500k with $100k of your money and a $400k mortgage. Your equity is $100k; the house is worth $500k. Companies are the same: the share price tells you the equity, but to buy the whole company you also take on its debt (and get its cash). That's the difference between equity value and enterprise value.</p>",
    parts: [
      { h: "The bridge", sim: evSim },
      { h: "Which multiple goes with which value?", html: "<p>Match the numerator to the claimants of the denominator:</p><ul><li><b>EV</b> belongs to everyone (debt and equity), so pair it with metrics before interest: revenue, EBITDA, EBIT. → EV/EBITDA, EV/Sales.</li><li><b>Equity value</b> belongs to shareholders, so pair it with metrics after interest: net income, book value. → P/E, P/B.</li></ul><p>Mixing them (EV/net income) is a classic mistake.</p>",
        sim: () => predict({ q: "A company borrows $1B and keeps it all as cash. What happens to its enterprise value?", options: ["Rises by $1B", "Unchanged: +$1B debt, +$1B cash", "Falls by $1B"], answer: 1, why: "<p>Debt +1, cash +1: they cancel in EV. Equity value doesn't change either (ignoring interest). EV only moves when the business itself changes.</p>" }) },
      { h: "Practise", sim: () => calc({ q: "Share price $40, 500M shares, $8B debt, $3B cash. Enterprise value in $B?", answer: 25, tol: 0.001, unit: "$B", why: "<p>Market cap 40 × 0.5B = $20B, + 8 − 3 = <b>$25B</b>.</p>" }) },
    ],
    job: "<p>EV is the starting point of every deal: a PE firm offers an EV (\"$2B, cash-free debt-free\"), then the equity cheque is EV minus the debt it raises. Bankers' comps tables show EV/EBITDA for every peer. In interviews: \"Why do we add debt and subtract cash?\" Because an acquirer must repay the debt and gets to keep the cash.</p>",
    terms: [["Enterprise value (EV)", "Equity value + debt − cash (+ preferred + minority interest)."], ["Equity value (market cap)", "Share price × diluted shares outstanding."], ["Net debt", "Debt minus cash."], ["Cash-free, debt-free", "Deal convention: the price is for the business; debt is repaid and cash is kept by the seller."], ["Diluted shares", "Shares including options and convertibles that would turn into shares."], ["Minority interest", "The part of a subsidiary owned by others; added to EV because EBITDA includes 100% of it."]],
    quiz: [
      ["Which multiple is consistent?", ["EV / net income", "Equity value / EBITDA", "EV / EBITDA"], 2, "EV pairs with pre-interest metrics like EBITDA."],
      ["Why subtract cash when computing EV?", ["Cash is a liability", "The buyer gets the cash, so it reduces the effective price", "Cash is taxed"], 1, "Cash on the balance sheet effectively refunds part of the price."],
      ["A company issues $500M of new shares and holds the cash. EV…", ["Rises $500M", "Is unchanged", "Falls"], 1, "Equity +500, cash +500: EV unchanged."],
    ],
    recap: [["House + mortgage", "EV is the whole house; equity is your slice."], ["+ debt − cash", "The bridge from market cap to EV."], ["Match", "EV with EBITDA; equity value with net income."]],
    see: ["multiples", "dcf", "balance-sheet", "lbo"],
  },

  multiples: {
    principle: "A multiple prices a company <em>by comparison</em>: if similar businesses sell for 10× earnings, this one probably should too, give or take.",
    hook: "<p>How do estate agents value your flat? They look at what similar flats nearby sold for, per square metre. Bankers do the same with companies: price ÷ earnings, EV ÷ EBITDA, compared with peers. It's fast, market-based, and the most common way companies are valued in practice.</p>",
    parts: [
      { h: "The football field", sim: footballSim },
      { h: "What drives a multiple?", html: "<p>A multiple is a DCF in disguise. From the growing perpetuity: P/E ≈ payout ÷ (r − g). So multiples are higher when:</p><ul><li><b>Growth</b> is higher (Nvidia vs a utility).</li><li><b>Risk</b> is lower (stable consumer brands).</li><li><b>Returns on capital</b> are higher (less reinvestment needed per unit of growth).</li></ul>",
        sim: () => table(["Company type", "Typical EV/EBITDA", "Why"], [["Fast-growing software", "20-40×+", "High growth, high margins, little capital needed"], ["Consumer brands", "12-20×", "Stable, pricing power"], ["Industrials", "8-12×", "Cyclical, capital-heavy"], ["Oil & gas, mining", "4-7×", "Commodity prices, depleting assets"], ["Struggling retailer", "3-5×", "Shrinking, risky"]]),
        after: "<p>Approximate ranges that move a lot with interest rates and sentiment.</p>" },
      { h: "Trading comps vs precedents", sim: () => flips([["Trading comps", "Multiples of similar listed companies today. Minority stake value."], ["Precedent transactions", "Multiples paid in past acquisitions. Include a <b>control premium</b> (often 20-40%)."], ["P/E", "Price ÷ earnings per share. Equity view; distorted by debt and one-offs."], ["EV/EBITDA", "The bankers' favourite: capital-structure neutral."], ["PEG", "P/E ÷ growth rate. A P/E of 30 with 30% growth = PEG 1."], ["EV/Revenue", "For companies with no profits yet: startups, high-growth tech."]]),
        after: "" },
      { h: "Practise", sim: () => calc({ q: "Peers trade at 9× EV/EBITDA. Your target has EBITDA of $200M and net debt of $600M. Implied equity value in $M?", answer: 1200, tol: 0.001, unit: "$M", why: "<p>EV = 9 × 200 = $1,800M. Equity = 1,800 − 600 = <b>$1,200M</b>.</p>" }) },
    ],
    job: "<p>Analysts in banking spend countless hours building <b>comps</b>: picking the peer set (the most argued-over step), calendarising fiscal years, stripping one-offs. Every pitch book has a football field. PE firms think \"buy at 10×, sell at 12×\": <b>multiple expansion</b> is one of the three ways they make money. Equity investors argue about whether a stock \"deserves\" its multiple.</p>",
    terms: [["Multiple", "A value measure divided by a financial metric (EV/EBITDA, P/E)."], ["Trading comps", "Valuation from the multiples of similar listed companies."], ["Precedent transactions", "Valuation from multiples paid in past deals."], ["Control premium", "Extra paid to acquire control of a company."], ["Football field", "Chart comparing valuation ranges from different methods."], ["Multiple expansion", "Selling at a higher multiple than you bought at."], ["LTM / NTM", "Last twelve months / next twelve months: the period a multiple uses."]],
    quiz: [
      ["Why do precedent transactions usually give higher values than trading comps?", ["They're older", "They include a control premium", "They use revenue"], 1, "Acquirers pay extra to control the company."],
      ["All else equal, which has the highest P/E?", ["Slow growth, high risk", "Fast growth, low risk", "Fast growth, high risk"], 1, "Growth raises and risk lowers multiples."],
      ["What's usually the hardest judgement in a comps analysis?", ["The arithmetic", "Choosing truly comparable peers", "Finding share prices"], 1, "Garbage peers in, garbage value out."],
    ],
    recap: [["Like for like", "Price by comparison with similar firms."], ["g, r, ROIC", "Growth, risk and returns drive multiples."], ["Football field", "Overlay every method; find the overlap."]],
    see: ["ev", "dcf", "lbo", "efficient"],
  },

  wacc: {
    principle: "WACC is <em>the blended return a company's lenders and shareholders demand</em>. It's the hurdle every project must clear.",
    hook: "<p>A company raises money from two groups: lenders (who want interest) and shareholders (who want returns). Neither works for free. The weighted average cost of capital (WACC) blends what each demands, and it's the discount rate for valuing the whole company.</p>",
    parts: [
      { h: "Build it", sim: waccSim },
      { h: "The pieces", sim: () => formula([["WACC", "Weighted average cost of capital"], ["=", null], ["E/V × Ke", "Equity weight × cost of equity (from CAPM: Rf + β × ERP)"], ["+", null], ["D/V × Kd × (1 − t)", "Debt weight × pre-tax cost of debt × tax shield"]], "Weights use <i>market</i> values, not book values. Tax reduces the cost of debt because interest is deductible."),
        after: "<p>The cost of equity isn't written anywhere: shareholders don't send invoices. So we estimate it with the <b>CAPM</b> (stocks world): risk-free rate + beta × equity risk premium. Small-company and country-risk premiums are often added on top, and every banker has an opinion about each input.</p>" },
      { h: "Practise", sim: () => calc({ q: "Cost of equity 10%, pre-tax cost of debt 6%, tax 25%, debt is 40% of capital. WACC?", answer: 7.8, tol: 0.01, unit: "%", why: "<p>0.6 × 10% + 0.4 × 6% × 0.75 = 6% + 1.8% = <b>7.8%</b>.</p>" }) },
    ],
    job: "<p>WACC is the discount rate in DCFs, the hurdle rate for capital projects and the benchmark in ROIC vs WACC analysis. Fairness opinions in M&A include WACC ranges. Because valuation is so sensitive to it, a whole industry (Damodaran's data, Kroll's cost of capital reports) supplies the inputs.</p>",
    terms: [["WACC", "Weighted average of the costs of equity and after-tax debt."], ["Cost of equity", "Return shareholders require; usually from CAPM."], ["Cost of debt", "Interest rate the company pays on new borrowing."], ["Beta", "Sensitivity of a stock to the overall market."], ["Equity risk premium", "Extra return stocks are expected to earn over risk-free bonds."], ["Levered vs unlevered beta", "Beta with or without the effect of the company's debt."]],
    quiz: [
      ["Why is the cost of debt multiplied by (1 − tax rate)?", ["Debt is risky", "Interest is tax-deductible", "Lenders pay tax"], 1, "The tax saving reduces the effective cost of debt."],
      ["Adding a little debt to an all-equity firm usually makes WACC…", ["Rise", "Fall", "Unchanged"], 1, "Cheaper, tax-deductible debt replaces expensive equity, up to a point."],
      ["WACC weights should use…", ["Book values", "Market values", "Last year's values"], 1, "Investors' required returns relate to what their claims are worth now."],
    ],
    recap: [["Blend", "Weights × costs of equity and after-tax debt."], ["CAPM", "Cost of equity = Rf + β × ERP."], ["Hurdle", "Projects must beat WACC to create value."]],
    see: ["capm", "dcf", "capital-structure", "npv"],
  },

  dcf: {
    principle: "A company is worth <em>all the cash it will ever generate, discounted back to today</em>.",
    hook: "<p>Warren Buffett: \"Intrinsic value is the discounted value of the cash that can be taken out of a business during its remaining life.\" A discounted cash flow model (DCF) is that sentence turned into a spreadsheet. It's the most theoretically sound valuation method, and the easiest to fool yourself with.</p>",
    parts: [
      { h: "Build one", sim: dcfSim },
      { h: "The steps", sim: () => stepper([
        { t: "1. Forecast revenue", html: "<p>Usually 5-10 years. Growth from market size, share, pricing.</p>" },
        { t: "2. Margins → EBIT → NOPAT", html: "<p>Operating profit after tax (NOPAT = EBIT × (1 − t)), ignoring financing.</p>" },
        { t: "3. Unlevered free cash flow", html: "<p>NOPAT + D&A − capex − increase in working capital. Cash available to <i>all</i> investors.</p>" },
        { t: "4. Discount at WACC", html: "<p>Each year's FCF ÷ (1 + WACC)ᵗ.</p>" },
        { t: "5. Terminal value", html: "<p>Value of everything after the forecast: either a growing perpetuity, FCF × (1 + g) ÷ (WACC − g), or an exit multiple × final-year EBITDA. Typically 60-80% of the total.</p>" },
        { t: "6. EV → equity → per share", html: "<p>Sum of PVs = enterprise value. Subtract net debt for equity value; divide by diluted shares.</p>" },
      ]) },
      { h: "Garbage in, gospel out", html: "<p>Small input changes swing the answer a lot (look at the sensitivity table). Common traps:</p><ul><li>Terminal growth above long-run GDP growth: no company outgrows the economy forever.</li><li>Hockey-stick forecasts: \"flat for years, then 30% growth from next year.\"</li><li>Forgetting reinvestment: growth requires capital.</li><li>Mixing nominal cash flows with a real discount rate.</li></ul>",
        sim: () => predict({ q: "WACC 9%, terminal growth 3%, final-year FCF $100M. Terminal value at year 5 is about…", options: ["$1.1B", "$1.7B", "$3.3B"], answer: 1, why: "<p>100 × 1.03 ÷ (0.09 − 0.03) = <b>$1.72B</b>, then discount it 5 years at 9% → ~$1.12B today. Raise g to 4% and TV jumps to $2.08B: that's the sensitivity problem.</p>" }) },
    ],
    job: "<p>DCFs appear in nearly every pitch book, fairness opinion, impairment test and equity research report. In practice bankers triangulate with comps and precedents (the football field). PE firms rely more on LBO models. The real skill isn't the arithmetic, it's defending each assumption, which is what interviewers probe.</p>",
    terms: [["DCF", "Valuing a business as the present value of its future free cash flows."], ["Unlevered free cash flow", "Cash flow to all investors: NOPAT + D&A − capex − ΔNWC."], ["NOPAT", "Net operating profit after tax: EBIT × (1 − t)."], ["Terminal value", "Value of all cash flows beyond the forecast period."], ["Gordon growth model", "TV = FCF × (1 + g) ÷ (r − g)."], ["Exit multiple method", "TV = final-year EBITDA × an assumed multiple."], ["Sensitivity table", "Grid of values across ranges of key inputs."]],
    quiz: [
      ["Which cash flow do you discount at WACC?", ["Levered FCF to equity", "Unlevered FCF to all investors", "Net income"], 1, "WACC is the cost of all capital, so it matches cash to all investors."],
      ["Terminal growth of 8% forever for a mature company is…", ["Reasonable", "Unrealistic: it would outgrow the economy", "Conservative"], 1, "Long-run nominal GDP growth is roughly 3-5%; most use 2-3%."],
      ["If terminal value is 90% of your DCF value, you should…", ["Be pleased", "Be cautious: the answer rests on far-future assumptions", "Ignore it"], 1, "Most of the value then hinges on guesses about the distant future."],
    ],
    recap: [["Cash, discounted", "Value = PV of all future free cash."], ["TV dominates", "Usually 60-80% of the answer."], ["Sensitive", "Always show a WACC × g table."]],
    see: ["pv", "wacc", "multiples", "growth"],
  },

  "capital-structure": {
    principle: "Debt is cheap and tax-friendly, but it <em>magnifies outcomes and can kill you in a downturn</em>. The right mix balances the two.",
    hook: "<p>Should a company fund itself with debt or with shareholders' money? In 1958 Modigliani and Miller proved that in a perfect world it doesn't matter. The real world isn't perfect: taxes reward debt, bankruptcy punishes it, and managers behave differently with debt hanging over them.</p>",
    parts: [
      { h: "Leverage magnifies", sim: leverageSim },
      { h: "The trade-off", sim: mmSim },
      { h: "Other theories", sim: () => flips([["Pecking order", "Firms prefer internal cash, then debt, then new equity, because issuing shares signals the stock is overvalued."], ["Debt as discipline", "Debt payments stop managers wasting cash on empire-building (Jensen). A big reason for LBOs."], ["Market timing", "Firms issue shares when prices are high, borrow when rates are low."], ["Agency costs of debt", "Shareholders of a near-bankrupt firm gamble with lenders' money."]]) },
    ],
    job: "<p>CFOs and corporate treasurers set capital structure; rating agencies judge it; DCM bankers sell the bonds. PE firms push leverage to the limit lenders allow (often 5-7× EBITDA). Restructuring bankers and lawyers deal with the failures: a whole career in fixing companies that borrowed too much.</p>",
    terms: [["Capital structure", "The mix of debt and equity funding a company."], ["Leverage", "Using debt to fund assets; magnifies returns and losses."], ["Modigliani-Miller theorem", "In perfect markets, capital structure doesn't affect firm value."], ["Interest tax shield", "Tax saved because interest is deductible."], ["Financial distress costs", "Costs of being near bankruptcy: lost customers, legal fees, fire sales."], ["Pecking order theory", "Preference for internal funds, then debt, then equity."]],
    quiz: [
      ["Under MM with no taxes, adding debt…", ["Raises firm value", "Doesn't change firm value", "Lowers firm value"], 1, "The pie's size is unchanged; only the slices change."],
      ["Which company can sensibly carry the most debt?", ["A biotech with one drug in trials", "A regulated water utility", "A startup"], 1, "Stable, predictable cash flows support debt."],
      ["Leverage makes ROE…", ["More stable", "More extreme in both directions", "Always higher"], 1, "Good years better, bad years worse."],
    ],
    recap: [["MM", "In theory, financing doesn't matter."], ["Tax vs distress", "Reality: a trade-off with an optimum."], ["Stable cash", "Supports more debt."]],
    see: ["wacc", "lbo", "leverage-loop", "ratios"],
  },

  payouts: {
    principle: "When a company has more cash than good projects, <em>it should give it back</em>, through dividends or buybacks, which are equivalent in a frictionless world.",
    hook: "<p>Apple has spent over $600 billion buying back its own shares. Utilities pay steady dividends that retirees live on. Amazon paid nothing for decades and reinvested everything. Which is right? It depends on whether the company can earn more than its cost of capital with the cash.</p>",
    parts: [
      { h: "Same value, different wrappers", sim: payoutSim },
      { h: "Why choose one or the other?", sim: () => table(["", "Dividends", "Buybacks"], [["Signal", "Commitment: cutting one is seen as a disaster", "Flexible: can stop quietly"], ["Taxes", "Taxed when paid (in many countries)", "Taxed only when you sell (deferral)"], ["Who benefits", "All shareholders, as cash", "Remaining shareholders, via a bigger slice"], ["Risk", "Low", "Destroys value if shares are bought when overpriced"], ["EPS", "Unchanged", "Rises mechanically (fewer shares): can flatter pay targets"]]) },
      { h: "Valuing a dividend stream", html: "<p>The <b>dividend discount model</b> (Gordon growth): Price = next year's dividend ÷ (required return − growth). It's the growing perpetuity again.</p>",
        sim: () => calc({ q: "A utility will pay a $3 dividend next year, growing 2% a year forever. Investors require 7%. Fair price?", answer: 60, tol: 0.001, unit: "$", why: "<p>3 ÷ (0.07 − 0.02) = <b>$60</b>. The dividend yield is 5% (= r − g).</p>" }) },
    ],
    job: "<p>Boards decide payout policy with advice from bankers; investors watch <b>payout ratio</b> and <b>dividend cover</b>. Buyback critics argue they boost short-term EPS-linked bonuses (incentives again). In PE, <b>dividend recapitalisations</b> borrow money to pay the fund a dividend early: a way to lock in returns and boost IRR.</p>",
    terms: [["Dividend", "Cash paid to shareholders from profits."], ["Share buyback (repurchase)", "Company buys back its own shares, shrinking the share count."], ["Payout ratio", "Dividends ÷ net income."], ["Dividend yield", "Annual dividend ÷ share price."], ["Dividend discount model", "Price = D₁ ÷ (r − g)."], ["Dividend recap", "Borrowing to pay owners a special dividend, common in PE."]],
    quiz: [
      ["Ignoring taxes and signals, a $10 dividend or a $10-per-share-equivalent buyback leaves shareholders…", ["Better off with the dividend", "Equally well off", "Better off with the buyback"], 1, "Total wealth is the same; it's just held differently."],
      ["Buybacks raise EPS because…", ["Profits rise", "The same profit is split across fewer shares", "Taxes fall"], 1, "Mechanical: fewer shares outstanding."],
      ["When should a company keep the cash instead?", ["When it can invest at returns above its cost of capital", "Always", "Never"], 0, "Reinvest if ROIC > WACC; otherwise give it back."],
    ],
    recap: [["Equivalent", "Dividends and buybacks: same value, different wrappers."], ["D ÷ (r − g)", "The dividend discount model."], ["ROIC test", "Keep cash only if it earns above its cost."]],
    see: ["dcf", "shares", "capital-structure", "pe-returns"],
  },

  mna: {
    principle: "An acquisition creates value only if <em>synergies are worth more than the premium paid</em>. Most acquirers overpay.",
    hook: "<p>Companies spend trillions a year buying each other. Studies consistently find that most acquisitions fail to create value for the buyer's shareholders: the seller's shareholders capture the premium, and promised synergies arrive late or never. Yet some deals (Disney-Pixar, Google-YouTube, Facebook-Instagram) were bargains in hindsight.</p>",
    parts: [
      { h: "Accretion and dilution", sim: adSim },
      { h: "Why companies buy companies", sim: () => flips([["Cost synergies", "Close duplicate offices, combine purchasing, cut overlapping staff. More predictable."], ["Revenue synergies", "Cross-sell products, new markets. Often promised, rarely delivered."], ["Buy vs build", "Faster to buy capabilities, talent or technology than to build them."], ["Market power", "Fewer competitors: the reason antitrust regulators look closely."], ["Empire building", "Bigger firm, bigger pay. The principal-agent problem again."], ["Hubris", "CEOs overconfident they'll run the target better (Roll's hubris hypothesis, 1986)."]]) },
      { h: "Who wins?", html: "<p>On announcement, target shares typically jump 20-40% (the premium). Acquirer shares are flat or fall on average. The <em>winner's curse</em>: in a competitive auction, the bidder who wins is often the one who overestimated the value the most.</p>",
        sim: () => calc({ q: "You pay $1.5B for a company whose standalone value is $1.1B. Synergies have a present value of $300M. Value created for your shareholders, in $M?", answer: -100, tol: 0.001, unit: "$M", why: "<p>Value gained = standalone + synergies − price = 1,100 + 300 − 1,500 = <b>−$100M</b>. The deal may still be EPS-accretive, which is why accretion is a poor test of a good deal.</p>" }) },
    ],
    job: "<p>M&A bankers advise on strategy, valuation, negotiation and run sale processes. Corporate development teams source deals. Consultants run <b>commercial due diligence</b> and <b>post-merger integration (PMI)</b>, which is where most value is won or lost. Lawyers handle the purchase agreement; regulators review antitrust. Every analyst runs accretion/dilution analyses.</p>",
    terms: [["Acquisition premium", "Price paid above the target's undisturbed market value."], ["Synergies", "Extra value from combining: cost savings or revenue gains."], ["Accretion / dilution", "Whether the deal raises or lowers the acquirer's EPS."], ["Pro forma", "Financials as if the deal had already happened."], ["Winner's curse", "The winning bidder tends to have overestimated value."], ["Post-merger integration", "Combining two companies' operations after a deal."], ["Fairness opinion", "A bank's opinion that a deal price is fair to shareholders."]],
    quiz: [
      ["An all-stock deal is usually EPS-accretive when…", ["The acquirer's P/E exceeds the P/E paid for the target", "The target is bigger", "Interest rates are high"], 0, "Expensive acquirer stock buys cheaper earnings."],
      ["Which synergies are more reliable?", ["Revenue synergies", "Cost synergies", "Both equally"], 1, "Cutting duplicate costs is more in management's control than making customers buy more."],
      ["A deal is accretive. Does it create value?", ["Always", "Not necessarily: it depends on synergies vs premium", "Never"], 1, "EPS accretion is accounting arithmetic, not value creation."],
    ],
    recap: [["Synergy > premium", "The only test that matters."], ["P/E rule", "High-P/E buyers make stock deals look accretive."], ["Winner's curse", "Winning an auction often means overpaying."]],
    see: ["multiples", "ib", "incentives", "herding"],
  },
};

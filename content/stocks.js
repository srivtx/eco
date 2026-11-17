// World 8: Stock markets.
import { h, money, num, pct, clamp, rng } from "../lib/core.js";
import { slider, seg, stats, stage, predict, calc, callout, table, bars, button, flips, stepper, formula } from "../lib/ui.js";
import { plot, columns, donut } from "../lib/chart.js";

const W = "var(--wc)";

/* ---------------- shares & dilution ---------------- */
function sliceSim() {
  let mine = 100, total = 1000, issue = 0, profit = 50000, pe = 15;
  const box = h("div"), st = stats([{ label: "You own" }, { label: "Earnings per share" }, { label: "Share price (EPS × P/E)" }, { label: "Your stake is worth" }]);
  const draw = () => {
    const sh = total + issue, own = mine / sh, eps = profit / sh, px = eps * pe;
    box.replaceChildren(donut([{ name: "You", v: own, color: "#ffc21a" }, { name: "Other shareholders", v: 1 - own - issue / sh, color: W }, { name: "New shares just issued", v: issue / sh, color: "#ec4899" }], { center: pct(own), sub: "you own" }));
    st.set(0, pct(own)); st.set(1, `$${num(eps, 2)}`); st.set(2, `$${num(px, 2)}`); st.set(3, money(px * mine), "accent");
  };
  const c = [slider({ label: "Shares you own", min: 10, max: 500, step: 10, value: mine, onInput: (x) => { mine = x; draw(); } }), slider({ label: "New shares issued (to raise money)", min: 0, max: 1000, step: 50, value: issue, onInput: (x) => { issue = x; draw(); } }), slider({ label: "Company profit this year", min: 0, max: 200000, step: 5000, value: profit, fmt: money, onInput: (x) => { profit = x; draw(); } }), slider({ label: "P/E the market pays", min: 5, max: 40, value: pe, fmt: (x) => `${x}×`, onInput: (x) => { pe = x; draw(); } })];
  draw();
  return stage({ title: "Own a slice of a pizza company", controls: c, body: [box, st.el], note: "Issue new shares and your slice shrinks: <b>dilution</b>. It's fine if the new money earns enough to grow profit more than the share count, and bad otherwise." });
}

/* ---------------- IPO book-building ---------------- */
function ipoSim() {
  let price = 20;
  const orders = [[30, 2], [28, 3], [26, 4], [24, 6], [22, 8], [20, 10], [18, 12], [16, 14], [14, 16]]; // [max price, millions of shares wanted at or below]
  const offer = 10;
  const p = plot({ height: 260, x: [0, 18], y: [10, 32], xLabel: "shares wanted (millions)", yLabel: "price", xFmt: (x) => `${num(x)}M`, yFmt: (x) => `$${num(x)}`, label: "IPO order book" });
  const st = stats([{ label: "Demand at this price" }, { label: "Oversubscribed" }, { label: "Raised" }, { label: "Likely day-one pop" }]);
  const draw = () => {
    const demand = (P) => { let q = 0; for (const [mp, sh] of orders) if (mp >= P) q = sh; return q; };
    const pts = []; for (let P = 31; P >= 13; P -= 0.25) pts.push([demand(P), P]);
    const d = demand(price), clear = orders.filter(([, sh]) => sh <= offer).reduce((m, [mp]) => Math.min(m, mp), 99);
    const pop = Math.max(0, (clear * 1.15) / price - 1);
    p.draw({ series: [{ name: "Investor demand", color: W, pts: pts.sort((a, b) => a[0] - b[0]) }, { name: "Shares on offer", color: "var(--ink)", pts: [[offer, 10], [offer, 32]], dash: "6 5" }], dots: [{ x: Math.min(d, 18), y: price, color: "#ffc21a", r: 8, label: `price $${price}` }] });
    st.set(0, `${d}M shares`); st.set(1, `${num(d / offer, 1)}×`, d >= offer ? "good" : "bad"); st.set(2, money(Math.min(d, offer) * 1e6 * price)); st.set(3, d < offer ? "flop risk" : pct(pop, 0), d < offer ? "bad" : pop > 0.3 ? "warn" : "good");
  };
  const a = slider({ label: "IPO price per share", min: 12, max: 30, step: 1, value: price, fmt: (x) => `$${x}`, onInput: (x) => { price = x; draw(); } });
  draw();
  return stage({ title: "Book-building: price the IPO", controls: [a], body: [p.el, st.el], note: "Bankers collect orders (\"10M shares at up to $22\") to build a demand curve, then set the price. Price low and the stock pops on day one: great headlines, but the company <b>left money on the table</b>. Price high and it may fall below the offer price. Banks usually aim for a 10-20% pop." });
}

/* ---------------- order book ---------------- */
function orderBook() {
  const r = rng(5);
  let bids, asks, last, trades, mm = true, hist;
  const reset = () => {
    bids = [[99.9, 300], [99.8, 500], [99.7, 800], [99.5, 1200], [99.2, 2000]];
    asks = [[100.1, 300], [100.2, 600], [100.3, 900], [100.5, 1500], [100.8, 2200]];
    last = 100; trades = []; hist = [[0, 100]]; render();
  };
  const book = h("div.ob"), log = h("div.game-log"), st = stats([{ label: "Last trade" }, { label: "Best bid" }, { label: "Best ask" }, { label: "Spread" }]);
  const p = plot({ height: 300, x: [0, 30], y: [97, 103], xLabel: "trade #", yLabel: "price", xFmt: (x) => Math.round(x), yFmt: (x) => `$${num(x, 1)}`, label: "Trade prices" });
  const render = () => {
    const mx = Math.max(1, ...bids.map((b) => b[1]), ...asks.map((a) => a[1]));
    const row = (side, [px, q]) => h(`div.ob-r.${side}`, h("span.ob-q", num(q)), h("span.ob-p", `$${px.toFixed(2)}`), h("i", { style: { width: `${(q / mx) * 100}%` } }));
    const bb = bids[0]?.[0], ba = asks[0]?.[0], f = (x) => (x == null ? "none" : `$${x.toFixed(2)}`), spr = bb != null && ba != null ? ba - bb : null;
    book.replaceChildren(h("div.ob-h", h("span", "Size"), h("span", "Price")), ...[...asks].reverse().map((a) => row("ask", a)), h("div.ob-mid", spr == null ? "one side of the book is empty!" : `spread $${spr.toFixed(2)}`), ...bids.map((b) => row("bid", b)));
    st.set(0, `$${last.toFixed(2)}`); st.set(1, f(bb)); st.set(2, f(ba)); st.set(3, spr == null ? "∞" : `$${spr.toFixed(2)}`, spr == null || spr > 0.5 ? "bad" : "good");
    const n = hist.length; p.draw({ x: [0, Math.max(30, n)], y: [Math.min(97, ...hist.map((x) => x[1])) - 0.5, Math.max(103, ...hist.map((x) => x[1])) + 0.5], series: [{ name: "Price", color: W, pts: hist }] });
  };
  const market = (side, qty) => {
    const book2 = side === "buy" ? asks : bids; let left = qty, cost = 0;
    while (left > 0 && book2.length) { const lvl = book2[0], q = Math.min(left, lvl[1]); cost += q * lvl[0]; left -= q; lvl[1] -= q; last = lvl[0]; if (lvl[1] <= 0) book2.shift(); }
    const filled = qty - left;
    hist.push([hist.length, last]);
    log.prepend(h("div", `Market ${side} ${num(qty)}: filled ${num(filled)} at avg $${(cost / Math.max(1, filled)).toFixed(2)}${left ? ` · ${num(left)} unfilled: book empty!` : ""}`));
    if (mm) refill();
    render();
  };
  const limit = (side) => {
    if (!bids.length || !asks.length) { log.prepend(h("div", "One side is empty: press Reset.")); return; }
    const px = side === "buy" ? +(bids[0][0] + 0.05).toFixed(2) : +(asks[0][0] - 0.05).toFixed(2);
    if (px <= bids[0][0] || px >= asks[0][0]) { log.prepend(h("div", "Spread too tight to improve.")); return; }
    (side === "buy" ? bids : asks).unshift([px, 200]);
    log.prepend(h("div", `Limit ${side} 200 @ $${px.toFixed(2)}: you're now the best ${side === "buy" ? "bid" : "ask"} and the spread narrows.`));
    render();
  };
  const refill = () => {
    // a market maker re-quotes around the last price, keeping the book deep
    while (asks.length < 5) asks.push([+((asks.at(-1)?.[0] ?? last) + 0.1 + r() * 0.2).toFixed(2), 300 + Math.round(r() * 1500)]);
    while (bids.length < 5) bids.push([+((bids.at(-1)?.[0] ?? last) - 0.1 - r() * 0.2).toFixed(2), 300 + Math.round(r() * 1500)]);
    if (!asks.length || !bids.length) return;
  };
  const tg = seg({ label: "Market makers", options: [{ value: true, label: "On" }, { value: false, label: "Off (thin market)" }], value: true, onChange: (x) => { mm = x; } });
  reset();
  return stage({ title: "Trade against a real order book", controls: [tg, h("div.game-btns", button("Market buy 500", () => market("buy", 500), "primary"), button("Market sell 500", () => market("sell", 500)), button("Market buy 5,000", () => market("buy", 5000)), button("Limit buy (improve bid)", () => limit("buy")), button("Reset", reset))], body: [h("div.split", book, h("div", st.el, p.el)), log], note: "A <b>market order</b> takes the best prices available now, walking up the book if it's big. A <b>limit order</b> waits at your price. Big orders in thin markets move the price against you: <b>slippage</b> and <b>market impact</b>. Turn market makers off and buy 5,000 to see a thin market break." });
}

/* ---------------- index weighting ---------------- */
function indexSim() {
  const base = [["MegaTech", 400, 15], ["BigBank", 60, 20], ["OilCo", 90, 8], ["ShopCo", 30, 25], ["TinyBio", 5, 4]]; // price, shares (B)
  let move = 20, who = 0;
  const box = h("div"), st = stats([{ label: "Price-weighted (Dow style)" }, { label: "Cap-weighted (S&P style)" }, { label: "Equal-weighted" }]);
  const draw = () => {
    const now = base.map(([n, p, s], i) => [n, i === who ? p * (1 + move / 100) : p, s]);
    const pw = now.reduce((a, x) => a + x[1], 0) / base.reduce((a, x) => a + x[1], 0) - 1;
    const cw = now.reduce((a, x) => a + x[1] * x[2], 0) / base.reduce((a, x) => a + x[1] * x[2], 0) - 1;
    const ew = now.reduce((a, x, i) => a + x[1] / base[i][1], 0) / base.length - 1;
    const caps = base.map(([n, p, s]) => ({ name: n, v: p * s }));
    const cols = ["#22c55e", "#3b82f6", "#f5c518", "#ec4899", "#8b5cf6"];
    box.replaceChildren(donut(caps.map((c, i) => ({ ...c, color: cols[i] })), { center: "weights", sub: "by market cap" }));
    st.set(0, `${pw >= 0 ? "+" : ""}${pct(pw, 2)}`); st.set(1, `${cw >= 0 ? "+" : ""}${pct(cw, 2)}`); st.set(2, `${ew >= 0 ? "+" : ""}${pct(ew, 2)}`);
  };
  const a = seg({ label: "Which stock moves?", options: base.map(([n], i) => ({ value: i, label: n })), value: who, onChange: (x) => { who = x; draw(); } });
  const b = slider({ label: "Its price change", min: -50, max: 50, value: move, fmt: (x) => `${x}%`, onInput: (x) => { move = x; draw(); } });
  draw();
  return stage({ title: "Three ways to build an index", controls: [a, b], body: [box, st.el], note: "Move MegaTech: the cap-weighted index jumps, because MegaTech is most of it. Move TinyBio: the equal-weighted index notices, the others barely. Today the top 10 US companies are over a third of the S&P 500: buying \"the market\" is a big bet on a few firms." });
}

/* ---------------- coin-flip managers ---------------- */
function coinSim() {
  let n = 1000, yrs = 10;
  const box = h("div"), st = stats([{ label: "Managers" }, { label: "Beat the market every year" }, { label: "Expected by pure luck" }]);
  const run = () => {
    const r = rng(Date.now() % 1e6); const surv = [n];
    let alive = n; for (let y = 1; y <= yrs; y++) { let s = 0; for (let i = 0; i < alive; i++) if (r() < 0.5) s++; alive = s; surv.push(alive); }
    box.replaceChildren(columns(surv.map((v, i) => ({ label: i ? `Y${i}` : "Start", value: v, color: i === yrs ? "#ffc21a" : W })), { height: 200, fmt: (x) => num(x) }));
    st.set(0, num(n)); st.set(1, num(alive), "accent"); st.set(2, num(n / Math.pow(2, yrs), 1));
  };
  const a = slider({ label: "Fund managers (all flipping coins)", min: 100, max: 10000, step: 100, value: n, onInput: (x) => { n = x; run(); } });
  const b = slider({ label: "Years", min: 1, max: 15, value: yrs, onInput: (x) => { yrs = x; run(); } });
  run();
  return stage({ title: "1,000 managers flip coins", controls: [a, b, button("Run again", run, "primary")], body: [box, st.el], note: "Each year, each manager has a 50% chance to beat the market by luck alone. After 10 years about 1 in 1,000 has beaten it every single year, and will be on magazine covers as a genius. Survivorship bias makes skill hard to tell from luck." });
}
function activeSim() {
  let fee = 1, yrs = 20;
  const p = plot({ height: 240, x: [0, 30], y: [0, 1], xLabel: "years", yLabel: "share of active funds beating the index", xFmt: (x) => Math.round(x), yFmt: (x) => pct(x, 0), label: "Active vs passive" });
  const draw = () => {
    const pts = []; for (let t = 1; t <= 30; t++) { const z = (-fee / 100 * Math.sqrt(t)) / 0.06; pts.push([t, 0.5 * (1 + erf(z / Math.SQRT2))]); }
    p.draw({ y: [0, 0.6], series: [{ name: "Beating the index", color: W, pts, area: true }], vlines: [{ x: yrs }], dots: [{ x: yrs, y: pts[yrs - 1][1], color: "#ffc21a", r: 7, label: pct(pts[yrs - 1][1], 0) }] });
  };
  const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
  const a = slider({ label: "Active fund fee above an index fund", min: 0, max: 2, step: 0.1, value: fee, fmt: (x) => `${x.toFixed(1)}%`, onInput: (x) => { fee = x; draw(); } });
  const b = slider({ label: "Years", min: 1, max: 30, value: yrs, onInput: (x) => { yrs = x; draw(); } });
  draw();
  return stage({ title: "Why most active funds lose to the index", controls: [a, b], body: [p.el], note: "A toy model: managers have no skill on average and pay higher fees, with 6% yearly noise around the index. The real data (S&P's SPIVA reports) is similar: over 15-20 years, around 90% of US large-cap active funds trail their benchmark." });
}

/* ---------------- CAPM / SML ---------------- */
function smlSim() {
  let rf = 4, erp = 5.5, beta = 1.3;
  const stocks = [["Utility", 0.5, 7.5], ["Supermarket", 0.7, 6.8], ["Bank", 1.2, 11.5], ["Chipmaker", 1.6, 14.5], ["Airline", 1.4, 9]];
  const p = plot({ height: 280, x: [0, 2], y: [0, 18], xLabel: "beta", yLabel: "expected return", xFmt: (x) => num(x, 1), yFmt: (x) => `${num(x)}%`, label: "Security market line" });
  const st = stats([{ label: "Required return (CAPM)" }]);
  const draw = () => {
    p.draw({ series: [{ name: "Security market line", color: W, pts: [[0, rf], [2, rf + 2 * erp]], width: 4 }], dots: [...stocks.map(([n, b, r]) => ({ x: b, y: r, r: 6, color: r > rf + b * erp ? "var(--good)" : "var(--bad)", label: `${n} (α ${r - rf - b * erp >= 0 ? "+" : ""}${num(r - rf - b * erp, 1)})` })), { x: beta, y: rf + beta * erp, color: "#ffc21a", r: 9, label: "your stock", dy: 20 }], hlines: [{ y: rf, label: "risk-free" }] });
    st.set(0, `${num(rf + beta * erp, 2)}%`, "accent");
  };
  const c = [slider({ label: "Risk-free rate", min: 0, max: 8, step: 0.25, value: rf, fmt: (x) => `${x}%`, onInput: (x) => { rf = x; draw(); } }), slider({ label: "Equity risk premium", min: 2, max: 9, step: 0.25, value: erp, fmt: (x) => `${x}%`, onInput: (x) => { erp = x; draw(); } }), slider({ label: "Your stock's beta", min: 0, max: 2, step: 0.05, value: beta, fmt: (x) => x.toFixed(2), onInput: (x) => { beta = x; draw(); } })];
  draw();
  return stage({ title: "CAPM: the price of market risk", controls: c, body: [p.el, st.el], note: "Stocks above the line (positive <b>alpha</b>) look cheap for their risk; below it, expensive. Expected returns here are made up for illustration." });
}
function betaSim() {
  let trueBeta = 1.4;
  const p = plot({ height: 260, x: [-8, 8], y: [-14, 14], xLabel: "market return (month)", yLabel: "stock return", xFmt: (x) => `${num(x)}%`, yFmt: (x) => `${num(x)}%`, hover: false, label: "Beta regression" });
  const st = stats([{ label: "Estimated beta (slope)" }, { label: "R² (how much is market-driven)" }]);
  const draw = () => {
    const r = rng(9), pts = [];
    for (let i = 0; i < 60; i++) { const m = r.gauss() * 4, s = trueBeta * m + r.gauss() * 4; pts.push([m, s]); }
    const mx = pts.reduce((a, x) => a + x[0], 0) / 60, my = pts.reduce((a, x) => a + x[1], 0) / 60;
    const cov = pts.reduce((a, x) => a + (x[0] - mx) * (x[1] - my), 0), vx = pts.reduce((a, x) => a + (x[0] - mx) ** 2, 0), vy = pts.reduce((a, x) => a + (x[1] - my) ** 2, 0);
    const b = cov / vx, r2 = (cov * cov) / (vx * vy);
    p.draw({ dots: pts.map(([x, y]) => ({ x, y, r: 4, color: W })), series: [{ name: "fit", color: "var(--ink)", pts: [[-8, my + b * (-8 - mx)], [8, my + b * (8 - mx)]], noHover: true }] });
    st.set(0, num(b, 2)); st.set(1, pct(r2, 0));
  };
  const a = slider({ label: "True beta", min: 0, max: 2.5, step: 0.1, value: trueBeta, onInput: (x) => { trueBeta = x; draw(); } });
  draw();
  return stage({ title: "Estimating beta from 5 years of monthly returns", controls: [a], body: [p.el, st.el], note: "Beta is the slope of the stock's returns against the market's. Everything off the line is company-specific noise, which diversification removes and CAPM says isn't rewarded." });
}

/* ---------------- short selling ---------------- */
function shortSim() {
  let px = 20;
  const p = plot({ height: 240, x: [0, 100], y: [-80, 30], xLabel: "share price later (you shorted at $20)", yLabel: "profit per share", xFmt: (x) => `$${num(x)}`, yFmt: (x) => `$${num(x)}`, label: "Short payoff" });
  const draw = () => {
    p.draw({ series: [{ name: "Short", color: "var(--bad)", pts: [[0, 20], [100, -80]], width: 4 }, { name: "Long (for comparison)", color: "var(--good)", pts: [[0, -20], [100, 80]], dash: "6 5" }], hlines: [{ y: 0 }], dots: [{ x: px, y: 20 - px, color: "#ffc21a", r: 8, label: `${20 - px >= 0 ? "+" : "−"}$${num(Math.abs(20 - px))}` }] });
  };
  const a = slider({ label: "Price when you close", min: 0, max: 100, value: px, fmt: (x) => `$${x}`, onInput: (x) => { px = x; draw(); } });
  draw();
  return stage({ title: "Borrow, sell, buy back later", controls: [a], body: [p.el], note: "The most a short can make is 100% (the price goes to zero). The most it can lose is unlimited. That asymmetry is why shorts get squeezed." });
}
function squeezeSim() {
  let si = 100, buyers = 30;
  const p = plot({ height: 240, x: [0, 20], y: [0, 400], xLabel: "day", yLabel: "share price", xFmt: (x) => Math.round(x), yFmt: (x) => `$${num(x)}`, label: "Short squeeze" });
  const st = stats([{ label: "Peak price" }, { label: "Short sellers forced out" }]);
  const draw = () => {
    let px = 20, shorts = si, pts = [[0, px]], forced = 0;
    for (let d = 1; d <= 20; d++) {
      const demand = buyers / 10 + (d < 6 ? 2 : 0);
      const pain = Math.max(0, px / 20 - 1.5) * 0.25 * shorts; // shorts losing > 50% must cover
      forced += pain; shorts -= pain;
      px *= 1 + 0.02 * demand + pain / 40 - (d > 12 ? 0.12 : 0);
      pts.push([d, px]);
    }
    p.draw({ y: [0, Math.max(100, ...pts.map((x) => x[1])) * 1.1], series: [{ name: "Price", color: W, pts, area: true }] });
    st.set(0, `$${num(Math.max(...pts.map((x) => x[1])))}`, "bad"); st.set(1, pct(forced / si, 0));
  };
  const a = slider({ label: "Short interest (% of free float)", min: 10, max: 140, step: 10, value: si, fmt: (x) => `${x}%`, onInput: (x) => { si = x; draw(); } });
  const b = slider({ label: "Retail buying frenzy", min: 0, max: 60, value: buyers, onInput: (x) => { buyers = x; draw(); } });
  draw();
  return stage({ title: "A squeeze", controls: [a, b], body: [p.el, st.el], note: "When a heavily shorted stock rises, short sellers lose money, face margin calls, and must <b>buy</b> to close, pushing the price up further. In January 2021 GameStop's short interest was over 100% of its float; the stock went from ~$20 to over $480 intraday in weeks." });
}

export default {
  shares: {
    principle: "A share is <em>a slice of ownership</em>: a claim on a company's future profits and a vote on how it's run.",
    hook: "<p>When you buy one Apple share, you own about one fifteen-billionth of Apple: its iPhones, its brand, its $100B+ yearly profit, and one vote at its annual meeting. The share price is the market's running guess at what that slice of all future profits is worth today.</p>",
    parts: [
      { h: "Own a slice", sim: sliceSim },
      { h: "Where your return comes from", html: "<p>Over the long run, stock returns come from three things:</p><ul><li><b>Dividends</b> paid out.</li><li><b>Earnings growth</b> (the company's profits rising).</li><li><b>Change in valuation</b> (the P/E rising or falling: the market's mood).</li></ul><p>In the short run the third dominates and looks random. In the long run the first two dominate.</p>",
        sim: () => calc({ q: "A stock pays a 2% dividend, earnings grow 6% a year, and the P/E stays the same. Expected annual return?", answer: 8, tol: 0.03, unit: "%", why: "<p>2% + 6% + 0% = <b>8%</b>. If the P/E fell from 20 to 16 over five years, that would subtract about 4.4% a year. This decomposition is how strategists build long-run return forecasts.</p>" }) },
      { h: "Kinds of shares", sim: () => flips([["Common stock", "Votes, dividends if declared, last in line in bankruptcy."], ["Preferred stock", "Fixed dividend, paid before common, usually no vote. Half bond, half stock."], ["Dual-class", "Founders keep super-voting shares (Meta, Alphabet) so outsiders can't outvote them."], ["Treasury stock", "Shares the company bought back and holds. No vote, no dividend."], ["Options & RSUs", "Rights to future shares given to employees. They dilute everyone else."], ["ADRs", "Certificates that let foreign shares trade on US exchanges."]]) },
    ],
    job: "<p>Equity research analysts (sell-side at banks, buy-side at funds) write models and recommendations on stocks. ECM bankers help companies issue shares. Corporate lawyers deal with share classes and voting. In startups and PE, the <b>cap table</b> (who owns what) is everything: you'll build one in the private markets world.</p>",
    terms: [["Share (stock, equity)", "A unit of ownership in a company."], ["Market capitalisation", "Share price × shares outstanding."], ["EPS", "Earnings per share: net income ÷ shares."], ["P/E ratio", "Share price ÷ EPS."], ["Dilution", "Existing owners' percentage shrinks when new shares are issued."], ["Preferred stock", "Shares with priority dividends and claims, usually without votes."], ["Dual-class shares", "Share classes with different voting rights."]],
    quiz: [
      ["A company doubles its share count with no change in profit. EPS…", ["Doubles", "Halves", "Unchanged"], 1, "Same profit across twice as many shares."],
      ["In bankruptcy, who is paid first?", ["Common shareholders", "Lenders, then preferred, then common", "Everyone equally"], 1, "Equity is the residual claim: last in line."],
      ["Over decades, stock returns mostly come from…", ["Changes in P/E", "Dividends and earnings growth", "Share buybacks only"], 1, "Valuation swings dominate short term but wash out over long periods."],
    ],
    recap: [["Claim", "A share = slice of future profits + a vote."], ["D + g + ΔPE", "Where returns come from."], ["Last in line", "Equity is the residual claim."]],
    see: ["ipo", "order-book", "payouts", "cap-table"],
  },

  ipo: {
    principle: "An IPO is when a private company <em>sells shares to the public for the first time</em>, trading control and secrecy for cash and a market price.",
    hook: "<p>Facebook raised $16B in its 2012 IPO; its stock then fell for months. Airbnb priced at $68 in 2020 and opened at $146: great for investors who got shares, and roughly $3.5B the company didn't raise. Pricing an IPO is an art with billions on the line.</p>",
    parts: [
      { h: "Book-building", sim: ipoSim },
      { h: "The IPO journey", sim: () => stepper([
        { t: "1. Pick the banks", html: "<p>The company hires <b>underwriters</b> (bookrunners), usually 2-5 big banks, paid ~2-7% of the money raised (less for big deals).</p>" },
        { t: "2. Due diligence & the S-1", html: "<p>Lawyers and bankers draft the prospectus (an <b>S-1</b> in the US): business, risks, financials. Regulators review it.</p>" },
        { t: "3. The roadshow", html: "<p>Management pitches big investors over 1-2 weeks. Bankers collect orders: the book.</p>" },
        { t: "4. Pricing", html: "<p>The night before trading, the price is set from the book. Shares are <b>allocated</b>, mostly to big institutions.</p>" },
        { t: "5. First day", html: "<p>Trading opens. The banks may support the price using the <b>greenshoe</b> (an option to sell 15% more shares, used to stabilise).</p>" },
        { t: "6. Lock-up", html: "<p>Insiders can't sell for ~180 days. When the lock-up expires, the price often dips.</p>" },
      ]) },
      { h: "Other ways to list", sim: () => table(["Route", "How", "Trade-off"], [["Traditional IPO", "Banks underwrite and price the deal", "Certainty of raise; underpricing and fees"], ["Direct listing", "Existing shares just start trading (Spotify 2018)", "No new money raised (originally), no lock-up, cheaper"], ["SPAC", "A listed cash shell merges with the private company", "Faster, negotiated price; many 2020-21 SPACs collapsed"], ["Dutch auction", "Investors bid, a clearing price is set (Google 2004)", "Fairer allocation; rarely used"]]) },
    ],
    job: "<p>ECM (equity capital markets) bankers run IPOs and follow-on offerings. VC and PE investors use IPOs as an <b>exit</b>. Lawyers draft prospectuses. Fund managers decide whether to buy. The IPO window opens and shuts with markets: in 2021 it was wide open; in 2022 it slammed shut, stranding many late-stage startups.</p>",
    terms: [["IPO", "Initial public offering: first sale of shares to the public."], ["Underwriter", "Bank that manages the offering and often guarantees the sale."], ["Book-building", "Collecting investor orders to set the IPO price."], ["Underpricing", "Pricing below what the market will pay; the first-day pop."], ["Greenshoe", "Option for underwriters to sell up to 15% more shares to stabilise the price."], ["Lock-up", "Period after an IPO when insiders can't sell."], ["SPAC", "A listed shell company that raises cash to merge with a private company."]],
    quiz: [
      ["A huge first-day pop means the company…", ["Raised the maximum possible", "Left money on the table", "Will definitely do well"], 1, "It could have sold the same shares at a higher price."],
      ["What happens at lock-up expiry, typically?", ["Price jumps", "Price often dips as insiders can sell", "Trading stops"], 1, "Expected extra supply weighs on the price."],
      ["A direct listing differs from an IPO because…", ["It always raises more money", "Existing shares start trading without underwritten new shares", "It's illegal in the US"], 1, "No underwriting syndicate selling new shares (in the classic form)."],
    ],
    recap: [["Book", "Orders build the demand curve that sets the price."], ["Pop", "Underpricing transfers money to first buyers."], ["Lock-up", "Insiders wait ~180 days."]],
    see: ["shares", "vc", "ib", "herding"],
  },

  "order-book": {
    principle: "An exchange is <em>a list of people willing to buy and sell at different prices</em>. A trade happens when two of them meet.",
    hook: "<p>When you tap \"buy\" in a trading app, your order lands in an order book: a ladder of bids (prices people will pay) and asks (prices people will sell at). Matching engines pair them in microseconds, billions of times a day. Liquidity, spreads and slippage all come from this ladder.</p>",
    parts: [
      { h: "Trade against the book", sim: orderBook },
      { h: "Who's on the other side?", sim: () => flips([["Market makers", "Firms (Citadel Securities, Virtu, Jane Street) quoting both sides all day, earning the spread."], ["High-frequency traders", "Algorithms reacting in microseconds; provide liquidity, sometimes vanish in stress."], ["Institutions", "Pension and mutual funds slicing huge orders into small pieces to hide them."], ["Retail", "You. In the US, often routed to wholesalers who pay brokers for the flow (payment for order flow)."], ["Dark pools", "Private venues where big blocks trade without showing in the public book."]]) },
      { h: "Liquidity is a cost", html: "<p>The <b>bid-ask spread</b> is a cost every time you trade: buy at the ask, sell at the bid. Big, popular stocks trade with spreads of a cent; small ones can be 1-2%. And size matters: buying more than is sitting in the book moves the price. That's why big funds care about <em>market impact</em> more than commissions.</p>",
        sim: () => predict({ q: "You place a market order to buy 10,000 shares of a tiny stock with only 2,000 offered near the current price. What happens?", options: ["You buy all at today's price", "Your order walks up the book, buying at worse and worse prices", "The exchange rejects it"], answer: 1, why: "<p>A market order takes whatever is there. In a thin book, that can be far above the last price. Use limit orders in illiquid markets. (In 2010's \"flash crash\", market sell orders in empty books traded some shares at one cent.)</p>" }) },
    ],
    job: "<p>Traders on sales & trading desks make markets for clients and manage inventory. Execution traders at funds minimise market impact (with algorithms like VWAP). Quant firms build market-making algorithms. Exchanges (NYSE, Nasdaq, LSE) and regulators design the rules: tick sizes, circuit breakers, best execution.</p>",
    terms: [["Order book", "List of outstanding buy (bid) and sell (ask) orders by price."], ["Bid / ask", "Highest price buyers offer / lowest price sellers accept."], ["Spread", "Ask minus bid: a trading cost and the market maker's income."], ["Market order", "Buy or sell immediately at the best available prices."], ["Limit order", "Buy or sell only at a set price or better."], ["Liquidity", "How easily you can trade without moving the price."], ["Slippage", "Getting a worse price than expected because the price moved or the book was thin."]],
    quiz: [
      ["Best bid $9.98, best ask $10.02. You market-buy a small amount. You pay about…", ["$9.98", "$10.00", "$10.02"], 2, "A market buy takes the best ask."],
      ["A limit order to buy at $9.99 in that book will…", ["Execute immediately", "Sit in the book as the new best bid", "Be rejected"], 1, "It improves the bid and waits for a seller."],
      ["Wider spreads usually mean…", ["More liquidity", "Less liquidity", "Lower volatility"], 1, "Fewer traders willing to quote tightly."],
    ],
    recap: [["Ladder", "Bids below, asks above, spread between."], ["Market vs limit", "Speed vs price control."], ["Size", "Big orders move the price."]],
    see: ["supply-demand", "shares", "efficient", "hedge-funds"],
  },

  indices: {
    principle: "An index is <em>a basket that stands for a market</em>; an index fund lets you buy the whole basket cheaply.",
    hook: "<p>\"The market was up 1% today\" usually means the S&P 500 index rose. But how is an index built? It matters more than you'd think: the Dow Jones gives more weight to a $400 stock than a $40 one regardless of company size, which is absurd, yet it's the index on the evening news.</p>",
    parts: [
      { h: "Three ways to weight", sim: indexSim },
      { h: "Funds that hold the index", sim: () => table(["Vehicle", "How you trade it", "Typical fee", "Notes"], [["Index mutual fund", "Once a day at closing price", "0.02-0.2%", "Vanguard pioneered it in 1976 (\"Bogle's folly\")"], ["ETF", "All day on an exchange like a stock", "0.03-0.5%", "Tax-efficient creation/redemption mechanism"], ["Active mutual fund", "Once a day", "0.5-1.5%", "A manager picks stocks"], ["Hedge fund", "Monthly/quarterly, lockups", "2% + 20% of profits", "Can short, use leverage"]]),
        after: "<p>How do ETF prices stay close to the value of what they hold? <b>Authorised participants</b> (big trading firms) can swap a basket of stocks for new ETF shares or vice versa. If the ETF trades above its holdings' value, they create shares and sell them; if below, they redeem. Arbitrage keeps the gap tiny.</p>" },
      { h: "The rise of passive", html: "<p>Index funds now hold more US stock fund assets than active funds. Critics worry about who is doing the price discovery, and about three firms (BlackRock, Vanguard, State Street) voting a huge share of every company. Supporters point out fees have collapsed, saving investors hundreds of billions.</p>",
        sim: () => predict({ q: "If a stock is added to the S&P 500, what typically happens to its price around the announcement?", options: ["Falls", "Jumps, as index funds must buy it", "Nothing"], answer: 1, why: "<p>Index funds holding trillions must buy it on inclusion day. Tesla rose ~70% between announcement and inclusion in 2020. The effect has shrunk as traders front-run it.</p>" }) },
    ],
    job: "<p>Index providers (S&P, MSCI, FTSE Russell) are hugely profitable businesses. ETF issuers compete on fees. Asset managers are judged against a <b>benchmark</b> index. Traders arbitrage ETFs and trade index rebalances. Advisers build portfolios out of a handful of cheap ETFs.</p>",
    terms: [["Index", "A rules-based basket measuring part of a market."], ["Market-cap weighting", "Each stock weighted by its total market value."], ["Price weighting", "Each stock weighted by its share price (the Dow)."], ["Index fund", "A fund that copies an index."], ["ETF", "Exchange-traded fund: a fund that trades like a stock."], ["Benchmark", "The index an active fund is compared against."], ["Tracking error", "How much a fund's returns differ from its index."]],
    quiz: [
      ["In a cap-weighted index, the stock that moves the index most is…", ["The one with the highest share price", "The one with the largest market cap", "The newest"], 1, "Weights are proportional to market cap."],
      ["What keeps an ETF's price close to its holdings' value?", ["Regulation", "Arbitrage by authorised participants creating/redeeming shares", "Luck"], 1, "Creation/redemption arbitrage."],
      ["The Dow is price-weighted, so a stock split…", ["Doesn't matter", "Reduces that stock's weight", "Increases it"], 1, "Lower price, lower weight: one reason the Dow is a strange index."],
    ],
    recap: [["Weighting", "Price, cap, or equal: changes everything."], ["ETF", "Trades like a stock; arbitrage keeps it honest."], ["Fees", "Passive won on cost."]],
    see: ["diversify", "efficient", "personal", "capm"],
  },

  efficient: {
    principle: "In a competitive market, <em>public information is quickly reflected in prices</em>, so beating the market consistently is very hard, especially after fees.",
    hook: "<p>An old joke: two economists see a $20 note on the pavement. One bends down; the other says, \"Don't bother, if it were real someone would have picked it up.\" That's the efficient market hypothesis: not that prices are always right, but that easy profits get competed away fast.</p>",
    parts: [
      { h: "Luck that looks like skill", sim: coinSim },
      { h: "Fees and the arithmetic of active management", sim: activeSim,
        after: "<p>William Sharpe's <em>arithmetic of active management</em>: before costs, the average active dollar must earn the market return (all investors together <i>are</i> the market). After costs, the average active dollar must earn less. Not an opinion: arithmetic.</p>" },
      { h: "How efficient?", sim: () => flips([["Weak form", "Past prices can't predict future prices. Chart patterns don't work (on average)."], ["Semi-strong form", "Public news is priced in within minutes. Reading the paper won't help."], ["Strong form", "Even inside information is priced in. Clearly false: insider trading is profitable, which is why it's illegal."], ["Anomalies", "Momentum, value, small-cap, low-volatility effects: are they risk, behaviour, or data mining?"], ["Limits to arbitrage", "Even when prices are wrong, betting against them can bankrupt you first: \"markets can stay irrational longer than you can stay solvent.\""]]),
        after: "<p>Eugene Fama (efficient markets) and Robert Shiller (bubbles and irrationality) shared the 2013 Nobel Prize, which tells you the debate isn't settled. The practical answer for most people: markets are efficient enough that low-cost index funds beat most alternatives.</p>" },
    ],
    job: "<p>The whole active management industry, from hedge funds to stock pickers, exists to find inefficiencies. Quants hunt anomalies in data. Index fund providers bet on efficiency. Insider trading law exists because private information isn't priced in. Interviewers love asking \"do you believe markets are efficient?\" (Good answer: mostly, with interesting exceptions, and here's one.)</p>",
    terms: [["Efficient market hypothesis", "Prices reflect available information, so consistent excess returns are hard."], ["Random walk", "Price changes are unpredictable from past changes."], ["Alpha", "Return above what's explained by market exposure."], ["Survivorship bias", "Looking only at funds that survived, ignoring the dead ones."], ["Anomaly", "A pattern that seems to contradict efficiency (e.g. momentum)."], ["Limits to arbitrage", "Risks and costs that stop traders correcting mispricings."]],
    quiz: [
      ["A fund beat the market 8 years in a row. Strong evidence of skill?", ["Yes, definitely", "Not necessarily: with thousands of funds, some will by luck", "No, impossible"], 1, "Survivorship and multiple-testing make luck look like skill."],
      ["Before fees, the average active investor earns…", ["More than the market", "The market return", "Less than the market"], 1, "Together they hold the market. After fees, less."],
      ["Which form of EMH does insider trading violate?", ["Weak", "Semi-strong", "Strong"], 2, "Strong form says even private info is priced in; it isn't."],
    ],
    recap: [["Hard, not impossible", "Easy profits get competed away."], ["Arithmetic", "Average active return = market − costs."], ["Luck", "Survivorship bias manufactures geniuses."]],
    see: ["indices", "capm", "herding", "hedge-funds"],
  },

  capm: {
    principle: "You're only paid for risk you can't diversify away. <em>Beta</em> measures that risk, and CAPM turns it into a required return.",
    hook: "<p>A biotech stock can swing 80% a year, yet many such stocks don't need especially high expected returns. Why? Because most of their swings are company-specific and cancel out in a diversified portfolio. The capital asset pricing model (CAPM) says the market only pays for <em>systematic</em> risk.</p>",
    parts: [
      { h: "The security market line", sim: smlSim, html: "<p>CAPM: expected return = risk-free rate + β × (market return − risk-free rate).</p>" },
      { h: "Where beta comes from", sim: betaSim },
      { h: "Is CAPM right?", html: "<p>Not quite. In real data, low-beta stocks have done better than CAPM predicts and high-beta stocks worse (the <em>low-volatility anomaly</em>). Fama and French added factors: small companies and cheap (value) companies earned more than beta explains. Later models add momentum, profitability and investment. Yet CAPM is still the standard way to estimate the cost of equity: simple, defensible, and roughly right.</p>",
        sim: () => calc({ q: "Risk-free 4%, market return 10%, beta 1.5. CAPM expected return?", answer: 13, tol: 0.001, unit: "%", why: "<p>4 + 1.5 × (10 − 4) = <b>13%</b>.</p>" }) },
    ],
    job: "<p>CAPM gives the cost of equity in every WACC and DCF. Portfolio managers measure performance against it (alpha). Factor investing (\"smart beta\" ETFs) productised the anomalies. Risk managers decompose portfolios into factor exposures. Bloomberg terminals show a \"BETA\" screen that analysts use daily.</p>",
    terms: [["CAPM", "Expected return = Rf + β × (Rm − Rf)."], ["Beta", "Sensitivity of an asset's returns to the market's."], ["Systematic risk", "Market-wide risk; can't be diversified away."], ["Security market line", "CAPM's line of expected return against beta."], ["Alpha", "Return above the CAPM prediction."], ["Factor model", "Explains returns with several risk factors (size, value, momentum...)."]],
    quiz: [
      ["A stock with beta 0 should, under CAPM, earn…", ["The market return", "The risk-free rate", "Zero"], 1, "No systematic risk, no premium."],
      ["Why isn't company-specific risk rewarded in CAPM?", ["It doesn't exist", "Investors can diversify it away for free", "It's illegal"], 1, "Only undiversifiable risk earns a premium."],
      ["A stock plots above the security market line. It has…", ["Negative alpha", "Positive alpha", "Beta above 1"], 1, "Higher expected return than its beta implies."],
    ],
    recap: [["Rf + β × ERP", "The CAPM formula."], ["Systematic only", "Diversifiable risk isn't paid."], ["Factors", "Size, value, momentum extend the story."]],
    see: ["diversify", "wacc", "efficient", "risk"],
  },

  short: {
    principle: "Short selling is <em>borrowing a share, selling it, and hoping to buy it back cheaper</em>. Capped upside, unlimited downside.",
    hook: "<p>Short sellers are some of the most hated people in markets, and some of the most useful. They exposed Enron, Wirecard and Luckin Coffee before regulators did. They also occasionally get crushed, as GameStop showed in 2021.</p>",
    parts: [
      { h: "The payoff", sim: shortSim, html: "<p>Mechanics: borrow shares from a broker (paying a <b>borrow fee</b>), sell them, later buy them back and return them. If the price falls, you pocket the difference. You also owe any dividends paid while short.</p>" },
      { h: "Squeeze", sim: squeezeSim },
      { h: "Why markets need shorts", sim: () => flips([["Price discovery", "Pessimists can act on their views, so prices reflect bad news too."], ["Fraud detection", "Activist shorts research and publish (Muddy Waters, Hindenburg)."], ["Hedging", "Funds short to offset risk in their long positions."], ["Liquidity", "Market makers short to fill buy orders."], ["Risks", "Short-and-distort campaigns; squeezes; bans in crises (2008) usually widen spreads."]]) },
    ],
    job: "<p>Long/short hedge funds pair longs with shorts. Prime brokers (at banks) lend shares and finance positions. Activist short sellers publish research. Regulators require disclosure of large short positions in many countries. And PE firms check short interest when buying a listed company: it's free due diligence from sceptics.</p>",
    terms: [["Short selling", "Selling borrowed shares, hoping to buy back cheaper."], ["Short interest", "Shares sold short as % of shares available to trade."], ["Borrow fee", "Cost of borrowing shares to short; high for hard-to-borrow stocks."], ["Short squeeze", "Rising price forces shorts to buy, pushing the price higher."], ["Margin call", "Demand to add collateral when a leveraged position loses money."], ["Days to cover", "Short interest ÷ average daily volume."]],
    quiz: [
      ["You short at $50. Maximum possible profit per share?", ["$50", "Unlimited", "$25"], 0, "The price can't go below zero."],
      ["Maximum possible loss on that short?", ["$50", "Unlimited", "$100"], 1, "There's no ceiling on how high a price can go."],
      ["Squeezes are most likely when…", ["Short interest is low", "Short interest is high and shares are hard to borrow", "The company pays big dividends"], 1, "Many shorts must buy from few sellers."],
    ],
    recap: [["Borrow, sell, buy back", "The mechanics."], ["Capped vs unlimited", "Max gain 100%; max loss unlimited."], ["Useful", "Shorts find frauds and improve prices."]],
    see: ["order-book", "hedge-funds", "leverage-loop", "options"],
  },
};

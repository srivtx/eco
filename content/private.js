// World 11: Private markets.
import { h, usd, money, num, pct, clamp, rng } from "../lib/core.js";
import { slider, seg, stats, stage, predict, calc, callout, table, bars, button, flips, stepper } from "../lib/ui.js";
import { plot, columns, waterfall, donut } from "../lib/chart.js";

const W = "var(--wc)";
const $M = (x) => `${x < 0 ? "−" : ""}$${num(Math.abs(x), Math.abs(x) < 10 ? 1 : 0)}M`;
const irrOf = (cfs) => { let lo = -0.99, hi = 3; const npv = (r) => cfs.reduce((a, c, t) => a + c / Math.pow(1 + r, t), 0); if (npv(lo) * npv(hi) > 0) return NaN; for (let k = 0; k < 100; k++) { const m = (lo + hi) / 2; npv(m) > 0 ? (lo = m) : (hi = m); } return (lo + hi) / 2; };

/* ---------------- fund J-curve ---------------- */
function jcurveSim() {
  let size = 1000, moic = 2.2, pace = 4;
  const p = plot({ height: 300, x: [0, 12], y: [-800, 1400], xLabel: "fund year", yLabel: "LP cumulative net cash", xFmt: (x) => `Y${Math.round(x)}`, yFmt: $M, label: "J-curve" });
  const st = stats([{ label: "Capital called" }, { label: "Fees paid to GP" }, { label: "Net to LPs" }, { label: "Net multiple (TVPI)" }, { label: "Net IRR" }]);
  const box = h("div");
  const draw = () => {
    const calls = Array(13).fill(0), dists = Array(13).fill(0), fees = Array(13).fill(0);
    const inv = size * 0.88; // the rest covers fees over life
    for (let y = 1; y <= 12; y++) fees[y] = (y <= 5 ? 0.02 * size : 0.015 * size * Math.max(0, 1 - (y - 5) / 6));
    for (let y = 1; y <= pace; y++) calls[y] += inv / pace;
    for (let y = 1; y <= 12; y++) calls[y] += fees[y];
    // each year's investments exit 4-6 years later at the gross multiple
    for (let y = 1; y <= pace; y++) for (const [lag, w] of [[4, 0.3], [5, 0.4], [6, 0.3]]) if (y + lag <= 12) dists[y + lag] += (inv / pace) * moic * w;
    const gross = dists.reduce((a, b) => a + b, 0), called = calls.reduce((a, b) => a + b, 0);
    const profit = Math.max(0, gross - called), carry = gross > called * 1.08 ? 0.2 * profit : 0;
    // carry taken pro rata from distributions (simplified)
    const net = dists.map((d) => d * (1 - carry / Math.max(1, gross)));
    let cum = 0; const pts = [];
    for (let y = 0; y <= 12; y++) { cum += net[y] - calls[y]; pts.push([y, cum]); }
    const cfs = Array.from({ length: 13 }, (_, y) => net[y] - calls[y]);
    p.draw({ y: [Math.min(-200, ...pts.map((x) => x[1])) * 1.15, Math.max(200, ...pts.map((x) => x[1])) * 1.15], series: [{ name: "Cumulative net cash to LPs", color: W, pts, width: 4, area: false }], hlines: [{ y: 0 }], dots: [{ x: pts.reduce((m, x) => (x[1] < m[1] ? x : m))[0], y: Math.min(...pts.map((x) => x[1])), color: "var(--bad)", r: 7, label: "bottom of the J" }] });
    box.replaceChildren(columns(cfs.slice(1).map((v, i) => ({ label: `Y${i + 1}`, value: v, color: v < 0 ? "var(--down)" : "var(--up)", show: num(v) })), { height: 170, fmt: (v) => num(v), label: "Yearly net cash flows to LPs" }));
    st.set(0, $M(called)); st.set(1, $M(fees.reduce((a, b) => a + b, 0)), "bad"); st.set(2, $M(net.reduce((a, b) => a + b, 0) - called), "good"); st.set(3, `${num(net.reduce((a, b) => a + b, 0) / called, 2)}×`); st.set(4, pct(irrOf(cfs)), "accent");
  };
  const c = [slider({ label: "Fund size (LP commitments)", min: 200, max: 5000, step: 100, value: size, fmt: $M, onInput: (x) => { size = x; draw(); } }), slider({ label: "Gross multiple on deals", min: 0.5, max: 4, step: 0.1, value: moic, fmt: (x) => `${x.toFixed(1)}×`, onInput: (x) => { moic = x; draw(); } }), slider({ label: "Years to invest the fund", min: 2, max: 6, value: pace, onInput: (x) => { pace = x; draw(); } })];
  draw();
  return stage({ title: "Ten years in the life of an LP", controls: c, body: [box, p.el, st.el], note: "Early on, LPs only pay: capital calls plus fees, while deals are young. Money comes back as companies are sold in years 5-10. The curve dips then climbs: the <b>J-curve</b>. Set the gross multiple near 1× to see fees and carry eat everything." });
}

/* ---------------- LBO ---------------- */
function lboSim() {
  const v = { ebitda: 100, entry: 10, lev: 6, rate: 9, growth: 6, conv: 50, years: 5, exit: 10 };
  const p = plot({ height: 240, x: [0, 5], y: [0, 700], xLabel: "year", yLabel: "debt outstanding", xFmt: (x) => `Y${Math.round(x)}`, yFmt: $M, label: "Debt paydown" });
  const st = stats([{ label: "Purchase price (EV)" }, { label: "Equity cheque" }, { label: "Equity at exit" }, { label: "MOIC" }, { label: "IRR" }]);
  const tbl = h("div"), attr = h("div"), sources = h("div");
  const draw = () => {
    const ev0 = v.ebitda * v.entry, debt0 = Math.min(ev0 * 0.9, v.ebitda * v.lev), fees = ev0 * 0.02, eq0 = ev0 - debt0 + fees;
    let debt = debt0, e = v.ebitda; const pts = [[0, debt]], rows = [];
    for (let y = 1; y <= v.years; y++) {
      e *= 1 + v.growth / 100;
      const interest = debt * v.rate / 100, fcf = Math.max(0, e * v.conv / 100 - interest * 0.75);
      const pay = Math.min(debt, fcf); debt -= pay; pts.push([y, debt]);
      rows.push([`Y${y}`, num(e), num(interest), num(fcf), num(debt), `${num(debt / e, 1)}×`]);
    }
    const evX = e * v.exit, eqX = evX - debt, moic = eqX / eq0, irr = Math.pow(Math.max(0, moic), 1 / v.years) - 1;
    p.draw({ x: [0, v.years], y: [0, Math.max(10, debt0 * 1.15)], series: [{ name: "Debt", color: "#0ea5e9", pts, area: true, width: 4 }] });
    tbl.replaceChildren(table(["", "EBITDA", "Interest", "Cash to repay debt", "Debt left", "Debt / EBITDA"], rows));
    sources.replaceChildren(h("div.split", table(["Sources", "$M"], [["Debt (" + num(debt0 / v.ebitda, 1) + "× EBITDA)", num(debt0)], ["PE fund equity", num(eq0)], ["<b>Total</b>", `<b>${num(debt0 + eq0)}</b>`]]), table(["Uses", "$M"], [["Buy the company (" + v.entry + "× EBITDA)", num(ev0)], ["Fees (~2%)", num(fees)], ["<b>Total</b>", `<b>${num(ev0 + fees)}</b>`]])));
    // value creation attribution
    const gEbitda = (e - v.ebitda) * v.entry, gMult = (v.exit - v.entry) * e, gDebt = debt0 - debt;
    attr.replaceChildren(waterfall([{ label: "Equity in", value: eq0, total: true, color: "#c2853a" }, { label: "EBITDA growth", value: gEbitda }, { label: "Multiple change", value: gMult }, { label: "Debt paydown", value: gDebt }, { label: "Fees", value: -fees }, { label: "Equity out", value: eqX, total: true, color: eqX > eq0 ? "var(--up)" : "var(--down)" }], { fmt: $M, height: 220, label: "Where the return came from" }));
    st.set(0, $M(ev0)); st.set(1, $M(eq0)); st.set(2, $M(eqX)); st.set(3, `${num(moic, 2)}×`, moic >= 2 ? "good" : moic < 1 ? "bad" : "warn"); st.set(4, Number.isFinite(irr) ? pct(irr) : "–", irr >= 0.2 ? "good" : irr < 0.1 ? "bad" : "warn");
  };
  const mk = (k, label, min, max, step, fmt) => slider({ label, min, max, step, value: v[k], fmt, onInput: (x) => { v[k] = x; draw(); } });
  draw();
  return stage({ title: "Buy a company with borrowed money", controls: [mk("ebitda", "EBITDA today", 20, 300, 5, $M), mk("entry", "Entry multiple (EV/EBITDA)", 5, 16, 0.5, (x) => `${x}×`), mk("lev", "Debt raised (× EBITDA)", 0, 8, 0.25, (x) => `${x}×`), mk("rate", "Interest rate on debt", 3, 15, 0.5, (x) => `${x}%`), mk("growth", "EBITDA growth a year", -5, 20, 1, (x) => `${x}%`), mk("conv", "EBITDA turned into cash (after capex, tax, WC)", 20, 80, 5, (x) => `${x}%`), mk("years", "Years held", 3, 7, 1, (x) => `${x}`), mk("exit", "Exit multiple", 5, 16, 0.5, (x) => `${x}×`)], body: [sources, p.el, tbl, attr, st.el], note: "Three engines of return: grow EBITDA, sell at a higher multiple, pay down debt with the company's own cash. Set the exit multiple below entry (<i>multiple contraction</i>) or rates to 13% and watch how fragile it gets." });
}

/* ---------------- carry waterfall ---------------- */
function carrySim() {
  let proceeds = 2000, hurdle = 8, yrs = 5;
  const box = h("div"), st = stats([{ label: "LPs get" }, { label: "GP carry" }, { label: "GP share of profit" }]);
  const draw = () => {
    const capital = 1000, pref = capital * (Math.pow(1 + hurdle / 100, yrs) - 1);
    let left = proceeds, lp = 0, gp = 0;
    const t1 = Math.min(left, capital); lp += t1; left -= t1;
    const t2 = Math.min(left, pref); lp += t2; left -= t2;
    const catchup = Math.min(left, pref * 0.25); gp += catchup; left -= catchup; // GP catches up to 20% of profits so far
    lp += left * 0.8; gp += left * 0.2;
    box.replaceChildren(waterfall([{ label: "Return capital", value: t1, total: true, color: "#3b82f6" }, { label: "Preferred return", value: t2, color: "#0ea5e9" }, { label: "GP catch-up", value: catchup, color: "#c2853a" }, { label: "80/20 split: LPs", value: left * 0.8, color: "#22c55e" }, { label: "80/20 split: GP", value: left * 0.2, color: "#f5c518" }, { label: "Total", value: proceeds, total: true, color: "var(--ink-3)" }], { fmt: $M, height: 240, label: "Distribution waterfall" }));
    st.set(0, $M(lp)); st.set(1, $M(gp), "accent"); st.set(2, proceeds > capital ? pct(gp / (proceeds - capital), 0) : "–");
  };
  const c = [slider({ label: "Total proceeds back from deals", min: 500, max: 4000, step: 50, value: proceeds, fmt: $M, onInput: (x) => { proceeds = x; draw(); } }), slider({ label: "Preferred return (hurdle)", min: 0, max: 12, step: 0.5, value: hurdle, fmt: (x) => `${x}%`, onInput: (x) => { hurdle = x; draw(); } }), slider({ label: "Years capital was out", min: 1, max: 10, value: yrs, onInput: (x) => { yrs = x; draw(); } })];
  draw();
  return stage({ title: "Who gets paid, in what order ($1B fund)", controls: c, body: [box, st.el], note: "A simplified European (whole-fund) waterfall: 1) LPs get their money back, 2) LPs get the preferred return (often 8%/yr), 3) the GP catches up until it has 20% of profits, 4) everything after splits 80/20. Below the hurdle, the GP gets no carry at all." });
}
function irrMoic() {
  let yrs = 3;
  const st = stats([{ label: "Deal A: 2.0× in 3 years" }, { label: "Deal B: 2.0× in your years" }, { label: "Deal C: 3.0× in 8 years" }]);
  const draw = () => { const f = (m, y) => pct(Math.pow(m, 1 / y) - 1); st.set(0, f(2, 3)); st.set(1, f(2, yrs), "accent"); st.set(2, f(3, 8)); };
  const a = slider({ label: "Years for deal B", min: 1, max: 10, value: yrs, onInput: (x) => { yrs = x; draw(); } });
  draw();
  return stage({ title: "IRR rewards speed; MOIC rewards size", controls: [a], body: [st.el], note: "Deal C makes the most money but has the lowest IRR. LPs can't eat IRR: they want multiples too. That's why funds report both, and why quick flips and <b>dividend recaps</b> (returning cash early) flatter IRR." });
}

/* ---------------- VC power law ---------------- */
function powerSim() {
  let seed = 1, miss = false;
  const box = h("div"), st = stats([{ label: "Fund multiple" }, { label: "Companies that lost money" }, { label: "Share of returns from the best deal" }]);
  const draw = () => {
    const r = rng(seed * 97 + 3);
    let outs = Array.from({ length: 25 }, () => { const u = r(); if (u < 0.55) return r() * 0.5; if (u < 0.85) return 0.5 + r() * 2.5; return Math.min(200, 3 / Math.pow(1 - r() * 0.985, 1.3)); }).sort((a, b) => b - a);
    if (miss) outs = outs.slice(1).concat([0]);
    const tot = outs.reduce((a, b) => a + b, 0);
    box.replaceChildren(columns(outs.map((x, i) => ({ label: String(i + 1), value: x, color: i === 0 ? "#ffc21a" : x < 1 ? "var(--down)" : W, show: x >= 10 ? `${num(x)}×` : "" })), { height: 220, fmt: (x) => `${num(x, 1)}×`, label: "Outcomes of 25 startups, sorted" }));
    st.set(0, `${num(tot / 25, 2)}×`, tot / 25 >= 3 ? "good" : tot / 25 < 1 ? "bad" : "warn"); st.set(1, `${outs.filter((x) => x < 1).length} of 25`); st.set(2, pct(outs[0] / tot, 0));
  };
  const c = [button("Run a new fund", () => { seed++; draw(); }, "primary"), seg({ label: "Your best deal", options: [{ value: false, label: "You got it" }, { value: true, label: "You passed on it" }], value: miss, onChange: (x) => { miss = x; draw(); } })];
  draw();
  return stage({ title: "25 startups, $1 in each", controls: c, body: [box, st.el], note: "Startup outcomes follow a <b>power law</b>: most fail or return little, and one or two return 50-100×+ and pay for the whole fund. So VCs ask of every deal: <i>could this return the entire fund on its own?</i> Missing the one winner matters more than avoiding every loser." });
}

/* ---------------- cap table ---------------- */
function capSim() {
  const v = { seedPre: 8, seedRaise: 2, aPre: 30, aRaise: 10, pool: 10 };
  const box = h("div"), st = stats([{ label: "Founders after Series A" }, { label: "Post-money valuation" }, { label: "Series A price per share" }]);
  const draw = () => {
    let f = 10; // founders' shares (M)
    const seedSh = f * (v.seedRaise / v.seedPre); let tot = f + seedSh;
    // the pool is a % of post-money but created before the round: only existing holders are diluted by it
    const post = v.aPre + v.aRaise, aShare = v.aRaise / post, rest = Math.max(0.05, 1 - aShare - v.pool / 100);
    const T = tot / rest, aSh = T * aShare, poolSh = T * (v.pool / 100), price = v.aRaise / aSh; tot = T;
    const parts = [["Founders", f, "#ffc21a"], ["Seed investors", seedSh, "#3b82f6"], ["Option pool", poolSh, "#22c55e"], ["Series A", aSh, "#c2853a"]];
    box.replaceChildren(h("div.split", donut(parts.map(([n, s, c]) => ({ name: n, v: s, color: c })), { center: pct(f / tot, 0), sub: "founders" }), table(["Holder", "Shares (M)", "Ownership"], parts.map(([n, s]) => [n, num(s, 2), pct(s / tot)]))));
    st.set(0, pct(f / tot), f / tot < 0.4 ? "warn" : "good"); st.set(1, `$${num(v.aPre + v.aRaise)}M`); st.set(2, `$${num(price, 2)}`);
  };
  const mk = (k, label, min, max, step) => slider({ label, min, max, step, value: v[k], fmt: (x) => (k === "pool" ? `${x}%` : `$${x}M`), onInput: (x) => { v[k] = x; draw(); } });
  draw();
  return stage({ title: "Seed, then Series A", controls: [mk("seedPre", "Seed pre-money valuation", 2, 30, 1), mk("seedRaise", "Seed raise", 0.5, 10, 0.5), mk("aPre", "Series A pre-money", 10, 150, 5), mk("aRaise", "Series A raise", 2, 50, 1), mk("pool", "Option pool (post-money %)", 0, 25, 1)], body: [box, st.el], note: "<b>Post-money = pre-money + new cash.</b> New investors' share = raise ÷ post-money. Investors usually insist the option pool is created <i>before</i> their money comes in, so only existing holders are diluted by it: the <b>option pool shuffle</b>." });
}
function prefSim() {
  let mode = "nonpart", pref = 1;
  const p = plot({ height: 280, x: [0, 300], y: [0, 300], xLabel: "exit price ($M)", yLabel: "payout ($M)", xFmt: (x) => `$${num(x)}M`, yFmt: (x) => `$${num(x)}M`, label: "Liquidation preferences" });
  const draw = () => {
    const inv = 40, own = 0.25; // investor put in $40M for 25%
    const invPay = (X) => { const P = Math.min(X, inv * pref); if (mode === "part") return P + Math.max(0, X - P) * own; return Math.max(Math.min(X, P), X * own); };
    const pts = (fn) => Array.from({ length: 61 }, (_, i) => [i * 5, fn(i * 5)]);
    p.draw({ series: [{ name: "Investor", color: "#c2853a", pts: pts(invPay), width: 4 }, { name: "Founders & common", color: "#ffc21a", pts: pts((X) => X - invPay(X)), width: 4 }, { name: "Pro rata (no preference)", color: "var(--ink-3)", pts: pts((X) => X * 0.75), dash: "6 5" }] });
  };
  const sg = seg({ label: "Preference type", options: [{ value: "nonpart", label: "Non-participating" }, { value: "part", label: "Participating" }], value: mode, onChange: (x) => { mode = x; draw(); } });
  const a = slider({ label: "Preference multiple", min: 1, max: 3, step: 0.5, value: pref, fmt: (x) => `${x}×`, onInput: (x) => { pref = x; draw(); } });
  draw();
  return stage({ title: "Who gets what when the company sells? ($40M in for 25%)", controls: [sg, a], body: [p.el], note: "A <b>1× non-participating preference</b> lets the investor take its money back <i>or</i> convert to its 25%, whichever is more. In a $100M sale it takes $40M, not $25M. <b>Participating</b> (\"double dip\") takes the $40M <i>and</i> 25% of the rest. Headline valuations hide these terms: what matters is the payout curve." });
}

/* ---------------- hedge funds ---------------- */
function lsSim() {
  let alpha = 4, beta = 0.2, mkt = -20;
  const st = stats([{ label: "Market return" }, { label: "From market exposure (β × market)" }, { label: "From stock picking (α)" }, { label: "Fund return before fees" }, { label: "After 2 and 20" }]);
  const draw = () => {
    const fromB = beta * mkt, gross = fromB + alpha, net = gross - 2 - Math.max(0, gross - 2) * 0.2;
    st.set(0, `${mkt}%`); st.set(1, `${num(fromB, 1)}%`); st.set(2, `${num(alpha, 1)}%`); st.set(3, `${num(gross, 1)}%`, gross >= 0 ? "good" : "bad"); st.set(4, `${num(net, 1)}%`, net >= 0 ? "good" : "bad");
  };
  const c = [slider({ label: "Market move this year", min: -40, max: 40, value: mkt, fmt: (x) => `${x}%`, onInput: (x) => { mkt = x; draw(); } }), slider({ label: "Fund beta (net market exposure)", min: -0.5, max: 1.5, step: 0.05, value: beta, fmt: (x) => x.toFixed(2), onInput: (x) => { beta = x; draw(); } }), slider({ label: "Alpha (skill)", min: -5, max: 15, step: 0.5, value: alpha, fmt: (x) => `${x}%`, onInput: (x) => { alpha = x; draw(); } })];
  draw();
  return stage({ title: "Long/short: separate skill from the market", controls: c, body: [st.el], note: "A long/short equity fund buys stocks it likes and shorts ones it doesn't. Low beta means it barely cares what the market does: returns come from alpha. That's what \"hedge\" originally meant (Alfred Winslow Jones, 1949)." });
}

/* ---------------- real estate ---------------- */
function reSim() {
  const v = { rent: 1200, opex: 35, cap: 5.5, ltv: 60, rate: 6, capExit: 5.5 };
  const st = stats([{ label: "Net operating income" }, { label: "Property value (NOI ÷ cap rate)" }, { label: "Cash-on-cash yield" }, { label: "Value if cap rate moves to exit" }]);
  const draw = () => {
    const gross = v.rent * 12 * 50, noi = gross * (1 - v.opex / 100), val = noi / (v.cap / 100), debt = val * v.ltv / 100, eq = val - debt, cf = noi - debt * v.rate / 100;
    st.set(0, money(noi)); st.set(1, money(val), "accent"); st.set(2, pct(cf / eq), cf >= 0 ? "good" : "bad"); st.set(3, `${money(noi / (v.capExit / 100))} (${v.capExit >= v.cap ? "" : "+"}${pct(v.cap / v.capExit - 1, 0)})`, v.capExit > v.cap ? "bad" : "good");
  };
  const mk = (k, label, min, max, step, fmt) => slider({ label, min, max, step, value: v[k], fmt, onInput: (x) => { v[k] = x; draw(); } });
  draw();
  return stage({ title: "A 50-flat apartment block", controls: [mk("rent", "Monthly rent per flat", 500, 3000, 50, (x) => `$${x}`), mk("opex", "Running costs (% of rent)", 20, 60, 1, (x) => `${x}%`), mk("cap", "Cap rate you buy at", 3, 10, 0.25, (x) => `${x}%`), mk("ltv", "Mortgage (loan-to-value)", 0, 80, 5, (x) => `${x}%`), mk("rate", "Mortgage rate", 2, 10, 0.25, (x) => `${x}%`), mk("capExit", "Cap rate when you sell", 3, 10, 0.25, (x) => `${x}%`)], body: [st.el], note: "The <b>cap rate</b> is NOI ÷ price: real estate's earnings yield. When interest rates rise, cap rates rise, and values fall even if rents don't change. That's what hit commercial property in 2022-24." });
}

export default {
  "pe-fund": {
    principle: "A private equity fund is <em>a 10-year partnership</em>: investors (LPs) commit money, the manager (GP) invests it in companies, and both share the profits, mostly in the GP's favour if it works.",
    hook: "<p>Blackstone, KKR, Apollo, Carlyle: private equity firms manage trillions of dollars and own companies employing millions of people. But the firm itself rarely puts in much money. It raises funds from pension funds, endowments and sovereign wealth funds, and earns fees and a share of profits for investing it.</p>",
    parts: [
      { h: "The structure", sim: () => stepper([
        { t: "The players", html: "<p><b>LPs</b> (limited partners): pension funds, insurers, endowments, sovereign funds, family offices, rich individuals. They commit money. <b>GP</b> (general partner): the PE firm. Makes decisions, invests a little (1-3%) of its own money.</p>" },
        { t: "Fundraising", html: "<p>The GP raises, say, $1B of <b>commitments</b>. LPs don't hand over cash yet: they promise to send it when asked.</p>" },
        { t: "Investment period (years 1-5)", html: "<p>The GP finds deals and makes <b>capital calls</b>, drawing down commitments as needed (10 days' notice is typical). It buys 10-15 companies.</p>" },
        { t: "Holding period", html: "<p>The GP owns and improves the companies for 3-7 years: new management, cost cuts, acquisitions (<b>buy-and-build</b>), better pricing.</p>" },
        { t: "Exits (years 4-10)", html: "<p>Companies are sold to strategic buyers, other PE funds (<b>secondary buyouts</b>), or listed in an IPO. Cash is <b>distributed</b> to LPs.</p>" },
        { t: "Fees and carry", html: "<p><b>Management fee</b>: ~2% a year on committed capital in the investment period, then on invested capital. <b>Carried interest</b>: ~20% of profits above a <b>hurdle</b> (~8% a year). \"2 and 20\".</p>" },
      ]) },
      { h: "The J-curve", sim: jcurveSim },
      { h: "Key metrics LPs track", sim: () => flips([["TVPI", "Total value to paid-in: (distributions + remaining value) ÷ capital called."], ["DPI", "Distributions to paid-in: real cash back ÷ called. \"DPI is the only thing that matters\" (LPs in 2023)."], ["RVPI", "Remaining value ÷ paid-in: unrealised, based on GP's own marks."], ["Net IRR", "IRR after fees and carry, from LPs' cash flows."], ["PME", "Public market equivalent: did the fund beat just buying an index?"], ["Vintage", "The year a fund started investing. Compare funds within vintages."]]) },
    ],
    job: "<p>PE <b>associates</b> (often ex-bankers) build LBO models, run diligence and draft investment memos. <b>Vice presidents and principals</b> manage deals and portfolio companies. <b>Partners</b> source deals, raise funds and sit on boards. <b>Investor relations</b> raises capital from LPs. On the LP side, pension and endowment investment teams pick managers (and fund-of-funds and secondaries funds buy LP stakes).</p>",
    terms: [["GP (general partner)", "The PE firm that manages the fund."], ["LP (limited partner)", "An investor in the fund with limited liability."], ["Commitment", "Money an LP promises to provide when called."], ["Capital call (drawdown)", "The GP requesting part of the commitment."], ["Management fee", "Annual fee, ~1.5-2% of commitments or invested capital."], ["Carried interest (carry)", "GP's share of profits, typically 20%."], ["Hurdle rate (preferred return)", "Minimum return LPs get before carry, often 8%."], ["J-curve", "Early negative returns then rising returns over a fund's life."], ["DPI / TVPI", "Cash returned / total value, relative to capital paid in."]],
    quiz: [
      ["Who decides which companies the fund buys?", ["The LPs", "The GP", "The portfolio companies"], 1, "LPs are passive; the GP has discretion."],
      ["Why do fund returns look negative in the first years?", ["Bad deals", "Fees and capital calls come before exits", "Taxes"], 1, "That's the J-curve."],
      ["Which metric counts only cash actually returned?", ["TVPI", "DPI", "IRR"], 1, "DPI ignores unrealised marks."],
    ],
    recap: [["2 and 20", "Management fee and carried interest."], ["J-curve", "Pay first, get paid later."], ["DPI", "Cash back is what LPs trust."]],
    see: ["lbo", "pe-returns", "incentives", "information"],
  },

  lbo: {
    principle: "An LBO buys a company with <em>mostly borrowed money</em>, uses the company's own cash to repay the debt, and sells it later. Leverage turns a decent business result into a big equity return.",
    hook: "<p>In 1989 KKR bought RJR Nabisco for $25B, mostly with debt: the story became the book <i>Barbarians at the Gate</i>. The idea is like buying a rental flat with a mortgage: the tenants' rent pays the mortgage down, and when you sell, the equity is yours. A leveraged buyout does it with whole companies.</p>",
    parts: [
      { h: "Build an LBO", sim: lboSim },
      { h: "What makes a good LBO target?", sim: () => flips([["Stable cash flows", "Predictable enough to carry debt: software, healthcare services, consumer staples."], ["Low capex needs", "Cash goes to debt, not machines."], ["Strong market position", "A moat protects cash flows."], ["Room to improve", "Costs to cut, prices to raise, add-ons to buy."], ["Reasonable price", "Entry multiple matters: you need room to exit."], ["Clear exit", "Strategic buyers, other funds, or an IPO."]]) },
      { h: "The paper LBO", html: "<p>A classic interview test: do a quick LBO in your head.</p>",
        sim: () => calc({ q: "Buy at $100M EBITDA × 10 = $1B, with $600M debt and $400M equity. In 5 years EBITDA is $130M, you exit at 10×, and debt is down to $300M. What's the MOIC on equity (×)?", answer: 2.5, tol: 0.01, unit: "×", hint: "Exit EV − remaining debt = exit equity.", why: "<p>Exit EV = 130 × 10 = $1,300M. Equity = 1,300 − 300 = $1,000M. MOIC = 1,000 ÷ 400 = <b>2.5×</b>, about a 20% IRR over 5 years (2.5^(1/5) ≈ 1.20).</p>" }) },
    ],
    job: "<p>The LBO model is the core skill of PE associates and leveraged finance bankers. In interviews you'll be handed a <b>modelling test</b> (build an LBO in 1-3 hours) or a <b>paper LBO</b> (in your head). Leveraged finance teams at banks and private credit funds provide the debt; restructuring bankers clean up when it fails (Toys \"R\" Us, 2017).</p>",
    terms: [["LBO", "Leveraged buyout: acquiring a company mostly with debt."], ["Sources and uses", "Table of where the money comes from and where it goes."], ["Leverage multiple", "Debt ÷ EBITDA at entry."], ["Debt paydown (deleveraging)", "Repaying debt with the company's free cash flow."], ["Multiple expansion", "Exiting at a higher EV/EBITDA than entry."], ["MOIC", "Multiple of invested capital: equity out ÷ equity in."], ["Add-on acquisition", "A smaller company bought and merged into a PE-owned platform."]],
    quiz: [
      ["The three main sources of LBO returns are…", ["Fees, taxes, dividends", "EBITDA growth, multiple expansion, debt paydown", "Interest, rent, royalties"], 1, "Grow it, sell it richer, and repay debt with its cash."],
      ["Higher interest rates make LBOs…", ["Easier", "Harder: less cash for debt paydown and less debt capacity", "Unaffected"], 1, "That's why LBO volumes fell sharply in 2022-23."],
      ["2.0× MOIC in 3 years is roughly what IRR?", ["15%", "26%", "33%"], 1, "2^(1/3) ≈ 1.26."],
    ],
    recap: [["Borrow, repay, sell", "The LBO in five words."], ["3 engines", "Growth, multiple, paydown."], ["Fragile", "Leverage magnifies mistakes too."]],
    see: ["pe-fund", "pe-returns", "capital-structure", "credit"],
  },

  "pe-returns": {
    principle: "Returns are split by a <em>waterfall</em>: LPs get their money back plus a hurdle first, then the GP takes its carry. IRR and MOIC tell different stories about the same deal.",
    hook: "<p>A fund turns $1B into $2B. Who gets the extra $1B? Not a simple 80/20 split: there's an order, with hurdles and catch-ups, written into a 150-page limited partnership agreement. And whether the fund looks great depends on whether you measure IRR or MOIC.</p>",
    parts: [
      { h: "The distribution waterfall", sim: carrySim },
      { h: "IRR vs MOIC", sim: irrMoic },
      { h: "European vs American waterfalls", sim: () => table(["", "European (whole-fund)", "American (deal-by-deal)"], [["When the GP earns carry", "After LPs get all capital + hurdle on the whole fund", "On each profitable deal as it exits"], ["Who it favours", "LPs", "GPs (earlier carry)"], ["Risk", "Low", "GP may be overpaid if later deals lose → <b>clawback</b>"], ["Common in", "Europe, most LP-friendly funds", "US buyout funds historically"]]) },
    ],
    job: "<p>Fund finance and investor relations teams model waterfalls; fund lawyers draft LPAs; LPs negotiate terms (fee offsets, hurdles, key-person clauses) through the <b>ILPA</b> guidelines. Carry is taxed as capital gains in many countries (the <b>carried interest loophole</b> debate). Associates rarely get carry; partners' wealth mostly comes from it.</p>",
    terms: [["Distribution waterfall", "The order in which fund proceeds are paid out."], ["Preferred return", "Hurdle LPs receive before carry, often 8% a year."], ["Catch-up", "Tier where the GP gets most profits until it reaches its 20% share."], ["Clawback", "GP must return carry if later losses mean it was overpaid."], ["LPA", "Limited partnership agreement: the fund's legal terms."], ["Dividend recap", "Borrowing at a portfolio company to pay an early dividend."]],
    quiz: [
      ["A fund returns less than its 8% hurdle. GP carry is…", ["20% of profits", "Zero", "Half"], 1, "No carry until LPs get their preferred return."],
      ["Which deal has the higher IRR?", ["2× in 2 years", "3× in 8 years", "Same"], 0, "41% vs 15%. MOIC tells the opposite story."],
      ["A clawback protects…", ["GPs", "LPs", "Lenders"], 1, "It makes the GP return excess carry."],
    ],
    recap: [["Money back first", "Then hurdle, then catch-up, then 80/20."], ["IRR ≠ MOIC", "Speed vs size."], ["Clawback", "LP protection in deal-by-deal waterfalls."]],
    see: ["pe-fund", "lbo", "npv", "incentives"],
  },

  vc: {
    principle: "Venture capital bets on <em>a few huge winners paying for many losers</em>. The goal isn't to avoid mistakes; it's to not miss the outlier.",
    hook: "<p>In 2004 Peter Thiel put $500,000 into Facebook for about 10%. That stake became worth billions. Most of his other bets did far less. VC is a business where one deal in a portfolio of 30 can return 10 times the fund, and where the best firms are defined by the few companies they got right.</p>",
    parts: [
      { h: "The power law", sim: powerSim },
      { h: "Stages of funding", sim: () => table(["Stage", "Typical raise", "What investors bet on", "Who invests"], [["Pre-seed / angel", "$100k-1M", "Founders and an idea", "Angels, friends, accelerators (Y Combinator)"], ["Seed", "$1-5M", "Early product, first users", "Seed funds"], ["Series A", "$8-20M", "Product-market fit, repeatable growth", "Early-stage VCs"], ["Series B-C", "$20-100M", "Scaling sales, expanding markets", "Growth VCs"], ["Late stage / growth", "$100M+", "Path to profits and IPO", "Growth funds, crossover funds, PE"]]),
        after: "<p>Typical sizes vary a lot with the market: in 2021 rounds were huge; in 2023 they shrank and many companies raised <b>down rounds</b> (at lower valuations).</p>" },
      { h: "The VC method", html: "<p>VCs often value a startup backwards: guess the exit value, divide by the return they need, and that's what the company is worth today (adjusting for future dilution).</p>",
        sim: () => calc({ q: "A startup could plausibly sell for $500M in 7 years. A VC needs a 10× return on this deal. What post-money valuation can they pay today, in $M (ignoring later dilution)?", answer: 50, tol: 0.001, unit: "$M", why: "<p>500 ÷ 10 = <b>$50M post-money</b>. If they invest $10M, they'd want 20%. Later rounds will dilute them, so real term sheets adjust for that, or demand pro-rata rights.</p>" }) },
    ],
    job: "<p>VC <b>associates</b> source deals and do research; <b>partners</b> lead investments and sit on boards. Founders pitch and negotiate. Startup lawyers draft term sheets. Corporate venture arms (Google Ventures, Salesforce Ventures) invest strategically. Most VCs are judged on whether they found one or two fund-returners.</p>",
    terms: [["Venture capital", "Equity funding for young, high-growth, high-risk companies."], ["Power law", "A few outcomes are vastly larger than all others combined."], ["Pre-money / post-money", "Company value before / after the new investment."], ["Down round", "Raising at a lower valuation than before."], ["Pro-rata right", "Right to invest in later rounds to keep your ownership."], ["Product-market fit", "Clear evidence customers want and keep using the product."], ["Unicorn", "A private startup valued at $1B+."]],
    quiz: [
      ["VC returns are mostly driven by…", ["Average deals", "A few outsized winners", "Interest income"], 1, "The power law dominates."],
      ["$20M pre-money + $5M raise = post-money of…", ["$15M", "$25M", "$20M"], 1, "Post = pre + new money; investor owns 20%."],
      ["A VC passing on a company that later becomes huge is…", ["Rare and minor", "Common, and often their biggest mistake", "Impossible"], 1, "Errors of omission cost more than errors of commission in VC."],
    ],
    recap: [["Power law", "One winner pays for the fund."], ["Pre + cash = post", "The core valuation arithmetic."], ["Backwards", "VC method: exit value ÷ target multiple."]],
    see: ["cap-table", "ipo", "options", "risk"],
  },

  "cap-table": {
    principle: "A cap table records <em>who owns what</em>. Valuation headlines matter less than terms: preferences decide who actually gets paid.",
    hook: "<p>A startup sells for $100M. The founders own 50%, so they get $50M? Often not. If investors put in $80M with preferences, the founders might get far less, or nothing. Understanding the cap table and the term sheet is the difference between a life-changing exit and a surprise.</p>",
    parts: [
      { h: "Build the cap table", sim: capSim },
      { h: "Liquidation preferences", sim: prefSim },
      { h: "Term sheet glossary", sim: () => flips([["Liquidation preference", "Investors get their money back (×1, ×2...) before common shareholders."], ["Participating preferred", "Gets the preference <b>and</b> a share of the rest. Founder-unfriendly."], ["Anti-dilution", "Protects investors in a down round by adjusting their conversion price (broad-based weighted average is standard)."], ["Vesting", "Founders and staff earn shares over time, usually 4 years with a 1-year cliff."], ["SAFE / convertible note", "Seed money that converts to shares at the next round, often with a discount or valuation cap."], ["Drag-along", "Majority can force minorities to join a sale."]]) },
    ],
    job: "<p>Founders, CFOs and startup lawyers manage cap tables (on tools like Carta). VCs negotiate term sheets. In M&A of private companies, bankers run <b>waterfall analyses</b> to show each shareholder's payout. Employees should understand their options: strike price, preference stack, and what an exit really means for them.</p>",
    terms: [["Cap table", "Capitalisation table: who owns which shares."], ["Fully diluted", "Counting all options, warrants and convertibles as if converted."], ["Option pool", "Shares reserved for future employee grants."], ["Liquidation preference", "Investors' right to be repaid before common shareholders."], ["SAFE", "Simple agreement for future equity: converts at a later round."], ["Vesting cliff", "Period before any shares vest, typically 1 year."], ["Anti-dilution protection", "Adjusts investors' terms if later rounds are priced lower."]],
    quiz: [
      ["An investor put in $10M for 20% with a 1× non-participating preference. The company sells for $30M. Investor gets…", ["$6M", "$10M", "$16M"], 1, "Max of the $10M preference or 20% × 30 = $6M."],
      ["The option pool shuffle mainly dilutes…", ["New investors", "Existing shareholders, including founders", "Nobody"], 1, "The pool is carved out of the pre-money."],
      ["A SAFE converts into equity…", ["Immediately", "At a future priced round", "Never"], 1, "It's a promise of future equity."],
    ],
    recap: [["Raise ÷ post", "New investor's ownership."], ["Prefs", "Terms decide payouts more than headlines."], ["Pool", "Usually comes out of the pre-money."]],
    see: ["vc", "shares", "options", "negotiation"],
  },

  "hedge-funds": {
    principle: "A hedge fund is <em>a lightly regulated pool</em> that can go long, go short, use leverage and trade almost anything, aiming for returns that don't depend on the market's direction.",
    hook: "<p>Bridgewater, Citadel, Renaissance, Millennium: hedge funds manage around $4-5 trillion. Some, like Renaissance's Medallion fund, have produced returns that look impossible. Many others have charged high fees for index-like returns. The label covers wildly different strategies.</p>",
    parts: [
      { h: "Alpha vs beta", sim: lsSim },
      { h: "The strategy zoo", sim: () => flips([["Long/short equity", "Buy winners, short losers. The original hedge fund."], ["Global macro", "Bet on rates, currencies, commodities from big-picture views (Soros vs the pound, 1992)."], ["Quant / systematic", "Computer models trading thousands of signals (Renaissance, Two Sigma)."], ["Event-driven", "Mergers (merger arbitrage), spin-offs, bankruptcies."], ["Activist", "Buy a stake, push management for change (Elliott, Pershing Square)."], ["Multi-strategy / pod shops", "Hundreds of small teams with tight risk limits (Citadel, Millennium)."], ["Credit / distressed", "Trade debt of troubled companies."], ["Relative value", "Bet on price gaps between related securities closing (LTCM)."]]) },
      { h: "Fees", sim: () => calc({ q: "A fund charges 2% and 20% of profits. It makes 10% gross this year. What do investors keep, roughly?", answer: 6.4, tol: 0.02, unit: "%", hint: "Take 2% off, then 20% of what's left.", why: "<p>10 − 2 = 8%, minus 20% of 8% = <b>6.4%</b>. The manager kept over a third of the gross return. Warren Buffett won a famous 10-year bet (2008-2017) that an S&P 500 index fund would beat a set of hedge fund-of-funds after fees. It did, easily.</p>" }) },
    ],
    job: "<p>Analysts and portfolio managers research and trade; quants build models; risk managers enforce limits; prime brokers at banks lend money and securities. Pod shops hire ex-bank traders and analysts and fire them fast if they lose money. Allocators at pension funds and endowments choose which hedge funds to back.</p>",
    terms: [["Hedge fund", "A private investment fund with flexible strategies, leverage and shorting."], ["Alpha", "Return from skill, beyond market exposure."], ["Beta", "Return from market exposure."], ["Market neutral", "A portfolio with near-zero beta."], ["Prime broker", "Bank providing financing, securities lending and custody to hedge funds."], ["High-water mark", "Fund must recover past losses before charging performance fees again."], ["Merger arbitrage", "Betting that announced deals close, earning the price gap."]],
    quiz: [
      ["A market-neutral fund aims for beta close to…", ["1", "0", "−1"], 1, "Returns shouldn't depend on the market's direction."],
      ["A high-water mark means…", ["The fund's best year", "Performance fees only apply after recovering previous losses", "A leverage limit"], 1, "Protects investors from paying twice for the same gains."],
      ["Which strategy bets on announced acquisitions completing?", ["Global macro", "Merger arbitrage", "Long/short"], 1, "Buy the target below the offer price, earn the gap if the deal closes."],
    ],
    recap: [["α vs β", "Pay for skill, not market exposure."], ["Many strategies", "From macro to quant to activist."], ["2 and 20", "Fees eat a big slice of gross returns."]],
    see: ["short", "efficient", "capm", "leverage-loop"],
  },

  "real-assets": {
    principle: "Real estate is valued on <em>its income</em>: net operating income divided by a cap rate. Private credit is lending done by funds instead of banks.",
    hook: "<p>Real estate is the world's largest asset class: around $380 trillion, more than all stocks and bonds combined. It runs on leverage and interest rates. Meanwhile, since 2008, a new giant has grown up next to private equity: private credit funds lending directly to companies, now a $1.5-2 trillion market.</p>",
    parts: [
      { h: "Value a building", sim: reSim },
      { h: "Real estate strategies", sim: () => table(["Strategy", "What", "Leverage", "Target return"], [["Core", "Fully let, prime buildings in big cities", "Low (30-40%)", "6-8%"], ["Core-plus", "Good buildings needing light improvements", "40-55%", "8-11%"], ["Value-add", "Renovate, re-let, reposition", "55-70%", "11-15%"], ["Opportunistic", "Develop, rescue distressed assets", "70%+", "15%+"], ["REITs", "Listed real estate companies, must pay out most income", "Varies", "Like stocks + bonds"]]),
        after: "<p>Rough, typical ranges. <b>REITs</b> let ordinary investors own property through the stock market.</p>" },
      { h: "Private credit", html: "<p>After 2008 regulators made banks hold more capital against risky loans, so banks pulled back from lending to mid-sized, PE-owned companies. Funds (Ares, Blue Owl, Apollo, Blackstone) stepped in with <b>direct lending</b>: floating-rate senior loans at higher yields, faster and more flexible than banks or bond markets.</p>",
        sim: () => predict({ q: "Why might a PE firm choose a private credit loan over a syndicated bank loan, even at a higher interest rate?", options: ["It's always cheaper", "Speed, certainty of execution and flexible terms with one lender", "Regulation requires it"], answer: 1, why: "<p>One lender (or a small club) can commit quickly, keep things confidential and renegotiate privately if things go wrong. Critics worry about opacity and how these loans will behave in a real downturn.</p>" }) },
    ],
    job: "<p>Real estate PE (Blackstone Real Estate is the world's largest property owner), REIT analysts, property developers and lenders all live on NOI and cap rates. Private credit is one of the fastest-growing areas for finance careers: underwriting loans, structuring covenants, managing workouts. Infrastructure funds (toll roads, airports, data centres) sit in between.</p>",
    terms: [["NOI", "Net operating income: rent minus operating costs, before debt payments."], ["Cap rate", "NOI ÷ property value: real estate's earnings yield."], ["Loan-to-value (LTV)", "Mortgage as % of property value."], ["REIT", "Real estate investment trust: listed property company paying out most income."], ["Direct lending", "Private funds lending directly to companies."], ["Unitranche", "A single loan combining senior and junior debt, common in private credit."], ["Infrastructure", "Long-lived essential assets with stable, often regulated cash flows."]],
    quiz: [
      ["NOI $1M, cap rate 5%. Property value?", ["$5M", "$20M", "$50M"], 1, "1 ÷ 0.05 = $20M."],
      ["Cap rates rise from 5% to 6% with no change in NOI. Value falls about…", ["1%", "17%", "50%"], 1, "Value ∝ 1/cap rate: 5/6 = 0.83."],
      ["Private credit grew after 2008 mainly because…", ["Banks stepped back from riskier lending under new capital rules", "Interest rates were high", "Stocks fell"], 0, "Regulation pushed lending outside banks."],
    ],
    recap: [["NOI ÷ cap", "Real estate value."], ["Rates → caps", "Rising rates lift cap rates and cut values."], ["Private credit", "Funds replacing banks as lenders."]],
    see: ["pe-fund", "credit", "leverage-loop", "pv"],
  },

  ib: {
    principle: "An investment bank <em>connects companies that need money or deals with investors who have money</em>, earning fees for advice, underwriting and trading.",
    hook: "<p>Goldman Sachs, Morgan Stanley, JPMorgan, plus elite boutiques like Evercore, Lazard and PJT. They advise on the biggest mergers, take companies public, sell trillions in bonds, and make markets in almost everything. If you're heading into finance, you need to know who does what.</p>",
    parts: [
      { h: "Who does what", sim: () => flips([["M&A advisory", "Advise companies on buying, selling, merging. Fees on success, often 0.5-2% of deal value for mid-size deals."], ["ECM", "Equity capital markets: IPOs, follow-on share sales, convertibles."], ["DCM / leveraged finance", "Bonds and loans: investment-grade, high-yield, LBO financing."], ["Coverage", "Industry groups (tech, healthcare...) own client relationships."], ["Sales & trading", "Markets division: making markets in stocks, bonds, FX, commodities, derivatives for clients."], ["Equity research", "Analysts publish views on stocks (buy/hold/sell)."], ["Restructuring", "Advise distressed companies or their creditors."], ["Asset & wealth management", "Manage money for institutions and the rich."]]) },
      { h: "A sell-side M&A process", sim: () => stepper([
        { t: "1. Pitch and mandate", html: "<p>Banks pitch (pitch books full of comps and football fields). The client picks one and signs an engagement letter.</p>" },
        { t: "2. Preparation (4-8 weeks)", html: "<p>Build the model, write the <b>CIM</b> (confidential information memorandum) and a short <b>teaser</b>. Compile the buyer list: strategics and financial sponsors.</p>" },
        { t: "3. First round", html: "<p>Send teasers, sign NDAs, share the CIM. Buyers submit non-binding <b>indications of interest</b> with price ranges.</p>" },
        { t: "4. Second round", html: "<p>Shortlisted bidders get the <b>data room</b> and management presentations, then submit binding bids with a marked-up purchase agreement.</p>" },
        { t: "5. Negotiation and signing", html: "<p>Pick the winner, negotiate the SPA (price, reps and warranties, conditions), sign.</p>" },
        { t: "6. Closing", html: "<p>Regulatory approvals (antitrust), financing, shareholder votes. Then closing: money moves, the bank gets its success fee.</p>" },
      ]) },
      { h: "Banker life", html: "<p>Analysts (straight from university) build models and slides; associates (often post-MBA) manage analysts and check work; VPs run deals day to day; directors and MDs bring in clients. Hours are long (70-100 a week is common for analysts), pay is high, and the classic exit is to private equity after two years.</p>",
        sim: () => predict({ q: "In a sale process, why do banks invite both strategic buyers and PE funds?", options: ["Tradition", "Competition between different kinds of buyers lifts the price", "Regulation"], answer: 1, why: "<p>Strategics can pay for synergies; PE funds bring speed and financing. A real auction with credible alternatives is the seller's best tool (and the winner's curse is the buyer's risk).</p>" }) },
    ],
    job: "<p>This lesson is the job. Recruiting typically starts years early via internships; interviews test accounting (three-statement walk-throughs), valuation (DCF, comps), LBOs, M&A maths (accretion/dilution) and \"why banking?\". Every lesson in the accounting, valuation and private markets worlds is interview material.</p>",
    terms: [["Bulge bracket", "The largest global investment banks."], ["Elite boutique", "Advisory-focused banks without big lending or trading arms."], ["Pitch book", "Presentation banks use to win mandates."], ["CIM", "Confidential information memorandum describing a company for sale."], ["Data room", "Secure online store of documents for buyers' due diligence."], ["Indication of interest (IOI)", "Non-binding first-round bid."], ["Success fee", "Fee paid to advisers only if the deal closes."], ["Financial sponsor", "A PE firm, as a buyer."]],
    quiz: [
      ["Which division helps a company issue bonds?", ["ECM", "DCM", "M&A"], 1, "Debt capital markets."],
      ["The first document a potential buyer usually sees is…", ["The SPA", "The teaser", "The data room"], 1, "A short anonymous summary; the CIM comes after an NDA."],
      ["\"Financial sponsor\" means…", ["A bank", "A private equity buyer", "A government"], 1, "PE funds are called sponsors."],
    ],
    recap: [["Advise, raise, trade", "The three things banks do."], ["Two rounds", "The classic sell-side auction."], ["Exit to PE", "The well-worn career path."]],
    see: ["mna", "ipo", "lbo", "multiples"],
  },
};

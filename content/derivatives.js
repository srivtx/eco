// World 10: Derivatives.
import { h, usd, money, num, pct, clamp, rng } from "../lib/core.js";
import { slider, seg, stats, stage, predict, calc, callout, table, bars, button, flips, stepper } from "../lib/ui.js";
import { plot, columns } from "../lib/chart.js";

const W = "var(--wc)";
const N = (x) => { const t = 1 / (1 + 0.2316419 * Math.abs(x)), d = 0.3989423 * Math.exp((-x * x) / 2); const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return x > 0 ? 1 - p : p; };
export function bs(S, K, T, r, v, type = "call") {
  if (T <= 0) return Math.max(0, type === "call" ? S - K : K - S);
  const d1 = (Math.log(S / K) + (r + (v * v) / 2) * T) / (v * Math.sqrt(T)), d2 = d1 - v * Math.sqrt(T);
  return type === "call" ? S * N(d1) - K * Math.exp(-r * T) * N(d2) : K * Math.exp(-r * T) * N(-d2) - S * N(-d1);
}

/* ---------------- forwards ---------------- */
function hedgeSim() {
  let fwd = 6, spot = 6;
  const p = plot({ height: 260, x: [3, 10], y: [3, 10], xLabel: "wheat price at harvest ($/bushel)", yLabel: "what the farmer effectively gets", xFmt: (x) => usd(x), yFmt: (x) => usd(x), label: "Hedged vs unhedged" });
  const st = stats([{ label: "Unhedged farmer gets" }, { label: "Hedged farmer gets" }, { label: "Gain/loss on the forward" }]);
  const draw = () => {
    p.draw({ series: [{ name: "Unhedged (sell at harvest price)", color: "var(--bad)", pts: [[3, 3], [10, 10]] }, { name: "Hedged with a forward", color: W, pts: [[3, fwd], [10, fwd]], width: 4 }], dots: [{ x: spot, y: spot, color: "var(--bad)", r: 7 }, { x: spot, y: fwd, color: "#ffc21a", r: 8, label: `locked $${fwd}` }] });
    st.set(0, `$${spot}`); st.set(1, `$${fwd}`, "good"); st.set(2, `${fwd - spot >= 0 ? "+" : "−"}$${num(Math.abs(fwd - spot), 2)}`, fwd >= spot ? "good" : "bad");
  };
  const a = slider({ label: "Forward price agreed in spring", min: 4, max: 8, step: 0.25, value: fwd, fmt: (x) => `$${x}`, onInput: (x) => { fwd = x; draw(); } });
  const b = slider({ label: "Actual price at harvest", min: 3, max: 10, step: 0.25, value: spot, fmt: (x) => `$${x}`, onInput: (x) => { spot = x; draw(); } });
  draw();
  return stage({ title: "A farmer and a baker shake hands", controls: [a, b], body: [p.el, st.el], note: "In spring the farmer agrees to sell wheat to a baker at a fixed price in autumn. Whatever happens to the market, the farmer gets the forward price. The forward's gain or loss exactly offsets the market move. Certainty, not profit, is the point." });
}
function marginSim() {
  let path = 0;
  const p = plot({ height: 240, x: [0, 10], y: [-6000, 6000], xLabel: "day", yLabel: "margin account", xFmt: (x) => Math.round(x), yFmt: (x) => money(x), label: "Futures margin" });
  const log = h("div.game-log");
  const draw = () => {
    const r = rng(20 + path), contract = 5000 * 6, initial = 3000, maint = 2000; // 5,000 bushels at $6
    let price = 6, acct = initial; const pts = [[0, acct]]; log.replaceChildren();
    for (let d = 1; d <= 10; d++) {
      const move = (r() - 0.55) * 0.3; price += move; const pl = move * 5000; acct += pl;
      if (acct < maint) { log.prepend(h("div", `Day ${d}: price $${price.toFixed(2)}, account ${money(acct)} < maintenance $2,000 → MARGIN CALL: deposit ${money(initial - acct)}`)); acct = initial; }
      else log.prepend(h("div", `Day ${d}: price $${price.toFixed(2)} (${move >= 0 ? "+" : ""}${move.toFixed(2)}), P&L ${money(pl)}, account ${money(acct)}`));
      pts.push([d, acct]);
    }
    p.draw({ y: [0, 6000], series: [{ name: "Margin account (long 1 contract)", color: W, pts }], hlines: [{ y: maint, label: "maintenance margin", color: "var(--bad)" }] });
  };
  draw();
  return stage({ title: "Futures: settled every day", controls: [button("New random path", () => { path++; draw(); }, "primary")], body: [p.el, log], note: "Futures are standardised forwards traded on an exchange. Gains and losses are paid <b>every day</b> (marking to market) through a margin account, so nobody can build up a giant unpaid loss. If your account falls below the maintenance level, you must top it up, today." });
}

/* ---------------- payoff builder ---------------- */
const PRESETS = {
  "Long call": [["call", 1, 100]], "Long put": [["put", 1, 100]], "Covered call": [["stock", 1, 0], ["call", -1, 110]], "Protective put": [["stock", 1, 0], ["put", 1, 90]],
  "Straddle": [["call", 1, 100], ["put", 1, 100]], "Bull call spread": [["call", 1, 95], ["call", -1, 110]], "Iron condor": [["put", 1, 80], ["put", -1, 90], ["call", -1, 110], ["call", 1, 120]], "Short put": [["put", -1, 95]],
};
function payoffSim() {
  let name = "Long call", legs = PRESETS[name], vol = 30, showValue = true;
  const p = plot({ height: 300, x: [50, 150], y: [-40, 50], xLabel: "stock price at expiry", yLabel: "profit", xFmt: (x) => usd(x), yFmt: (x) => usd(x), label: "Option payoff" });
  const st = stats([{ label: "Cost to set up (premium)" }, { label: "Max profit" }, { label: "Max loss" }, { label: "Break-even(s)" }]);
  const tbl = h("div");
  const draw = () => {
    const prem = legs.reduce((a, [t, q, k]) => a + q * (t === "stock" ? 100 : bs(100, k, 0.25, 0.04, vol / 100, t)), 0);
    const pay = (S) => legs.reduce((a, [t, q, k]) => a + q * (t === "stock" ? S : t === "call" ? Math.max(0, S - k) : Math.max(0, k - S)), 0) - prem;
    const now = (S) => legs.reduce((a, [t, q, k]) => a + q * (t === "stock" ? S : bs(S, k, 0.12, 0.04, vol / 100, t)), 0) - prem;
    const pts = Array.from({ length: 201 }, (_, i) => [50 + i / 2, pay(50 + i / 2)]);
    const ys = pts.map((x) => x[1]), mx = Math.max(...ys), mn = Math.min(...ys);
    const be = []; for (let i = 1; i < pts.length; i++) if (Math.sign(pts[i][1]) !== Math.sign(pts[i - 1][1])) be.push(pts[i][0]);
    p.draw({ y: [Math.min(-20, mn * 1.15), Math.max(20, mx * 1.15)], series: [{ name: "At expiry", color: W, pts, width: 4 }, ...(showValue ? [{ name: "Six weeks before expiry", color: "#3b82f6", pts: pts.map(([S]) => [S, now(S)]), dash: "6 5" }] : [])], hlines: [{ y: 0 }],
      areas: [{ pts: [[50, 0], ...pts.map(([x, y]) => [x, Math.max(0, y)]), [150, 0]], color: "var(--up)", opacity: 0.18 }, { pts: [[50, 0], ...pts.map(([x, y]) => [x, Math.min(0, y)]), [150, 0]], color: "var(--down)", opacity: 0.18 }], vlines: [{ x: 100, label: "today $100" }] });
    const unl = (side) => { const a = pay(150), b = pay(149); const c = pay(50), d = pay(51); return side === "up" ? a - b > 0.05 : c - d > 0.05; };
    st.set(0, `${prem >= 0 ? "" : "receive "}$${num(Math.abs(prem), 2)}`); st.set(1, unl("up") || unl("down") ? "unlimited*" : `$${num(mx, 2)}`, "good"); st.set(2, pay(150) < pay(149) - 0.05 ? "unlimited*" : `$${num(-mn, 2)}`, "bad"); st.set(3, be.map((x) => usd(x)).join(" / ") || "none");
    tbl.replaceChildren(table(["Leg", "Position", "Strike"], legs.map(([t, q, k]) => [t === "stock" ? "Stock" : t === "call" ? "Call" : "Put", q > 0 ? "Buy" : "Sell", t === "stock" ? "–" : `$${k}`])));
  };
  const sg = seg({ label: "Strategy", options: Object.keys(PRESETS), value: name, onChange: (x) => { name = x; legs = PRESETS[x]; draw(); } });
  const v = slider({ label: "Volatility (sets option prices)", min: 10, max: 80, step: 5, value: vol, fmt: (x) => `${x}%`, onInput: (x) => { vol = x; draw(); } });
  const sv = seg({ label: "Show value before expiry", options: [{ value: true, label: "Yes" }, { value: false, label: "No" }], value: true, onChange: (x) => { showValue = x; draw(); } });
  draw();
  return stage({ title: "Build an options strategy", controls: [sg, v, sv], body: [p.el, st.el, tbl], note: "Profit per share for 3-month options on a $100 stock, priced with Black-Scholes. *Unlimited in theory: beyond the chart." });
}

/* ---------------- pricing ---------------- */
function bsSim() {
  const v = { S: 100, K: 100, T: 0.5, vol: 25, r: 4 };
  let type = "call";
  const p = plot({ height: 260, x: [50, 150], y: [0, 60], xLabel: "stock price today", yLabel: "option value", xFmt: (x) => usd(x), yFmt: (x) => usd(x), label: "Option value" });
  const st = stats([{ label: "Option price" }, { label: "Intrinsic value" }, { label: "Time value" }, { label: "Delta" }, { label: "Theta (per day)" }, { label: "Vega (per 1% vol)" }]);
  const draw = () => {
    const f = (S, T = v.T, vol = v.vol) => bs(S, v.K, T, v.r / 100, vol / 100, type);
    const price = f(v.S), intr = Math.max(0, type === "call" ? v.S - v.K : v.K - v.S);
    const delta = (f(v.S + 0.01) - f(v.S - 0.01)) / 0.02, theta = (f(v.S, Math.max(0, v.T - 1 / 365)) - price), vega = f(v.S, v.T, v.vol + 1) - price;
    p.draw({ series: [{ name: "Value now", color: W, pts: Array.from({ length: 101 }, (_, i) => [50 + i, f(50 + i)]), width: 4 }, { name: "Value at expiry (intrinsic)", color: "var(--ink)", pts: Array.from({ length: 101 }, (_, i) => [50 + i, Math.max(0, type === "call" ? 50 + i - v.K : v.K - 50 - i)]), dash: "6 5" }], dots: [{ x: v.S, y: price, color: "#ffc21a", r: 8, label: `$${num(price, 2)}` }] });
    st.set(0, `$${num(price, 2)}`, "accent"); st.set(1, `$${num(intr, 2)}`); st.set(2, `$${num(price - intr, 2)}`); st.set(3, num(delta, 2)); st.set(4, `$${num(theta, 3)}`, "bad"); st.set(5, `$${num(vega, 3)}`);
  };
  const mk = (k, label, min, max, step, fmt) => slider({ label, min, max, step, value: v[k], fmt, onInput: (x) => { v[k] = x; draw(); } });
  const sg = seg({ label: "Type", options: [{ value: "call", label: "Call" }, { value: "put", label: "Put" }], value: type, onChange: (x) => { type = x; draw(); } });
  draw();
  return stage({ title: "Black-Scholes, live", controls: [sg, mk("S", "Stock price", 50, 150, 1, (x) => `$${x}`), mk("K", "Strike", 50, 150, 1, (x) => `$${x}`), mk("T", "Time to expiry (years)", 0.02, 2, 0.02, (x) => `${x.toFixed(2)}y`), mk("vol", "Volatility", 5, 100, 1, (x) => `${x}%`), mk("r", "Interest rate", 0, 10, 0.25, (x) => `${x}%`)], body: [p.el, st.el], note: "The gap between the solid curve and the dashed line is <b>time value</b>: the chance things get better before expiry. It melts every day (theta) and grows with volatility (vega)." });
}
function treeSim() {
  let up = 20;
  const box = h("div");
  const draw = () => {
    const S = 100, K = 100, u = 1 + up / 100, d = 1 / u, r = 0.0;
    const q = (1 + r - d) / (u - d), cu = Math.max(0, S * u - K), cd = Math.max(0, S * d - K), c = q * cu + (1 - q) * cd;
    const delta = (cu - cd) / (S * u - S * d), bond = c - delta * S;
    box.innerHTML = `<svg viewBox="0 0 520 220" style="width:100%;max-width:560px"><g font-family="var(--mono)" font-size="13" fill="var(--ink)">
      <line x1="90" y1="110" x2="330" y2="40" stroke="var(--ink)" stroke-width="2.5"/><line x1="90" y1="110" x2="330" y2="180" stroke="var(--ink)" stroke-width="2.5"/>
      <rect x="20" y="80" width="140" height="60" rx="10" fill="var(--surface)" stroke="var(--ink)" stroke-width="2.5"/><text x="90" y="105" text-anchor="middle">stock $${S}</text><text x="90" y="126" text-anchor="middle" font-weight="800" fill="var(--wc)">call $${c.toFixed(2)}</text>
      <rect x="300" y="10" width="200" height="60" rx="10" fill="color-mix(in srgb, #22c55e 18%, var(--surface))" stroke="var(--ink)" stroke-width="2.5"/><text x="400" y="35" text-anchor="middle">stock $${(S * u).toFixed(2)}</text><text x="400" y="56" text-anchor="middle" font-weight="800">call pays $${cu.toFixed(2)}</text>
      <rect x="300" y="150" width="200" height="60" rx="10" fill="color-mix(in srgb, #e5484d 15%, var(--surface))" stroke="var(--ink)" stroke-width="2.5"/><text x="400" y="175" text-anchor="middle">stock $${(S * d).toFixed(2)}</text><text x="400" y="196" text-anchor="middle" font-weight="800">call pays $${cd.toFixed(2)}</text>
      <text x="205" y="62" text-anchor="middle" font-size="12">q = ${q.toFixed(2)}</text><text x="205" y="168" text-anchor="middle" font-size="12">1 − q = ${(1 - q).toFixed(2)}</text></g></svg>
      <p class="muted">Replicate the call: buy <b>${delta.toFixed(3)} shares</b> and ${bond >= 0 ? "lend" : "borrow"} <b>$${Math.abs(bond).toFixed(2)}</b>. That portfolio pays exactly what the call pays in both states, so the call must cost the same: <b>$${c.toFixed(2)}</b>. Nobody's opinion about the odds of going up enters the price: only volatility does.</p>`;
  };
  const a = slider({ label: "Up/down move size (volatility)", min: 2, max: 50, value: up, fmt: (x) => `±${x}%`, onInput: (x) => { up = x; draw(); } });
  draw();
  return stage({ title: "One-step binomial tree (at-the-money call, rates 0)", controls: [a], body: [box] });
}

/* ---------------- swaps ---------------- */
function swapSim() {
  let fixed = 4, drift = 0;
  const p = plot({ height: 260, x: [1, 10], y: [0, 9], xLabel: "year", yLabel: "rate", xFmt: (x) => `Y${Math.round(x)}`, yFmt: (x) => `${num(x)}%`, label: "Swap legs" });
  const st = stats([{ label: "Fixed payer pays (total)" }, { label: "Floating received (total)" }, { label: "Fixed payer's net" }]);
  const draw = () => {
    const fl = Array.from({ length: 10 }, (_, i) => [i + 1, Math.max(0, 3.5 + (drift * i) / 9 + Math.sin(i) * 0.4)]);
    const notional = 100; // $M
    const pf = fixed * 10, rf = fl.reduce((a, x) => a + x[1], 0);
    p.draw({ series: [{ name: "Fixed leg", color: "#3b82f6", pts: [[1, fixed], [10, fixed]], width: 4 }, { name: "Floating leg (SOFR path)", color: W, pts: fl, width: 4 }], areas: [{ pts: [[1, fixed], ...fl, [10, fixed]], color: W, opacity: 0.18 }] });
    st.set(0, `$${num((pf * notional) / 100, 1)}M`); st.set(1, `$${num((rf * notional) / 100, 1)}M`); st.set(2, `${rf - pf >= 0 ? "+" : "−"}$${num((Math.abs(rf - pf) * notional) / 100, 1)}M`, rf >= pf ? "good" : "bad");
  };
  const a = slider({ label: "Fixed rate agreed", min: 1, max: 8, step: 0.25, value: fixed, fmt: (x) => `${x}%`, onInput: (x) => { fixed = x; draw(); } });
  const b = slider({ label: "Where floating rates go", min: -3, max: 4, step: 0.25, value: drift, fmt: (x) => `${x > 0 ? "+" : ""}${x}%`, onInput: (x) => { drift = x; draw(); } });
  draw();
  return stage({ title: "A 10-year interest rate swap on $100M", controls: [a, b], body: [p.el, st.el], note: "A company with a floating-rate loan pays fixed and receives floating in a swap. Its floating receipts cancel its loan payments, leaving it paying a fixed rate: certainty. Only the <i>difference</i> changes hands; the $100M notional never moves." });
}

/* ---------------- leverage ---------------- */
function levSim() {
  let lev = 5, move = -10;
  const st = stats([{ label: "Your money" }, { label: "Position size" }, { label: "Price move" }, { label: "Return on your money" }]);
  const msg = h("p.muted");
  const draw = () => {
    const eq = 10000, pos = eq * lev, pl = (pos * move) / 100, ret = pl / eq;
    st.set(0, money(eq)); st.set(1, money(pos)); st.set(2, `${move > 0 ? "+" : ""}${move}%`); st.set(3, ret <= -1 ? "wiped out" : `${ret >= 0 ? "+" : ""}${pct(ret, 0)}`, ret >= 0 ? "good" : "bad");
    msg.innerHTML = `At ${lev}× leverage, a <b>${num(100 / lev, 1)}%</b> fall wipes out your money. ${ret <= -1 ? "You also owe the broker " + money(-pl - eq) + "." : ""}`;
  };
  const a = slider({ label: "Leverage", min: 1, max: 50, value: lev, fmt: (x) => `${x}×`, onInput: (x) => { lev = x; draw(); } });
  const b = slider({ label: "Price move", min: -30, max: 30, value: move, fmt: (x) => `${x}%`, onInput: (x) => { move = x; draw(); } });
  draw();
  return stage({ title: "Leverage", controls: [a, b], body: [st.el, msg] });
}

export default {
  forwards: {
    principle: "A forward is <em>a deal today to trade later at a fixed price</em>. It turns an uncertain future price into a certain one.",
    hook: "<p>Derivatives sound exotic, but the oldest ones are agricultural: Japanese rice futures traded in Osaka in the 1700s. A farmer wants a certain price for next year's crop; a baker wants a certain cost for next year's flour. They agree a price now. That's a forward contract.</p>",
    parts: [
      { h: "Hedge the harvest", sim: hedgeSim },
      { h: "Futures: forwards on an exchange", sim: marginSim },
      { h: "What should a forward cost?", html: "<p>Not a forecast! If gold is $2,000 today and interest rates are 5%, a 1-year gold forward should be about $2,100. Why? You could borrow $2,000, buy gold, store it, and deliver it in a year: cost $2,100. If the forward were higher, traders would do exactly that and pocket the gap: <em>cash-and-carry arbitrage</em>. So F = S × (1 + r − income + storage).</p>",
        sim: () => calc({ q: "A stock costs $50, pays no dividend, and rates are 4%. Fair 1-year forward price?", answer: 52, tol: 0.002, unit: "$", why: "<p>50 × 1.04 = <b>$52</b>. If the stock paid a $1 dividend, the forward would be about $1 lower: owning the stock would earn it, the forward doesn't.</p>" }) },
    ],
    job: "<p>Commodity producers and consumers (airlines, food companies, miners) hedge with forwards and futures. Treasury teams hedge currency exposure with FX forwards. Futures traders and market makers provide the other side. Exchanges like CME and ICE run the clearing houses that make futures safe.</p>",
    terms: [["Derivative", "A contract whose value depends on something else (the underlying)."], ["Forward", "Private agreement to trade an asset at a fixed price on a future date."], ["Futures", "Standardised forwards traded on exchanges, settled daily."], ["Spot price", "Price for immediate delivery."], ["Marking to market", "Settling gains and losses daily."], ["Margin", "Collateral posted to cover potential losses."], ["Cost of carry", "Financing and storage costs that link forward and spot prices."]],
    quiz: [
      ["The farmer sold forward at $6. At harvest the price is $8. The farmer…", ["Gets $8", "Effectively gets $6", "Gets $14"], 1, "The market gain is offset by the forward loss: $6 locked."],
      ["Why are futures settled daily?", ["Tradition", "To stop large unpaid losses building up", "Taxes"], 1, "Daily margin limits counterparty risk."],
      ["Gold $2,000, rates 5%, no storage costs. 1-year forward ≈", ["$1,900", "$2,000", "$2,100"], 2, "Cost of buying now and carrying: 2,000 × 1.05."],
    ],
    recap: [["Lock it", "Forwards trade uncertainty for certainty."], ["Daily", "Futures settle every day via margin."], ["S × (1 + r)", "Forward price from cost of carry, not forecasts."]],
    see: ["hedging", "options", "swaps", "fx"],
  },

  options: {
    principle: "An option gives <em>the right, but not the obligation</em>, to buy (call) or sell (put) at a set price. You pay a premium for that choice.",
    hook: "<p>Paying a deposit to hold a flat at today's price for three months is a call option: if prices rise, you buy cheap; if they fall, you walk away, losing only the deposit. Options let you shape risk: cap losses, bet on volatility, or earn income by selling insurance.</p>",
    parts: [
      { h: "Payoffs", sim: payoffSim },
      { h: "The vocabulary", sim: () => flips([["Call", "Right to <b>buy</b> at the strike. Profits when the price rises."], ["Put", "Right to <b>sell</b> at the strike. Profits when the price falls: insurance."], ["Strike", "The fixed price in the contract."], ["Premium", "What you pay for the option."], ["In / at / out of the money", "Would exercising now pay? In: yes. At: break-even. Out: no."], ["American vs European", "American can be exercised any time; European only at expiry."]]) },
      { h: "Practise", sim: () => calc({ q: "You buy a call with strike $100 for $5. At expiry the stock is $112. Profit per share?", answer: 7, tol: 0.001, unit: "$", why: "<p>Exercise value 112 − 100 = $12, minus the $5 premium = <b>$7</b>. Break-even was $105.</p>" }) },
    ],
    job: "<p>Options desks at banks and market makers (Susquehanna, Optiver, Citadel Securities) quote millions of options. Fund managers buy puts to protect portfolios. Companies pay staff in stock options (whose cost must be estimated with option pricing). PE and VC securities often contain option-like features: liquidation preferences, warrants, convertibles.</p>",
    terms: [["Call option", "Right to buy at the strike price."], ["Put option", "Right to sell at the strike price."], ["Strike price", "The price at which the option can be exercised."], ["Premium", "Price paid for an option."], ["Expiry", "Last day the option exists."], ["Intrinsic value", "What the option would pay if exercised now."], ["Covered call", "Owning the stock and selling a call: income for capped upside."], ["Protective put", "Owning the stock and buying a put: insurance against a fall."]],
    quiz: [
      ["The most a call buyer can lose is…", ["Unlimited", "The premium paid", "The strike price"], 1, "You can always just let it expire."],
      ["A straddle (long call + long put, same strike) profits when…", ["The price stays still", "The price moves a lot either way", "Rates rise"], 1, "It's a bet on volatility."],
      ["Selling a put is similar to…", ["Selling insurance", "Buying insurance", "Owning bonds"], 0, "You collect a premium and pay out if the price falls."],
    ],
    recap: [["Right, not obligation", "Buyers' loss capped at the premium."], ["Call ↑ / put ↓", "Calls gain on rises, puts on falls."], ["Shape risk", "Combine legs into any payoff."]],
    see: ["option-pricing", "hedging", "short", "cap-table"],
  },

  "option-pricing": {
    principle: "An option's price comes from <em>how much the underlying might move</em> (volatility) and how long it has to move, not from anyone's forecast.",
    hook: "<p>In 1973 Fischer Black, Myron Scholes and Robert Merton showed how to price an option by building a portfolio of stock and cash that copies it exactly. The formula launched the modern derivatives industry and a Nobel Prize. The key insight is beautifully simple: if you can copy something, it must cost what the copy costs.</p>",
    parts: [
      { h: "Copy it to price it", sim: treeSim },
      { h: "Black-Scholes and the Greeks", sim: bsSim },
      { h: "The Greeks in one table", sim: () => table(["Greek", "Measures", "Call", "Put"], [["Delta (Δ)", "Price change per $1 move in the stock", "0 to 1", "−1 to 0"], ["Gamma (Γ)", "How fast delta changes", "+", "+"], ["Theta (Θ)", "Value lost per day as time passes", "− (usually)", "− (usually)"], ["Vega (ν)", "Value change per 1% change in volatility", "+", "+"], ["Rho (ρ)", "Value change per 1% change in rates", "+", "−"]]),
        after: "<p><b>Implied volatility</b> is the volatility that makes Black-Scholes match the market price: the market's fear gauge. The VIX index is implied volatility on S&P 500 options. And since real markets crash more often than the model's bell curve assumes, out-of-the-money puts trade at higher implied vols: the <em>volatility smile</em> (or skew).</p>" },
    ],
    job: "<p>Options traders manage portfolios by their Greeks: a delta-neutral book makes money from volatility, not direction. Quants build pricing models for exotic derivatives. Risk managers aggregate Greeks across a bank. Accountants value employee stock options with Black-Scholes. VC term sheets (liquidation preferences) are valued with option models too.</p>",
    terms: [["Black-Scholes model", "Formula for European option prices from S, K, T, r and volatility."], ["Binomial tree", "Model where the price moves up or down each step."], ["Replication", "Building a portfolio that copies an option's payoff."], ["Implied volatility", "Volatility that makes the model match the market price."], ["Delta", "Option price sensitivity to the underlying price."], ["Theta", "Time decay of an option's value."], ["VIX", "Index of implied volatility on S&P 500 options."]],
    quiz: [
      ["Raising volatility makes a call option…", ["Cheaper", "More expensive", "Unchanged"], 1, "More chance of a big upside; downside is capped."],
      ["Raising volatility makes a put option…", ["Cheaper", "More expensive", "Unchanged"], 1, "Both calls and puts gain from volatility."],
      ["Why doesn't the expected return of the stock enter Black-Scholes?", ["It's too hard to estimate", "The option is priced by replication, which works whatever the odds", "It's always zero"], 1, "If you can copy it, the copy's cost is the price."],
    ],
    recap: [["Copy", "Replication sets the price."], ["Vol", "Volatility drives option value."], ["Greeks", "Delta, gamma, theta, vega, rho: the risk dashboard."]],
    see: ["options", "risk", "hedging", "vc"],
  },

  swaps: {
    principle: "A swap is <em>two parties exchanging streams of payments</em>, most often fixed interest for floating.",
    hook: "<p>Interest rate swaps are the biggest derivatives market by far: hundreds of trillions of dollars of notional. They let a company turn a floating-rate loan into a fixed one, a bank match its assets to its deposits, and a fund bet on rates without buying a single bond.</p>",
    parts: [
      { h: "Fixed for floating", sim: swapSim },
      { h: "The swap family", sim: () => flips([["Interest rate swap", "Fixed rate for floating (SOFR in the US, SONIA in the UK). The workhorse."], ["Currency swap", "Swap principal and interest in two currencies: fund abroad, pay in your own money."], ["Credit default swap (CDS)", "Pay a premium; get paid if a borrower defaults. Insurance on debt, and the AIG story of 2008."], ["Total return swap", "Receive an asset's total return without owning it. How Archegos built hidden leverage in 2021."], ["Commodity swap", "Fixed price for floating price on oil, gas, metals."]]) },
      { h: "Check", sim: () => predict({ q: "A company pays fixed 4% and receives floating in a swap. Floating rates rise to 6%. The swap is now…", options: ["An asset for the company", "A liability for the company", "Worth nothing"], answer: 0, why: "<p>It receives 6% and pays 4%: the swap gains value, offsetting the higher payments on its floating loan. That's the hedge working.</p>" }) },
    ],
    job: "<p>Rates desks at banks make markets in swaps; corporate treasuries hedge with them; DCM bankers pair new bonds with swaps. CDS traders and credit funds trade default risk. After 2008, most standard swaps must be <b>centrally cleared</b>, so a clearing house stands between the two sides.</p>",
    terms: [["Swap", "Exchange of payment streams between two parties."], ["Notional", "The reference amount payments are calculated on; usually not exchanged."], ["Fixed leg / floating leg", "The two sides of an interest rate swap."], ["SOFR", "US overnight benchmark rate that replaced LIBOR."], ["Credit default swap", "Protection against a borrower's default, for a regular premium."], ["Central clearing", "A clearing house becomes the counterparty to both sides."]],
    quiz: [
      ["In a standard interest rate swap, the notional…", ["Is exchanged at start and end", "Usually isn't exchanged; it just sets the payment sizes", "Is paid as a fee"], 1, "Only net interest differences change hands."],
      ["A company with a floating-rate loan worried about rising rates should…", ["Receive fixed, pay floating", "Pay fixed, receive floating", "Do nothing"], 1, "Paying fixed locks its cost."],
      ["A CDS buyer gets paid when…", ["Rates fall", "The reference borrower defaults", "Stocks rise"], 1, "It's insurance on default."],
    ],
    recap: [["Swap streams", "Fixed for floating is the classic."], ["Notional", "Sets sizes; rarely changes hands."], ["CDS", "Insurance on default."]],
    see: ["forwards", "duration", "crisis-2008", "credit"],
  },

  hedging: {
    principle: "The same derivative <em>reduces risk for a hedger and adds it for a speculator</em>. Leverage is what makes derivatives powerful and dangerous.",
    hook: "<p>Southwest Airlines hedged jet fuel in the early 2000s and saved billions when oil soared. Metallgesellschaft hedged oil in 1993 and lost $1.3B when the hedge's daily cash calls drained it. Nick Leeson speculated on Japanese futures and destroyed 233-year-old Barings Bank. Same tools, very different outcomes.</p>",
    parts: [
      { h: "Leverage", sim: levSim },
      { h: "Hedge or bet?", sim: () => table(["Who", "Exposure", "Uses", "Effect"], [["Airline", "Loses if fuel rises", "Buys oil futures/calls", "Hedge: locks fuel cost"], ["Exporter paid in USD", "Loses if USD falls", "Sells USD forward", "Hedge: locks exchange rate"], ["Pension fund", "Loses if stocks crash", "Buys index puts", "Hedge: insurance"], ["Hedge fund", "No exposure", "Buys oil futures", "Speculation: takes on risk"], ["Market maker", "Inventory from clients", "Delta-hedges with stock", "Hedge: stays neutral"]]),
        after: "<p>Speculators aren't villains: they take the other side of hedgers' trades, providing the liquidity hedgers need. The danger is hidden, concentrated leverage (Archegos, LTCM, AIG).</p>" },
      { h: "Hedges have costs and gaps", html: "<ul><li><b>Basis risk</b>: the hedge doesn't move exactly with your exposure (jet fuel vs crude oil futures).</li><li><b>Liquidity risk</b>: daily margin calls can drain cash before the hedge pays off.</li><li><b>Opportunity cost</b>: lock in a price and you miss out if prices move your way.</li><li><b>Counterparty risk</b>: the other side might not pay (AIG in 2008).</li></ul>",
        sim: () => calc({ q: "An airline needs 10M gallons of fuel. Each futures contract covers 42,000 gallons, and the hedge ratio is 0.9. How many contracts (round to nearest)?", answer: 214, tol: 0.005, why: "<p>10,000,000 × 0.9 ÷ 42,000 ≈ <b>214 contracts</b>.</p>" }) },
    ],
    job: "<p>Corporate treasurers design hedging programmes (and must explain them to boards and auditors under hedge accounting rules). Risk managers check that \"hedges\" aren't secret bets. Commodity trading houses (Glencore, Vitol, Cargill) hedge and speculate constantly. Regulators require margin and reporting on derivatives since 2008 to stop hidden leverage.</p>",
    terms: [["Hedging", "Taking a position to offset an existing risk."], ["Speculation", "Taking risk to profit from expected price moves."], ["Leverage", "Controlling a large position with a small amount of money."], ["Basis risk", "The hedge and the exposure don't move perfectly together."], ["Hedge ratio", "Size of the hedge relative to the exposure."], ["Counterparty risk", "Risk the other side of a contract fails to pay."]],
    quiz: [
      ["At 10× leverage, what price fall wipes out your equity?", ["1%", "10%", "50%"], 1, "Equity is 10% of the position."],
      ["An airline buying oil futures is…", ["Speculating", "Hedging its fuel costs", "Short selling"], 1, "Gains on futures offset higher fuel bills."],
      ["Metallgesellschaft's hedge failed mainly because of…", ["Fraud", "Cash drained by margin calls before the hedge paid off", "Low volatility"], 1, "Liquidity risk: right in the long run, broke in the short run."],
    ],
    recap: [["Same tool", "Hedge or bet: it depends on your exposure."], ["1 ÷ L", "The fall that wipes out a leveraged position."], ["Gaps", "Basis, liquidity, counterparty risk."]],
    see: ["forwards", "options", "leverage-loop", "fx"],
  },
};

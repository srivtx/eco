// World 5: Time & money.
import { h, money, num, pct, clamp, rng } from "../lib/core.js";
import { slider, seg, stats, stage, predict, calc, callout, table, bars, button, flips, stepper, formula } from "../lib/ui.js";
import { plot, columns, donut } from "../lib/chart.js";

const W = "var(--wc)", INK = "var(--ink)";

/* ---------------- compound ---------------- */
function compoundSim() {
  let P0 = 10000, r = 7, yrs = 40, add = 200;
  const p = plot({ height: 300, x: [0, 40], y: [0, 1], xLabel: "years", yLabel: "balance", xFmt: (v) => Math.round(v), yFmt: (v) => money(v), label: "Compound growth" });
  const st = stats([{ label: "You put in" }, { label: "Growth earned" }, { label: "Final balance" }, { label: "Simple interest would give" }]);
  const draw = () => {
    const comp = [], simple = [], paid = [];
    let b = P0, s = P0, put = P0;
    for (let t = 0; t <= yrs; t++) { comp.push([t, b]); simple.push([t, s]); paid.push([t, put]); b = b * (1 + r / 100) + add * 12; s = s + P0 * (r / 100) + add * 12; put += add * 12; }
    const end = comp.at(-1)[1], inn = paid.at(-1)[1];
    p.draw({ x: [0, yrs], y: [0, end * 1.08], series: [{ name: "Compound", color: W, pts: comp, area: true }, { name: "Simple interest", color: "#3b82f6", pts: simple, dash: "6 5" }, { name: "Money you put in", color: INK, pts: paid, width: 2 }] });
    st.set(0, money(inn)); st.set(1, money(end - inn), "good"); st.set(2, money(end)); st.set(3, money(simple.at(-1)[1]));
  };
  const c = [
    slider({ label: "Starting amount", min: 0, max: 100000, step: 1000, value: P0, fmt: (v) => money(v), onInput: (v) => { P0 = v; draw(); } }),
    slider({ label: "Added every month", min: 0, max: 2000, step: 50, value: add, fmt: (v) => money(v), onInput: (v) => { add = v; draw(); } }),
    slider({ label: "Return per year", min: 0, max: 15, step: 0.5, value: r, fmt: (v) => `${v}%`, onInput: (v) => { r = v; draw(); } }),
    slider({ label: "Years", min: 1, max: 60, value: yrs, onInput: (v) => { yrs = v; draw(); } }),
  ];
  draw();
  return stage({ title: "Growth on growth", controls: c, body: [p.el, st.el], note: "Simple interest pays only on what you put in. Compound interest pays on the interest too, so the curve bends upward. Over long periods, most of the final balance is growth, not your money." });
}
function earlyLate() {
  const r = 0.07, a = [], b = [];
  let A = 0, B = 0;
  for (let age = 25; age <= 65; age++) { a.push([age, A]); b.push([age, B]); A = A * (1 + r) + (age < 35 ? 5000 : 0); B = B * (1 + r) + (age >= 35 ? 5000 : 0); }
  const p = plot({ height: 260, x: [25, 65], y: [0, a.at(-1)[1] * 1.1], xLabel: "age", yLabel: "balance", xFmt: (v) => Math.round(v), yFmt: (v) => money(v), label: "Start early vs late" });
  p.draw({ series: [{ name: "Early Emma: $5k/yr age 25-34, then stops ($50k in)", color: W, pts: a }, { name: "Late Liam: $5k/yr age 35-64 ($150k in)", color: "#3b82f6", pts: b }] });
  return stage({ title: "Emma vs Liam at 7% a year", body: [p.el, h("p.muted", { html: `At 65, Emma has <b>${money(A)}</b> from $50k; Liam has <b>${money(B)}</b> from $150k. Emma's ten-year head start beats Liam's thirty years of saving.` })] });
}

/* ---------------- PV ---------------- */
function pvSim() {
  let fv = 1000, r = 8, n = 10;
  const p = plot({ height: 260, x: [0, 30], y: [0, 1000], xLabel: "years until you get the money", yLabel: "worth today", xFmt: (v) => Math.round(v), yFmt: (v) => money(v), label: "Present value" });
  const st = stats([{ label: "Present value" }, { label: "Discount factor" }, { label: "Lost to waiting" }]);
  const draw = () => {
    const pts = Array.from({ length: 31 }, (_, t) => [t, fv / Math.pow(1 + r / 100, t)]);
    const pv = fv / Math.pow(1 + r / 100, n);
    p.draw({ y: [0, fv * 1.05], series: [{ name: "PV", color: W, pts, area: true }], dots: [{ x: n, y: pv, color: "#ffc21a", label: money(pv), r: 8 }], vlines: [{ x: n }] });
    st.set(0, money(pv)); st.set(1, num(1 / Math.pow(1 + r / 100, n), 3)); st.set(2, money(fv - pv), "bad");
  };
  const c = [slider({ label: "Amount in the future", min: 100, max: 10000, step: 100, value: fv, fmt: (v) => money(v), onInput: (v) => { fv = v; draw(); } }), slider({ label: "Discount rate", min: 0, max: 20, step: 0.5, value: r, fmt: (v) => `${v}%`, onInput: (v) => { r = v; draw(); } }), slider({ label: "Years away", min: 0, max: 30, value: n, onInput: (v) => { n = v; draw(); } })];
  draw();
  return stage({ title: "What's future money worth now?", controls: c, body: [p.el, st.el] });
}
function patienceTest() {
  const offers = [105, 110, 120, 135, 160, 200];
  let i = 0, rate = null;
  const q = h("p.q"), out = h("div");
  const show = () => { q.innerHTML = i < offers.length ? `Would you rather have <b>$100 today</b> or <b>${money(offers[i])} in one year</b>?` : ""; };
  const answer = (wait) => {
    if (wait) { rate = offers[i] / 100 - 1; finish(); return; }
    i++; if (i >= offers.length) { rate = 1.01; finish(); return; } show();
  };
  const finish = () => {
    q.innerHTML = "";
    out.replaceChildren(h("div.big-num", rate > 1 ? "> 100%" : pct(rate, 0)), h("p.muted", { html: `That's your <b>personal discount rate</b>: the return you need to wait a year. ${rate <= 0.1 ? "Patient! Close to what markets pay." : rate <= 0.35 ? "Higher than market rates (5-10%): most people are like this, especially with small sums." : "Very impatient. Present bias is real: the psychology world has a whole lesson on it."}` }));
  };
  show();
  return stage({ title: "How patient are you?", body: [q, h("div.game-btns", button("$100 today", () => answer(false)), button("Wait a year", () => answer(true), "primary")), out] });
}

/* ---------------- NPV / IRR ---------------- */
function npvSim() {
  const cf = [-1000, 250, 300, 350, 300, 250];
  let r = 10;
  const p = plot({ height: 260, x: [0, 40], y: [-500, 600], xLabel: "discount rate", yLabel: "NPV", xFmt: (v) => `${num(v)}%`, yFmt: (v) => money(v), label: "NPV profile" });
  const st = stats([{ label: "NPV at your rate" }, { label: "IRR" }, { label: "Payback" }, { label: "Verdict" }]);
  const tbl = h("div");
  const npv = (rate) => cf.reduce((a, c, t) => a + c / Math.pow(1 + rate / 100, t), 0);
  const irr = () => { let lo = -50, hi = 200; for (let k = 0; k < 80; k++) { const m = (lo + hi) / 2; npv(m) > 0 ? (lo = m) : (hi = m); } return (lo + hi) / 2; };
  const draw = () => {
    const pts = Array.from({ length: 81 }, (_, i) => [i / 2, npv(i / 2)]);
    const I = irr(), N = npv(r);
    let acc = 0, pb = null; cf.forEach((c, t) => { const before = acc; acc += c; if (pb == null && acc >= 0 && t > 0) pb = t - 1 + -before / c; });
    p.draw({ y: [Math.min(-300, ...pts.map((x) => x[1])), Math.max(300, ...pts.map((x) => x[1])) * 1.1], series: [{ name: "NPV", color: W, pts }], hlines: [{ y: 0 }], dots: [{ x: r, y: N, color: "#ffc21a", label: `your rate: ${money(N)}`, r: 8 }, ...(I > 0 && I < 40 ? [{ x: I, y: 0, color: "var(--surface)", label: `IRR ${num(I, 1)}%`, r: 6, dy: 20 }] : [])] });
    st.set(0, money(N), N >= 0 ? "good" : "bad"); st.set(1, `${num(I, 1)}%`); st.set(2, pb == null ? "never" : `${num(pb, 1)} yrs`); st.set(3, N >= 0 ? "Do it" : "Skip it", N >= 0 ? "good" : "bad");
    tbl.replaceChildren(columns(cf.map((c, t) => ({ label: `Y${t}`, value: c / Math.pow(1 + r / 100, t), show: money(c / Math.pow(1 + r / 100, t)), color: c < 0 ? "var(--bad)" : W })), { height: 170, fmt: money, label: "Discounted cash flows" }));
  };
  const c = [slider({ label: "Discount rate (cost of capital)", min: 0, max: 40, step: 0.5, value: r, fmt: (v) => `${v}%`, onInput: (v) => { r = v; draw(); } }),
    ...cf.map((v, t) => slider({ label: t ? `Cash in year ${t}` : "Cost today (year 0)", min: t ? 0 : -3000, max: t ? 1000 : 0, step: 50, value: v, fmt: (x) => money(x), onInput: (x) => { cf[t] = x; draw(); } }))];
  draw();
  return stage({ title: "Should we build the new machine?", controls: c, body: [tbl, p.el, st.el], note: "Bars show each year's cash in today's money. The curve shows NPV at every possible discount rate; where it crosses zero is the IRR. NPV > 0 means the project earns more than your cost of capital." });
}

/* ---------------- risk ---------------- */
function monteCarlo() {
  let asset = "stocks", yrs = 30;
  const A = { cash: [0.035, 0.01], bonds: [0.05, 0.07], stocks: [0.09, 0.18], crypto: [0.2, 0.75] };
  const p = plot({ height: 280, x: [0, 30], y: [0, 1], xLabel: "years", yLabel: "$10k becomes", xFmt: (v) => Math.round(v), yFmt: (v) => money(v), xLog: false, hover: false, label: "Simulated paths" });
  const st = stats([{ label: "Median outcome" }, { label: "Worst 10%" }, { label: "Best 10%" }, { label: "Paths that lost money" }]);
  const draw = () => {
    const [mu, sd] = A[asset], r = rng(3), paths = [], ends = [];
    for (let k = 0; k < 60; k++) { let v = 10000; const pts = [[0, v]]; for (let t = 1; t <= yrs; t++) { v *= Math.exp(mu - sd * sd / 2 + sd * r.gauss()); pts.push([t, v]); } paths.push(pts); ends.push(v); }
    ends.sort((a, b) => a - b);
    const top = ends[Math.floor(ends.length * 0.9)] * 1.4;
    p.draw({ x: [0, yrs], y: [0, top], series: paths.map((pts, i) => ({ color: `color-mix(in srgb, ${W} ${30 + (i % 5) * 12}%, transparent)`, pts, width: 1.5 })), hlines: [{ y: 10000, label: "$10k in" }] });
    st.set(0, money(ends[30])); st.set(1, money(ends[6]), "bad"); st.set(2, money(ends[54]), "good"); st.set(3, pct(ends.filter((e) => e < 10000).length / ends.length, 0));
  };
  const sg = seg({ label: "Invest $10,000 in", options: [{ value: "cash", label: "Cash" }, { value: "bonds", label: "Bonds" }, { value: "stocks", label: "Stocks" }, { value: "crypto", label: "Crypto-like" }], value: asset, onChange: (v) => { asset = v; draw(); } });
  const sl = slider({ label: "Years", min: 1, max: 30, value: yrs, onInput: (v) => { yrs = v; draw(); } });
  draw();
  return stage({ title: "Sixty possible futures", controls: [sg, sl], body: [p.el, st.el], note: "Each line is one random future using rough long-run averages (stocks ~9% a year with ~18% volatility). Risk is the <b>spread</b> of outcomes. More expected return comes with a wider spread, and over short periods even good assets often lose." });
}

/* ---------------- diversification ---------------- */
function diversifySim() {
  let n = 1, rho = 0.25;
  const p = plot({ height: 260, x: [1, 50], y: [0, 45], xLabel: "number of stocks", yLabel: "portfolio volatility", xFmt: (v) => Math.round(v), yFmt: (v) => `${num(v)}%`, label: "Diversification" });
  const st = stats([{ label: "Volatility with your stocks" }, { label: "Floor: market risk" }, { label: "Risk removed" }]);
  const draw = () => {
    const s = 40, vol = (k) => s * Math.sqrt(rho + (1 - rho) / k);
    const pts = Array.from({ length: 50 }, (_, i) => [i + 1, vol(i + 1)]);
    p.draw({ series: [{ name: "Volatility", color: W, pts, area: true }], hlines: [{ y: s * Math.sqrt(rho), label: "systematic risk: can't diversify away" }], dots: [{ x: n, y: vol(n), color: "#ffc21a", r: 8, label: `${num(vol(n), 1)}%` }] });
    st.set(0, `${num(vol(n), 1)}%`); st.set(1, `${num(s * Math.sqrt(rho), 1)}%`); st.set(2, pct(1 - vol(n) / s, 0), "good");
  };
  const a = slider({ label: "Stocks you hold (equal amounts)", min: 1, max: 50, value: n, onInput: (v) => { n = v; draw(); } });
  const b = slider({ label: "How alike they move (correlation)", min: 0, max: 1, step: 0.05, value: rho, onInput: (v) => { rho = v; draw(); } });
  draw();
  return stage({ title: "Spread your bets", controls: [a, b], body: [p.el, st.el], note: "Each stock alone swings ±40% a year. Their own bad news (a failed product, a fraud) cancels out across many stocks: <b>idiosyncratic risk</b>. What's left is the risk they share, like recessions: <b>systematic risk</b>. Around 20-30 stocks gets most of the benefit." });
}
function frontierSim() {
  let rho = 0.2;
  const p = plot({ height: 280, x: [0, 25], y: [3, 11], xLabel: "risk (volatility %)", yLabel: "expected return %", xFmt: (v) => `${num(v)}%`, yFmt: (v) => `${num(v)}%`, label: "Two-asset frontier" });
  const draw = () => {
    const a = [4, 6], b = [9, 20];
    const pts = Array.from({ length: 41 }, (_, i) => { const w = i / 40; const ret = w * b[0] + (1 - w) * a[0]; const vol = Math.sqrt((w * b[1]) ** 2 + ((1 - w) * a[1]) ** 2 + 2 * w * (1 - w) * a[1] * b[1] * rho); return [vol, ret, w]; });
    const min = pts.reduce((m, x) => (x[0] < m[0] ? x : m));
    p.draw({ series: [{ name: "Every mix of bonds and stocks", color: W, pts: [...pts].sort((x, y) => x[0] - y[0]).map(([x, y]) => [x, y]), noHover: true }], dots: [{ x: a[1], y: a[0], color: "#3b82f6", label: "100% bonds", r: 7 }, { x: b[1], y: b[0], color: "var(--bad)", label: "100% stocks", r: 7, anchor: "end", dx: -11 }, { x: min[0], y: min[1], color: "#ffc21a", label: `least risky: ${Math.round(min[2] * 100)}% stocks`, r: 7 }] });
  };
  const s = slider({ label: "Correlation between stocks and bonds", min: -1, max: 1, step: 0.05, value: rho, onInput: (v) => { rho = v; draw(); } });
  draw();
  return stage({ title: "Mixing two assets (Markowitz)", controls: [s], body: [p.el], note: "With correlation below 1, adding some stocks to bonds can <i>lower</i> risk while raising return: the curve bulges left. At correlation −1 you can build a nearly riskless mix. Harry Markowitz won a Nobel for this picture (1952)." });
}

/* ---------------- personal finance ---------------- */
function feeSim() {
  let fee = 1, yrs = 40;
  const p = plot({ height: 260, x: [0, 40], y: [0, 1], xLabel: "years", yLabel: "balance", xFmt: (v) => Math.round(v), yFmt: (v) => money(v), label: "Fees" });
  const st = stats([{ label: "Low-cost index fund (0.05%)" }, { label: `With your fee` }, { label: "Lost to fees" }]);
  const draw = () => {
    const grow = (f) => { let b = 0; const pts = []; for (let t = 0; t <= yrs; t++) { pts.push([t, b]); b = (b + 6000) * (1 + 0.07 - f / 100); } return pts; };
    const a = grow(0.05), b = grow(fee);
    p.draw({ x: [0, yrs], y: [0, a.at(-1)[1] * 1.08], series: [{ name: "Index fund, 0.05%", color: "var(--good)", pts: a }, { name: `Fund charging ${fee}%`, color: "var(--bad)", pts: b }] });
    st.set(0, money(a.at(-1)[1])); st.set(1, money(b.at(-1)[1])); st.set(2, money(a.at(-1)[1] - b.at(-1)[1]), "bad");
  };
  const a = slider({ label: "Annual fee", min: 0.05, max: 2.5, step: 0.05, value: fee, fmt: (v) => `${v.toFixed(2)}%`, onInput: (v) => { fee = v; draw(); } });
  const b = slider({ label: "Years investing $500/month", min: 5, max: 45, value: yrs, onInput: (v) => { yrs = v; draw(); } });
  draw();
  return stage({ title: "The tyranny of small fees", controls: [a, b], body: [p.el, st.el], note: "A 1% fee sounds small. Over 40 years it takes roughly a quarter of your final balance, because the fee compounds against you." });
}
function debtPayoff() {
  const debts = [["Credit card", 4000, 24, 120], ["Car loan", 9000, 7, 250], ["Store card", 1200, 29, 40]];
  let extra = 300, method = "avalanche";
  const st = stats([{ label: "Months to debt-free" }, { label: "Total interest" }]);
  const box = h("div");
  const draw = () => {
    const d = debts.map(([n, b, r, m]) => ({ n, b, r: r / 1200, m })); let month = 0, interest = 0;
    while (d.some((x) => x.b > 0.01) && month < 600) {
      month++; let pool = extra;
      for (const x of d) if (x.b > 0) { const i = x.b * x.r; interest += i; x.b += i; const pay = Math.min(x.b, x.m); x.b -= pay; if (x.b <= 0.01) pool += x.m - pay; }
      const order = d.filter((x) => x.b > 0.01).sort((a, b) => (method === "avalanche" ? b.r - a.r : a.b - b.b));
      for (const x of order) { const pay = Math.min(x.b, pool); x.b -= pay; pool -= pay; if (pool <= 0) break; }
    }
    st.set(0, String(month)); st.set(1, money(interest), "bad");
    box.replaceChildren(table(["Debt", "Balance", "Rate", "Min payment"], debts.map(([n, b, r, m]) => [n, money(b), `${r}%`, money(m)])));
  };
  const a = seg({ label: "Strategy", options: [{ value: "avalanche", label: "Avalanche (highest rate first)" }, { value: "snowball", label: "Snowball (smallest balance first)" }], value: method, onChange: (v) => { method = v; draw(); } });
  const b = slider({ label: "Extra paid every month", min: 0, max: 1000, step: 50, value: extra, fmt: (v) => money(v), onInput: (v) => { extra = v; draw(); } });
  draw();
  return stage({ title: "Pay off three debts", controls: [a, b], body: [box, st.el], note: "Avalanche is mathematically cheapest. Snowball gives quick wins, and some studies find people stick with it better. The best plan is the one you'll keep doing." });
}

export default {
  compound: {
    principle: "Compound growth means <em>earning returns on your returns</em>. Given time, it beats almost everything else.",
    hook: "<p>A coin doubled every day for a month becomes over a billion coins. Money at 7% a year doubles every ten years. In 40 years that's 16 times. The deep idea of compounding: growth is proportional to what you already have, so the curve bends upward and keeps bending.</p>",
    parts: [
      { h: "Growth on growth", sim: compoundSim, after: "" },
      { h: "Time beats amount", sim: earlyLate },
      { h: "The rule of 72", html: "<p>Divide 72 by the annual rate to get years to double. At 6%, 12 years. At 9%, 8 years. (72 works better than 70 for typical investment rates; both are approximations of ln 2 ≈ 0.693.)</p>",
        sim: () => formula([["FV", "Future value"], ["=", null], ["PV", "Present value: what you start with"], ["×", null], ["(1 + r)ⁿ", "Growth factor: rate r, compounded n periods"]], "The whole idea in one line. Everything in the next lessons is this, rearranged."),
        after: "" },
      { h: "Try it", sim: () => calc({ q: "You invest $5,000 at 8% a year for 18 years. Roughly what do you end with?", answer: 19980, tol: 0.03, unit: "$", hint: "72 ÷ 8 = 9 years to double. 18 years = two doublings.", why: "<p>5,000 × 1.08¹⁸ ≈ <b>$19,980</b>. The rule of 72 says two doublings: $20,000. Close.</p>" }) },
    ],
    job: "<p>Compounding is the engine under every finance model. PE investors think in <b>multiples of money</b> over time (a 3× in 5 years ≈ 25% a year). Bankers compound revenue growth in forecasts. Pension funds and endowments set strategy around long-run compounding, which is why fees and early losses matter so much: a 50% loss needs a 100% gain to recover.</p>",
    terms: [["Compound interest", "Interest earned on both the original amount and past interest."], ["Simple interest", "Interest only on the original amount."], ["Future value (FV)", "What an amount grows to: PV × (1 + r)ⁿ."], ["Rule of 72", "Years to double ≈ 72 ÷ rate."], ["CAGR", "Compound annual growth rate: the steady rate that gets from start to end value."], ["APR vs APY", "APR is the stated rate; APY includes compounding within the year."]],
    quiz: [
      ["At 9% a year, money doubles in about…", ["6 years", "8 years", "12 years"], 1, "72 ÷ 9 = 8."],
      ["A portfolio falls 50%. What gain gets it back to even?", ["50%", "100%", "75%"], 1, "Half of what you had must double. Losses compound too."],
      ["Why does Emma (saving early, then stopping) beat Liam (saving later, three times as much)?", ["Higher returns", "Her money had more years to compound", "Lower fees"], 1, "Each early dollar compounds for 30+ more years."],
    ],
    recap: [["(1 + r)ⁿ", "The formula behind all of finance."], ["72 ÷ r", "Years to double."], ["Start early", "Time matters more than amount."]],
    see: ["pv", "inflation", "personal", "growth"],
  },

  pv: {
    principle: "A dollar later is worth less than a dollar now, so <em>to compare money across time, bring it all back to today</em>.",
    hook: "<p>Would you swap $100 today for $100 in five years? No: today's $100 can be invested, spent, or protected from inflation, and the future is uncertain. Present value is compounding run backwards, and it's the foundation of every valuation, loan and bond price.</p>",
    parts: [
      { h: "Discounting", sim: pvSim, html: "<p>PV = future amount ÷ (1 + r)ⁿ. The rate <em>r</em> is the <b>discount rate</b>: the return you could earn elsewhere at similar risk (your opportunity cost).</p>" },
      { h: "Your own discount rate", sim: patienceTest },
      { h: "Streams of payments", html: "<p>Two shortcuts that come up constantly:</p><ul><li><b>Perpetuity</b> (a payment forever): PV = payment ÷ r. $50 a year forever at 5% is worth $1,000. With growth g: PV = payment ÷ (r − g). This is the <b>terminal value</b> formula in every DCF.</li><li><b>Annuity</b> (a payment for n years): PV = payment × [1 − (1 + r)⁻ⁿ] ÷ r. Mortgages, car loans and pensions are annuities.</li></ul>",
        sim: () => calc({ q: "A lottery offers $1M a year for 20 years, or a lump sum today. At a 6% discount rate, what lump sum is equal value (in $M)?", answer: 11.47, tol: 0.01, unit: "$M", hint: "Annuity: 1 × [1 − 1.06⁻²⁰] ÷ 0.06", why: "<p>1 × (1 − 0.3118) ÷ 0.06 = <b>$11.47M</b>. That's why lottery winners are offered roughly half the \"headline\" jackpot as cash.</p>" }) },
    ],
    job: "<p>Every valuation (DCF), bond price, lease, pension liability and insurance reserve is a present value. When rates rise, PVs fall, which is why stocks, bonds and property all fell in 2022. Bankers spend their days arguing about the discount rate, because small changes swing the value a lot, especially for cash flows far in the future.</p>",
    terms: [["Present value (PV)", "What a future amount is worth today."], ["Discount rate", "The rate used to convert future money to today's value."], ["Discount factor", "1 ÷ (1 + r)ⁿ: today's value of $1 in n years."], ["Perpetuity", "Equal payments forever. PV = C ÷ r."], ["Growing perpetuity", "Payments growing at g forever. PV = C ÷ (r − g)."], ["Annuity", "Equal payments for a fixed number of periods."]],
    quiz: [
      ["What happens to the PV of a future payment when the discount rate rises?", ["Rises", "Falls", "Unchanged"], 1, "You divide by a bigger number: higher rates shrink present values."],
      ["PV of $100 a year forever at 4%?", ["$400", "$2,500", "$4,000"], 1, "100 ÷ 0.04 = $2,500."],
      ["Which is hurt MORE by higher rates: cash arriving in 1 year or in 20 years?", ["1 year", "20 years", "Same"], 1, "Discounting compounds over time, so distant cash is far more rate-sensitive. That's why growth stocks and long bonds swing most."],
    ],
    recap: [["÷ (1 + r)ⁿ", "Compounding in reverse."], ["C ÷ (r − g)", "Value of a growing stream forever."], ["Rates up", "Present values down, most for far-off cash."]],
    see: ["compound", "npv", "dcf", "bond-basics"],
  },

  npv: {
    principle: "Do a project if <em>the present value of what comes in beats what goes out</em>. That's NPV > 0.",
    hook: "<p>Build a factory? Launch a product? Buy a company? Every corporate investment boils down to: is the money we'll get back, adjusted for time and risk, worth more than the money we put in? Net present value answers that, and IRR restates it as a percentage.</p>",
    parts: [
      { h: "Should we build the machine?", sim: npvSim },
      { h: "NPV vs IRR vs payback", sim: () => table(["Rule", "Says do it if…", "Strength", "Trap"], [["<b>NPV</b>", "NPV > 0", "Measures value created in dollars", "Needs a discount rate"], ["<b>IRR</b>", "IRR > cost of capital", "Easy to compare as a %", "Ignores size; multiple IRRs if cash flows flip sign; favours quick small wins"], ["<b>Payback</b>", "Money back within X years", "Simple, cares about risk", "Ignores time value and everything after payback"], ["<b>MOIC</b>", "Multiple of money is high", "Easy to grasp", "Ignores time: 2× in 2 years ≠ 2× in 10"]]),
        after: "<p>When NPV and IRR disagree (e.g. a big project with 15% IRR vs a tiny one with 40%), trust NPV: you can't eat percentages, and the big project creates more value.</p>" },
      { h: "Quick check", sim: () => predict({ q: "Project A: invest $100, get $130 next year. Project B: invest $1,000, get $1,200 next year. Cost of capital 10%. Which creates more value?", options: ["A: 30% IRR beats 20%", "B: NPV of $91 beats A's $18", "They're equal"], answer: 1, why: "<p>A: 130 ÷ 1.1 − 100 = $18. B: 1,200 ÷ 1.1 − 1,000 = $91. A has the higher IRR, B creates five times more value. If you can only pick one, pick B.</p>" }) },
    ],
    job: "<p>Corporate development and FP&A teams build NPV models for every major capital project. PE funds report <b>IRR and MOIC</b> to their investors (and there are tricks to juice IRR, like delaying capital calls with credit lines). Consultants build business cases ending in an NPV. In interviews: \"walk me through how you'd decide whether to build a new plant\" means NPV.</p>",
    terms: [["NPV", "Sum of all cash flows discounted to today, minus the initial cost."], ["IRR", "The discount rate that makes NPV exactly zero."], ["Cost of capital", "The return investors require: the hurdle for projects."], ["Payback period", "Time until cumulative cash flows turn positive."], ["MOIC", "Multiple on invested capital: total returned ÷ invested."], ["NPV profile", "NPV plotted against the discount rate."]],
    quiz: [
      ["A project's IRR is 12% and the cost of capital is 9%. NPV is…", ["Negative", "Positive", "Zero"], 1, "IRR above the hurdle means NPV at the hurdle is positive."],
      ["If NPV and IRR rank two projects differently, prefer…", ["Higher IRR", "Higher NPV", "Shorter payback"], 1, "NPV measures dollars of value created."],
      ["The payback rule's biggest flaw is…", ["It's hard to compute", "It ignores cash after the payback date and time value", "It needs an IRR"], 1, "A project paying back in 2 years then nothing can beat one that pays back in 3 and runs for 20."],
    ],
    recap: [["NPV > 0", "Creates value. Do it."], ["IRR", "The rate where NPV = 0."], ["Dollars", "When in doubt, trust NPV over IRR."]],
    see: ["pv", "wacc", "dcf", "pe-returns"],
  },

  risk: {
    principle: "Investors hate uncertainty, so <em>riskier assets must offer higher expected returns</em> to get anyone to hold them.",
    hook: "<p>Why do stocks return more than savings accounts over time? Not because the stock market is generous. Because stocks can fall 50% in a year and savings can't. That extra expected return is payment for sitting through the scary parts: the <em>risk premium</em>.</p>",
    parts: [
      { h: "Sixty futures", sim: monteCarlo },
      { h: "Measuring risk", html: "<ul><li><b>Volatility</b> (standard deviation of returns): how widely returns swing. Stocks ~15-20% a year, bonds ~5-8%.</li><li><b>Drawdown</b>: the peak-to-trough fall. US stocks fell ~50% in 2008-09 and ~34% in a month in 2020.</li><li><b>Value at risk (VaR)</b>: \"95% of days we lose less than $X\". Banks use it; it says nothing about the worst 5%.</li><li><b>Sharpe ratio</b>: (return − risk-free rate) ÷ volatility. Return per unit of risk.</li></ul>",
        sim: () => calc({ q: "A fund returns 11% with 16% volatility. Treasury bills pay 3%. What's its Sharpe ratio?", answer: 0.5, tol: 0.02, why: "<p>(11 − 3) ÷ 16 = <b>0.5</b>. Long-run stock markets run around 0.3-0.5. Anything sold to you with a Sharpe above 2 deserves deep suspicion (Bernie Madoff's reported Sharpe was absurdly high).</p>" }) },
      { h: "Volatility drag", html: "<p>Average returns lie. Up 50% then down 50% averages 0% but leaves you with 75% of your money. The <b>geometric</b> (compound) return is roughly the average minus half the variance. That's why reducing volatility can raise your long-run wealth even at the same average return.</p>",
        sim: () => predict({ q: "Fund A returns +10% every year. Fund B alternates +30%, −10%. Both average 10%. After 10 years, which has more?", options: ["A", "B", "Same"], answer: 0, why: "<p>A: 1.1¹⁰ = 2.59×. B: (1.3 × 0.9)⁵ = 2.19×. Same average, but volatility drags B's compound return down to about 8.2%.</p>" }) },
    ],
    job: "<p>Risk management is a whole career: banks' risk teams set limits, run stress tests and VaR. Portfolio managers are judged on <b>risk-adjusted</b> returns (Sharpe, Sortino, information ratio). In private equity, leverage adds risk that IRRs don't show. Insurers price risk directly. Every investment memo has a \"key risks\" section.</p>",
    terms: [["Risk premium", "Extra expected return for bearing risk."], ["Volatility", "Standard deviation of returns: the size of typical swings."], ["Drawdown", "Fall from a peak to a trough."], ["Sharpe ratio", "Excess return per unit of volatility."], ["Value at risk", "Loss not exceeded with a given confidence over a period."], ["Volatility drag", "Swings reduce compound return below the average return."], ["Risk-free rate", "Return on the safest asset, usually short government bills."]],
    quiz: [
      ["Why must stocks offer higher expected returns than government bills?", ["Companies are greedy", "They're riskier, so investors demand a premium", "Tax reasons"], 1, "The equity risk premium compensates for volatility and crashes."],
      ["+50% then −50% leaves you at…", ["100%", "75%", "50%"], 1, "1.5 × 0.5 = 0.75."],
      ["A higher Sharpe ratio means…", ["More return per unit of risk", "More risk", "Lower fees"], 0, "It's excess return divided by volatility."],
    ],
    recap: [["Premium", "Risk is paid for with expected return."], ["Spread", "Risk = width of possible outcomes."], ["Drag", "Volatility eats compound returns."]],
    see: ["diversify", "capm", "compound", "leverage-loop"],
  },

  diversify: {
    principle: "Combine assets that don't move together and <em>you cut risk without cutting expected return</em>.",
    hook: "<p>Harry Markowitz called diversification \"the only free lunch in finance\". Owning one company is a bet on its CEO, products and luck. Owning 500 is a bet on the economy. The second has the same expected return with far less risk.</p>",
    parts: [
      { h: "How many stocks?", sim: diversifySim },
      { h: "Mixing stocks and bonds", sim: frontierSim, after: "<p>The upper edge of all possible portfolios is the <em>efficient frontier</em>: the best return for each level of risk. Anything below it is leaving money on the table. Add a risk-free asset and the best portfolios lie on a straight line (the <b>capital market line</b>) touching the frontier.</p>" },
      { h: "When diversification fails", html: "<p>Correlations aren't fixed. In crises, almost everything risky falls together (2008, March 2020): correlations jump toward 1 exactly when you need diversification most. In 2022 stocks <i>and</i> bonds fell together as rates rose, breaking the classic 60/40 portfolio for a year. True diversification means different <i>drivers</i> of return: not 10 tech stocks, but stocks, bonds, real assets, different countries.</p>",
        sim: () => predict({ q: "You own 30 stocks, all large US tech companies. How diversified are you?", options: ["Very: 30 is plenty", "Not very: they share the same drivers and move together", "Perfectly"], answer: 1, why: "<p>The count matters less than the correlation. 30 highly correlated stocks behave like a few. Sector and country concentration is still concentration.</p>" }) },
    ],
    job: "<p>Asset allocators (pension funds, endowments, wealth managers) spend their careers on portfolio construction. The <b>60/40</b> portfolio and the <b>endowment model</b> (Yale's heavy use of private assets) are diversification strategies. In PE, a fund diversifies across 10-15 companies; LPs diversify across funds and vintages. Banks watch <b>concentration risk</b>: too much lending to one sector.</p>",
    terms: [["Diversification", "Spreading investments to reduce risk."], ["Correlation", "How much two assets move together, from −1 to +1."], ["Idiosyncratic risk", "Risk specific to one company; diversifiable."], ["Systematic risk", "Market-wide risk that can't be diversified away."], ["Efficient frontier", "Portfolios with the best return for each risk level."], ["Asset allocation", "How a portfolio is split across asset classes."]],
    quiz: [
      ["Diversification mainly removes…", ["Systematic risk", "Idiosyncratic risk", "All risk"], 1, "Company-specific risks cancel out; market risk stays."],
      ["Two assets with correlation −1 can be combined to…", ["Double risk", "Eliminate volatility almost entirely", "Nothing special"], 1, "Perfectly opposite moves cancel."],
      ["Why did diversification disappoint in 2008?", ["Too many stocks", "Correlations rose sharply in the crisis", "Bonds were banned"], 1, "In panics, risky assets fall together."],
    ],
    recap: [["Free lunch", "Less risk, same expected return."], ["~25", "Stocks gets most of the benefit."], ["Correlation", "What matters is how things move together."]],
    see: ["risk", "capm", "indices", "efficient"],
  },

  personal: {
    principle: "Spend less than you earn, keep a buffer, kill expensive debt, then <em>let low-cost compounding do the heavy lifting</em>.",
    hook: "<p>Personal finance is mostly behaviour, not maths. But the maths tells you which behaviours matter. Here's the whole thing from first principles, in order of priority.</p>",
    parts: [
      { h: "The priority ladder", sim: () => stepper([
        { t: "1. Spend less than you earn", html: "<p>The gap is your savings rate, the single biggest lever. A common rule of thumb: <b>50/30/20</b>: 50% needs, 30% wants, 20% saving and debt repayment.</p>" },
        { t: "2. Build a buffer", html: "<p>An <b>emergency fund</b> of 3-6 months of expenses in cash. It stops a broken boiler becoming credit-card debt at 25%.</p>" },
        { t: "3. Grab free money", html: "<p>If your employer matches pension contributions, contribute enough to get the full match: an instant 50-100% return.</p>" },
        { t: "4. Kill expensive debt", html: "<p>Paying off a 24% credit card is a guaranteed, tax-free 24% return. Nothing in markets reliably beats that.</p>" },
        { t: "5. Invest for the long term", html: "<p>Low-cost, diversified index funds in tax-advantaged accounts (401(k)/IRA in the US, ISA/SIPP in the UK). Automate it.</p>" },
        { t: "6. Leave it alone", html: "<p>Don't panic-sell in crashes, don't chase hot tips. The average investor earns less than the funds they own because they buy high and sell low (the <i>behaviour gap</i>).</p>" },
      ]) },
      { h: "Which debt first?", sim: debtPayoff },
      { h: "Fees are a silent killer", sim: feeSim },
    ],
    job: "<p>Wealth managers and financial planners do this for a living, and the industry's incentive problems (commissions, high-fee products) are exactly the principal-agent issues from World 1. Fintech (robo-advisers, neobanks) competes by cutting fees. And knowing your own finances cold is the best training for analysing a company's: a household is a tiny company with income, expenses, assets and debts.</p>",
    terms: [["Savings rate", "Share of income not spent."], ["Emergency fund", "Cash buffer for unexpected costs, usually 3-6 months of expenses."], ["Index fund", "A fund that holds a whole market index at low cost."], ["Expense ratio", "A fund's annual fee as % of assets."], ["Debt avalanche", "Pay the highest-interest debt first."], ["Debt snowball", "Pay the smallest balance first for quick wins."], ["Tax-advantaged account", "Accounts where investments grow tax-free or tax-deferred."]],
    quiz: [
      ["You have a credit card at 22% and could invest in stocks expected to earn 8%. Best move?", ["Invest", "Pay off the card", "Split evenly"], 1, "A guaranteed 22% beats an uncertain 8%."],
      ["The main purpose of an emergency fund is…", ["High returns", "Avoid expensive borrowing or forced selling when shocks hit", "Tax savings"], 1, "It's insurance, not an investment."],
      ["Over 40 years, a 1% annual fee costs you roughly…", ["1% of your money", "About 20-25% of your final balance", "Nothing"], 1, "Fees compound against you every year."],
    ],
    recap: [["Gap", "Your savings rate drives everything."], ["Debt first", "High-rate debt is a guaranteed return to kill."], ["Low fees", "Cheap index funds plus time."]],
    see: ["compound", "indices", "present-bias", "mental-accounting"],
  },
};

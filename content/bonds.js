// World 9: Bonds & credit.
import { h, usd, money, num, pct } from "../lib/core.js";
import { slider, seg, stats, stage, predict, calc, callout, table, bars, button, flips, stepper } from "../lib/ui.js";
import { plot, columns } from "../lib/chart.js";

const W = "var(--wc)";
export const bondPrice = (face, cpn, yld, n) => { let p = 0; for (let t = 1; t <= n; t++) p += (face * cpn) / Math.pow(1 + yld, t); return p + face / Math.pow(1 + yld, n); };
const macD = (cpn, yld, n) => { let pv = 0, w = 0; for (let t = 1; t <= n; t++) { const cf = (t === n ? 1 + cpn : cpn) / Math.pow(1 + yld, t); pv += cf; w += t * cf; } return w / pv; };

function seesaw() {
  let cpn = 5, y = 5, n = 10;
  const p = plot({ height: 260, x: [0, 12], y: [400, 1800], xLabel: "market yield", yLabel: "bond price", xFmt: (x) => `${num(x)}%`, yFmt: (x) => usd(x), label: "Price-yield curve" });
  const cfs = h("div"), st = stats([{ label: "Price" }, { label: "Trades at" }, { label: "Current yield" }]);
  const draw = () => {
    const pr = bondPrice(1000, cpn / 100, y / 100, n);
    const pts = Array.from({ length: 121 }, (_, i) => [i / 10, bondPrice(1000, cpn / 100, Math.max(0.0001, i / 1000), n)]);
    p.draw({ series: [{ name: "Price at each yield", color: W, pts }], hlines: [{ y: 1000, label: "face value $1,000" }], dots: [{ x: y, y: pr, color: "#ffc21a", r: 9, label: `$${num(pr)}` }] });
    cfs.replaceChildren(columns(Array.from({ length: n }, (_, i) => ({ label: `Y${i + 1}`, value: i === n - 1 ? 1000 + cpn * 10 : cpn * 10, color: i === n - 1 ? "#0369a1" : W, show: i === n - 1 ? `$${num(1000 + cpn * 10)}` : `$${cpn * 10}` })), { height: 160, fmt: (v) => `$${num(v)}`, label: "Bond cash flows" }));
    st.set(0, `$${num(pr, 2)}`); st.set(1, Math.abs(pr - 1000) < 0.5 ? "Par" : pr > 1000 ? "Premium" : "Discount", pr > 1000.5 ? "good" : pr < 999.5 ? "bad" : ""); st.set(2, pct((cpn * 10) / pr, 2));
  };
  const c = [slider({ label: "Coupon (fixed when issued)", min: 0, max: 10, step: 0.5, value: cpn, fmt: (x) => `${x}%`, onInput: (x) => { cpn = x; draw(); } }), slider({ label: "Market yield today", min: 0.5, max: 12, step: 0.25, value: y, fmt: (x) => `${x}%`, onInput: (x) => { y = x; draw(); } }), slider({ label: "Years to maturity", min: 1, max: 30, value: n, onInput: (x) => { n = x; draw(); } })];
  draw();
  return stage({ title: "The price-yield seesaw", controls: c, body: [cfs, p.el, st.el], note: "A bond's cash flows are fixed. If new bonds pay more (yields rise), yours is less attractive, so its price falls until its yield matches. Price and yield always move in opposite directions." });
}

function durationSim() {
  let shock = 1;
  const box = h("div"), st = stats([{ label: "2-year bond" }, { label: "10-year bond" }, { label: "30-year bond" }, { label: "30-year zero-coupon" }]);
  const draw = () => {
    const y0 = 0.04, items = [["2-year", 0.04, 2], ["10-year", 0.04, 10], ["30-year", 0.04, 30], ["30y zero", 0, 30]];
    const ch = items.map(([, c, n]) => bondPrice(100, c, y0 + shock / 100, n) / bondPrice(100, c, y0, n) - 1);
    box.replaceChildren(columns(items.map(([n], i) => ({ label: n, value: ch[i] * 100, color: ch[i] < 0 ? "var(--down)" : "var(--up)", show: `${ch[i] >= 0 ? "+" : ""}${num(ch[i] * 100, 1)}%` })), { height: 220, fmt: (v) => `${num(v, 1)}%`, label: "Price change" }));
    items.forEach(([n, c, m], i) => st.set(i, `D = ${num(macD(c || 1e-9, y0, m) / (1 + y0), 1)}`));
  };
  const a = slider({ label: "Rates move by", min: -3, max: 3, step: 0.25, value: shock, fmt: (x) => `${x > 0 ? "+" : ""}${x}%`, onInput: (x) => { shock = x; draw(); } });
  draw();
  return stage({ title: "Same rate move, very different pain", controls: [a], body: [box, st.el], note: "<b>Modified duration</b> (D) ≈ % price change for a 1% move in yields. A 30-year zero has duration near 29: a 1% rise in rates costs ~25%. In 2022, long US Treasuries fell more than 30%: a \"safe\" asset with stock-like losses." });
}

function creditSim() {
  let pd = 2, rec = 40;
  const st = stats([{ label: "Expected loss per year" }, { label: "Spread needed (break-even)" }, { label: "Rating ballpark" }]);
  const draw = () => {
    const el = (pd / 100) * (1 - rec / 100);
    const rating = pd < 0.05 ? "AAA/AA" : pd < 0.2 ? "A" : pd < 0.6 ? "BBB" : pd < 2 ? "BB" : pd < 6 ? "B" : "CCC";
    st.set(0, pct(el, 2)); st.set(1, `${num(el * 10000)} bp`, "accent"); st.set(2, rating, pd >= 0.6 ? "warn" : "good");
  };
  const a = slider({ label: "Chance of default per year", min: 0, max: 15, step: 0.05, value: pd, fmt: (x) => `${x.toFixed(2)}%`, onInput: (x) => { pd = x; draw(); } });
  const b = slider({ label: "Recovery if it defaults", min: 0, max: 90, step: 5, value: rec, fmt: (x) => `${x}%`, onInput: (x) => { rec = x; draw(); } });
  draw();
  return stage({ title: "Price the risk of not being paid back", controls: [a, b], body: [st.el, h("p.muted", { html: "Expected loss = <b>probability of default × loss given default</b>. Real spreads are usually several times the expected loss: investors also want paying for uncertainty and illiquidity, and defaults cluster in recessions (the <i>credit spread puzzle</i>)." })] });
}

function curveSim() {
  let shape = "normal";
  const shapes = { normal: [3, 3.3, 3.6, 3.9, 4.1, 4.3, 4.5, 4.6], flat: [4, 4, 4, 4, 4, 4, 4, 4], inverted: [5.3, 5.1, 4.8, 4.5, 4.3, 4.2, 4.3, 4.4], steep: [0.5, 0.8, 1.3, 1.9, 2.5, 3, 3.6, 3.9] };
  const tenors = [0.25, 1, 2, 3, 5, 7, 10, 30], labels = ["3m", "1y", "2y", "3y", "5y", "7y", "10y", "30y"];
  const p = plot({ height: 280, x: [0, 7], y: [0, 6], xLabel: "maturity", yLabel: "yield", xFmt: (x) => labels[Math.round(x)] ?? "", yFmt: (x) => `${num(x)}%`, xTicks: 7, label: "Yield curve" });
  const msg = h("p.muted");
  const notes = { normal: "<b>Normal</b>: lenders want more for locking money up longer. Markets expect steady growth.", flat: "<b>Flat</b>: transition. Markets expect rates to stay put; often late in a cycle.", inverted: "<b>Inverted</b>: short rates above long rates. Markets expect the central bank to <i>cut</i>, usually because a slowdown is coming. Every US recession since 1970 was preceded by an inversion of the 10y-3m curve (with one false alarm in the 1960s, and a long delay after 2022).", steep: "<b>Steep</b>: rates are low now but expected to rise. Typical early in a recovery, when central banks have cut hard." };
  const draw = () => { p.draw({ series: [{ name: "Yield", color: W, pts: shapes[shape].map((v, i) => [i, v]), width: 4 }], dots: shapes[shape].map((v, i) => ({ x: i, y: v, r: 5, color: W })) }); msg.innerHTML = notes[shape]; };
  const sg = seg({ label: "Curve shape", options: [{ value: "normal", label: "Normal" }, { value: "flat", label: "Flat" }, { value: "inverted", label: "Inverted" }, { value: "steep", label: "Steep" }], value: shape, onChange: (x) => { shape = x; draw(); } });
  draw();
  return stage({ title: "Four shapes, four stories", controls: [sg], body: [p.el, msg] });
}

export default {
  "bond-basics": {
    principle: "A bond is <em>a loan you can buy and sell</em>. Its cash flows are fixed, so when market rates move, its price moves the other way.",
    hook: "<p>The bond market is bigger than the stock market: over $130 trillion worldwide. Governments fund wars and pensions with it, companies fund factories, cities fund schools. And its prices set the cost of borrowing for everyone, from mortgage holders to PE funds.</p>",
    parts: [
      { h: "How a bond pays", sim: seesaw, html: "<p>A typical bond: you lend $1,000 (the <b>face value</b> or par), receive a fixed <b>coupon</b> every year, and get the $1,000 back at <b>maturity</b>. Its price today is the present value of those payments at today's market yield.</p>" },
      { h: "Yield, yield, yield", sim: () => flips([["Coupon rate", "Fixed interest as % of face value. Never changes."], ["Current yield", "Annual coupon ÷ today's price."], ["Yield to maturity (YTM)", "The single discount rate that makes PV of all payments = price. The IRR of buying the bond."], ["Yield to worst", "Lowest yield if the issuer calls (repays) early when it can."], ["Real yield", "Yield on inflation-linked bonds (TIPS, linkers): return above inflation."], ["Basis point", "0.01%. Bond people talk in bp: \"spreads widened 50 bp\"."]]) },
      { h: "Practise", sim: () => calc({ q: "A 1-year zero-coupon bond pays $1,000 in a year. The market yield is 5%. What's its price?", answer: 952.38, tol: 0.002, unit: "$", why: "<p>1,000 ÷ 1.05 = <b>$952.38</b>. Zero-coupon bonds pay nothing until maturity; all the return comes from buying below face value.</p>" }) },
    ],
    job: "<p>Fixed income is a huge part of finance: DCM bankers issue bonds, traders and portfolio managers (PIMCO, pension funds, insurers) trade and hold them, credit analysts judge issuers. Treasury yields are the <b>risk-free rate</b> in every valuation. Mortgage rates key off 10-year yields. When people say \"the bond market is sending a message\", it's yields moving.</p>",
    terms: [["Bond", "A tradable loan: fixed payments to the holder."], ["Face value (par)", "Amount repaid at maturity, usually $1,000 or $100."], ["Coupon", "Fixed periodic interest payment."], ["Maturity", "When the face value is repaid."], ["Yield to maturity", "Discount rate equating the bond's price to the PV of its payments."], ["Premium / discount", "Trading above / below face value."], ["Basis point", "One hundredth of a percent."]],
    quiz: [
      ["Market yields rise. Existing bond prices…", ["Rise", "Fall", "Unchanged"], 1, "Fixed payments discounted at higher rates are worth less."],
      ["A bond with a 6% coupon when market yields are 4% trades…", ["At a discount", "At a premium", "At par"], 1, "Its coupon beats the market, so buyers pay above par."],
      ["YTM is best described as…", ["The coupon", "The bond's internal rate of return if held to maturity", "The price"], 1, "It's the IRR of the bond's cash flows at today's price."],
    ],
    recap: [["Seesaw", "Yields up, prices down."], ["Par", "Coupon = yield → price = face."], ["YTM", "The bond's IRR."]],
    see: ["pv", "duration", "credit", "central-bank"],
  },

  duration: {
    principle: "Duration measures <em>how sensitive a bond's price is to interest rates</em>. Longer, lower-coupon bonds swing hardest.",
    hook: "<p>In March 2023 Silicon Valley Bank collapsed, partly because it had bought long-dated government bonds when yields were near zero. When rates rose, those \"safe\" bonds lost billions in value. The bank had ignored duration.</p>",
    parts: [
      { h: "Shock the rates", sim: durationSim },
      { h: "Rules of thumb", html: "<ul><li>Longer maturity → higher duration.</li><li>Lower coupon → higher duration (more of the value arrives at the end). A zero-coupon bond's duration equals its maturity.</li><li>% price change ≈ −duration × change in yield.</li><li><b>Convexity</b>: the price-yield curve is curved, so prices rise more when yields fall than they drop when yields rise by the same amount. A nice extra for bondholders.</li></ul>",
        sim: () => calc({ q: "A bond has modified duration 7. Yields rise 0.5%. Approximate price change?", answer: -3.5, tol: 0.01, unit: "%", why: "<p>−7 × 0.5% = <b>−3.5%</b>.</p>" }) },
      { h: "Who manages duration", sim: () => predict({ q: "A pension fund owes pensions for 30 years. Which bonds best match that liability?", options: ["3-month bills", "Long-dated bonds with similar duration", "Cash"], answer: 1, why: "<p>Matching asset duration to liability duration (<em>immunisation</em>) means when rates move, both sides move together. UK pension funds used leveraged versions of this (LDI), which blew up in the 2022 gilt crisis when yields spiked too fast for the collateral.</p>" }) },
    ],
    job: "<p>Bond portfolio managers position duration as their main bet on rates. Bank treasuries and regulators manage <b>interest rate risk in the banking book</b> (SVB's failure). Insurers and pension funds do asset-liability matching. Traders hedge with futures and swaps sized by <b>DV01</b>: dollars of P&L per 1 bp move.</p>",
    terms: [["Duration", "Weighted average time to a bond's cash flows; also its rate sensitivity."], ["Modified duration", "% price change per 1% change in yield."], ["Convexity", "Curvature of the price-yield relationship."], ["DV01", "Dollar value change for a 1 basis point move in yield."], ["Immunisation", "Matching asset and liability durations to neutralise rate risk."], ["Zero-coupon bond", "Pays only face value at maturity; duration equals maturity."]],
    quiz: [
      ["Which falls most if rates rise 1%?", ["2-year 5% coupon bond", "10-year 5% coupon bond", "30-year zero-coupon bond"], 2, "Longest, all cash at the end: highest duration."],
      ["A zero-coupon bond maturing in 8 years has Macaulay duration of…", ["About 4", "8", "Depends on the coupon"], 1, "All cash arrives at year 8."],
      ["Convexity means that for equal-sized rate moves…", ["Price gains from falls exceed losses from rises", "Losses exceed gains", "They're equal"], 0, "The curve bends in the holder's favour."],
    ],
    recap: [["−D × Δy", "Approximate % price change."], ["Long + low coupon", "Highest duration."], ["Match", "Hedge liabilities with equal duration."]],
    see: ["bond-basics", "yield-curve", "bank-run", "swaps"],
  },

  credit: {
    principle: "Lending to someone who might not pay you back <em>must pay more</em>. The extra yield over government bonds is the credit spread.",
    hook: "<p>The US government can always print dollars to repay its dollar debts. A shale oil company can't. So the company pays a higher yield. That extra, the <em>spread</em>, is the price of default risk, and watching spreads is one of the best ways to see fear in markets.</p>",
    parts: [
      { h: "Price default", sim: creditSim },
      { h: "The rating ladder", sim: () => table(["Rating (S&P / Fitch)", "Grade", "Typical spread", "10-yr cumulative default (rough)"], [["AAA, AA", "Investment grade", "0.3-0.7%", "<1%"], ["A", "Investment grade", "0.7-1.2%", "~1-2%"], ["BBB", "Investment grade (lowest)", "1.2-2%", "~3-4%"], ["BB", "High yield (\"junk\")", "2-3.5%", "~10-15%"], ["B", "High yield", "3.5-5%", "~25-30%"], ["CCC and below", "Distressed", "8%+", "~50%"]]),
        after: "<p>The line between BBB and BB matters hugely: many funds may only hold investment grade, so a downgrade to junk (a <b>fallen angel</b>) forces selling. Approximate long-run ranges; spreads swing widely with the cycle.</p>" },
      { h: "Who stands where", sim: () => stepper([
        { t: "Senior secured loans", html: "<p>First claim on specific collateral. Highest recovery (often 60-80%). The main debt in LBOs.</p>" },
        { t: "Senior unsecured bonds", html: "<p>General claim, ahead of junior debt. Recovery ~40%.</p>" },
        { t: "Subordinated / mezzanine", html: "<p>Paid after senior lenders. Higher yield, lower recovery.</p>" },
        { t: "Preferred equity", html: "<p>After all debt.</p>" },
        { t: "Common equity", html: "<p>Last. Often zero in bankruptcy. The <b>absolute priority rule</b> sets this order.</p>" },
      ]) },
    ],
    job: "<p>Credit analysts at banks, rating agencies and funds judge borrowers' ability to pay. Leveraged finance bankers structure the loans and high-yield bonds behind LBOs. Distressed debt investors buy bonds of struggling companies cheaply, aiming to own the company after restructuring. Private credit funds now lend directly to mid-sized companies (private markets world).</p>",
    terms: [["Credit spread", "Yield above a government bond of the same maturity."], ["Probability of default (PD)", "Chance a borrower fails to pay."], ["Loss given default (LGD)", "Share of the loan lost if default happens."], ["Investment grade", "BBB− or better: lower risk."], ["High yield (junk)", "BB+ or worse."], ["Seniority", "Order in which creditors are repaid."], ["Covenants", "Promises in a bond or loan that protect lenders."]],
    quiz: [
      ["PD 3%, recovery 40%. Expected annual loss?", ["3%", "1.8%", "1.2%"], 1, "3% × (1 − 0.4) = 1.8%."],
      ["In a recession, credit spreads usually…", ["Narrow", "Widen", "Don't move"], 1, "Default fears rise, investors demand more."],
      ["Which gets paid first in bankruptcy?", ["Common stock", "Senior secured lenders", "Subordinated bonds"], 1, "Secured senior debt sits at the top of the stack."],
    ],
    recap: [["PD × LGD", "Expected loss: the floor for a spread."], ["BBB line", "Investment grade vs junk."], ["Seniority", "Who stands first in line."]],
    see: ["bond-basics", "information", "lbo", "crisis-2008"],
  },

  "yield-curve": {
    principle: "The yield curve plots <em>rates across maturities</em>. Its shape is the market's forecast for rates, growth and inflation.",
    hook: "<p>Line up government bond yields from 3 months to 30 years and you get a curve. Usually it slopes up. When it flips upside down, bond markets are betting the central bank will have to cut rates soon, and historically a recession has usually followed.</p>",
    parts: [
      { h: "Read the shapes", sim: curveSim },
      { h: "Why the curve has a shape", sim: () => flips([["Expectations theory", "Long rates = average of expected future short rates."], ["Term premium", "Extra yield for the risk of locking money up long (inflation, rate surprises)."], ["Supply and demand", "Pension funds crave long bonds; governments issue more of some maturities."], ["Central banks", "Control the short end directly; QE pushes the long end down."]]) },
      { h: "Practise", sim: () => calc({ q: "The 1-year rate is 4%. The market expects next year's 1-year rate to be 6%. Under pure expectations theory, roughly what's today's 2-year rate?", answer: 5, tol: 0.02, unit: "%", why: "<p>Average of 4% and 6% ≈ <b>5%</b> (exactly √(1.04 × 1.06) − 1 = 4.995%). Turned around, this is how traders back out the <b>forward rates</b> the market expects.</p>" }) },
    ],
    job: "<p>Rates traders bet on <b>steepeners</b> and <b>flatteners</b>. Banks profit when the curve is steep (borrow short, lend long), so bank stocks track it. Economists watch the 10y-2y and 10y-3m spreads as recession signals. Every company's cost of debt depends on where on the curve it borrows.</p>",
    terms: [["Yield curve", "Yields of bonds plotted by maturity."], ["Inverted curve", "Short-term yields above long-term yields."], ["Term premium", "Extra yield for holding longer bonds."], ["Forward rate", "A future interest rate implied by today's curve."], ["Steepener / flattener", "Trades betting on the curve's slope changing."], ["10y-2y spread", "A popular measure of the curve's slope."]],
    quiz: [
      ["An inverted yield curve usually signals the market expects…", ["Rate hikes and booms", "Rate cuts, often due to a slowdown", "Higher inflation"], 1, "Long rates below short rates imply lower future short rates."],
      ["Which part of the curve does the central bank control most directly?", ["The short end", "The 30-year", "None"], 0, "The policy rate anchors the shortest maturities."],
      ["A steep curve is good for bank profits because…", ["Banks borrow short and lend long", "Banks hold cash", "It lowers taxes"], 0, "The wider the gap, the bigger the net interest margin."],
    ],
    recap: [["Shape = forecast", "The curve encodes rate expectations."], ["Inversion", "Historically a recession warning."], ["Short end", "Set by the central bank."]],
    see: ["central-bank", "cycle", "duration", "banks"],
  },
};

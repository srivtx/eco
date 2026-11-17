// World 14: Crashes & crises. When the machine breaks.
import { h, s, usd, num, pct, rng, clamp } from "../lib/core.js";
import { slider, seg, stats, stage, predict, calc, callout, table, bars, button, flips, stepper } from "../lib/ui.js";
import { plot, columns, curve } from "../lib/chart.js";

const W = "var(--wc)";

/* ---------- Bank run: 100 depositors with panic thresholds ---------- */
function runSim() {
  let rumour = 12, cash = 15, insured = false, seed = 4, timer = null;
  const svg = s("svg", { viewBox: "0 0 400 200", class: "chart dots", role: "img", "aria-label": "Depositors queueing at a bank" });
  const st = stats([{ label: "Withdrawn" }, { label: "Cash left in the vault" }, { label: "Bank" }]);
  const log = h("p.muted");
  let gone, round, thr;
  const reset = () => {
    const r = rng(seed); clearInterval(timer);
    thr = Array.from({ length: 100 }, () => clamp(10 + r.gauss() * 18 + 25, 0, 100));
    gone = new Set(); round = 0; paint("Press <b>Spread the rumour</b>.");
  };
  const paint = (msg) => {
    const out = gone.size, left = cash - out, fire = left < 0;
    svg.replaceChildren(...thr.map((t, i) => s("rect", { x: (i % 20) * 20 + 2, y: Math.floor(i / 20) * 34 + 4, width: 16, height: 28, rx: 4, fill: gone.has(i) ? "#e11d48" : t < rumour + out * 0.8 ? "#f5c518" : "var(--up)", stroke: "var(--ink)", "stroke-width": 1.5 })));
    st.set(0, `${out}%`); st.set(1, left >= 0 ? `${left}%` : "empty", left > 5 ? "good" : "bad");
    st.set(2, fire ? "Fire-selling loans" : out > 0 ? "Paying out" : "Calm", fire ? "bad" : out > 0 ? "warn" : "good");
    if (msg) log.innerHTML = msg;
  };
  const tick = () => {
    round++;
    const fear = insured ? rumour * 0.15 : rumour + gone.size * 0.8 + (gone.size > cash ? 25 : 0);
    const before = gone.size;
    thr.forEach((t, i) => { if (!gone.has(i) && t < fear) gone.add(i); });
    const added = gone.size - before;
    if (!added || round > 30) { clearInterval(timer); paint(gone.size > cash ? `Run complete: ${gone.size}% of deposits pulled in ${round} rounds. The bank's loans were fine, but it had only ${cash}% in cash, so it had to dump loans at fire-sale prices and failed.` : `The rumour fizzled. ${gone.size}% withdrew; the bank paid them from its ${cash}% cash buffer.`); return; }
    paint(`Round ${round}: ${added} more people saw the queue and joined it.`);
  };
  const go = () => { reset(); timer = setInterval(tick, 380); };
  const c = [slider({ label: "Strength of the rumour", min: 0, max: 50, value: rumour, fmt: (x) => `${x}`, onInput: (x) => { rumour = x; reset(); } }), slider({ label: "Cash the bank keeps", min: 5, max: 50, value: cash, fmt: (x) => `${x}%`, onInput: (x) => { cash = x; reset(); } }),
    seg({ label: "Deposit insurance", options: [{ value: "n", label: "None" }, { value: "y", label: "Guaranteed" }], value: "n", onChange: (x) => { insured = x === "y"; reset(); } }), button("Spread the rumour", go, "primary"), button("New town", () => { seed++; reset(); })];
  reset();
  return stage({ title: "100 depositors, one rumour", controls: c, body: [h("div.legend", [["var(--up)", "Calm"], ["#f5c518", "Nervous"], ["#e11d48", "Withdrawn"]].map(([col, t]) => h("span", h("i", { style: { background: col } }), t))), h("div.chartbox", svg), st.el, log], note: "Each person has a panic threshold. Every withdrawal makes the queue longer and the fear stronger, so the next group goes. Once cash runs out, the bank must sell long-term loans cheaply, which makes the rumour come true. Turn on deposit insurance and the same rumour dies." });
}

/* ---------- Leverage loop ---------- */
function spiral() {
  let lev = 10, shock = 3, depth = 40;
  const p = plot({ height: 260, x: [0, 10], y: [0, 105], xLabel: "round of forced selling", yLabel: "asset price", xFmt: (x) => `${num(x)}`, yFmt: (x) => num(x), label: "Fire-sale spiral" });
  const st = stats([{ label: "Initial shock" }, { label: "Total price fall" }, { label: "Fund equity left" }]);
  const draw = () => {
    let price = 100 * (1 - shock / 100), assets = lev * 100 / 100, debt = assets - 1, units = assets / 1;
    const pts = [[0, 100], [1, price]], eq = [[0, 100], [1, Math.max(0, (units * price / 100 - debt) * 100)]];
    for (let k = 2; k <= 10; k++) {
      const A = units * price / 100, E = A - debt;
      if (E <= 0) { pts.push([k, price]); eq.push([k, 0]); continue; }
      const target = E * lev, sell = Math.max(0, A - target);
      const sellUnits = sell / (price / 100); units -= sellUnits; debt -= sell;
      price = price * (1 - sellUnits / depth);
      pts.push([k, price]); eq.push([k, Math.max(0, (units * price / 100 - debt) * 100)]);
    }
    p.draw({ series: [{ name: "Asset price", color: W, width: 4, pts }, { name: "Fund equity (% of start)", color: "#f5c518", width: 3, pts: eq.map(([a, b]) => [a, Math.min(105, b)]) }] });
    st.set(0, `−${shock}%`); st.set(1, `−${num(100 - price, 1)}%`, 100 - price > shock * 2 ? "bad" : "warn"); st.set(2, `${num(eq.at(-1)[1])}%`, eq.at(-1)[1] < 30 ? "bad" : "good");
  };
  const c = [slider({ label: "Leverage (assets ÷ equity)", min: 1, max: 30, value: lev, fmt: (x) => `${x}×`, onInput: (x) => { lev = x; draw(); } }), slider({ label: "Initial price shock", min: 0, max: 10, step: 0.5, value: shock, fmt: (x) => `−${x}%`, onInput: (x) => { shock = x; draw(); } }), slider({ label: "Market depth (buyers waiting)", min: 10, max: 200, step: 5, value: depth, fmt: (x) => `${x}`, onInput: (x) => { depth = x; draw(); } })];
  draw();
  return stage({ title: "A leveraged fund must keep its leverage constant", controls: c, body: [p.el, st.el], note: "A small price drop eats the fund's thin equity, so it must sell assets to repay debt. Selling pushes the price down further, which eats more equity, which forces more selling. At 1× leverage there's no spiral. At 30× (Lehman's was about 30×), a 3% fall wipes out equity." });
}

/* ---------- 2008: tranches ---------- */
function tranches() {
  let pd = 5, rho = 0.1;
  const box = h("div"), st = stats([{ label: "Average pool loss" }, { label: "Chance senior (AAA) loses money" }]);
  const tr = [["Equity 0-5%", 0, 5, "var(--down)"], ["Mezzanine 5-15%", 5, 15, "#f5c518"], ["Senior 15-100%", 15, 100, "var(--up)"]];
  const Ninv = (p) => { // Acklam-ish rational approximation
    const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239], b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572], c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783], d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
    if (p < 0.02425) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - 0.02425) return -Ninv(1 - p);
    const q = p - 0.5, r = q * q; return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  };
  const Phi = (x) => 0.5 * (1 + Math.tanh(0.7978845608 * (x + 0.044715 * x * x * x)));
  const draw = () => {
    const r = rng(11), K = Ninv(pd / 100), N = 3000, lgd = 0.5, losses = [];
    for (let i = 0; i < N; i++) { const z = r.gauss(); const cpd = Phi((K - Math.sqrt(rho) * z) / Math.sqrt(1 - rho)); losses.push(cpd * lgd * 100); }
    const tl = tr.map(([, a, b]) => losses.reduce((acc, L) => acc + clamp(L - a, 0, b - a) / (b - a), 0) / N);
    const hit = losses.filter((L) => L > 15).length / N;
    box.replaceChildren(bars(tr.map(([n], i) => ({ label: n, value: tl[i] * 100, color: tr[i][3] })), { max: 100, fmt: (v) => `${num(v, 1)}% lost` }));
    st.set(0, `${num(losses.reduce((a, b) => a + b, 0) / N, 1)}%`); st.set(1, pct(hit, 1), hit > 0.01 ? "bad" : "good");
  };
  const c = [slider({ label: "Mortgage default rate", min: 1, max: 30, value: pd, fmt: (x) => `${x}%`, onInput: (x) => { pd = x; draw(); } }), slider({ label: "Correlation: do they default together?", min: 0, max: 0.9, step: 0.05, value: rho, fmt: (x) => num(x, 2), onInput: (x) => { rho = x; draw(); } })];
  draw();
  return stage({ title: "Slice a pool of 1,000 mortgages into tranches", controls: c, body: [box, st.el], note: "Losses hit the equity tranche first, then mezzanine, then senior. With low correlation, defaults are spread out and the senior slice looks bullet-proof: rated AAA. But mortgages default <b>together</b> when house prices fall nationwide. Raise correlation and the \"AAA\" slice starts losing money. Ratings models assumed low correlation." });
}

function housing() {
  const yrs = [1997, 1999, 2001, 2003, 2005, 2006, 2007, 2008, 2009, 2010, 2012, 2014, 2016, 2018, 2020, 2022];
  const idx = [84, 95, 110, 130, 172, 184, 176, 152, 139, 136, 130, 158, 173, 193, 211, 290];
  const p = plot({ height: 240, x: [1997, 2022], y: [60, 300], xLabel: "year", yLabel: "US home price index", xFmt: (x) => String(Math.round(x)), yFmt: (x) => num(x), label: "US house prices" });
  p.draw({ series: [{ name: "Case-Shiller national index (rough)", color: W, width: 4, pts: yrs.map((y, i) => [y, idx[i]]) }], bands: [{ x0: 2007.9, x1: 2009.5, color: "var(--down)", opacity: 0.15, label: "crisis" }], dots: [{ x: 2006, y: 184, color: "#f5c518", r: 7, label: "peak 2006", anchor: "end", dx: -10 }] });
  return p.el;
}

/* ---------- Bubbles ---------- */
function bubbleSim() {
  let mom = 55, seed = 2;
  const p = plot({ height: 270, x: [0, 120], y: [0, 400], xLabel: "months", yLabel: "price", xFmt: (x) => num(x), yFmt: (x) => num(x), label: "Bubble simulation" });
  const st = stats([{ label: "Peak vs fair value" }, { label: "Crash from peak" }]);
  const draw = () => {
    const r = rng(seed), fv = (t) => 100 * Math.pow(1.004, t), pts = [[0, 100]];
    let pr = 100, prev = 100, peak = 100, trough = 1e9, crashed = false;
    for (let t = 1; t <= 120; t++) {
      const trend = (pr - prev) / prev, gap = Math.log(fv(t) / pr);
      const story = t > 10 && t < 45 ? 0.012 : 0;
      const ret = (mom / 100) * trend * 1.08 + (1 - mom / 100) * gap * 0.08 + story + r.gauss() * 0.02;
      prev = pr; pr = Math.max(5, pr * (1 + ret)); pts.push([t, pr]);
      if (pr > peak && !crashed) peak = pr; if (pr < peak * 0.7) crashed = true; if (crashed) trough = Math.min(trough, pr);
    }
    const top = Math.max(...pts.map((q) => q[1]));
    p.draw({ y: [0, Math.max(250, top * 1.1)], series: [{ name: "Price", color: W, width: 4, pts }, { name: "Fair value", color: "var(--ink-3)", dash: "5 5", pts: curve(fv, 0, 120, 60) }] });
    const ti = pts.findIndex((q) => q[1] === top);
    st.set(0, `${num(top / fv(ti), 1)}×`, top / fv(ti) > 1.6 ? "bad" : "good");
    st.set(1, trough < 1e9 ? `−${num((1 - trough / peak) * 100)}%` : "no crash yet", trough < 1e9 ? "bad" : "good");
  };
  const c = [slider({ label: "Share of trend-chasing traders", min: 0, max: 95, value: mom, fmt: (x) => `${x}%`, onInput: (x) => { mom = x; draw(); } }), button("Rerun history", () => { seed++; draw(); }, "primary")];
  draw();
  return stage({ title: "Fundamentalists vs trend-chasers", controls: c, body: [p.el, st.el], note: "Fundamentalists buy below fair value and sell above it. Trend-chasers buy what's been rising. A good story (months 10-45) gives the price a nudge; with enough trend-chasers that nudge feeds on itself, overshoots, then reverses just as violently. Models like this (Lux & Marchesi 1999) reproduce real market booms and busts." });
}

export default {
  "bank-run": {
    principle: "Banks borrow short and lend long. That's useful, and it means <em>any bank can fail if enough depositors believe it will</em>.",
    hook: "<p>On 9 March 2023, depositors tried to pull $42 billion out of Silicon Valley Bank in one day, mostly by phone app, egged on by group chats. The next morning regulators closed it: the fastest bank run in history. SVB had real losses, but it was the run that killed it.</p>",
    parts: [
      { h: "Run the bank", sim: runSim },
      { h: "Why banks are fragile", sim: () => flips([["Maturity transformation", "Deposits can leave today; mortgages take 25 years to repay. The bank bridges the gap."], ["Liquidity vs solvency", "Solvent: assets > debts. Liquid: can pay right now. A solvent bank can still be illiquid."], ["Self-fulfilling", "If everyone runs, the bank must fire-sell assets, and then it really is insolvent. A coordination game with two equilibria (Diamond & Dybvig 1983, Nobel 2022)."], ["Fire sale", "Selling assets fast, below their value, because you must."]]) },
      { h: "The fixes", sim: () => table(["Tool", "What it does", "Example"], [["Deposit insurance", "Small depositors have no reason to run", "US FDIC: $250k per depositor per bank"], ["Lender of last resort", "Central bank lends against good collateral", "Bagehot's rule: lend freely, at a penalty rate, against good collateral"], ["Capital requirements", "More equity to absorb losses", "Basel III"], ["Liquidity rules", "Hold enough cash-like assets for 30 days of stress", "Liquidity Coverage Ratio"], ["Resolution", "Wind down a failing bank without chaos", "Bail-in, living wills"]]),
        after: "<p>SVB's problem: about 94% of its deposits were above the $250k insurance limit, held by startups who all talked to each other. Insurance only works if depositors are covered.</p>" },
      { h: "Practise", sim: () => predict({ q: "A bank's loans are sound, but it holds little cash and a rumour spreads. Which policy most directly stops a run?", options: ["Raising interest rates", "Credible deposit insurance or central-bank lending", "Lowering taxes"], answer: 1, why: "<p>The run is about <b>confidence</b>. If depositors know they'll be paid regardless, nobody needs to be first in the queue, and the bad equilibrium disappears.</p>" }) },
    ],
    job: "<p>Bank treasurers manage liquidity daily. Regulators (Fed, ECB, PRA) run stress tests and supervise. Central banks act as lender of last resort. Risk managers model deposit outflows (\"how sticky are our deposits?\"). Bank equity and credit analysts watch deposit trends, unrealised losses and funding mix.</p>",
    terms: [["Bank run", "Many depositors withdrawing at once out of fear."], ["Maturity transformation", "Funding long-term loans with short-term deposits."], ["Liquidity", "Ability to pay obligations as they come due."], ["Solvency", "Assets exceed liabilities."], ["Deposit insurance", "Government guarantee of deposits up to a limit."], ["Lender of last resort", "Central bank lending to solvent but illiquid banks."], ["Contagion", "Fear spreading from one institution to others."]],
    quiz: [
      ["A bank is solvent but can't meet withdrawals today. It's…", ["Insolvent", "Illiquid", "Bankrupt"], 1, "Liquidity problem, not solvency."],
      ["Why can a rumour alone sink a healthy bank?", ["Banks are corrupt", "Fire sales to meet withdrawals create real losses", "Rumours are illegal"], 1, "The run makes itself true."],
      ["Bagehot's rule says lend…", ["Freely, at a penalty rate, against good collateral", "Only to small banks", "At zero interest to anyone"], 0, "The classic lender-of-last-resort rule (1873)."],
    ],
    recap: [["Short vs long", "Deposits leave fast; loans don't."], ["Self-fulfilling", "Fear creates the losses."], ["Backstops", "Insurance and lender of last resort."]],
    see: ["banks", "central-bank", "leverage-loop", "herding"],
  },

  "leverage-loop": {
    principle: "Leverage turns <em>small price falls into forced selling</em>, and forced selling into bigger price falls. Losses feed on themselves.",
    hook: "<p>In March 2021, the family office Archegos had about $36 billion of stock exposure on roughly $10 billion of capital. A few of its stocks fell; banks demanded more collateral; Archegos couldn't pay; banks dumped the shares in days. Credit Suisse lost $5.5 billion and the bank never fully recovered.</p>",
    parts: [
      { h: "Watch the spiral", sim: spiral },
      { h: "How it propagates", sim: () => stepper([
        { t: "1 · Shock", html: "<p>Something falls: house prices, a stock, a bond. A modest move, say 3%.</p>" },
        { t: "2 · Margin call", html: "<p>Lenders ask leveraged holders for more collateral, or to cut positions. <b>Haircuts</b> (how much lenders lend against an asset) also get bigger when markets are scared.</p>" },
        { t: "3 · Fire sales", html: "<p>Holders sell what they can, not what they want: often the most liquid assets, which spreads the selling to unrelated markets.</p>" },
        { t: "4 · Mark to market", html: "<p>Everyone else holding the same assets marks them down, takes losses, and gets their own margin calls.</p>" },
        { t: "5 · Spiral", html: "<p>Brunnermeier & Pedersen (2009) call this the <b>liquidity spiral</b>: funding and market liquidity dry up together. Seen in 1998 (LTCM), 2008, March 2020 and the 2022 UK gilt crisis.</p>" },
      ]) },
      { h: "Practise", sim: () => calc({ q: "A fund has $100M equity and $900M debt (10× leverage). Its assets fall 4%. What % of its equity is lost?", answer: 40, tol: 0.01, unit: "%", why: "<p>Assets $1,000M × 4% = $40M loss, all borne by the $100M equity: <b>40%</b>. And to get back to 10× it must now sell $360M of assets into a falling market.</p>" }) },
    ],
    job: "<p>Prime brokers at banks lend to hedge funds and set margin; risk teams monitor concentration. Regulators track leverage in the \"shadow banking\" system. Central banks run emergency facilities when spirals start (March 2020). Hedge fund risk managers stress-test what happens if they must sell into a crowded trade.</p>",
    terms: [["Leverage", "Using borrowed money; assets ÷ equity."], ["Margin call", "Demand for more collateral when positions lose value."], ["Haircut", "Discount a lender applies to collateral."], ["Fire sale", "Forced selling at depressed prices."], ["Mark to market", "Valuing holdings at current market prices."], ["Liquidity spiral", "Falling prices and tightening funding reinforcing each other."], ["Deleveraging", "Reducing debt, often by selling assets."]],
    quiz: [
      ["At 20× leverage, what asset fall wipes out equity?", ["20%", "5%", "1%"], 1, "1 ÷ 20 = 5%."],
      ["Fire sales spread to unrelated assets because…", ["All assets are the same", "Forced sellers sell whatever is liquid", "Regulators require it"], 1, "You sell what you can, not what you want."],
      ["Bigger haircuts in a crisis mean…", ["More borrowing possible", "Less borrowing against the same collateral", "Lower interest"], 1, "Lenders lend less per dollar of collateral."],
    ],
    recap: [["Leverage", "Small falls, big equity losses."], ["Forced selling", "Pushes prices further down."], ["Spiral", "Funding and prices collapse together."]],
    see: ["capital-structure", "bank-run", "crisis-2008", "hedging"],
  },

  "crisis-2008": {
    principle: "2008 was <em>a housing bust, amplified by leverage, hidden by complex securities, and spread by short-term funding</em>. Each part alone would have been a bad year. Together they nearly broke the world.",
    hook: "<p>US house prices fell about 27% from their 2006 peak. That alone destroyed perhaps $7 trillion of household wealth. But the panic of September 2008 (Lehman's collapse, AIG's rescue, money funds \"breaking the buck\") came from the financial plumbing built on top of those mortgages.</p>",
    parts: [
      { h: "The house price chart", sim: housing },
      { h: "Slice the mortgages", sim: tranches },
      { h: "The machine, step by step", sim: () => stepper([
        { t: "1 · Originate", html: "<p>Lenders made mortgages to riskier (<b>subprime</b>) borrowers, often with teaser rates and little documentation. They didn't keep them: they sold them on (<b>originate to distribute</b>), so they cared about volume, not quality.</p>" },
        { t: "2 · Securitise", html: "<p>Banks pooled thousands of mortgages into <b>mortgage-backed securities</b> (MBS) and sliced them into tranches. Then they pooled the risky mezzanine tranches again into <b>CDOs</b>, and sliced those again.</p>" },
        { t: "3 · Rate", html: "<p>Rating agencies, paid by the issuers, rated most of it AAA, assuming house prices wouldn't fall everywhere at once. About $3 trillion of AAA-rated mortgage securities were later downgraded.</p>" },
        { t: "4 · Lever up", html: "<p>Investment banks ran at 30-40× leverage, funded overnight in the <b>repo</b> market. AIG sold <b>credit default swaps</b> (insurance) on hundreds of billions of these securities, without the capital to pay out.</p>" },
        { t: "5 · Break", html: "<p>House prices fell. Defaults rose together. Nobody knew who held the losses, so lenders stopped lending to everyone: repo haircuts jumped, Bear Stearns failed (March 2008), Lehman went bankrupt (15 September), AIG was rescued the next day.</p>" },
        { t: "6 · Respond", html: "<p>The Fed cut to zero and started QE. Congress passed the $700B TARP. Governments guaranteed bank debt. Result: the worst recession since the 1930s, but not a depression. Then: Dodd-Frank, Basel III, stress tests, central clearing of derivatives.</p>" },
      ]) },
      { h: "Who held the risk", sim: () => flips([["Subprime borrowers", "Took loans they could only repay if prices kept rising."], ["Originators", "Countrywide, New Century: paid per loan, sold the risk on."], ["Investment banks", "Bear, Lehman, Merrill: held CDOs on 30× leverage."], ["Rating agencies", "Moody's, S&P: AAA on securities that later defaulted."], ["AIG", "Sold CDS protection with no capital: a $182B bailout."], ["Money market funds", "Reserve Primary Fund broke the buck on Lehman paper, triggering a run."]]) },
    ],
    job: "<p>Every risk job today was shaped by 2008: bank stress testing (CCAR, EBA), central clearing, Basel III capital and liquidity rules, structured-credit analysts who now model correlation, and the <b>CLO</b> market (the corporate-loan cousin of CDOs) that funds most LBOs. Interviewers love asking \"explain 2008 in two minutes\".</p>",
    terms: [["Subprime mortgage", "Loan to a borrower with weak credit."], ["Securitisation", "Pooling loans and selling securities backed by them."], ["MBS", "Mortgage-backed security."], ["CDO", "Collateralised debt obligation: a pool of debt sliced into tranches."], ["Tranche", "A slice of a security with its own priority for losses."], ["Credit default swap (CDS)", "Insurance-like contract paying out if a borrower defaults."], ["Repo", "Short-term borrowing secured by collateral."], ["TARP", "US $700B rescue programme (2008)."]],
    quiz: [
      ["Which tranche takes losses first?", ["Senior", "Mezzanine", "Equity"], 2, "Equity is the first-loss piece."],
      ["Why did AAA tranches fail?", ["They had no mortgages", "Defaults were far more correlated than models assumed", "Fraud alone"], 1, "Nationwide price falls hit everything together."],
      ["\"Originate to distribute\" weakened lending standards because…", ["Lenders kept no risk", "Interest rates rose", "Borrowers lied more"], 0, "If you sell the loan, you care less if it's repaid."],
    ],
    recap: [["Bust", "House prices −27%."], ["Correlation", "AAA wasn't."], ["Plumbing", "Leverage + short funding spread it."]],
    see: ["credit", "leverage-loop", "bank-run", "central-bank"],
  },

  bubbles: {
    principle: "Bubbles follow a <em>recognisable plot</em>: a real innovation, easy credit, a story everyone believes, a mania, and a crash. The asset changes; the psychology doesn't.",
    hook: "<p>In February 1637, a single Semper Augustus tulip bulb reportedly sold for the price of a grand Amsterdam house. In 1999, Pets.com went public and was bankrupt within a year. In 2021, a cartoon-ape JPEG sold for over $3 million. People said \"this time is different\" every time.</p>",
    parts: [
      { h: "Make a bubble", sim: bubbleSim },
      { h: "Five stages (Minsky & Kindleberger)", sim: () => stepper([
        { t: "1 · Displacement", html: "<p>Something genuinely new: railways, radio, the internet, blockchains, AI. Real profits appear.</p>" },
        { t: "2 · Boom", html: "<p>Prices rise; media attention grows; credit gets easier.</p>" },
        { t: "3 · Euphoria", html: "<p>\"This time is different.\" New valuation metrics justify any price (\"eyeballs\", \"TAM\"). Amateurs pile in. Leverage grows. <b>Hyman Minsky</b>: stability breeds instability, because calm encourages risk.</p>" },
        { t: "4 · Distress / profit-taking", html: "<p>Insiders start selling. A trigger (rate rise, a fraud, a failed IPO) makes people doubt.</p>" },
        { t: "5 · Panic (revulsion)", html: "<p>Everyone rushes for the exit at once. Prices often overshoot below fair value. A <b>Minsky moment</b>.</p>" },
      ]) },
      { h: "The hall of fame", sim: () => table(["Bubble", "Peak", "Fall from peak"], [["Dutch tulips", "1637", "~95% (in weeks)"], ["South Sea Company", "1720", "~85%"], ["US stocks (Dow)", "1929", "89% by 1932"], ["Japan (Nikkei)", "1989", "~80% by 2003; recovered only in 2024"], ["Dot-com (Nasdaq)", "2000", "78% by 2002"], ["US housing (national)", "2006", "~27%"], ["Bitcoin", "2017 / 2021", "~84% / ~77%"], ["Meme stocks, SPACs, NFTs", "2021", "Most 70-95%"]]),
        after: "<p>Not every bubble wrecks the economy. Unlevered stock bubbles (dot-com) hurt investors. <b>Credit-fuelled</b> bubbles (1929, Japan, 2008 housing) wreck banks and cause long recessions.</p>" },
      { h: "Can you spot one?", sim: () => predict({ q: "Which is the most reliable warning sign of a dangerous bubble?", options: ["Prices rising fast", "Prices rising fast, funded by fast-growing debt", "Newspaper headlines"], answer: 1, why: "<p>Fast price rises happen in healthy booms too. Research by Greenwood, Shleifer & You (2019) found that sharp price run-ups <i>combined with</i> rapid credit growth and new issuance raise crash odds sharply. Credit is what turns a bust into a crisis.</p>" }) },
    ],
    job: "<p>Central banks track asset prices and credit for financial-stability reports. Investors decide whether to ride, avoid or short a bubble (shorting too early is often fatal). VCs and PE firms invest through cycles and try not to buy at the top. Journalists and historians argue for decades about which ones were truly bubbles.</p>",
    terms: [["Bubble", "Prices far above fundamental value, driven by expectations of further rises."], ["Minsky moment", "Sudden collapse after a long period of speculative excess."], ["Displacement", "The innovation or shock that starts a boom."], ["Euphoria", "The stage when caution disappears."], ["\"This time is different\"", "The four most dangerous words in investing (John Templeton)."], ["Momentum", "Assets that rose tend to keep rising in the short run."], ["Fundamental value", "Present value of expected future cash flows."]],
    quiz: [
      ["Minsky argued that long periods of stability…", ["Make crises impossible", "Encourage risk-taking that causes instability", "Have no effect"], 1, "Stability is destabilising."],
      ["Which bubbles tend to cause the worst recessions?", ["Equity bubbles without debt", "Credit-fuelled bubbles", "Collectible bubbles"], 1, "Debt spreads losses to banks."],
      ["Why is shorting a bubble risky?", ["It's illegal", "Prices can keep rising long after they're overvalued", "There are no lenders"], 1, "Being right too early can still bankrupt you."],
    ],
    recap: [["Five stages", "Displacement → boom → euphoria → distress → panic."], ["Credit", "Turns busts into crises."], ["Same psychology", "Herding, overconfidence, greater fools."]],
    see: ["herding", "crisis-2008", "leverage-loop", "dcf"],
  },
};

// World 3: Money & banks.
import { h, money, num, pct, clamp, rng } from "../lib/core.js";
import { slider, seg, stats, stage, predict, calc, callout, table, bars, button, flips, stepper } from "../lib/ui.js";
import { plot, columns, donut } from "../lib/chart.js";

const W = "var(--wc)";

/* ---------------- barter vs money ---------------- */
function barterSim() {
  let n = 8;
  const st = stats([{ label: "Prices to remember (barter)" }, { label: "Prices with money" }]);
  const svgBox = h("div");
  const draw = () => {
    const pairs = (n * (n - 1)) / 2;
    st.set(0, num(pairs), "bad"); st.set(1, num(n - 1), "good");
    // draw goods on a circle with all barter links
    const R = 110, c = 140, pts = Array.from({ length: n }, (_, i) => [c + R * Math.cos((i / n) * 2 * Math.PI - Math.PI / 2), c + R * Math.sin((i / n) * 2 * Math.PI - Math.PI / 2)]);
    const lines = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) lines.push(`<line x1="${pts[i][0]}" y1="${pts[i][1]}" x2="${pts[j][0]}" y2="${pts[j][1]}" stroke="var(--bad)" stroke-width="1.2" opacity=".55"/>`);
    const dots = pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="var(--surface)" stroke="var(--ink)" stroke-width="2.5"/>`).join("");
    const star = pts.map(([x, y]) => `<line x1="${c}" y1="${c}" x2="${x}" y2="${y}" stroke="var(--good)" stroke-width="2.5"/>`).join("");
    svgBox.innerHTML = `<div class="split"><figure style="margin:0;text-align:center"><svg viewBox="0 0 280 280" style="max-width:280px;width:100%">${lines.join("")}${dots}</svg><figcaption class="muted">Barter: every good priced in every other good</figcaption></figure><figure style="margin:0;text-align:center"><svg viewBox="0 0 280 280" style="max-width:280px;width:100%">${star}${dots}<circle cx="${c}" cy="${c}" r="20" fill="#ffc21a" stroke="var(--ink)" stroke-width="3"/><text x="${c}" y="${c + 6}" text-anchor="middle" font-weight="800" font-size="18" fill="#1b1530">$</text></svg><figcaption class="muted">Money: every good priced in one thing</figcaption></figure></div>`;
  };
  const sl = slider({ label: "Goods in the village", min: 3, max: 24, value: n, onInput: (v) => { n = v; draw(); } });
  draw();
  return stage({ title: "Why money was invented", controls: [sl], body: [svgBox, st.el], note: "With 1,000 goods, barter needs about 500,000 exchange rates; money needs 999. And barter needs a <b>double coincidence of wants</b>: the baker must want exactly what the shoemaker has, right now." });
}

/* ---------------- banks create money ---------------- */
function multiplierSim() {
  let rr = 10, rounds = 12;
  const st = stats([{ label: "Cash first deposited" }, { label: "Total deposits after lending" }, { label: "New money created" }, { label: "Max multiplier (1 ÷ reserve)" }]);
  const box = h("div");
  const draw = () => {
    const r = rr / 100, items = []; let dep = 1000, total = 0;
    for (let i = 0; i < rounds; i++) { total += dep; items.push({ label: `Bank ${i + 1}`, value: dep, parts: [{ v: dep * r, color: "var(--ink-3)", name: "reserves" }, { v: dep * (1 - r), color: W, name: "lent out" }] }); dep *= 1 - r; }
    box.replaceChildren(columns(items, { height: 220, fmt: (v) => money(v), max: 1000, label: "Deposits at each bank in the chain" }));
    st.set(0, money(1000)); st.set(1, money(total)); st.set(2, money(total - 1000), "good"); st.set(3, `${num(1 / r, 1)}×`);
  };
  const a = slider({ label: "Reserve ratio (kept, not lent)", min: 2, max: 50, value: rr, fmt: (v) => `${v}%`, onInput: (v) => { rr = v; draw(); } });
  const b = slider({ label: "Rounds of lending", min: 1, max: 20, value: rounds, onInput: (v) => { rounds = v; draw(); } });
  draw();
  return stage({ title: "One deposit, lent again and again", controls: [a, b], body: [box, st.el], note: "You deposit $1,000. The bank keeps a slice (grey) and lends the rest (coloured), which gets spent and deposited at the next bank, which lends most of it again. Every deposit is money someone can spend, so the system has created money out of lending." });
}

function balanceSheetSim() {
  let loans = 90, reserves = 10, equity = 8, lossPct = 0;
  const box = h("div"), st = stats([{ label: "Leverage (assets ÷ equity)" }, { label: "Capital ratio" }, { label: "Status" }]);
  const draw = () => {
    const lost = (loans * lossPct) / 100, assets = loans - lost + reserves, deposits = loans + reserves - equity, eq = assets - deposits;
    const cell = (label, v, col) => h("div.bs-c", { style: { flex: `${Math.max(0.0001, v)} 1 0`, background: col } }, h("b", label), h("span", money(v * 1e6)));
    box.replaceChildren(h("div.bs",
      h("div.bs-side", h("div.bs-h", "Assets: what the bank owns"), h("div.bs-col", cell("Loans", loans - lost, W), lost > 0 ? cell("Losses", lost, "repeating-linear-gradient(-45deg, var(--bad) 0 6px, var(--bad-bg) 6px 12px)") : null, cell("Reserves", reserves, "var(--ink-3)"))),
      h("div.bs-side", h("div.bs-h", "Liabilities + equity: who it owes"), h("div.bs-col", cell("Deposits (owed to you)", deposits, "#0ea5e9"), eq > 0 ? cell("Equity", eq, "#ffc21a") : null, lost > 0 ? h("div.bs-c", { style: { flex: `${lost} 1 0`, background: "transparent", border: "2px dashed var(--bad)" } }, h("b", "hole"), h("span", "")) : null))));
    st.set(0, eq > 0 ? `${num(assets / eq, 1)}×` : "∞"); st.set(1, pct(eq / assets), eq / assets < 0.04 ? "bad" : "good"); st.set(2, eq <= 0 ? "Insolvent" : eq / assets < 0.04 ? "Undercapitalised" : "Healthy", eq <= 0 ? "bad" : eq / assets < 0.04 ? "warn" : "good");
  };
  const a = slider({ label: "Equity (owners' money), $M", min: 2, max: 20, value: equity, onInput: (v) => { equity = v; draw(); } });
  const b = slider({ label: "Loans that go bad", min: 0, max: 20, value: lossPct, fmt: (v) => `${v}%`, onInput: (v) => { lossPct = v; draw(); } });
  draw();
  return stage({ title: "A bank's balance sheet", controls: [a, b], body: [box, st.el], note: "Losses hit equity first. With 8% equity, losing 9% of loans wipes the owners out and depositors are next. That's why regulators care about <b>capital ratios</b> far more than reserve ratios today." });
}

/* ---------------- central bank game ---------------- */
function cbGame() {
  let q, infl, gap, rate, hist;
  const p = plot({ height: 280, x: [0, 12], y: [-6, 10], xLabel: "quarter", yLabel: "%", xFmt: (v) => `Q${Math.round(v)}`, yFmt: (v) => `${num(v)}%`, xTicks: 6, label: "Inflation, output gap and the policy rate" });
  const st = stats([{ label: "Inflation" }, { label: "Output gap (econ. vs potential)" }, { label: "Your rate" }, { label: "Score" }]);
  const msg = h("p.muted");
  const sl = slider({ label: "Set the policy rate this quarter", min: 0, max: 12, step: 0.25, value: 4, fmt: (v) => `${v}%`, onInput: (v) => { rate = v; } });
  const reset = () => { q = 0; infl = 6.5; gap = 1.5; rate = 4; sl.value = 4; hist = [[0, infl, gap, rate]]; msg.innerHTML = "Inflation is 6.5% and the economy is running hot. Your target is 2%. Each quarter, set a rate and press <b>Next quarter</b>. Rates work with a lag."; draw(); };
  const r = rng(11);
  const step = () => {
    if (q >= 12) return;
    const real = rate - infl;                       // real rate: what borrowing actually costs after inflation
    const shock = (r() - 0.5) * 0.6;
    gap = 0.75 * gap - 0.35 * (real - 1) + shock;     // above-neutral real rates cool the economy
    infl = infl + 0.35 * gap - 0.08 * (infl - 2) + (r() - 0.5) * 0.3;
    q++; hist.push([q, infl, gap, rate]);
    const score = Math.max(0, Math.round(100 - hist.slice(1).reduce((a, [, i, g]) => a + Math.abs(i - 2) * 3 + Math.max(0, -g) * 4, 0)));
    msg.innerHTML = q === 12 ? `<b>Three years done.</b> Inflation ended at ${num(infl, 1)}%. ${Math.abs(infl - 2) < 1 && hist.every(([, , g]) => g > -2.5) ? "A soft landing. Central bankers get statues for that." : gap < -2.5 ? "Inflation's down but you caused a recession. Too much, too late?" : "Inflation is still off target. Rates usually need to rise above inflation to bite."}` :
      gap < -2 ? "⚠ The economy is shrinking fast. Unemployment is rising." : infl > 5 ? "Prices are still running hot." : "Steady...";
    draw(score);
  };
  const draw = (score) => {
    p.draw({ series: [{ name: "Inflation", color: "var(--bad)", pts: hist.map(([t, i]) => [t, i]) }, { name: "Output gap", color: "#3b82f6", pts: hist.map(([t, , g]) => [t, g]) }, { name: "Policy rate", color: W, pts: hist.map(([t, , , rr]) => [t, rr]), dash: "6 4" }], bands: [{ x0: 0, x1: 12, color: "var(--good)", opacity: 0 }], hlines: [{ y: 2, label: "2% target", color: "var(--good)" }],
      dots: [{ x: q, y: infl, color: "var(--bad)", r: 6 }, { x: q, y: gap, color: "#3b82f6", r: 6 }, { x: q, y: rate, color: "#8b5cf6", r: 6 }] });
    st.set(0, `${num(infl, 1)}%`, Math.abs(infl - 2) < 1 ? "good" : "bad"); st.set(1, `${num(gap, 1)}%`, gap < -2 ? "bad" : ""); st.set(2, `${rate}%`); st.set(3, score == null ? "–" : String(score));
  };
  reset();
  return stage({ title: "You run the central bank", controls: [sl, h("div.game-btns", button("Next quarter →", step, "primary"), button("Restart", reset))], body: [msg, p.el, st.el], note: "A toy model, but the shape is real: rates must rise <b>above</b> inflation (a positive real rate) to cool things, the effect arrives with a lag, and overdoing it causes a recession." });
}

/* ---------------- inflation ---------------- */
function meltSim() {
  let infl = 3, years = 30;
  const p = plot({ height: 260, x: [0, 40], y: [0, 100], xLabel: "years", yLabel: "what $100 buys", xFmt: (v) => Math.round(v), yFmt: (v) => money(v), label: "Purchasing power" });
  const st = stats([{ label: `$100 buys, in today's money` }, { label: "Years to halve (rule of 70)" }, { label: "Prices multiply by" }]);
  const draw = () => {
    const pts = Array.from({ length: 41 }, (_, t) => [t, 100 / Math.pow(1 + infl / 100, t)]);
    p.draw({ series: [{ name: "Purchasing power", color: W, pts, area: true }], vlines: [{ x: years, label: `${years} years` }], dots: [{ x: years, y: 100 / Math.pow(1 + infl / 100, years), color: "#ffc21a", label: money(100 / Math.pow(1 + infl / 100, years)) }] });
    st.set(0, money(100 / Math.pow(1 + infl / 100, years)), "bad"); st.set(1, infl > 0 ? `${num(70 / infl, 1)} yrs` : "never"); st.set(2, `${num(Math.pow(1 + infl / 100, years), 2)}×`);
  };
  const a = slider({ label: "Inflation per year", min: 0, max: 15, step: 0.5, value: infl, fmt: (v) => `${v}%`, onInput: (v) => { infl = v; draw(); } });
  const b = slider({ label: "Years", min: 1, max: 40, value: years, onInput: (v) => { years = v; draw(); } });
  draw();
  return stage({ title: "Your $100 under the mattress", controls: [a, b], body: [p.el, st.el] });
}
function basketSim() {
  const items = [["Rent", 33, 4.5], ["Food", 14, 6], ["Transport", 16, 9], ["Energy", 7, 18], ["Health", 7, 3], ["Recreation", 6, 2], ["Clothing", 3, 1], ["Other", 14, 3]];
  const ws = items.map(([, w]) => w), ch = items.map(([, , c]) => c);
  const out = h("div"), st = stats([{ label: "Official CPI inflation" }, { label: "Your inflation" }]);
  const sliders = items.map(([n], i) => slider({ label: `${n}: share of your spending`, min: 0, max: 60, value: ws[i], fmt: (v) => `${v}%`, onInput: (v) => { ws[i] = v; draw(); } }));
  const draw = () => {
    const off = items.reduce((a, [, w, c]) => a + w * c, 0) / items.reduce((a, [, w]) => a + w, 0);
    const tot = ws.reduce((a, b) => a + b, 0) || 1, mine = ws.reduce((a, w, i) => a + w * ch[i], 0) / tot;
    out.replaceChildren(bars(items.map(([n], i) => ({ label: `${n} (${ch[i]}%)`, value: (ws[i] / tot) * ch[i], color: ch[i] > 6 ? "var(--bad)" : W })), { fmt: (v) => `${num(v, 2)} pts` }));
    st.set(0, `${num(off, 1)}%`); st.set(1, `${num(mine, 1)}%`, mine > off + 0.3 ? "bad" : mine < off - 0.3 ? "good" : "");
  };
  draw();
  return stage({ title: "Build your own inflation rate", controls: sliders, body: [st.el, out], note: "Numbers in brackets are this year's price rises in a made-up but typical year with an energy shock. CPI weights a basket of an average household. If you drive a lot and rent, your personal inflation is higher than the headline." });
}

/* ---------------- FX ---------------- */
function bigMac() {
  const rows = [["Switzerland", 8.17], ["Norway", 7.0], ["USA", 5.69], ["Euro area", 5.87], ["UK", 5.55], ["Japan", 3.19], ["China", 3.53], ["India (Maharaja Mac)", 2.54], ["South Africa", 2.95]];
  return stage({ title: "The Big Mac index", body: [bars(rows.map(([n, p]) => ({ label: n, value: p, color: n === "USA" ? "#ffc21a" : p > 5.69 ? "var(--bad)" : "var(--good)" })), { fmt: (v) => money(v, 2) }), h("p.muted", { html: "Approximate dollar price of a Big Mac, rounded from The Economist's 2024 index. If currencies followed <b>purchasing power parity</b>, a burger would cost the same everywhere. Red: currency looks <i>overvalued</i> vs the dollar. Green: <i>undervalued</i>. It's a joke index that works surprisingly well over decades, and badly over months." })] });
}
function fxSim() {
  let usd = 1.1;
  const st = stats([{ label: "€1 buys" }, { label: "A $30 US shirt costs a European" }, { label: "A €200 Paris hotel costs an American" }]);
  const msg = h("p.muted");
  const draw = () => {
    st.set(0, `$${num(usd, 2)}`); st.set(1, `€${num(30 / usd, 2)}`); st.set(2, `$${num(200 * usd, 0)}`);
    msg.innerHTML = usd > 1.15 ? "<b>Strong euro.</b> European tourists and importers win; European exporters (Airbus, BMW) find it harder to sell abroad." : usd < 1.0 ? "<b>Weak euro.</b> European exporters cheer, holidays in the US get pricey, imported energy (priced in dollars) costs more, adding to inflation." : "Middle of the range.";
  };
  const a = slider({ label: "EUR/USD exchange rate", min: 0.8, max: 1.6, step: 0.01, value: usd, fmt: (v) => `${v.toFixed(2)}`, onInput: (v) => { usd = v; draw(); } });
  draw();
  return stage({ title: "Who wins from a strong currency?", controls: [a], body: [st.el, msg] });
}

export default {
  "what-money": {
    principle: "Money is <em>a shared record of who is owed what</em>, trusted because everyone else trusts it.",
    hook: "<p>A $20 note costs about 5 cents to print. Yet everyone accepts it for a pizza. Not because of gold (there isn't any behind it) but because you're sure the next person will accept it too. Money is a social technology, maybe the most successful one ever invented.</p>",
    parts: [
      { h: "Why not just swap things?", html: "<p>Without money you'd need to find someone who has what you want <i>and</i> wants what you have. And you'd need to remember a price for every pair of goods.</p>", sim: barterSim },
      { h: "Three jobs money does", sim: () => flips([["Medium of exchange", "Everyone accepts it for goods and services."], ["Unit of account", "We measure prices, debts and profits in it."], ["Store of value", "It keeps (most of) its value until you spend it."], ["Bonus: standard of deferred payment", "Loans and contracts are written in it."]]),
        after: "<p>Anything that does these jobs well is money: cowrie shells, giant stone discs on the island of Yap, cigarettes in prisoner-of-war camps, gold coins, bank deposits. Bitcoin does the first job badly (slow, volatile) and so far mainly works as a speculative store of value.</p>" },
      { h: "A short history", sim: () => stepper([
        { t: "Credit came first", html: "<p>Anthropologists (David Graeber's <i>Debt</i>) find that ancient villages ran on IOUs and memory long before coins. Mesopotamian temples kept clay-tablet ledgers of debts around 3000 BC.</p>" },
        { t: "Coins (around 600 BC)", html: "<p>Lydia (modern Turkey) stamped lumps of electrum with a lion. A stamp meant you didn't have to weigh and test the metal: the king vouched for it.</p>" },
        { t: "Paper money (China, ~1000 AD)", html: "<p>Merchants in Song-dynasty China left heavy iron coins with deposit shops for paper receipts. The state took over and printed <i>jiaozi</i>. Then it printed too many: the first paper-money inflation.</p>" },
        { t: "Banknotes and the gold standard", html: "<p>European goldsmiths issued receipts for gold, and noticed not everyone came back for it at once, so they could lend out more receipts than they had gold. Banking was born. Under the gold standard, notes could be swapped for a fixed weight of gold.</p>" },
        { t: "Fiat money (1971 onward)", html: "<p>In 1971 President Nixon ended the dollar's convertibility into gold. Since then major currencies are <b>fiat</b>: valuable because governments accept them for taxes and people trust them. Their value now depends on central banks not printing too much.</p>" },
        { t: "Digital (now)", html: "<p>Over 90% of money in rich countries exists only as numbers in bank databases. Cash is a shrinking slice. Central banks are experimenting with digital currencies (CBDCs) and private stablecoins pin themselves to the dollar.</p>" },
      ]) },
      { h: "Where money comes from today", html: "<p>There are two layers:</p><ul><li><b>Base money</b> (central bank money): cash, plus the reserves banks hold at the central bank.</li><li><b>Broad money</b>: mostly bank deposits, created when banks make loans. This is the money you actually use, and it's far bigger.</li></ul>",
        sim: () => predict({ q: "Roughly what share of money in the UK is physical cash?", options: ["About 50%", "About 20%", "About 3%"], answer: 2, why: "<p>About 3%. The Bank of England's famous 2014 paper \"Money creation in the modern economy\" showed that the other ~97% is bank deposits, created by banks when they lend. Next lesson shows how.</p>" }) },
    ],
    job: "<p>Anyone in finance needs to know the money layers: when analysts say the Fed is \"draining liquidity\" they mean shrinking reserves; when they track <b>M2</b> (broad money) they're watching bank deposits. Payments is a huge industry (Visa, Stripe, SWIFT) built on moving these database entries. And crypto debates are really debates about which institutions you trust to keep the ledger.</p>",
    terms: [["Barter", "Swapping goods directly, with no money."], ["Double coincidence of wants", "Barter needs each side to want exactly what the other has."], ["Fiat money", "Money with value from government decree and trust, not a commodity."], ["Gold standard", "A system where money could be swapped for a fixed amount of gold."], ["Base money", "Cash plus banks' reserves at the central bank."], ["Broad money (M2)", "Cash plus bank deposits: the money people spend."]],
    quiz: [
      ["Which job of money is 'prices are written in it'?", ["Medium of exchange", "Unit of account", "Store of value"], 1, "A unit of account is the measuring stick for prices and debts."],
      ["Why does a fiat note have value?", ["It's backed by gold", "Governments accept it for taxes and people trust others will accept it", "It's expensive to print"], 1, "Trust plus tax demand. The paper itself is almost worthless."],
      ["Most money in a modern economy is…", ["Coins and notes", "Bank deposits", "Gold"], 1, "Bank deposits dominate broad money: around 97% in the UK."],
    ],
    recap: [["Trust", "Money is a shared ledger of debts."], ["3 jobs", "Exchange, unit of account, store of value."], ["~97%", "Of UK money is bank deposits, not cash."]],
    see: ["banks", "central-bank", "inflation", "bank-run"],
  },

  banks: {
    principle: "When a bank makes a loan, it doesn't hand out other people's savings. <em>It types a new deposit into your account.</em> Loans create money.",
    hook: "<p>Most people think banks take your savings and lend them out. That's half right. When a bank approves a $300,000 mortgage, it simply adds $300,000 to the borrower's account. That deposit is brand-new money. The bank's limits are profitability, regulation and how much capital it has, not a vault of savings.</p>",
    parts: [
      { h: "The textbook version: the money multiplier", html: "<p>The classic textbook story: you deposit $1,000; the bank keeps some as <em>reserves</em> and lends the rest; that gets deposited elsewhere and lent again.</p>", sim: multiplierSim,
        after: "<p>The modern understanding flips the order: banks lend first and find reserves later (central banks supply reserves on demand at their policy rate). Several countries, including the UK and Canada, have <b>zero reserve requirements</b>. The real brake on lending is <em>capital</em>.</p>" },
      { h: "Inside a bank's balance sheet", html: "<p>A bank's assets are mainly loans (money others owe it). Its liabilities are mainly deposits (money it owes you). The thin slice left over is <em>equity</em>: the owners' cushion against losses. Push some loans into default.</p>", sim: balanceSheetSim },
      { h: "How a bank makes money", html: "<p>Banks borrow short (deposits you can withdraw anytime) and lend long (30-year mortgages). They earn the gap between the rate on loans and the rate on deposits: the <em>net interest margin</em>, typically 2-3%. That's <b>maturity transformation</b>: it's useful (you get instant access, the homeowner gets 30 years) and dangerous (if everyone wants their money at once, see bank runs).</p>",
        sim: () => calc({ q: "A bank has $100B of loans earning 6% and $95B of deposits costing 2%. Ignoring costs, what's its net interest income in $B?", answer: 4.1, tol: 0.01, unit: "$B", why: "<p>Interest earned $6B − interest paid $1.9B = <b>$4.1B</b>. Out of that come staff, branches, tech and loan losses.</p>" }) },
    ],
    job: "<p>Bank analysts live on <b>net interest margin</b>, <b>loan-loss provisions</b> and <b>CET1 capital ratios</b> (core equity ÷ risk-weighted assets, regulators want well above 7-10%). Bank regulation (the Basel rules) sets these minimums. Corporate bankers and leveraged-finance teams structure the loans that fund LBOs. Treasury teams manage the mismatch between short deposits and long loans.</p>",
    terms: [["Reserves", "Money banks hold at the central bank."], ["Reserve ratio", "Share of deposits kept as reserves rather than lent."], ["Money multiplier", "The textbook ratio of broad money to base money (1 ÷ reserve ratio at most)."], ["Bank capital (equity)", "The owners' stake: the first loss-absorber."], ["Capital ratio", "Equity relative to (risk-weighted) assets. Basel rules set minimums."], ["Net interest margin", "Interest earned on loans minus interest paid on deposits, as % of assets."], ["Maturity transformation", "Borrowing short-term, lending long-term."]],
    quiz: [
      ["When a bank makes a new loan, the money supply…", ["Stays the same", "Rises: a new deposit is created", "Falls"], 1, "The loan creates a matching deposit: new broad money."],
      ["With a 10% reserve ratio, the maximum textbook money multiplier is…", ["1.1", "10", "100"], 1, "1 ÷ 0.10 = 10."],
      ["A bank's first line of defence against loan losses is…", ["Deposits", "Equity (capital)", "Reserves at the central bank"], 1, "Losses reduce equity first. When equity is gone, depositors are at risk."],
    ],
    recap: [["Loans → deposits", "Lending creates new money."], ["Capital", "Equity, not reserves, really limits lending."], ["Short → long", "Banks borrow short and lend long: useful and fragile."]],
    see: ["what-money", "central-bank", "bank-run", "leverage-loop"],
  },

  "central-bank": {
    principle: "A central bank controls <em>the price of short-term money</em>. Every other interest rate, and much of the economy, follows.",
    hook: "<p>Eight times a year, about a dozen people at the US Federal Reserve decide one number. Within seconds, mortgage rates, stock prices, the dollar and the borrowing costs of every company on Earth move. The central bank is the closest thing an economy has to a steering wheel, and it steers with a delay.</p>",
    parts: [
      { h: "Run the central bank", html: "<p>Your job: get inflation back to 2% without crashing the economy. You only control one thing: the policy rate.</p>", sim: cbGame },
      { h: "How a rate rise travels", sim: () => stepper([
        { t: "1. The policy rate", html: "<p>The central bank raises the rate it pays banks on reserves and charges on overnight loans (the Fed funds rate, the ECB deposit rate, Bank Rate in the UK).</p>" },
        { t: "2. Borrowing gets dearer", html: "<p>Banks raise rates on mortgages, credit cards and business loans. Bond yields rise. Floating-rate borrowers pay more at once; fixed-rate borrowers when they refinance.</p>" },
        { t: "3. Assets get cheaper", html: "<p>Future cash flows are worth less at higher discount rates, so house prices and stocks tend to fall. People feel poorer: the <b>wealth effect</b>.</p>" },
        { t: "4. The currency strengthens", html: "<p>Higher rates attract foreign money, lifting the exchange rate. Imports get cheaper, which pulls inflation down directly.</p>" },
        { t: "5. Spending slows", html: "<p>Households save more and borrow less; firms delay investment. Demand cools, firms hire less, wage growth eases.</p>" },
        { t: "6. Inflation falls (12-24 months later)", html: "<p>The famous <b>long and variable lags</b> (Milton Friedman's phrase). Central bankers drive by looking in the rear-view mirror, with brakes that work a year late.</p>" },
      ]) },
      { h: "The toolkit beyond rates", html: "<ul><li><b>Quantitative easing (QE)</b>: when rates hit zero, the central bank buys bonds with new reserves, pushing long-term rates down. Used massively after 2008 and in 2020.</li><li><b>Quantitative tightening (QT)</b>: letting those bonds roll off.</li><li><b>Forward guidance</b>: promising what rates will do, to move long-term rates now.</li><li><b>Lender of last resort</b>: lending to solvent banks in a panic (see bank runs).</li></ul><p>Why independent? Politicians love rate cuts before elections. Handing rates to independent technocrats with an inflation target (usually 2%) made inflation far more stable after the 1990s.</p>",
        sim: () => predict({ q: "Inflation is 5% and the policy rate is 3%. Is policy tight or loose?", options: ["Tight: rates are high", "Loose: the real rate is −2%", "Neutral"], answer: 1, why: "<p>What matters is the <em>real</em> rate = nominal − inflation = 3 − 5 = −2%. Borrowers repay in money worth less: an incentive to borrow and spend. To bite, rates usually need to exceed inflation, as Paul Volcker showed with 20% rates in 1981.</p>" }) },
    ],
    job: "<p>\"Fed watching\" is a profession. Traders price the odds of every meeting (via futures). Every valuation model uses a risk-free rate anchored by the central bank. Banks' profits, PE deal financing costs and startup valuations all swing with it. When rates went from near 0% to over 5% in 2022-23, LBO activity collapsed and growth-stock valuations halved: the same cash flows, discounted harder.</p>",
    terms: [["Policy rate", "The short-term rate a central bank sets (Fed funds, Bank Rate, ECB deposit rate)."], ["Real interest rate", "Nominal rate minus inflation."], ["Neutral rate (r*)", "The rate that neither speeds up nor slows down the economy."], ["Quantitative easing", "Central bank bond-buying to push long-term rates down."], ["Forward guidance", "Signalling future policy to move expectations now."], ["Dual mandate", "The Fed's two goals: maximum employment and stable prices."], ["Lender of last resort", "Central bank lending to solvent banks during a panic."]],
    quiz: [
      ["Why do central banks raise rates to fight inflation?", ["To raise tax revenue", "To make borrowing dearer and cool spending", "To weaken the currency"], 1, "Higher rates slow borrowing and spending, and strengthen the currency, reducing price pressure."],
      ["The real interest rate when nominal is 4% and inflation is 6% is…", ["10%", "−2%", "2%"], 1, "4 − 6 = −2%."],
      ["QE mainly works by…", ["Printing cash for households", "Buying bonds to lower long-term interest rates", "Raising the policy rate"], 1, "Buying bonds pushes their prices up and yields down."],
    ],
    recap: [["One rate", "Moves every other price of money."], ["Real", "Rates must beat inflation to bite."], ["Lag", "Effects arrive 1-2 years later."]],
    see: ["inflation", "yield-curve", "bond-basics", "cycle"],
  },

  inflation: {
    principle: "Inflation is <em>too much money chasing too few goods</em>, and a little of it, on purpose, keeps the economy running smoothly.",
    hook: "<p>In 1923 German prices doubled every few days and workers were paid twice a day so they could shop before lunch. In 2008 Zimbabwe printed a 100-trillion-dollar note. Most inflation is far milder, but even 3% a year quietly halves what your money buys in about 23 years.</p>",
    parts: [
      { h: "Watch money melt", sim: meltSim, html: "<p>The <em>rule of 70</em>: divide 70 by the inflation rate to get the years until prices double (and your cash halves).</p>" },
      { h: "Your inflation isn't the official one", sim: basketSim, html: "<p>Inflation is measured by the <b>consumer price index (CPI)</b>: the price of a fixed basket of goods weighted by what an average household buys. Change the weights to match your own spending.</p>",
        after: "<p>Watch for <em>core inflation</em> too: CPI without food and energy, which jump around. Central banks look at core to see the underlying trend.</p>" },
      { h: "Where inflation comes from", sim: () => flips([["Demand-pull", "Spending outruns what the economy can produce: too much money chasing too few goods."], ["Cost-push", "Input costs jump (an oil shock, a war, a pandemic) and firms pass them on."], ["Expectations", "If everyone expects 5%, workers ask for 5% raises and firms pre-emptively raise prices: self-fulfilling."], ["Money printing", "Fund the government by printing and you get hyperinflation (Weimar, Zimbabwe, Venezuela)."]]),
        after: "<p>The 2021-23 surge mixed all four: stimulus cheques and savings (demand), broken supply chains and an energy shock from the war in Ukraine (cost-push), and fears it would stick (expectations).</p>" },
      { h: "Winners, losers, and why 2%?", html: "<ul><li><b>Losers</b>: savers in cash, people on fixed incomes, lenders at fixed rates.</li><li><b>Winners</b>: borrowers at fixed rates (they repay in cheaper money), governments with big debts.</li><li><b>Deflation</b> (falling prices) is worse than it sounds: people delay purchases, debts get heavier, and Japan spent decades stuck in it.</li></ul><p>A small positive target (2%) gives central banks room to cut real rates below zero in a slump, and greases wage adjustments.</p>",
        sim: () => calc({ q: "Your savings account pays 4.5% and inflation is 3%. Roughly what's your real return?", answer: 1.5, tol: 0.03, unit: "%", why: "<p>Real ≈ nominal − inflation = 4.5 − 3 = <b>1.5%</b>. (Exactly: 1.045 ÷ 1.03 − 1 = 1.46%.) This relation is called the <i>Fisher equation</i>.</p>" }) },
    ],
    job: "<p>Every investor thinks in <b>real returns</b>. Bond traders watch <b>breakeven inflation</b> (the gap between normal and inflation-protected bond yields, called TIPS in the US) to read market expectations. Companies with pricing power protect margins in inflation; those without get squeezed. Consultants run \"inflation pass-through\" projects: which costs can be passed to customers, and how fast.</p>",
    terms: [["Inflation", "A sustained rise in the general price level."], ["CPI", "Consumer price index: price of a typical household basket."], ["Core inflation", "Inflation excluding volatile food and energy."], ["Deflation", "Falling general prices."], ["Hyperinflation", "Extreme inflation, often defined as 50%+ a month."], ["Fisher equation", "Real rate ≈ nominal rate − inflation."], ["Rule of 70", "Years to double ≈ 70 ÷ growth (or inflation) rate."]],
    quiz: [
      ["At 7% inflation, roughly how long until prices double?", ["7 years", "10 years", "14 years"], 1, "70 ÷ 7 = 10 years."],
      ["Who gains from unexpected inflation?", ["Savers holding cash", "Borrowers with fixed-rate loans", "Pensioners on fixed incomes"], 1, "They repay with money worth less than when they borrowed."],
      ["Why do central banks aim for ~2% instead of 0%?", ["They like inflation", "To leave room to cut real rates and avoid deflation", "Because of taxes"], 1, "A buffer above zero helps avoid deflation traps and gives policy room."],
    ],
    recap: [["70 ÷ π", "Years until prices double."], ["Real = nominal − π", "What your money actually earns."], ["2%", "The target: small, steady, on purpose."]],
    see: ["central-bank", "compound", "jobs", "bond-basics"],
  },

  fx: {
    principle: "An exchange rate is <em>the price of one currency in another</em>, set by supply and demand like anything else.",
    hook: "<p>About $7.5 trillion of currencies change hands every day, the biggest market on Earth. Every holiday, every imported phone, every foreign investment needs a currency swap. And a 10% move in the yen can wipe out a Japanese carmaker's annual profit.</p>",
    parts: [
      { h: "Strong vs weak", sim: fxSim, html: "<p>\"Strong\" sounds good, but every exchange rate move creates winners and losers.</p>" },
      { h: "What moves currencies", html: "<ul><li><b>Interest rates</b>: higher rates attract foreign savers, who need the currency to buy local bonds. This is the biggest short-term driver.</li><li><b>Inflation</b>: high inflation erodes a currency's value over time.</li><li><b>Trade</b>: exporters earning foreign money sell it for home currency.</li><li><b>Risk</b>: in panics, money runs to \"safe havens\" (dollar, Swiss franc, yen).</li><li><b>Central banks</b>: some fix or manage their currency (China, Hong Kong's peg, Gulf states).</li></ul>",
        sim: () => predict({ q: "The US raises rates while Europe holds. What tends to happen to EUR/USD (dollars per euro)?", options: ["Rises: euro strengthens", "Falls: dollar strengthens", "No change"], answer: 1, why: "<p>Higher US yields pull money into dollars, so it takes fewer dollars to buy a euro. EUR/USD falls. In 2022 aggressive Fed hikes pushed EUR/USD below 1.00 for the first time in 20 years.</p>" }) },
      { h: "Purchasing power parity", sim: bigMac, after: "<p><b>Carry trade</b>: borrow in a low-rate currency (yen), invest in a high-rate one (Mexican peso), pocket the gap. It works until the high-rate currency suddenly falls, which tends to happen all at once: \"picking up pennies in front of a steamroller\".</p>" },
    ],
    job: "<p>Multinational treasury teams <b>hedge</b> currency risk with forwards and swaps (derivatives world). Consultants restate growth at \"constant currency\" to strip out FX noise. Global investors decide whether to hedge foreign holdings. Emerging-market crises (Argentina, Turkey) often start as currency crises when foreign-currency debt becomes unpayable.</p>",
    terms: [["Exchange rate", "The price of one currency in terms of another."], ["Appreciation / depreciation", "A currency gaining / losing value against others."], ["Purchasing power parity", "The idea that exchange rates should equalise the price of the same goods across countries."], ["Peg", "A fixed exchange rate defended by a central bank."], ["Carry trade", "Borrowing in a low-rate currency to invest in a high-rate one."], ["Safe haven", "A currency or asset people buy in a crisis."]],
    quiz: [
      ["The euro strengthens against the dollar. Who benefits most?", ["European exporters to the US", "Europeans holidaying in the US", "US tourists in Paris"], 1, "Each euro buys more dollars, so the US trip is cheaper."],
      ["Which usually strengthens a currency in the short run?", ["Lower interest rates", "Higher interest rates", "Higher inflation"], 1, "Higher yields attract foreign capital."],
      ["A Big Mac costs $5.69 in the US and the equivalent of $3.19 in Japan. PPP suggests the yen is…", ["Overvalued", "Undervalued", "Fairly valued"], 1, "The burger is cheaper in dollars there, so the yen buys less than PPP says it should."],
    ],
    recap: [["Price", "An exchange rate is a price: supply and demand."], ["Rates", "Interest rate gaps drive short-term moves."], ["Winners", "Strong currency: importers win, exporters lose."]],
    see: ["trade-macro", "central-bank", "swaps", "hedging"],
  },
};

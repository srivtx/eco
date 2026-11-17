// World 6: Accounting.
import { h, money, num, pct, clamp } from "../lib/core.js";
import { slider, seg, stats, stage, predict, calc, callout, table, bars, button, flips, stepper, formula } from "../lib/ui.js";
import { plot, columns, waterfall, donut } from "../lib/chart.js";

const W = "var(--wc)";
const M = (v) => money(v * 1e6);
const $M = (x) => `${x < 0 ? "−" : ""}$${num(Math.abs(x))}M`;

/* ---------------- income statement ---------------- */
function plSim() {
  const v = { cups: 40, price: 5, cogs: 32, sga: 70, da: 12, int: 6, tax: 25 };
  const box = h("div"), tbl = h("div"), st = stats([{ label: "Gross margin" }, { label: "EBITDA margin" }, { label: "Operating (EBIT) margin" }, { label: "Net margin" }]);
  const draw = () => {
    const rev = v.cups * v.price, cogs = (rev * v.cogs) / 100, gp = rev - cogs, ebitda = gp - v.sga, ebit = ebitda - v.da, ebt = ebit - v.int, tax = Math.max(0, (ebt * v.tax) / 100), ni = ebt - tax;
    box.replaceChildren(waterfall([{ label: "Revenue", value: rev, total: true, color: W }, { label: "COGS", value: -cogs }, { label: "Opex (SG&A)", value: -v.sga }, { label: "D&A", value: -v.da }, { label: "Interest", value: -v.int }, { label: "Tax", value: -tax }, { label: "Net income", value: ni, total: true, color: ni >= 0 ? "var(--up)" : "var(--down)" }], { fmt: $M, label: "Revenue to net income" }));
    tbl.replaceChildren(table(["Line", "$M", "% of revenue"], [["Revenue", num(rev), "100%"], ["− Cost of goods sold", num(-cogs), pct(-cogs / rev)], ["<b>= Gross profit</b>", `<b>${num(gp)}</b>`, pct(gp / rev)], ["− Selling, general & admin", num(-v.sga), pct(-v.sga / rev)], ["<b>= EBITDA</b>", `<b>${num(ebitda)}</b>`, pct(ebitda / rev)], ["− Depreciation & amortisation", num(-v.da), ""], ["<b>= EBIT (operating profit)</b>", `<b>${num(ebit)}</b>`, pct(ebit / rev)], ["− Interest", num(-v.int), ""], ["= Pre-tax profit", num(ebt), ""], ["− Tax", num(-tax), ""], ["<b>= Net income</b>", `<b>${num(ni)}</b>`, pct(ni / rev)]]));
    st.set(0, pct(gp / rev)); st.set(1, pct(ebitda / rev)); st.set(2, pct(ebit / rev)); st.set(3, pct(ni / rev), ni >= 0 ? "good" : "bad");
  };
  const mk = (k, label, min, max, step, fmt) => slider({ label, min, max, step, value: v[k], fmt, onInput: (x) => { v[k] = x; draw(); } });
  draw();
  return stage({ title: "Bean There: a coffee chain's year", controls: [mk("cups", "Cups sold (millions)", 10, 80, 1, (x) => `${x}M`), mk("price", "Price per cup", 2, 9, 0.25, (x) => `$${x}`), mk("cogs", "Beans, milk, cups (% of revenue)", 15, 60, 1, (x) => `${x}%`), mk("sga", "Rent, staff, marketing ($M)", 20, 150, 1, (x) => `$${x}M`), mk("da", "Depreciation of fit-outs ($M)", 0, 40, 1, (x) => `$${x}M`), mk("int", "Interest on loans ($M)", 0, 40, 1, (x) => `$${x}M`), mk("tax", "Tax rate", 0, 40, 1, (x) => `${x}%`)], body: [box, st.el, tbl] });
}

/* ---------------- balance sheet transactions ---------------- */
function bsGame() {
  const S = { cash: 0, inv: 0, ppe: 0, ar: 0, ap: 0, debt: 0, eq: 0, re: 0 };
  const log = h("div.game-log"), box = h("div"), chk = h("p.muted");
  const ev = [
    ["Founders invest $100k", "Cash ↑, equity ↑", () => { S.cash += 100; S.eq += 100; }],
    ["Borrow $50k from a bank", "Cash ↑, debt ↑", () => { S.cash += 50; S.debt += 50; }],
    ["Buy an espresso machine for $40k cash", "Cash ↓, equipment ↑ (just swapping assets)", () => { S.cash -= 40; S.ppe += 40; }],
    ["Buy $20k of beans on credit", "Inventory ↑, payables ↑", () => { S.inv += 20; S.ap += 20; }],
    ["Sell $15k of beans (cost) for $35k cash", "Cash ↑35, inventory ↓15, retained earnings ↑20 (profit)", () => { S.cash += 35; S.inv -= 15; S.re += 20; }],
    ["Cater an event, customer pays in 30 days: $10k", "Receivables ↑, retained earnings ↑", () => { S.ar += 10; S.re += 10; }],
    ["Pay $12k of staff wages", "Cash ↓, retained earnings ↓ (an expense)", () => { S.cash -= 12; S.re -= 12; }],
    ["Machine wears out: $4k depreciation", "Equipment ↓, retained earnings ↓ (no cash!)", () => { S.ppe -= 4; S.re -= 4; }],
    ["Pay supplier the $20k owed", "Cash ↓, payables ↓", () => { S.cash -= 20; S.ap -= 20; }],
  ];
  const draw = () => {
    const A = [["Cash", S.cash, "#22c55e"], ["Receivables", S.ar, "#84cc16"], ["Inventory", S.inv, "#f5c518"], ["Equipment", S.ppe, "#ff7a45"]];
    const L = [["Payables", S.ap, "#0ea5e9"], ["Debt", S.debt, "#3b82f6"], ["Equity paid in", S.eq, "#8b5cf6"], ["Retained earnings", S.re, "#d946ef"]];
    const ta = A.reduce((a, x) => a + x[1], 0), tl = L.reduce((a, x) => a + x[1], 0);
    const col = (items) => h("div.bs-col", items.filter((x) => x[1] > 0.01).map(([n, v, c]) => h("div.bs-c", { style: { flex: `${v} 1 0`, background: c } }, h("b", n), h("span", `$${num(v)}k`))));
    box.replaceChildren(h("div.bs", h("div.bs-side", h("div.bs-h", `Assets · $${num(ta)}k`), ta ? col(A) : h("div.bs-col")), h("div.bs-side", h("div.bs-h", `Liabilities + equity · $${num(tl)}k`), tl ? col(L) : h("div.bs-col"))));
    chk.innerHTML = Math.abs(ta - tl) < 0.01 ? `✓ Balanced: $${num(ta)}k = $${num(tl)}k. It always will be, because every transaction has two sides.` : "Not balanced?!";
  };
  const btns = h("div.game-btns", ev.map(([t, why, fn]) => { const b = button(t, () => { fn(); b.disabled = true; log.prepend(h("div", `${t} → ${why}`)); draw(); }); return b; }));
  draw();
  return stage({ title: "Run a café's books", body: [h("p.muted", "Click the events in any order. Watch both sides move."), btns, box, chk, log], note: "This is <b>double-entry bookkeeping</b>, invented by Italian merchants and written up by Luca Pacioli in 1494. Every entry has a debit and a credit, so the two sides always match." });
}

/* ---------------- cash flow ---------------- */
function cfSim() {
  const v = { ni: 50, da: 20, ar: 15, inv: 10, ap: 5, capex: 35 };
  const box = h("div"), st = stats([{ label: "Net income" }, { label: "Cash from operations" }, { label: "Free cash flow" }, { label: "Cash conversion (FCF ÷ NI)" }]);
  const draw = () => {
    const cfo = v.ni + v.da - v.ar - v.inv + v.ap, fcf = cfo - v.capex;
    box.replaceChildren(waterfall([{ label: "Net income", value: v.ni, total: true, color: W }, { label: "+ D&A", value: v.da }, { label: "− ↑ receivables", value: -v.ar }, { label: "− ↑ inventory", value: -v.inv }, { label: "+ ↑ payables", value: v.ap }, { label: "= CFO", value: cfo, total: true, color: "#3b82f6" }, { label: "− Capex", value: -v.capex }, { label: "= FCF", value: fcf, total: true, color: fcf >= 0 ? "var(--up)" : "var(--down)" }], { fmt: $M }));
    st.set(0, `$${num(v.ni)}M`); st.set(1, `$${num(cfo)}M`); st.set(2, `$${num(fcf)}M`, fcf >= 0 ? "good" : "bad"); st.set(3, v.ni ? pct(fcf / v.ni, 0) : "–", fcf / v.ni < 0.5 ? "warn" : "");
  };
  const mk = (k, label, max) => slider({ label, min: 0, max, value: v[k], fmt: (x) => `$${x}M`, onInput: (x) => { v[k] = x; draw(); } });
  draw();
  return stage({ title: "From profit to cash", controls: [mk("ni", "Net income", 100), mk("da", "Depreciation & amortisation (added back)", 60), mk("ar", "Increase in receivables (customers owe more)", 60), mk("inv", "Increase in inventory", 60), mk("ap", "Increase in payables (you owe suppliers more)", 60), mk("capex", "Capital expenditure", 100)], body: [box, st.el], note: "Push receivables and capex up: a profitable company can burn cash. That's how fast-growing firms go bust." });
}

/* ---------------- three-statement link ---------------- */
function linkSim() {
  let delta = 10, item = "dep", tax = 25;
  const out = h("div");
  const draw = () => {
    const t = tax / 100;
    const map = {
      dep: { is: [["Depreciation", `+${delta}`], ["Pre-tax income", `−${delta}`], ["Tax", `−${num(delta * t, 1)}`], ["<b>Net income</b>", `<b>−${num(delta * (1 - t), 1)}</b>`]], cf: [["Net income", `−${num(delta * (1 - t), 1)}`], ["Add back depreciation", `+${delta}`], ["<b>Cash</b>", `<b>+${num(delta * t, 1)}</b>`]], bs: [["Cash", `+${num(delta * t, 1)}`], ["Equipment (PP&E)", `−${delta}`], ["<b>Total assets</b>", `<b>−${num(delta * (1 - t), 1)}</b>`], ["Retained earnings", `−${num(delta * (1 - t), 1)}`], ["<b>Liabilities + equity</b>", `<b>−${num(delta * (1 - t), 1)}</b>`]] },
      inv: { is: [["Nothing", "0"]], cf: [["Increase in inventory", `−${delta}`], ["<b>Cash</b>", `<b>−${delta}</b>`]], bs: [["Cash", `−${delta}`], ["Inventory", `+${delta}`], ["<b>Total assets</b>", "<b>0</b>"], ["<b>Liabilities + equity</b>", "<b>0</b>"]] },
      debt: { is: [["Nothing (until interest is paid)", "0"]], cf: [["Borrowing (financing)", `+${delta}`], ["<b>Cash</b>", `<b>+${delta}</b>`]], bs: [["Cash", `+${delta}`], ["<b>Total assets</b>", `<b>+${delta}</b>`], ["Debt", `+${delta}`], ["<b>Liabilities + equity</b>", `<b>+${delta}</b>`]] },
      sale: { is: [["Revenue", `+${delta}`], ["Tax", `+${num(delta * t, 1)}`], ["<b>Net income</b>", `<b>+${num(delta * (1 - t), 1)}</b>`]], cf: [["Net income", `+${num(delta * (1 - t), 1)}`], ["Increase in receivables", `−${delta}`], ["<b>Cash</b>", `<b>−${num(delta * t, 1)}</b> (tax paid, cash not yet in)`]], bs: [["Cash", `−${num(delta * t, 1)}`], ["Receivables", `+${delta}`], ["<b>Total assets</b>", `<b>+${num(delta * (1 - t), 1)}</b>`], ["Retained earnings", `+${num(delta * (1 - t), 1)}`], ["<b>Liabilities + equity</b>", `<b>+${num(delta * (1 - t), 1)}</b>`]] },
    }[item];
    const card = (t2, rows, c) => h("div.mini", { style: { borderTop: `6px solid ${c}` } }, h("h4", t2), table(null, rows));
    out.replaceChildren(h("div.split", card("1 · Income statement", map.is, "#ff7a45"), card("2 · Cash flow statement", map.cf, "#22c55e"), card("3 · Balance sheet", map.bs, "#3b82f6")));
  };
  const sg = seg({ label: "What happens?", options: [{ value: "dep", label: "Depreciation ↑" }, { value: "inv", label: "Buy inventory with cash" }, { value: "debt", label: "Borrow" }, { value: "sale", label: "Sale on credit" }], value: item, onChange: (v) => { item = v; draw(); } });
  const a = slider({ label: "Amount", min: 5, max: 100, step: 5, value: delta, fmt: (v) => `$${v}`, onInput: (v) => { delta = v; draw(); } });
  const b = slider({ label: "Tax rate", min: 0, max: 40, value: tax, fmt: (v) => `${v}%`, onInput: (v) => { tax = v; draw(); } });
  draw();
  return stage({ title: "Pull a lever, watch all three statements", controls: [sg, a, b], body: [out] });
}

/* ---------------- ratios / DuPont ---------------- */
function dupontSim() {
  const cos = {
    Software: { m: 25, t: 0.6, l: 1.6 }, Supermarket: { m: 2.5, t: 2.6, l: 3 }, Bank: { m: 25, t: 0.06, l: 11 }, Utility: { m: 12, t: 0.3, l: 3 },
  };
  let co = "Software", v = { ...cos.Software };
  const st = stats([{ label: "Net margin" }, { label: "Asset turnover" }, { label: "Leverage (assets ÷ equity)" }, { label: "Return on equity" }]);
  const sl = [slider({ label: "Net margin", min: 0.5, max: 40, step: 0.5, value: v.m, fmt: (x) => `${x}%`, onInput: (x) => { v.m = x; draw(); } }), slider({ label: "Asset turnover (sales ÷ assets)", min: 0.05, max: 4, step: 0.05, value: v.t, fmt: (x) => `${x.toFixed(2)}×`, onInput: (x) => { v.t = x; draw(); } }), slider({ label: "Leverage (assets ÷ equity)", min: 1, max: 15, step: 0.5, value: v.l, fmt: (x) => `${x}×`, onInput: (x) => { v.l = x; draw(); } })];
  const draw = () => { const roe = (v.m / 100) * v.t * v.l; st.set(0, `${v.m}%`); st.set(1, `${v.t.toFixed(2)}×`); st.set(2, `${v.l}×`); st.set(3, pct(roe), roe > 0.15 ? "good" : roe < 0.08 ? "bad" : ""); };
  const sg = seg({ label: "Typical company", options: Object.keys(cos), value: co, onChange: (k) => { co = k; v = { ...cos[k] }; sl[0].value = v.m; sl[1].value = v.t; sl[2].value = v.l; draw(); } });
  draw();
  return stage({ title: "DuPont: three ways to earn 15%", controls: [sg, ...sl], body: [h("div.formula", h("div.f-line", h("span.f-part", { "data-x": "Profit per $ of sales" }, "margin"), h("span.f-op", "×"), h("span.f-part", { "data-x": "Sales per $ of assets" }, "turnover"), h("span.f-op", "×"), h("span.f-part", { "data-x": "Assets per $ of equity" }, "leverage"), h("span.f-op", "="), h("span.f-part", { "data-x": "Profit per $ of shareholders' money" }, "ROE"))), st.el], note: "Software earns ROE with fat margins. Supermarkets with thin margins and huge turnover. Banks with tiny turnover and massive leverage. Same ROE can carry very different risks." });
}

/* ---------------- working capital ---------------- */
function cccSim() {
  let dso = 45, dio = 60, dpo = 30, rev = 100, growth = 30;
  const st = stats([{ label: "Cash conversion cycle" }, { label: "Cash tied up" }, { label: "Extra cash needed for growth" }]);
  const bar = h("div.ccc");
  const draw = () => {
    const ccc = dio + dso - dpo, tied = (rev * ccc) / 365, extra = (rev * growth / 100 * ccc) / 365;
    const tot = dio + dso;
    bar.replaceChildren(
      h("div.ccc-row", h("span.ccc-l", "Inventory sits"), h("div.ccc-t", h("i", { style: { left: 0, width: `${(dio / tot) * 100}%`, background: "#f5c518" } }, `${dio}d`), h("i", { style: { left: `${(dio / tot) * 100}%`, width: `${(dso / tot) * 100}%`, background: "#84cc16" } }, `${dso}d`))),
      h("div.ccc-row", h("span.ccc-l", "You pay suppliers"), h("div.ccc-t", h("i", { style: { left: 0, width: `${(Math.min(dpo, tot) / tot) * 100}%`, background: "#0ea5e9" } }, `${dpo}d`))),
      h("div.ccc-row", h("span.ccc-l", "Your cash is out"), h("div.ccc-t", h("i", { style: { left: `${(Math.min(dpo, tot) / tot) * 100}%`, width: `${(Math.max(0, ccc) / tot) * 100}%`, background: "var(--bad)" } }, `${ccc}d`))));
    st.set(0, `${ccc} days`, ccc < 0 ? "good" : ccc > 60 ? "bad" : ""); st.set(1, `$${num(tied, 1)}M`); st.set(2, `$${num(extra, 1)}M`, extra > 5 ? "bad" : "");
  };
  const c = [slider({ label: "Days inventory sits (DIO)", min: 0, max: 120, value: dio, onInput: (x) => { dio = x; draw(); } }), slider({ label: "Days customers take to pay (DSO)", min: 0, max: 120, value: dso, onInput: (x) => { dso = x; draw(); } }), slider({ label: "Days you take to pay suppliers (DPO)", min: 0, max: 120, value: dpo, onInput: (x) => { dpo = x; draw(); } }), slider({ label: "Revenue ($M a year)", min: 10, max: 500, step: 10, value: rev, onInput: (x) => { rev = x; draw(); } }), slider({ label: "Revenue growth next year", min: 0, max: 100, value: growth, fmt: (x) => `${x}%`, onInput: (x) => { growth = x; draw(); } })];
  draw();
  return stage({ title: "The cash conversion cycle", controls: c, body: [bar, st.el], note: "Set DPO above DIO + DSO and the cycle goes negative: suppliers fund your business. That's Amazon's and Dell's famous trick. Set it high and growth eats cash: the faster you grow, the more you need." });
}

export default {
  "income-statement": {
    principle: "The income statement tells you <em>whether the business made a profit over a period</em>: revenue at the top, costs peeled off, net income at the bottom.",
    hook: "<p>Accounting is the language of business. If you can't read the three financial statements, every conversation about companies, deals and stocks will be in a language you only half speak. The income statement (also called the P&L, profit and loss) is the one people see first.</p>",
    parts: [
      { h: "Peel the onion", sim: plSim, html: "<p>Each line answers a question. Gross profit: is the product itself profitable? EBITDA: are operations profitable before accounting for wear and tear? EBIT: after it? Net income: what's left for owners after lenders and the taxman?</p>" },
      { h: "Why everyone talks about EBITDA", html: "<p><b>EBITDA</b> (earnings before interest, tax, depreciation and amortisation) is a rough proxy for operating cash profit that's comparable across companies with different debt, tax and asset histories. Bankers and PE investors value companies on it (\"8 times EBITDA\").</p><p>Its critics have a point. Charlie Munger: \"Every time you see the word EBITDA, substitute the words 'bullshit earnings'.\" Machines really do wear out; ignoring depreciation flatters capital-hungry businesses. And \"<i>adjusted</i> EBITDA\" lets management strip out whatever costs they call one-off.</p>",
        sim: () => predict({ q: "Revenue is recognised when…", options: ["Cash is received", "The good or service is delivered (earned)", "The contract is signed"], answer: 1, why: "<p>Under <em>accrual accounting</em>, revenue counts when earned, and costs are matched to the revenue they helped produce. Cash timing can be very different, which is why we need a separate cash flow statement.</p>" }) },
      { h: "Read a real one", sim: () => calc({ q: "Revenue $500M, COGS $300M, SG&A $120M, D&A $30M. What's EBIT in $M?", answer: 50, tol: 0.001, unit: "$M", why: "<p>500 − 300 − 120 − 30 = <b>$50M</b>. EBITDA would be $80M.</p>" }) },
    ],
    job: "<p>Analysts start every company review with the P&L: growth, gross margin trends, operating leverage. Bankers build it as the first page of every model. Consultants run <b>profitability trees</b> that decompose net income into revenue (price × volume) and costs (fixed and variable). Earnings calls are a quarterly fight over these lines: did revenue beat? Are margins expanding?</p>",
    terms: [["Revenue (sales, top line)", "Money earned from selling goods or services."], ["COGS", "Direct costs of the goods sold: materials, direct labour."], ["Gross profit", "Revenue − COGS."], ["SG&A (opex)", "Selling, general and administrative costs: rent, salaries, marketing."], ["EBITDA", "Earnings before interest, tax, depreciation, amortisation."], ["EBIT", "Operating profit: after D&A, before interest and tax."], ["Net income (bottom line)", "Profit left for shareholders after everything."], ["Accrual accounting", "Recording revenues when earned and costs when incurred, not when cash moves."]],
    quiz: [
      ["Which line is BEFORE depreciation is subtracted?", ["EBIT", "EBITDA", "Net income"], 1, "EBITDA excludes D&A; EBIT includes it."],
      ["A firm raises prices 10% and sells the same volume. Which margin rises first and most directly?", ["Gross margin", "Tax rate", "Interest coverage"], 0, "Revenue rises with no change in COGS, so gross profit and margin jump."],
      ["Why might EBITDA flatter a telecom company?", ["It ignores heavy spending on network equipment", "It includes too much tax", "It counts debt twice"], 0, "Depreciation is real: networks must be rebuilt."],
    ],
    recap: [["Top → bottom", "Revenue, gross profit, EBITDA, EBIT, net income."], ["Accrual", "Recorded when earned, not when paid."], ["EBITDA", "Useful proxy, easy to abuse."]],
    see: ["balance-sheet", "cash-flow", "ratios", "multiples"],
  },

  "balance-sheet": {
    principle: "<em>Assets = liabilities + equity</em>, always. Everything a company owns was paid for by someone: lenders or owners.",
    hook: "<p>The income statement is a video of a year. The balance sheet is a photo of one moment: what the company owns, what it owes, and what belongs to the owners. And thanks to a 15th-century Italian idea, the two sides always balance.</p>",
    parts: [
      { h: "Run the books", sim: bsGame },
      { h: "What goes where", sim: () => table(["Assets (what you own)", "Liabilities (what you owe)", "Equity (what's left for owners)"], [["Cash", "Accounts payable (owed to suppliers)", "Paid-in capital (what shareholders put in)"], ["Accounts receivable (owed by customers)", "Accrued expenses, deferred revenue", "Retained earnings (all profits kept so far)"], ["Inventory", "Short-term debt", "Treasury stock (shares bought back, negative)"], ["PP&E: property, plant, equipment", "Long-term debt, bonds", ""], ["Intangibles and goodwill", "Leases, pensions", ""]]),
        after: "<p><b>Current</b> items turn into cash (or come due) within a year; <b>non-current</b> items take longer. <b>Goodwill</b> appears when you buy a company for more than its net assets: it's the premium for brand, customers, people. If the deal turns out badly, goodwill gets <i>written down</i>, which is how many failed acquisitions finally show up in the accounts.</p>" },
      { h: "Book value vs market value", html: "<p>Equity on the balance sheet (<b>book value</b>) is historical: what was put in plus what was kept. The stock market's value of the company (<b>market cap</b>) reflects expected future profits. Apple's market value is many times its book value; a struggling bank might trade below book. The ratio (price-to-book) is a classic valuation measure, most useful for banks.</p>",
        sim: () => predict({ q: "A company buys a $10M building with $2M cash and an $8M mortgage. Total assets change by…", options: ["+$10M", "+$8M", "+$2M"], answer: 1, why: "<p>Building +10, cash −2: assets +8. Liabilities +8 (mortgage). Balanced.</p>" }) },
    ],
    job: "<p>Credit analysts read the balance sheet first: how much debt, how much cash, what's the collateral? PE firms plan the <b>capital structure</b> of every buyout around it. Bank analysts treat it as the main event. In M&A, the purchase price is split among identifiable assets, with the rest booked as goodwill (the <b>purchase price allocation</b>).</p>",
    terms: [["Balance sheet", "A snapshot of assets, liabilities and equity on one date."], ["Assets", "Resources the company controls that bring future benefit."], ["Liabilities", "Obligations to pay others."], ["Shareholders' equity", "Assets − liabilities: the owners' claim."], ["Retained earnings", "Cumulative profits kept in the business."], ["Goodwill", "Price paid in an acquisition above the fair value of net assets."], ["Book value", "Equity as recorded on the balance sheet."], ["Double-entry bookkeeping", "Every transaction is recorded in two places so the books balance."]],
    quiz: [
      ["A company pays $5k of wages in cash. What happens on the balance sheet?", ["Cash −5, equity (retained earnings) −5", "Cash −5, liabilities +5", "Nothing"], 0, "Wages are an expense, reducing profit and so retained earnings."],
      ["Buying inventory on credit changes…", ["Assets and equity", "Assets and liabilities", "Only cash"], 1, "Inventory up, payables up."],
      ["Goodwill arises when…", ["A company earns profit", "An acquirer pays more than the fair value of net assets", "Customers like the brand"], 1, "It's an accounting entry from acquisitions."],
    ],
    recap: [["A = L + E", "Always. Every entry has two sides."], ["Snapshot", "One date, not a period."], ["Book ≠ market", "Accounts look back; prices look forward."]],
    see: ["income-statement", "cash-flow", "three-link", "banks"],
  },

  "cash-flow": {
    principle: "Profit is an opinion; <em>cash is a fact</em>. The cash flow statement shows where the money actually went.",
    hook: "<p>Companies rarely go bust from losses. They go bust from running out of cash. A business can show a profit every quarter while its bank account drains, because customers haven't paid yet, stock is piling up, or it's buying machines. The cash flow statement catches that.</p>",
    parts: [
      { h: "From net income to free cash flow", sim: cfSim },
      { h: "The three sections", sim: () => flips([["Operating (CFO)", "Cash from running the business: net income adjusted for non-cash items and working capital."], ["Investing (CFI)", "Buying/selling long-term assets: capex, acquisitions, investments."], ["Financing (CFF)", "Dealing with owners and lenders: borrowing, repaying, dividends, buybacks, issuing shares."], ["Free cash flow", "CFO − capex. Cash the business throws off that could go to investors."]]),
        after: "<p>The <em>indirect method</em> (what almost every company uses) starts from net income and adjusts. Add back non-cash expenses like depreciation. Subtract increases in working capital assets (cash is stuck there). Add increases in liabilities like payables (you're holding cash you owe).</p>" },
      { h: "Spot the warning", sim: () => predict({ q: "Net income rose 30% but cash from operations fell 20%. Receivables doubled. What might be going on?", options: ["Great quality earnings", "Sales booked that customers haven't paid for, maybe aggressive revenue recognition", "Lower taxes"], answer: 1, why: "<p>A classic red flag. Profit rising without cash often means revenue recognised early, lax credit terms, or worse (channel stuffing, fraud). Short sellers hunt for exactly this pattern.</p>" }) },
    ],
    job: "<p>PE and credit investors care about cash first: <b>free cash flow</b> pays down LBO debt. Valuation (DCF) discounts free cash flow, not net income. Analysts track <b>cash conversion</b> (FCF ÷ net income or EBITDA) as a quality-of-earnings test. Forensic accountants and short sellers look for profits that don't turn into cash.</p>",
    terms: [["Cash flow statement", "Shows cash in and out over a period, in three sections."], ["CFO", "Cash flow from operations."], ["Capex", "Capital expenditure: spending on long-lived assets."], ["Free cash flow (FCF)", "CFO minus capex."], ["Non-cash expense", "An expense with no cash outflow that period, like depreciation."], ["Cash conversion", "How much of profit turns into cash."]],
    quiz: [
      ["Depreciation is added back in the cash flow statement because…", ["It's a cash inflow", "It reduced net income but no cash left the company that year", "Tax rules"], 1, "The cash left when the asset was bought (capex), not when it depreciates."],
      ["Inventory rises by $10M. Cash from operations…", ["Rises $10M", "Falls $10M", "Is unchanged"], 1, "Cash went into stock on the shelves."],
      ["Paying a dividend shows up in…", ["Operating", "Investing", "Financing"], 2, "Dealings with owners are financing."],
    ],
    recap: [["Cash is fact", "Profit depends on accounting choices; cash doesn't."], ["CFO − capex", "Free cash flow."], ["3 sections", "Operating, investing, financing."]],
    see: ["income-statement", "three-link", "working-capital", "dcf"],
  },

  "three-link": {
    principle: "The three statements are one connected machine: <em>net income flows into cash flow and the balance sheet, and cash closes the loop</em>.",
    hook: "<p>\"Depreciation goes up by $10. Walk me through the three statements.\" It's the most famous interview question in investment banking, because answering it proves you understand how a company's accounts fit together. After this lesson, you'll be able to answer any version of it.</p>",
    parts: [
      { h: "Pull a lever", sim: linkSim },
      { h: "The links", sim: () => stepper([
        { t: "1. Net income → top of the cash flow statement", html: "<p>The cash flow statement starts from net income.</p>" },
        { t: "2. Net income → retained earnings", html: "<p>Retained earnings on the balance sheet grow by net income minus dividends.</p>" },
        { t: "3. Non-cash items and working capital", html: "<p>Depreciation reduces PP&E on the balance sheet and is added back in CFO. Changes in receivables, inventory and payables on the balance sheet show up as adjustments in CFO.</p>" },
        { t: "4. Capex and financing", html: "<p>Capex raises PP&E. Borrowing raises debt. Dividends reduce retained earnings. All flow through the cash flow statement.</p>" },
        { t: "5. Ending cash → balance sheet cash", html: "<p>The net change in cash from the cash flow statement, added to last year's cash, equals this year's balance sheet cash. If the model's balance sheet doesn't balance, something's broken in these links.</p>" },
      ]) },
      { h: "Your turn", sim: () => calc({ q: "Depreciation rises by $20, tax rate 30%. By how much does cash change?", answer: 6, tol: 0.01, unit: "$", hint: "Net income falls by 20 × (1 − 0.3), then you add back 20.", why: "<p>Net income −14, add back +20: <b>cash +$6</b>, which is the tax saved (20 × 30%). PP&E −20, retained earnings −14, cash +6: assets −14 = equity −14. Balanced. Depreciation's only cash effect is the <em>tax shield</em>.</p>" }) },
    ],
    job: "<p>Every analyst and associate in banking and PE builds <b>three-statement models</b> in Excel: forecast the P&L, then the balance sheet, then derive cash flow, with circular references for interest. Consultants use simplified versions in business cases. Getting the model to balance is a rite of passage, and these interview walk-throughs test whether you'd build it right.</p>",
    terms: [["Three-statement model", "A linked forecast of the income statement, balance sheet and cash flow statement."], ["Tax shield", "Tax saved by a deductible expense: expense × tax rate."], ["Retained earnings roll-forward", "Beginning RE + net income − dividends = ending RE."], ["Circularity", "When interest depends on debt, which depends on cash, which depends on interest."]],
    quiz: [
      ["A company borrows $100 in cash. Net income changes by…", ["+100", "0", "−100"], 1, "Borrowing isn't income. Only interest, later, hits the P&L."],
      ["A $50 sale on credit (30% tax) changes cash by…", ["+50", "−15 (tax, before the customer pays)", "+35"], 1, "Profit +35, receivables +50 → CFO −15, assuming the tax is paid now."],
      ["What ties the cash flow statement to the balance sheet at the end?", ["Revenue", "Ending cash", "Goodwill"], 1, "Ending cash on the CFS = cash on the balance sheet."],
    ],
    recap: [["NI flows", "Into CFS top line and retained earnings."], ["Cash closes", "CFS ending cash = BS cash."], ["Dep × t", "Depreciation's only cash effect is the tax shield."]],
    see: ["income-statement", "balance-sheet", "cash-flow", "lbo"],
  },

  ratios: {
    principle: "Ratios turn raw numbers into <em>comparable stories</em>: how profitable, how efficient, how risky.",
    hook: "<p>Is $1B of profit good? For a corner shop, astonishing. For Apple, a disaster. Ratios scale numbers so you can compare companies of different sizes, industries and years. Analysts carry about 15 of them in their heads.</p>",
    parts: [
      { h: "DuPont: what drives return on equity", sim: dupontSim },
      { h: "The ratio toolkit", sim: () => table(["Family", "Ratio", "Formula", "Tells you"], [["Profitability", "Gross / EBIT / net margin", "Profit ÷ revenue", "How much of each sale you keep"], ["", "ROE", "Net income ÷ equity", "Return on owners' money"], ["", "ROIC", "NOPAT ÷ (debt + equity − cash)", "Return on all capital invested: the best quality test"], ["Efficiency", "Asset turnover", "Revenue ÷ assets", "How hard assets work"], ["", "Inventory days", "Inventory ÷ COGS × 365", "How long stock sits"], ["Liquidity", "Current ratio", "Current assets ÷ current liabilities", "Can it pay bills due this year?"], ["", "Quick ratio", "(Cash + receivables) ÷ current liabilities", "Same, without inventory"], ["Leverage", "Net debt / EBITDA", "(Debt − cash) ÷ EBITDA", "Years of earnings to repay debt; banks' favourite"], ["", "Interest coverage", "EBIT ÷ interest", "How comfortably it pays interest"], ["Valuation", "P/E, EV/EBITDA", "Price ÷ earnings; EV ÷ EBITDA", "How expensive the stock is (see valuation world)"]]),
        after: "<p><b>ROIC vs WACC</b> is the single most important comparison in corporate finance: a company creates value only if its return on invested capital beats its cost of capital. Growth in a company with ROIC below WACC destroys value faster.</p>" },
      { h: "Practise", sim: () => calc({ q: "A company has $400M debt, $100M cash and EBITDA of $100M. What's net debt / EBITDA?", answer: 3, tol: 0.001, unit: "×", why: "<p>(400 − 100) ÷ 100 = <b>3.0×</b>. Investment-grade companies are typically under ~3×; LBOs often start at 5-7×.</p>" }) },
    ],
    job: "<p>Equity analysts screen stocks by ratios. Credit analysts and banks set <b>covenants</b> (loan conditions) on leverage and coverage: breach one and lenders can demand repayment. Consultants benchmark clients' ratios against peers to find where they lag. PE firms underwrite deals to leverage and coverage targets.</p>",
    terms: [["ROE", "Return on equity: net income ÷ shareholders' equity."], ["ROIC", "Return on invested capital: after-tax operating profit ÷ capital invested."], ["DuPont analysis", "ROE = margin × asset turnover × leverage."], ["Current ratio", "Current assets ÷ current liabilities."], ["Net debt / EBITDA", "Leverage measure: years of EBITDA to repay net debt."], ["Interest coverage", "EBIT ÷ interest expense."], ["Covenant", "A condition in a loan agreement, often on ratios."]],
    quiz: [
      ["Two firms have 15% ROE. Firm A: 5% margin, 1× turnover, 3× leverage. Firm B: 15% margin, 1× turnover, 1× leverage. Which is riskier?", ["A: it relies on debt", "B", "Same"], 0, "A gets its ROE from leverage, which magnifies losses too."],
      ["ROIC of 6% with a WACC of 9% means growth…", ["Creates value", "Destroys value", "Is neutral"], 1, "Each new dollar invested earns less than it costs."],
      ["A current ratio of 0.6 suggests…", ["Strong liquidity", "Possible trouble paying near-term bills", "High profitability"], 1, "Current liabilities exceed current assets."],
    ],
    recap: [["m × t × L", "DuPont splits ROE three ways."], ["ROIC > WACC", "The test of value creation."], ["Net debt / EBITDA", "The lender's favourite leverage ratio."]],
    see: ["income-statement", "wacc", "capital-structure", "frameworks"],
  },

  "working-capital": {
    principle: "Working capital is cash <em>stuck in the business</em>: in stock on shelves and in customers' unpaid bills. Growth needs more of it.",
    hook: "<p>A toy company lands a huge Christmas order from a retailer. It must buy materials in August, make toys in October, ship in November, and get paid in January. Five months of costs before a cent arrives. Many profitable companies have died of success this way.</p>",
    parts: [
      { h: "The cash conversion cycle", sim: cccSim },
      { h: "Growing broke", html: "<p>Working capital needs grow with revenue. If you need 20% of sales tied up in receivables and inventory, growing from $100M to $150M ties up another $10M, before profits from the extra sales arrive. That's why fast-growing companies often raise money even when profitable.</p>",
        sim: () => predict({ q: "Which business model has negative working capital (customers fund it)?", options: ["A shipbuilder paid on delivery", "A supermarket that sells stock in days and pays suppliers in 45", "A wholesaler with 60-day customer terms"], answer: 1, why: "<p>Supermarkets collect cash at the till almost immediately but pay suppliers weeks later. Subscription software (paid annually upfront) and airlines (tickets sold months ahead) do the same.</p>" }) },
      { h: "Squeeze the cycle", sim: () => flips([["Collect faster", "Shorter payment terms, deposits, card payments, factoring (selling receivables)."], ["Hold less stock", "Just-in-time supply chains (Toyota), better forecasting."], ["Pay slower", "Longer supplier terms, supply-chain finance. Careful: suppliers notice."], ["Get paid upfront", "Subscriptions, pre-orders, deposits."]]) },
    ],
    job: "<p>Working capital optimisation is a staple consulting project and one of the fastest ways PE owners release cash after a buyout (often 5-10% of revenue). In deal negotiations, buyers and sellers agree a \"normal\" level of working capital (the <b>NWC peg</b>); if the company is delivered with less, the price drops. Treasurers manage it daily.</p>",
    terms: [["Working capital", "Current assets − current liabilities; in practice receivables + inventory − payables."], ["DSO", "Days sales outstanding: how long customers take to pay."], ["DIO", "Days inventory outstanding: how long stock sits."], ["DPO", "Days payables outstanding: how long you take to pay suppliers."], ["Cash conversion cycle", "DIO + DSO − DPO."], ["Factoring", "Selling receivables to a financier for cash now."], ["NWC peg", "Agreed normal working capital level in an acquisition."]],
    quiz: [
      ["DIO 40, DSO 50, DPO 30. Cash conversion cycle?", ["120 days", "60 days", "20 days"], 1, "40 + 50 − 30 = 60."],
      ["Why can a fast-growing profitable firm run out of cash?", ["Taxes", "Working capital grows with sales before cash comes in", "Depreciation"], 1, "More sales mean more stock and receivables to fund."],
      ["Negative working capital means…", ["The firm is insolvent", "Suppliers and customers effectively fund operations", "Inventory is negative"], 1, "Cash comes in before it goes out."],
    ],
    recap: [["DIO + DSO − DPO", "The cash conversion cycle."], ["Growth eats cash", "More sales need more working capital."], ["Negative is nice", "Get paid before you pay."]],
    see: ["cash-flow", "three-link", "unit-economics", "lbo"],
  },
};

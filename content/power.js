// World 15: Power & the rules. Who writes the rules, how the powerful use them, and where the line is.
// Everything here is described so you can recognise it, price it and resist it, with what happened to the people who crossed the line.
import { h, s, usd, num, pct, rng, clamp } from "../lib/core.js";
import { slider, seg, stats, stage, predict, calc, callout, table, bars, button, flips, stepper } from "../lib/ui.js";
import { plot, columns, curve } from "../lib/chart.js";

const W = "var(--wc)";
const B = (x) => `$${num(x, x < 10 ? 1 : 0)}B`;

/* ---------- 1. Concentrated benefits, diffuse costs ---------- */
function olson() {
  let gain = 3, firms = 10, people = 330;
  const st = stats([{ label: "Gain per firm" }, { label: "Cost per person" }, { label: "Worth lobbying, per firm, up to" }, { label: "Will the public fight it?" }]);
  const box = h("div");
  const draw = () => {
    const perFirm = (gain * 1e9) / firms, perPerson = (gain * 1e9) / (people * 1e6);
    st.set(0, usd(perFirm / 1e6) + "M"); st.set(1, usd(perPerson, 2));
    st.set(2, usd(perFirm / 1e6 * 0.5) + "M", "accent"); st.set(3, perPerson < 20 ? "No: too small to notice" : "Maybe", perPerson < 20 ? "bad" : "good");
    box.replaceChildren(bars([{ label: "Each firm's stake", value: Math.log10(perFirm), color: W }, { label: "Each citizen's stake", value: Math.log10(Math.max(1, perPerson)), color: "var(--ink-3)" }], { max: 10, fmt: (v) => `~${usd(Math.pow(10, v))}` }));
  };
  const c = [
    slider({ label: "Yearly benefit of a protective rule (tariff, subsidy, licence)", min: 0.1, max: 20, step: 0.1, value: gain, fmt: (x) => B(x), onInput: (x) => { gain = x; draw(); } }),
    slider({ label: "Firms that share it", min: 1, max: 200, value: firms, onInput: (x) => { firms = x; draw(); } }),
    slider({ label: "People who pay for it (millions)", min: 1, max: 1000, value: people, fmt: (x) => `${x}M`, onInput: (x) => { people = x; draw(); } }),
  ];
  draw();
  return stage({ title: "Why small groups beat big ones in politics", controls: c, body: [box, st.el], note: "Mancur Olson's <i>Logic of Collective Action</i> (1965): a rule worth $300M to each of ten firms will be fought for with lawyers and lobbyists; costing each citizen $9 a year, nobody will spend a weekend opposing it. US sugar quotas, for example, have long kept American sugar prices well above world prices. The bar chart is on a log scale: the gap is that big." });
}

/* ---------- 2. Buy, borrow, die ---------- */
function bbd() {
  let r = 8, spend = 2, loan = 5, yrs = 30;
  const p = plot({ height: 270, x: [0, 30], y: [0, 300], xLabel: "years", yLabel: "left for heirs ($M, after tax)", xFmt: (x) => `${num(x)}y`, yFmt: (x) => `$${num(x)}M`, label: "Sell vs borrow" });
  const st = stats([{ label: "Sell shares to spend" }, { label: "Borrow against shares" }, { label: "Tax paid: sell / borrow" }]);
  const draw = () => {
    const start = 50, basis0 = 5, cg = 0.238;
    let a1 = start, b1 = basis0, tax1 = 0; let a2 = start, debt = 0;
    const s1 = [[0, start - (start - basis0) * cg]], s2 = [[0, start]];
    for (let t = 1; t <= yrs; t++) {
      a1 *= 1 + r / 100; const gainShare = Math.max(0, 1 - b1 / a1), gross = spend / (1 - gainShare * cg); const tx = gross - spend; tax1 += tx; b1 *= 1 - gross / a1; a1 -= gross;
      a2 *= 1 + r / 100; debt = (debt + spend) * (1 + loan / 100);
      s1.push([t, Math.max(0, a1 - Math.max(0, a1 - b1) * cg)]); s2.push([t, Math.max(0, a2 - debt)]); // heirs: sellers' heirs still owe gains in this simple view; borrowers' heirs get a stepped-up basis
    }
    p.draw({ y: [0, Math.max(100, s2.at(-1)[1], s1.at(-1)[1]) * 1.1], x: [0, yrs], series: [{ name: "Sell to spend (pay capital gains tax)", color: "var(--ink-3)", width: 3, pts: s1 }, { name: "Buy, borrow, die (step-up at death)", color: W, width: 4, pts: s2 }] });
    st.set(0, `$${num(s1.at(-1)[1])}M`); st.set(1, `$${num(s2.at(-1)[1])}M`, "accent"); st.set(2, `$${num(tax1, 1)}M / $0`, "bad");
  };
  const c = [slider({ label: "Shares grow per year", min: 2, max: 12, step: 0.5, value: r, fmt: (x) => `${x}%`, onInput: (x) => { r = x; draw(); } }), slider({ label: "Spending per year", min: 0.5, max: 4, step: 0.5, value: spend, fmt: (x) => `$${x}M`, onInput: (x) => { spend = x; draw(); } }), slider({ label: "Interest on the loan", min: 2, max: 10, step: 0.25, value: loan, fmt: (x) => `${x}%`, onInput: (x) => { loan = x; draw(); } }), slider({ label: "Years", min: 5, max: 40, value: yrs, fmt: (x) => `${x}y`, onInput: (x) => { yrs = x; draw(); } })];
  draw();
  return stage({ title: "A founder with $50M of stock (bought for $5M) needs to live", controls: c, body: [p.el, st.el], note: "<b>Buy</b> assets that grow. <b>Borrow</b> against them instead of selling, so there's no sale and no capital gains tax. <b>Die</b>, and in the US heirs get a <b>stepped-up basis</b>: decades of gains are never taxed as income. It only works while returns beat the loan rate, which is why it's a strategy for the already rich. Estate tax can still apply above a high exemption. Simplified US example, 23.8% capital gains rate." });
}

function rgSim() {
  let r = 5, g = 2;
  const p = plot({ height: 240, x: [0, 50], y: [0, 100], xLabel: "years", yLabel: "share of total income", xFmt: (x) => `${num(x)}y`, yFmt: (x) => `${num(x)}%`, label: "r versus g" });
  const draw = () => {
    const pts = [], w = [];
    for (let t = 0; t <= 50; t++) { const k = 20 * Math.pow(1 + r / 100, t), y = 80 * Math.pow(1 + g / 100, t); pts.push([t, (100 * k) / (k + y)]); w.push([t, (100 * y) / (k + y)]); }
    p.draw({ series: [{ name: "Capital owners' share", color: W, width: 4, pts }, { name: "Wage earners' share", color: "var(--ink-3)", width: 3, pts: w }] });
  };
  const c = [slider({ label: "r: return on capital", min: 0, max: 10, step: 0.5, value: r, fmt: (x) => `${x}%`, onInput: (x) => { r = x; draw(); } }), slider({ label: "g: wage / economy growth", min: 0, max: 6, step: 0.5, value: g, fmt: (x) => `${x}%`, onInput: (x) => { g = x; draw(); } })];
  draw();
  return stage({ title: "r > g: when capital compounds faster than wages", controls: c, body: [p.el], note: "Thomas Piketty's famous inequality (2013): if the return on wealth (r) beats the growth of the economy (g), and owners reinvest, wealth concentrates over time. Critics argue r falls as capital piles up, and that taxes, spending and inheritance split fortunes. It's a starting point for debate, not a law of nature." });
}

/* ---------- 3. Profit shifting ---------- */
function shiftSim() {
  let roy = 60, haven = 0, minTax = false;
  const box = h("div"), st = stats([{ label: "Profit booked in the haven" }, { label: "Total tax" }, { label: "Effective tax rate" }]);
  const draw = () => {
    const profit = 10, high = 25, shifted = (profit * roy) / 100, home = profit - shifted;
    let tax = home * high / 100 + shifted * haven / 100;
    if (minTax && haven < 15) tax += shifted * (15 - haven) / 100;
    box.replaceChildren(columns([{ label: "Sales country (25%)", value: home, color: "var(--ink-3)", show: B(home) }, { label: "Tax haven", value: shifted, color: W, show: B(shifted) }], { height: 180, fmt: (v) => B(v), label: "Where profit is booked" }));
    st.set(0, B(shifted)); st.set(1, B(tax)); st.set(2, pct(tax / profit), tax / profit < 0.12 ? "bad" : "good");
  };
  const c = [slider({ label: "Royalty the haven subsidiary charges for the brand/IP (% of profit)", min: 0, max: 90, value: roy, fmt: (x) => `${x}%`, onInput: (x) => { roy = x; draw(); } }), slider({ label: "Haven tax rate", min: 0, max: 15, step: 0.5, value: haven, fmt: (x) => `${x}%`, onInput: (x) => { haven = x; draw(); } }), seg({ label: "Global minimum tax (15%)", options: [{ value: "n", label: "Off" }, { value: "y", label: "On" }], value: "n", onChange: (x) => { minTax = x === "y"; draw(); } })];
  draw();
  return stage({ title: "Move $10B of profit without moving a single customer", controls: c, body: [box, st.el], note: "A group puts its patents and brand in a low-tax subsidiary, then charges its other subsidiaries royalties for using them. Profit moves on paper to where tax is lowest. <b>Transfer pricing</b> rules say those charges must be \"arm's length\", but valuing unique IP is hard, so there's a lot of room. In 2021 about 140 countries agreed a 15% <b>global minimum tax</b> (OECD Pillar Two), now being applied in the EU, UK, Japan and others: turn it on and the haven stops paying off." });
}

/* ---------- 4. Legal / grey / illegal sorter ---------- */
function sorter(items, title, note) {
  let score = 0, answered = 0;
  const st = stats([{ label: "Answered" }, { label: "Right" }]);
  const rows = items.map(([sit, ans, why]) => {
    const out = h("div.sort-why");
    const pick = (v) => {
      if (out.dataset.done) return; out.dataset.done = "1"; answered++; if (v === ans) score++;
      btns.forEach((b) => { b.disabled = true; b.classList.toggle("right", b.dataset.v === ans); b.classList.toggle("wrong", b.dataset.v === v && v !== ans); });
      out.innerHTML = `<b>${v === ans ? "Right" : "Actually: " + { L: "legal", G: "grey", I: "illegal" }[ans]}.</b> ${why}`;
      st.set(0, `${answered} / ${items.length}`); st.set(1, String(score), score / answered >= 0.7 ? "good" : "warn");
    };
    const btns = [["L", "Legal"], ["G", "Grey"], ["I", "Illegal"]].map(([v, t]) => h("button.sort-b", { type: "button", "data-v": v, onclick: () => pick(v) }, t));
    const sg = h("div.sort-bs", btns);
    return h("div.sort-row", h("p", { html: sit }), sg, out);
  });
  st.set(0, `0 / ${items.length}`); st.set(1, "0");
  return stage({ title, body: [h("div.sort", rows), st.el], note });
}

/* ---------- 5. Pump and dump ---------- */
function pumpSim() {
  let hype = 6, late = 60;
  const p = plot({ height: 250, x: [0, 40], y: [0, 2], xLabel: "days", yLabel: "share price", xFmt: (x) => `d${num(x)}`, yFmt: (x) => usd(x, 2), label: "Pump and dump" });
  const box = h("div");
  const draw = () => {
    const pts = []; let pr = 0.2;
    for (let d = 0; d <= 40; d++) { if (d < 8) pr = 0.2 + d * 0.004; else if (d < 20) pr *= 1 + hype / 100; else if (d < 24) pr *= 0.97; else pr *= 0.86; pr = Math.max(0.03, pr); pts.push([d, pr]); }
    const peak = Math.max(...pts.map((q) => q[1])), buyAt = pts[Math.min(19, 8 + Math.round((late / 100) * 12))][1], end = pts.at(-1)[1];
    p.draw({ y: [0, peak * 1.15], series: [{ name: "Price", color: W, width: 4, pts }], bands: [{ x0: 0, x1: 8, color: "#84cc16", label: "quiet buying" }, { x0: 8, x1: 20, color: "#f5c518", label: "hype" }, { x0: 20, x1: 40, color: "var(--down)", label: "dump" }] });
    box.replaceChildren(bars([{ label: "Promoters (bought d0-8, sold d18-22)", value: ((peak * 0.85) / 0.21 - 1) * 100, color: "var(--up)" }, { label: "Retail buyer who got in at the hype", value: (end / buyAt - 1) * 100, color: "var(--down)" }], { fmt: (v) => `${v >= 0 ? "+" : ""}${num(v)}%` }));
  };
  const c = [slider({ label: "Hype intensity (daily rise)", min: 1, max: 15, value: hype, fmt: (x) => `+${x}%/day`, onInput: (x) => { hype = x; draw(); } }), slider({ label: "How late the retail buyer joins the hype", min: 0, max: 100, value: late, fmt: (x) => `${x}%`, onInput: (x) => { late = x; draw(); } })];
  draw();
  return stage({ title: "Anatomy of a pump-and-dump in a tiny stock", controls: c, body: [p.el, box], note: "Insiders buy a thinly traded stock quietly, then hype it (once by cold-calling, now via social media, paid influencers and chat groups). Latecomers' buying lets the insiders sell at the top. Then there's nobody left to buy. It's securities fraud in most countries; the losers are always the people who heard about it last." });
}

/* ---------- 6. Ponzi ---------- */
function ponziSim() {
  let promise = 12, growth = 25, out = 10;
  const p = plot({ height: 260, x: [0, 20], y: [0, 100], xLabel: "years", yLabel: "$ billions", xFmt: (x) => `${num(x)}y`, yFmt: (x) => `$${num(x)}B`, label: "Ponzi scheme" });
  const st = stats([{ label: "Collapses in year" }, { label: "Statement balances at collapse" }, { label: "Real cash at collapse" }]);
  const draw = () => {
    let owed = 1, cash = 1, inflow = 0.5, dead = null; const o = [[0, 1]], c = [[0, 1]];
    for (let t = 1; t <= 20; t++) {
      if (dead) { o.push([t, o.at(-1)[1]]); c.push([t, 0]); continue; }
      owed = owed * (1 + promise / 100) + inflow; const paid = owed * ((t > 14 ? out * 2.5 : out) / 100); owed -= paid; cash = cash + inflow - paid;
      inflow *= 1 + growth / 100; if (t > 14) inflow *= 0.3; // a downturn: new money dries up and scared investors pull out
      if (cash <= 0) { dead = t; cash = 0; }
      o.push([t, owed]); c.push([t, Math.max(0, cash)]);
    }
    p.draw({ y: [0, Math.max(...o.map((q) => q[1])) * 1.1], series: [{ name: "What investors think they have", color: W, width: 4, pts: o }, { name: "Cash actually there", color: "#f5c518", width: 3, pts: c }] });
    st.set(0, dead ? `Year ${dead}` : "not yet", dead ? "bad" : "warn"); st.set(1, `$${num((dead ? o[dead] : o.at(-1))[1], 1)}B`); st.set(2, `$${num((dead ? c[dead - 1] : c.at(-1))[1], 1)}B`, "bad");
  };
  const c = [slider({ label: "Promised steady return", min: 5, max: 30, value: promise, fmt: (x) => `${x}%/yr`, onInput: (x) => { promise = x; draw(); } }), slider({ label: "New money growth", min: 0, max: 60, value: growth, fmt: (x) => `${x}%/yr`, onInput: (x) => { growth = x; draw(); } }), slider({ label: "Investors withdrawing each year", min: 2, max: 30, value: out, fmt: (x) => `${x}%`, onInput: (x) => { out = x; draw(); } })];
  draw();
  return stage({ title: "No investments at all: old investors are paid with new investors' money", controls: c, body: [p.el, st.el], note: "Nothing is invested, so statements are fiction. The scheme survives as long as new money exceeds withdrawals. A recession (here, from year 15, when new money dries up and withdrawals jump) ends it. Bernie Madoff's statements showed about $65B when he confessed in December 2008, as the crisis triggered redemptions. Charles Ponzi's 1920 version lasted months; Madoff's lasted decades." });
}

/* ---------- 7. Network effects tip ---------- */
function tipSim() {
  let net = 1.4, q = 15, seed = 3;
  const box = h("div"), st = stats([{ label: "A's final share" }, { label: "B's final share" }, { label: "Market" }]);
  const run = () => {
    const r = rng(seed); let a = 5, b = 5; const path = [];
    for (let i = 0; i < 2000; i++) { const wa = Math.pow(a, net), wb = Math.pow(b, net) * (1 + q / 100); if (r() < wa / (wa + wb)) a++; else b++; if (i % 50 === 0) path.push([i, (100 * a) / (a + b)]); }
    return { a, b, path };
  };
  const p = plot({ height: 220, x: [0, 2000], y: [0, 100], xLabel: "users who have joined", yLabel: "platform A's share", xFmt: (x) => num(x), yFmt: (x) => `${num(x)}%`, label: "Platform market share" });
  const draw = () => {
    const o = run(), sa = o.a / (o.a + o.b);
    p.draw({ series: [{ name: "A's share", color: W, width: 4, pts: o.path }], hlines: [{ y: 50 }] });
    st.set(0, pct(sa, 0)); st.set(1, pct(1 - sa, 0)); st.set(2, sa > 0.9 || sa < 0.1 ? "Tipped: winner takes all" : "Shared", sa > 0.9 || sa < 0.1 ? "bad" : "good");
  };
  const c = [slider({ label: "Network effect strength (1 = none extra)", min: 0.5, max: 2, step: 0.05, value: net, fmt: (x) => num(x, 2), onInput: (x) => { net = x; draw(); } }), slider({ label: "B is better by", min: 0, max: 60, value: q, fmt: (x) => `${x}%`, onInput: (x) => { q = x; draw(); } }), button("Rerun", () => { seed++; draw(); }, "primary")];
  draw();
  return stage({ title: "Two platforms, users join the one their friends are on", controls: c, body: [p.el, st.el], note: "With strong network effects, early luck decides who wins, and a <b>better</b> product (B) can still lose. Once a market tips, the winner faces little competition: it can raise prices, degrade quality or buy any rival that gets close. That's why antitrust regulators now watch \"killer acquisitions\" of small startups." });
}

/* ---------- 8. Dilemmas ---------- */
function dilemmas() {
  const D = [
    ["You're a second-year analyst. Your MD asks you to raise the growth assumption in a model \"so the deal works\" before it goes to the investment committee.", [["Change it quietly", "The deal closes on numbers you knew were stretched. If it fails, the model has your name on it. This is how bad deals get done: everyone \"just adjusts\"."], ["Change it but write down the original and why it moved", "Better: there's a record, but you've still signed off on something you don't believe."], ["Show the MD the data behind your number and offer a sensitivity table", "Best first move. Most MDs want a defensible case, not a lie. If they insist, the sensitivity shows the committee the risk. If pressured to mislead, compliance exists for this."]], 2],
    ["At your bank, branch staff must hit eight products per customer. Colleagues are opening accounts customers never asked for.", [["Do it too: everyone does", "Wells Fargo staff opened about 3.5 million accounts without consent (revealed 2016). The bank paid $3B to settle criminal and civil charges in 2020; thousands of staff were fired; the CEO resigned."], ["Hit what you can honestly and flag the incentive problem", "The root cause was the incentive scheme. Raising it through the ethics hotline (and documenting it) is what regulators later said should have happened."], ["Quit without saying anything", "Protects you, fixes nothing for customers."]], 1],
    ["Your car company's engines can't meet emissions limits at a reasonable cost. An engineer shows software that detects lab tests and runs clean only then.", [["Ship it: the tests are unrealistic anyway", "Volkswagen did this in about 11 million diesel cars (\"Dieselgate\", 2015). Total costs passed €30B; executives were charged in the US and Germany."], ["Delay the launch and tell regulators the truth", "Costly now, survivable. Problems hidden from regulators tend to become existential when found."], ["Ask legal whether it's technically allowed", "The question is the tell. If it needs a clever reading of the rules, it's a defeat device."]], 1],
    ["A consulting client asks you to help \"turbocharge\" sales of an addictive painkiller, including paying distributors rebates for every overdose.", [["It's legal medicine; it's their call", "McKinsey advised Purdue Pharma on OxyContin sales, including a suggestion of rebates to distributors linked to overdoses. In 2021 it paid $573M to settle with US states, and later about $650M more to resolve a federal criminal probe (2024)."], ["Decline the work", "Firms can and do turn down clients. \"Would I be comfortable if this appeared on the front page?\" is the test that failed here."], ["Do it but avoid putting things in writing", "Attempting to hide it signals you know it's wrong, and destroying documents was part of the later McKinsey case."]], 1],
    ["You're evaluating a fund for your firm. It has returned about 1% a month for 15 years with almost no losing months, and nobody can explain the strategy.", [["Invest: track record speaks", "That's what thousands did with Madoff. Real strategies have bad months."], ["Ask for the custodian, the auditor and the trades, and do the maths", "Harry Markopolos did this in 2000 and told the SEC the returns were impossible. He was ignored for years; Madoff collapsed in 2008. Smooth returns + secrecy + a tiny auditor = run."], ["Invest a little to see", "A Ponzi pays early investors well. Your small test will \"work\"."]], 1],
  ];
  const box = h("div.dlm"), st = stats([{ label: "Good calls" }]);
  let good = 0, n = 0;
  D.forEach(([sit, opts, best], i) => {
    const out = h("div.qz-why");
    const btns = opts.map(([o, why], k) => h("button.choice", { type: "button", onclick: () => {
      btns.forEach((b, j) => { b.disabled = true; b.classList.toggle("right", j === best); b.classList.toggle("wrong", j === k && k !== best); });
      n++; if (k === best) good++; st.set(0, `${good} / ${n}`, good === n ? "good" : "warn");
      out.innerHTML = `<b>What happened:</b> ${why}${k !== best ? `<br><br><b>Better:</b> ${opts[best][0]}. ${opts[best][1]}` : ""}`;
    } }, h("span.choice-k", String.fromCharCode(65 + k)), h("span", o)));
    box.append(h("div.dlm-c", h("div.eyebrow", `Situation ${i + 1}`), h("p.q", sit), h("div.choices", btns), out));
  });
  st.set(0, "0 / 0");
  return stage({ title: "Five real dilemmas (lightly disguised)", body: [box, st.el], note: "Every situation is based on a real case. People rarely decide to commit fraud; they take one small, rationalised step at a time, under pressure, with incentives pointing the wrong way. Sociologist Diane Vaughan called this the <b>normalisation of deviance</b>." });
}

export default {
  "who-decides": {
    principle: "Rules aren't handed down by nature. They're <em>written by people, under pressure from people</em>, and the groups with the most to gain per head usually push hardest.",
    hook: "<p>Every price, market and loan in this course sits inside rules: what counts as a security, how much capital a bank holds, what's taxed and at what rate. Those rules are fought over. In the US alone, lobbying spending runs to over $4 billion a year on record. Understanding who writes the rules is half of understanding who wins.</p>",
    parts: [
      { h: "The maths of lobbying", sim: olson },
      { h: "Who decides what", sim: () => table(["Who", "Decides", "Examples"], [["Legislatures", "Laws, tax codes, budgets", "US Congress, UK Parliament, EU Parliament + Council"], ["Regulators", "Detailed rules and enforcement", "SEC, CFTC, Fed, FCA, PRA, ECB, ESMA"], ["Central banks", "Interest rates, bank supervision, emergency lending", "Fed, ECB, Bank of England"], ["Courts", "What laws mean; whether rules are lawful", "US Supreme Court, CJEU"], ["Standard setters", "Accounting and capital rules", "FASB, IASB, Basel Committee"], ["Self-regulators", "Rules for members", "FINRA, stock exchanges"], ["International bodies", "Coordinated rules", "OECD (tax), FSB, IMF"], ["Private gatekeepers", "Who gets access", "Rating agencies, index providers, auditors"]]) },
      { h: "Life of a rule", sim: () => stepper([
        { t: "1 · A crisis or scandal", html: "<p>Rules usually follow disasters: 1929 → the SEC (1934); Enron → Sarbanes-Oxley (2002); 2008 → Dodd-Frank (2010).</p>" },
        { t: "2 · The law passes", html: "<p>Laws are often broad. Dodd-Frank ran to about 850 pages and asked regulators to write about 400 detailed rules.</p>" },
        { t: "3 · The detail is written", html: "<p>Regulators publish draft rules for comment. Industry submits thousands of pages; the public submits far less. The Volcker Rule (no proprietary trading by banks) took until December 2013 to finalise.</p>" },
        { t: "4 · Lobbying and courts", html: "<p>Rules are challenged in court and softened through exemptions. Thresholds get raised (in 2018 the US raised the asset size at which banks face the strictest oversight from $50B to $250B; SVB, at about $200B, fell below it).</p>" },
        { t: "5 · Enforcement", html: "<p>A rule only matters if it's enforced. Budgets, political priorities and whether fines are bigger than profits decide that.</p>" },
        { t: "6 · Next crisis", html: "<p>Memories fade, rules loosen, risk moves to the less-regulated corners (shadow banking, crypto, private credit). Repeat.</p>" },
      ]) },
      { h: "How rules get bent toward the powerful", sim: () => flips([["Regulatory capture", "George Stigler (1971): regulators come to serve the industry they regulate. They depend on it for information, expertise and future jobs."], ["Revolving door", "Officials move to the firms they oversaw, and back. Not illegal, but it shapes incentives."], ["Complexity", "Long, technical rules favour firms that can afford armies of lawyers; small rivals can't."], ["Regulatory moats", "Big incumbents sometimes lobby <i>for</i> regulation they can afford and newcomers can't."], ["Too big to jail", "Prosecutors may avoid charging giant banks for fear of collapse. HSBC paid $1.9B over money laundering in 2012 under a deferred prosecution agreement; no executives were charged."], ["Fines as a cost of business", "If the expected fine is smaller than the profit, some firms treat it as a tax."]]) },
      { h: "Practise", sim: () => predict({ q: "A rule gives 5 steel firms $2B a year and costs 330M consumers about $6 each. Who is most likely to win the political fight?", options: ["Consumers: there are more of them", "Steel firms: $400M each is worth lobbying for", "Neither"], answer: 1, why: "<p>Concentrated benefits, diffuse costs. The firms can rationally spend up to hundreds of millions; no consumer will spend $6 of effort, never mind more.</p>" }) },
    ],
    job: "<p><b>Policy and regulatory affairs</b> teams at banks and tech firms track rulemaking and draft comment letters. Lawyers and lobbyists in Washington, Brussels and London shape the detail. Consultants run regulatory change programmes. Investors price <b>regulatory risk</b>: a rule change can wipe out a business model overnight (or create one).</p>",
    terms: [["Lobbying", "Trying to influence lawmakers or regulators."], ["Regulatory capture", "When a regulator ends up serving the industry it oversees."], ["Revolving door", "Movement of people between regulators and the firms they regulate."], ["Collective action problem", "Large groups with small individual stakes struggle to organise."], ["Rent-seeking", "Seeking wealth by influencing rules rather than creating value."], ["Deferred prosecution agreement", "Charges are filed but dropped if a firm pays and meets conditions."], ["Rulemaking", "The process by which regulators write detailed rules."]],
    quiz: [
      ["Why do small, organised groups often beat large ones in politics?", ["They're smarter", "Each member's stake is large enough to fight for", "Large groups don't vote"], 1, "Olson's logic of collective action."],
      ["Regulatory capture means…", ["Regulators arrest firms", "Regulators come to serve the industry's interests", "Firms buy regulators' companies"], 1, "Stigler's idea."],
      ["Rent-seeking is…", ["Collecting rent from tenants", "Getting richer by changing rules rather than creating value", "Renting equipment"], 1, "Profiting from privilege, not production."],
    ],
    recap: [["Olson", "Concentrated gains beat diffuse costs."], ["Capture", "Regulators drift toward the regulated."], ["Cycle", "Crisis → rules → loosening → crisis."]],
    see: ["incentives", "externalities", "price-controls", "crisis-2008"],
  },

  "rich-playbook": {
    principle: "Wages are taxed when earned. <em>Wealth that grows is taxed only when sold</em>, and sometimes never. The rich mostly own, borrow and defer, all perfectly legally.",
    hook: "<p>In 2021 ProPublica obtained IRS data on the richest Americans. Comparing taxes paid with how much their wealth grew (2014-2018), the 25 richest paid a \"true tax rate\" of about 3.4%. Nobody broke a law. Their wealth grew as unsold shares, which isn't income under the tax code.</p>",
    parts: [
      { h: "Buy, borrow, die", sim: bbd },
      { h: "r > g", sim: rgSim },
      { h: "The legal playbook", sim: () => flips([["Own, don't earn", "Equity in a growing company compounds untaxed until sold. Founders pay themselves low salaries."], ["Borrow against assets", "Loans aren't income. Securities-backed loans for the very wealthy often cost only a little more than the central bank rate."], ["Step-up at death", "In the US, heirs inherit assets at today's value, erasing the unrealised gain."], ["Carried interest", "PE and hedge fund managers' share of profits is often taxed as a capital gain, not income: a lower rate on what is, economically, pay for work."], ["Real estate depreciation", "Buildings are depreciated for tax even as they rise in value; gains can be rolled into new property tax-free (US \"1031 exchange\")."], ["Trusts and foundations", "Move future growth to heirs (US GRATs) or keep control of giving while taking a deduction now."], ["Location", "Live, or hold assets, where taxes are lowest. Some countries tax non-domiciled residents only on local income."]]) },
      { h: "Who decides", html: "<p>Each item above is a choice written into tax law, and each has defenders: taxing unsold gains is hard to value and could force founders to sell; step-up avoids double tax with estate tax; carried interest rewards risk. Critics answer that it lets the richest pay lower rates than nurses. Proposals to change them (wealth taxes, taxing gains at death, ending carried interest treatment) come up almost every year. Which way they go depends on lobbying, voting and courts: the previous lesson.</p>",
        sim: () => calc({ q: "A founder's shares rise from $100M to $150M this year. She sells nothing and borrows $2M to live on. How much US income tax does the $50M gain trigger this year (in $)?", answer: 0, tol: 0, unit: "$", why: "<p><b>$0</b>. Unrealised gains aren't taxed, and loan proceeds aren't income. A nurse earning $80,000 pays income and payroll tax on every dollar. That gap is the core of the debate.</p>" }) },
    ],
    job: "<p><b>Private bankers</b> and <b>wealth managers</b> (family offices, the private banks of JPMorgan, UBS, Goldman) structure lending, trusts and holdings for ultra-high-net-worth clients. Tax lawyers and accountants design the structures. On the other side, tax authorities, policy economists (Saez, Zucman) and journalists measure the effect and argue for change.</p>",
    terms: [["Realisation", "A gain is taxed only when the asset is sold."], ["Buy, borrow, die", "Hold assets, borrow against them, pass them on with a stepped-up basis."], ["Stepped-up basis", "Heirs' cost basis resets to the value at death."], ["Carried interest", "Fund managers' share of profits, often taxed as capital gains."], ["Family office", "A private company managing one wealthy family's money."], ["Securities-based lending", "Loans backed by a portfolio of shares or bonds."], ["Wealth tax", "A yearly tax on net worth rather than income."]],
    quiz: [
      ["Why don't the very rich just sell shares to fund spending?", ["They can't", "Selling triggers capital gains tax; borrowing doesn't", "Banks forbid it"], 1, "Loans aren't taxable income."],
      ["Stepped-up basis means heirs…", ["Pay double tax", "Inherit with the gain wiped out for capital gains tax", "Can't sell"], 1, "The basis resets to market value at death."],
      ["Buy-borrow-die stops working when…", ["Assets grow faster than loan interest", "Loan rates exceed asset returns for long", "The owner is young"], 1, "Debt then grows faster than wealth."],
    ],
    recap: [["Own", "Gains untaxed until sold."], ["Borrow", "Loans aren't income."], ["Die", "Step-up erases gains."]],
    see: ["compound", "capital-structure", "tax-games", "pe-returns"],
  },

  "tax-games": {
    principle: "<em>Avoidance</em> uses the rules (legal, sometimes aggressively). <em>Evasion</em> hides income or lies (a crime). The line is about honesty, not how clever the plan is.",
    hook: "<p>Al Capone, after years of bootlegging and violence, went to prison in 1931 for tax evasion. In 2016 the European Commission said Ireland gave Apple illegal tax breaks worth €13 billion; Apple called it legal planning; the EU's top court finally sided with the Commission in 2024. Same topic, opposite ends of the spectrum.</p>",
    parts: [
      { h: "Shift the profit", sim: shiftSim },
      { h: "The spectrum", sim: () => table(["", "What it is", "Example", "Consequence"], [["<b>Planning</b>", "Using rules as intended", "Pension contributions, tax-free savings accounts", "None: it's the point"], ["<b>Avoidance</b>", "Using rules in ways lawmakers didn't intend", "\"Double Irish\" structures, IP in havens", "Legal until closed; may be challenged"], ["<b>Aggressive avoidance</b>", "Schemes with no real purpose except tax", "Artificial loss schemes, abusive shelters", "Struck down by courts (\"substance over form\"), penalties"], ["<b>Evasion</b>", "Hiding income, lying, fake invoices", "Undeclared offshore accounts", "Back tax, big fines, prison"]]) },
      { h: "Spot the line", sim: () => sorter([
        ["A family puts the maximum allowed into tax-free retirement accounts.", "L", "Exactly what the law intends."],
        ["A tech group books European sales through an Irish subsidiary paying royalties to a Bermuda company with no staff.", "G", "The classic \"Double Irish\". Legal at the time; Ireland closed it for new entrants in 2015 (fully by 2020) after global pressure."],
        ["A business owner pays staff partly in cash to skip payroll tax.", "I", "Evasion: hiding income from the tax authority."],
        ["A billionaire moves to a country with no income tax and actually lives there.", "L", "Legal, if the move is real. Faking residence (still living at home) is evasion."],
        ["A client keeps an undisclosed Swiss account and doesn't report its interest.", "I", "Evasion. After 2009, UBS paid $780M and handed over client names to the US; the US FATCA law (2010) and global data sharing (CRS) now report most foreign accounts automatically."],
      ], "Legal, grey or illegal?", "Most tax fights happen in the grey band. Courts apply doctrines like <b>economic substance</b>: a deal with no business purpose except saving tax can be ignored.") },
      { h: "Who decides", sim: () => flips([["Legislatures", "Write the tax code, including every exemption."], ["Tax authorities", "IRS, HMRC: issue guidance, audit, prosecute."], ["Courts", "Decide whether a scheme works. The EU's top court ruled on Apple in 2024."], ["OECD / G20", "BEPS project (2013-) and the 15% global minimum tax agreed in 2021."], ["Leaks and journalists", "LuxLeaks (2014), Panama Papers (2016), Paradise Papers (2017) changed laws by changing public opinion."], ["Whistleblowers", "Bradley Birkenfeld exposed UBS's US clients; the IRS paid him a $104M award in 2012, after he'd served prison time for his part."]]) },
    ],
    job: "<p>Big Four <b>tax advisers</b> design group structures; in-house tax teams manage effective tax rates (a figure analysts track). <b>Tax authorities</b> and the OECD design countermeasures. Equity analysts adjust for tax risk: a company with a 10% tax rate today may face 15%+ tomorrow. PE funds model tax structures in every LBO.</p>",
    terms: [["Tax avoidance", "Legally reducing tax, sometimes against the spirit of the law."], ["Tax evasion", "Illegally hiding income or lying to pay less."], ["Transfer pricing", "Prices charged between parts of the same group."], ["Arm's-length principle", "Intra-group prices should match what unrelated firms would charge."], ["Tax haven", "A jurisdiction with very low tax and often secrecy."], ["BEPS", "Base erosion and profit shifting: the OECD's project against it."], ["Global minimum tax", "15% floor on large groups' profits agreed by ~140 countries (Pillar Two)."], ["Economic substance", "Doctrine that schemes must have a real business purpose."]],
    quiz: [
      ["What separates evasion from avoidance?", ["The amount saved", "Concealment or dishonesty", "Whether lawyers were used"], 1, "Evasion involves hiding or lying."],
      ["Transfer pricing lets groups shift profit by…", ["Moving customers", "Setting internal charges between subsidiaries", "Printing money"], 1, "Royalties, interest and service fees move profit on paper."],
      ["A 15% global minimum tax mainly reduces the benefit of…", ["Pension saving", "Booking profit in 0% jurisdictions", "Paying dividends"], 1, "A top-up tax removes the gain below 15%."],
    ],
    recap: [["Avoid vs evade", "Using rules vs breaking them."], ["Transfer pricing", "Profit moves on paper."], ["15% floor", "Havens matter less."]],
    see: ["rich-playbook", "who-decides", "fiscal", "income-statement"],
  },

  "information-edge": {
    principle: "Working harder to know more is how markets get efficient. <em>Trading on secrets you were trusted with</em> is a crime. The edge is legal; the breach of duty isn't.",
    hook: "<p>Raj Rajaratnam ran Galleon, a $7B hedge fund. He paid insiders at Intel, IBM and McKinsey for tips, and was caught on FBI wiretaps, the first time they were used in an insider trading case. In 2011 he got 11 years. Meanwhile, funds legally buy satellite images of car parks and credit-card data to predict retailers' sales before they report.</p>",
    parts: [
      { h: "Legal, grey or illegal?", sim: () => sorter([
        ["A fund buys satellite photos of retailers' car parks to estimate sales.", "L", "<b>Alternative data</b>: public, paid for, legal. A big industry."],
        ["An analyst combines filings, store visits and supplier chats into a call nobody else made.", "L", "The <b>mosaic theory</b>: many pieces of public or non-material info can add up to an insight legally."],
        ["A CEO tells her brother about an unannounced takeover; he buys call options.", "I", "Classic tipper/tippee insider trading. Options are a red flag regulators scan for."],
        ["A trader pays an \"expert network\" consultant who works at a chipmaker for next quarter's unreleased sales.", "I", "Material non-public info obtained by breach of duty. SAC Capital pleaded guilty in 2013 and paid $1.8B."],
        ["An executive sells shares under a trading plan set up months earlier.", "L", "A 10b5-1 plan is legal. Abuse (setting plans up just before bad news) led the SEC to add cooling-off periods in 2023."],
        ["A high-frequency firm pays an exchange to put its servers next door, seeing prices microseconds sooner.", "G", "Co-location is legal and sold openly, but critics (Michael Lewis's <i>Flash Boys</i>) say it taxes slower investors."],
        ["You overhear a stranger on a train discussing an unannounced merger and trade on it.", "G", "In the US, usually not illegal if no duty was breached (overheard tips have been ruled legal). In the EU and UK, trading on any inside information is banned. Jurisdiction matters."],
        ["A lawmaker trades shares in companies their committee is investigating.", "G", "Insider trading laws apply to members of Congress (STOCK Act, 2012), but proving it is hard; disclosures are often late. Bans on lawmakers owning individual stocks are debated every year."],
      ], "Sort the edges", "The legal test in most places: was the information <b>material</b>, <b>non-public</b>, and did you get it through a <b>breach of a duty</b> of trust? Each word matters.") },
      { h: "How they get caught", sim: () => stepper([
        { t: "1 · Surveillance", html: "<p>Exchanges and regulators flag unusual trading before announcements: out-of-the-money options bought days before a takeover are the classic pattern.</p>" },
        { t: "2 · Links", html: "<p>Investigators map phone records, emails and relationships between traders and insiders.</p>" },
        { t: "3 · Cooperators", html: "<p>One small tippee is charged and offers up the bigger names for a lighter sentence. This is how Galleon unravelled.</p>" },
        { t: "4 · Wiretaps and chats", html: "<p>Rajaratnam (wiretaps); chatrooms in the FX and LIBOR rigging cases: people write down what they shouldn't.</p>" },
        { t: "5 · Lying makes it worse", html: "<p>Martha Stewart was convicted not of insider trading but of obstructing the investigation and lying about a 2001 stock sale. She served five months in 2004-05.</p>" },
      ]) },
      { h: "Practise", sim: () => predict({ q: "An analyst learns from a company's public filings, a trade show and a former employee's general comments that demand is weakening, and sells. Most likely?", options: ["Insider trading", "Legal mosaic analysis", "Market manipulation"], answer: 1, why: "<p>Public and non-material pieces, combined by skill, are legal. It would change if the former employee leaked specific confidential numbers in breach of a duty.</p>" }) },
    ],
    job: "<p><b>Compliance officers</b> keep watch lists, restrict trading around deals and monitor communications. Hedge funds have <b>data teams</b> sourcing alternative data, with lawyers vetting each source. Bankers work behind \"walls\" separating deal teams from traders. Regulators (SEC, FCA) run market surveillance, and the SEC pays whistleblowers a share of sanctions.</p>",
    terms: [["Insider trading", "Trading on material non-public information in breach of a duty."], ["Material information", "Information a reasonable investor would consider important."], ["Tipper / tippee", "Insider who leaks / person who trades on the leak."], ["Mosaic theory", "Combining public and immaterial info into an insight is legal."], ["Alternative data", "Non-traditional data (satellite, card spending, web traffic) used to forecast."], ["10b5-1 plan", "A pre-set trading plan that lets insiders sell legally."], ["Information barrier", "Rules separating people with inside information from traders."], ["Expert network", "Firms connecting investors to industry experts for paid calls."]],
    quiz: [
      ["Which three things make trading on information illegal in the US?", ["Fast, profitable, large", "Material, non-public, obtained in breach of a duty", "Options, short sales, foreign"], 1, "All three elements matter."],
      ["Martha Stewart went to prison for…", ["Insider trading", "Obstructing justice and lying to investigators", "Tax evasion"], 1, "The cover-up, not the trade."],
      ["Buying satellite images of car parks to predict sales is…", ["Illegal", "Legal alternative data", "Manipulation"], 1, "Public, paid for, no duty breached."],
    ],
    recap: [["Edge vs breach", "Skill is legal; betrayal isn't."], ["MNPI", "Material, non-public, duty."], ["Caught", "Patterns, links, cooperators, chats."]],
    see: ["efficient", "information", "manipulation", "hedge-funds"],
  },

  manipulation: {
    principle: "Prices are supposed to reflect real supply and demand. <em>Manipulation fakes one of them</em> to trick others into trading at the wrong price.",
    hook: "<p>On 6 May 2010, US stocks briefly lost about $1 trillion in value in minutes: the Flash Crash. One contributor, regulators later said, was a trader in his parents' house in west London, Navinder Sarao, who placed huge sell orders he never meant to fill. He pleaded guilty to spoofing in 2016.</p>",
    parts: [
      { h: "Pump and dump", sim: pumpSim },
      { h: "The rogues' gallery", sim: () => table(["Trick", "How it works", "Famous case"], [["Pump and dump", "Hype a cheap stock, sell into the buying", "Stratton Oakmont (\"The Wolf of Wall Street\"); countless crypto tokens"], ["Spoofing / layering", "Place big fake orders to move the price, cancel them, trade the other way", "Sarao (2010 flash crash); JPMorgan paid $920M in 2020 for metals and Treasury spoofing"], ["Benchmark rigging", "Submit false figures to a reference rate", "LIBOR: banks paid around $9B in fines; trader Tom Hayes was jailed in 2015 (conviction quashed by the UK Supreme Court in 2025)"], ["Wash trading", "Trade with yourself to fake volume", "Common on unregulated crypto exchanges"], ["Cornering / squeezes", "Buy up supply, force short sellers to pay up", "Hunt brothers' silver (1980)"], ["Marking the close", "Trade at the last moment to set a closing price", "Used to flatter fund valuations at quarter end"]]) },
      { h: "Not every frenzy is manipulation", sim: () => predict({ q: "In January 2021, Reddit users piled into GameStop, squeezing short sellers. Was it illegal manipulation?", options: ["Yes, coordinated buying is always illegal", "No: the SEC found no evidence it was manipulation, though the episode raised questions about brokers and short interest", "Only the short sellers broke the law"], answer: 1, why: "<p>Openly sharing opinions and buying is legal, even in a crowd. Manipulation needs deception: fake orders, false statements, or secretly selling what you tell others to buy. The SEC's 2021 report found no manipulation, but highlighted payment for order flow and margin calls that made brokers restrict trading.</p>" }) },
      { h: "Who polices it", sim: () => flips([["SEC / CFTC", "US securities and derivatives regulators; civil penalties and bans."], ["Justice Department", "Criminal prosecution: prison."], ["FCA (UK), ESMA (EU)", "European equivalents under the Market Abuse Regulation."], ["Exchanges", "Real-time surveillance; can halt trading."], ["Crypto", "Much of it sits outside traditional rules or in disputed territory; enforcement has been patchy and political."]]) },
    ],
    job: "<p><b>Market surveillance</b> teams at exchanges, banks and regulators build models to detect spoofing and wash trades. <b>Trading compliance</b> reviews chats and orders. Lawyers defend and prosecute. Traders learn the rules the hard way: intent matters, and chats are evidence.</p>",
    terms: [["Market manipulation", "Deceptive actions that distort prices or volume."], ["Pump and dump", "Hyping an asset to sell it at an inflated price."], ["Spoofing", "Placing orders you intend to cancel, to mislead others."], ["Wash trade", "Buying and selling to yourself to fake activity."], ["Corner", "Controlling enough supply to dictate price."], ["LIBOR", "A former benchmark interest rate, rigged by banks, replaced by SOFR and SONIA."], ["Flash crash", "A very fast, deep price drop that quickly reverses."]],
    quiz: [
      ["Spoofing is illegal because…", ["The orders are big", "The orders are meant to deceive and be cancelled", "It's done by computers"], 1, "Intent to deceive is the key."],
      ["In a pump and dump, who usually loses?", ["The promoters", "Late buyers", "The exchange"], 1, "They buy at the top."],
      ["Lots of people openly buying a stock they like is…", ["Manipulation", "Legal", "Spoofing"], 1, "No deception, no manipulation."],
    ],
    recap: [["Fake demand", "Pump, spoof, wash."], ["Fake prices", "Benchmark rigging, marking the close."], ["Intent", "Deception is what makes it illegal."]],
    see: ["order-book", "short", "information-edge", "herding"],
  },

  fraud: {
    principle: "Fraud needs three things: <em>pressure, opportunity and a story</em> the fraudster tells themself. It usually ends when the cash runs out.",
    hook: "<p>Wirecard was a German payments star in the DAX index. In June 2020 it admitted that €1.9 billion of cash, a quarter of its balance sheet, probably never existed. Short sellers and the <i>Financial Times</i> had reported problems for years; German regulators had investigated the journalists.</p>",
    parts: [
      { h: "Run a Ponzi (on paper)", sim: ponziSim },
      { h: "The fraud triangle", sim: () => flips([["Pressure", "Missed targets, debts, a share price that must keep rising."], ["Opportunity", "Weak controls, a captured board, a small or conflicted auditor, complexity nobody understands."], ["Rationalisation", "\"It's temporary\", \"everyone does it\", \"I'll pay it back after the next round\"."]]),
        after: "<p>Donald Cressey's model (1950s). Remove any one corner and most frauds don't happen, which is why companies separate duties and rotate auditors.</p>" },
      { h: "Case files", sim: () => stepper([
        { t: "Enron (2001)", html: "<p>Used mark-to-market accounting to book decades of future profit up front, and off-balance-sheet entities to hide debt. Its auditor, Arthur Andersen, shredded documents and collapsed. Led to the Sarbanes-Oxley Act (2002). CEO Jeff Skilling was sentenced to 24 years (later reduced).</p>" },
        { t: "Madoff (2008)", html: "<p>A Ponzi scheme disguised as a steady options strategy. About $65B in fictional balances. Sentenced to 150 years. The court-appointed trustee has since recovered over $14B for victims.</p>" },
        { t: "Wirecard (2020)", html: "<p>Fake revenue from \"third-party acquirers\" in Asia; €1.9B of missing cash. EY, its auditor for a decade, failed to confirm the cash with the banks. Germany overhauled its financial regulator, BaFin.</p>" },
        { t: "Theranos (2018)", html: "<p>A blood-testing startup valued at $9B whose technology didn't work. Founder Elizabeth Holmes was convicted of defrauding investors and sentenced to over 11 years. Big-name board, no experts on it.</p>" },
        { t: "FTX (2022)", html: "<p>A crypto exchange secretly lent customer deposits to its sister trading firm, Alameda. About $8B missing when it collapsed. Sam Bankman-Fried was sentenced to 25 years in 2024.</p>" },
      ]) },
      { h: "Red flags investors use", sim: () => table(["Red flag", "Why it matters"], [["Returns too smooth", "Real strategies have bad months (Madoff)."], ["Profits but no cash", "Earnings rise, operating cash flow doesn't (Wirecard, Enron)."], ["Tiny or unknown auditor", "Madoff's auditor was a three-person firm."], ["Complexity no one can explain", "If it can't be explained, assume it can't be checked."], ["Related-party deals", "Money moving between entities the boss controls (FTX/Alameda)."], ["Hostility to critics", "Suing journalists and short sellers instead of answering."], ["Founder controls the board", "Nobody can say no."]]) },
      { h: "Practise", sim: () => predict({ q: "A company reports rising profits for three years but its operating cash flow is negative and receivables are growing much faster than sales. What's the most likely explanation?", options: ["It's growing fast and healthy", "Revenue may be booked aggressively, or be fake", "Taxes are too high"], answer: 1, why: "<p>Profit without cash is the most common accounting red flag. Sales that never get collected show up as rising receivables. The cash flow statement is harder to fake than the income statement.</p>" }) },
    ],
    job: "<p><b>Forensic accountants</b> (Big Four, specialist firms) investigate frauds. <b>Short sellers</b> (Muddy Waters, Hindenburg) research and publish on suspected fraud, profiting if they're right. Auditors, internal audit and compliance try to prevent it. The SEC's whistleblower programme has paid over $2 billion in awards since 2011.</p>",
    terms: [["Ponzi scheme", "Paying old investors with new investors' money."], ["Fraud triangle", "Pressure, opportunity, rationalisation."], ["Forensic accounting", "Investigating financial records for fraud."], ["Off-balance-sheet entity", "A vehicle that keeps assets or debts off a company's main accounts."], ["Related-party transaction", "A deal between a company and people or firms connected to it."], ["Short-seller report", "Public research arguing a company is overvalued or fraudulent."], ["Whistleblower", "Insider who reports wrongdoing."]],
    quiz: [
      ["A Ponzi scheme collapses when…", ["Returns are too low", "Withdrawals exceed new money", "Auditors visit"], 1, "No real assets to pay out."],
      ["Which statement is hardest to fake?", ["Income statement", "Cash flow statement", "Press release"], 1, "Cash is checkable with banks."],
      ["The three corners of the fraud triangle are…", ["Greed, fear, luck", "Pressure, opportunity, rationalisation", "Debt, equity, cash"], 1, "Cressey's model."],
    ],
    recap: [["Triangle", "Pressure, opportunity, story."], ["Cash", "Profit without cash is the red flag."], ["Too smooth", "Real returns are bumpy."]],
    see: ["cash-flow", "three-link", "information", "grey-zone"],
  },

  "market-power": {
    principle: "Competition pushes profits toward zero. <em>Firms with power find ways to escape it</em>: network effects, lock-in, buying rivals, or rules that keep newcomers out.",
    hook: "<p>In 2012 Facebook paid $1 billion for Instagram, a 13-person company with no revenue. In 2014 it paid $19 billion for WhatsApp. Visionary bets, or buying rivals before they could become threats? The US Federal Trade Commission later sued to undo both. Whether such deals should be allowed is one of the biggest questions in economics today.</p>",
    parts: [
      { h: "Watch a market tip", sim: tipSim },
      { h: "How power is built and kept", sim: () => flips([["Network effects", "Each user makes it more valuable for the next (phones, marketplaces, social networks)."], ["Switching costs", "Data, habits, contracts and integrations make leaving painful."], ["Killer acquisitions", "Buy a small rival to shut it down or absorb it. Studies of pharma found a share of acquired drug projects were discontinued when they overlapped with the buyer's."], ["Bundling and tying", "Use one dominant product to push another (Microsoft bundled Internet Explorer with Windows)."], ["Self-preferencing", "A platform ranks its own products first."], ["Exclusive deals", "Pay partners to shut out rivals (Google paid Apple to be Safari's default search engine)."], ["Regulatory moats", "Licences and compliance costs only incumbents can afford."]]) },
      { h: "Who decides: antitrust", sim: () => table(["Case", "Year", "What happened"], [["Standard Oil", "1911", "Broken into 34 companies"], ["AT&T", "1984", "Split into regional \"Baby Bells\""], ["Microsoft", "2001", "Settled over bundling; avoided breakup"], ["EU vs Google Shopping", "2017 / 2024", "€2.4B fine for self-preferencing, upheld by the EU's top court"], ["EU vs Google Android", "2018", "€4.3B fine (later cut slightly)"], ["US vs Google (search)", "2024", "A federal judge ruled Google an illegal monopolist in search"]]),
        after: "<p>For 40 years US antitrust followed the <b>consumer welfare standard</b>: if prices didn't rise, it was fine. Free products broke that test. The \"New Brandeis\" school argues size and power matter in themselves. The EU's Digital Markets Act (2022) now imposes rules on designated \"gatekeepers\" up front.</p>" },
      { h: "Practise", sim: () => predict({ q: "A dominant app store charges developers 30% and bans them from telling users about cheaper ways to pay. Which concept fits best?", options: ["Perfect competition", "Using market power to block competition (anti-steering)", "Price discrimination only"], answer: 1, why: "<p>\"Anti-steering\" rules have been challenged by regulators and courts on several continents (Epic v. Apple in the US, the EU's DMA, Japan and South Korea's app store laws).</p>" }) },
    ],
    job: "<p><b>Antitrust lawyers</b> and <b>competition economists</b> (Compass Lexecon, CRA, regulators' staff) model market definition and harm in every big merger. Bankers and PE teams must clear deals with regulators. Strategy consultants help firms build moats; investors pay a premium for them; regulators try to keep them from becoming walls.</p>",
    terms: [["Network effect", "A product gets more valuable as more people use it."], ["Switching cost", "The cost of moving to a rival."], ["Killer acquisition", "Buying a startup to eliminate future competition."], ["Antitrust / competition law", "Laws against monopolisation and anti-competitive deals."], ["Consumer welfare standard", "Judging competition by effects on prices and output."], ["Self-preferencing", "A platform favouring its own products."], ["Gatekeeper", "EU term for a dominant digital platform with special obligations."]],
    quiz: [
      ["Strong network effects tend to make markets…", ["Fragmented", "Winner-take-most", "Perfectly competitive"], 1, "Users flock to the biggest network."],
      ["A killer acquisition is mainly worrying because…", ["It's expensive", "It removes a future competitor", "It's always illegal"], 1, "Competition that would have existed is lost."],
      ["Free products were hard for the consumer welfare standard because…", ["They're illegal", "There's no price rise to measure", "They have no users"], 1, "Harm shows up in quality, privacy or innovation instead."],
    ],
    recap: [["Tipping", "Network effects crown early winners."], ["Moats", "Lock-in, bundling, acquisitions, rules."], ["Antitrust", "Decides where moats become walls."]],
    see: ["competition", "frameworks", "who-decides", "pricing"],
  },

  "grey-zone": {
    principle: "Most scandals aren't one big decision. They're <em>many small, rationalised steps</em>, pushed by incentives, where each step was \"technically\" fine or \"what everyone does\".",
    hook: "<p>Enron's 64-page code of ethics was praised. Wells Fargo was famous for its culture. Volkswagen had a compliance department. None of that stopped what happened, because what people are rewarded for beats what's written on the wall. Charlie Munger: \"Show me the incentive and I'll show you the outcome.\"</p>",
    parts: [
      { h: "Play the dilemmas", sim: dilemmas },
      { h: "Legal vs right", sim: () => table(["", "Ethical", "Unethical"], [["<b>Legal</b>", "Most business: do this", "The grey zone: aggressive tax avoidance, dark patterns, exploiting loopholes. Legal today, often illegal tomorrow, and reputationally toxic"], ["<b>Illegal</b>", "Rare: civil disobedience, whistleblowing that breaks confidentiality", "Fraud, bribery, insider trading: prison"]]),
        after: "<p>Insiders know the grey zone is where careers and companies are actually lost: in the newspaper and the court of opinion first, in law later.</p>" },
      { h: "Tests professionals use", sim: () => flips([["Front-page test", "Would you be comfortable if this appeared on the front page, with your name?"], ["Mother test", "Would you explain this decision to your mother?"], ["Reverse test", "Would you accept this if a competitor did it to you?"], ["Incentive check", "Who gains from me agreeing? (Munger)"], ["Paper trail", "If you wouldn't write it down, don't do it."], ["Speak up early", "Problems are cheapest to raise on day one. Know your firm's whistleblower channel and your legal protections."]]) },
      { h: "Principal-agent problems", sim: () => predict({ q: "A fund manager earns 20% of gains but shares none of the losses. Which behaviour does that incentive push toward?", options: ["Less risk", "More risk: heads I win, tails you lose", "No effect"], answer: 1, why: "<p>An <b>asymmetric payoff</b> is a call option on the fund's performance, and options gain from volatility. That's why investors demand high-water marks, clawbacks and managers investing their own money alongside (\"skin in the game\").</p>" }) },
    ],
    job: "<p>Every finance and consulting job has <b>compliance training</b>, codes of conduct and personal trading rules. <b>Ethics and compliance officers</b>, internal audit, risk committees and boards are the formal guardrails. Increasingly, investors judge governance (the G in ESG) and regulators hold senior managers personally accountable (the UK's Senior Managers Regime, 2016).</p>",
    terms: [["Principal-agent problem", "When someone acting for you has different incentives from you."], ["Moral hazard", "Taking more risk because someone else bears the cost."], ["Normalisation of deviance", "Gradually accepting rule-breaking as normal."], ["Whistleblower protection", "Laws protecting those who report wrongdoing."], ["Skin in the game", "Having your own money at stake."], ["Clawback", "Taking back bonuses after misconduct or losses."], ["Governance", "How a company is directed and controlled."]],
    quiz: [
      ["\"Show me the incentive and I'll show you the outcome\" means…", ["People ignore incentives", "Behaviour follows what's rewarded", "Incentives are illegal"], 1, "Munger's rule."],
      ["Moral hazard arises when…", ["Risks are fully priced", "Someone else bears the cost of your risk", "Ethics training is mandatory"], 1, "Bailouts and insurance can create it."],
      ["Most corporate scandals start with…", ["One huge decision", "Small, rationalised steps", "Outsiders"], 1, "Normalisation of deviance."],
    ],
    recap: [["Incentives", "Beat codes of ethics."], ["Grey zone", "Legal today, scandal tomorrow."], ["Tests", "Front page, paper trail, speak early."]],
    see: ["incentives", "fraud", "information", "two-systems"],
  },
};

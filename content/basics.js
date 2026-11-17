// World 1: First principles.
import { h, s, money, num, pct, clamp, rng } from "../lib/core.js";
import { slider, seg, stats, stage, predict, calc, callout, table, bars, button, say, flips } from "../lib/ui.js";
import { plot, curve } from "../lib/chart.js";

const W = "var(--wc)";

/* ---------------- scarcity: an island with ten hours a day ---------------- */
function islandSim() {
  // fish need increasing hours (you fish out the easy spots), coconuts likewise
  const fishFrom = (hrs) => 12 * Math.sqrt(hrs / 10) * 1; // max 12 fish in 10 hours
  const cocoFrom = (hrs) => 20 * Math.sqrt(hrs / 10);
  let hf = 5;
  const p = plot({ height: 300, x: [0, 13], y: [0, 22], xLabel: "fish a day", yLabel: "coconuts a day", xFmt: (v) => num(v), yFmt: (v) => num(v), label: "Production possibilities" });
  const st = stats([{ label: "Hours fishing" }, { label: "Fish" }, { label: "Coconuts" }, { label: "Cost of the next fish" }]);
  const front = Array.from({ length: 101 }, (_, i) => { const t = (i / 100) * 10; return [fishFrom(t), cocoFrom(10 - t)]; });
  const draw = () => {
    const f = fishFrom(hf), c = cocoFrom(10 - hf);
    const f2 = fishFrom(Math.min(10, hf + 0.25)), c2 = cocoFrom(Math.max(0, 10 - hf - 0.25));
    const cost = f2 - f > 1e-6 ? (c - c2) / (f2 - f) : Infinity;
    p.draw({
      series: [{ name: "Everything you could make", color: W, pts: front, area: true }],
      dots: [{ x: f, y: c, color: "#ffc21a", label: "you", r: 8 }, { x: 10.5, y: 18, color: "var(--bad)", label: "want: can't reach", r: 6 }, { x: 4, y: 7, color: "var(--ink-3)", label: "wasteful", r: 6 }],
    });
    st.set(0, `${hf.toFixed(1)} h`); st.set(1, num(f, 1)); st.set(2, num(c, 1)); st.set(3, Number.isFinite(cost) ? `${num(cost, 1)} coconuts` : "∞");
  };
  const sl = slider({ label: "Hours spent fishing (of 10)", min: 0, max: 10, step: 0.25, value: hf, fmt: (v) => `${v} h`, onInput: (v) => { hf = v; draw(); } });
  draw();
  return stage({ title: "Your island · 10 hours a day", controls: [sl], body: [p.el, st.el], note: "The curved line is the <b>production possibilities frontier</b>. Everything under it is possible, everything past it isn't. Slide right: each extra fish costs more coconuts, because you've already caught the easy fish and you're leaving the easy coconuts on the tree." });
}

function auctionSim() {
  const people = [["Ama", 9], ["Bo", 7], ["Cy", 6], ["Di", 4], ["Eli", 3], ["Fen", 2]];
  let stock = 3, price = 1;
  const row = h("div.card-row");
  const st = stats([{ label: "Price" }, { label: "People who still want one" }, { label: "Apples" }]);
  const msg = h("p.muted");
  const draw = () => {
    const want = people.filter(([, v]) => v >= price);
    row.replaceChildren(...people.map(([n, v]) => h("div.mini", { "data-on": v >= price ? "1" : null }, h("h4", n), h("div", `Would pay up to ${money(v)}`), h("div", v >= price ? h("span.pill.up", "still in") : h("span.pill.down", "dropped out")))));
    st.set(0, money(price)); st.set(1, String(want.length), want.length > stock ? "bad" : want.length === stock ? "good" : "warn"); st.set(2, String(stock));
    msg.innerHTML = want.length > stock ? `${want.length} people want ${stock} apples. Someone will be disappointed: raise the price.` : want.length === stock ? `<b>Cleared.</b> At ${money(price)} exactly ${stock} people want the ${stock} apples. Nobody had to queue, fight, or know anyone. The price did the rationing.` : `Too high: apples left over. The seller would drop the price.`;
  };
  const sl = slider({ label: "Price of an apple", min: 1, max: 10, step: 1, value: price, fmt: (v) => money(v), onInput: (v) => { price = v; draw(); } });
  const sk = slider({ label: "Apples available", min: 1, max: 6, value: stock, onInput: (v) => { stock = v; draw(); } });
  draw();
  return stage({ title: "Six people, three apples", controls: [sl, sk], body: [row, st.el, msg] });
}

/* ---------------- opportunity cost ---------------- */
function choiceSim() {
  const opts = [["Take the job", 62000], ["Do a master's", 0], ["Start a company", 30000], ["Travel a year", -12000]];
  let pick = 1;
  const st = stats([{ label: "What you chose is worth" }, { label: "Best thing you gave up" }, { label: "Opportunity cost" }]);
  const box = h("div");
  const draw = () => {
    const best = opts.map((o, i) => [o, i]).filter(([, i]) => i !== pick).sort((a, b) => b[0][1] - a[0][1])[0][0];
    box.replaceChildren(bars(opts.map(([n, v], i) => ({ label: (i === pick ? "★ " : "") + n, value: Math.max(0, v), color: i === pick ? "#ffc21a" : n === best[0] ? "var(--bad)" : "var(--line)" })), { fmt: (v) => money(v) }));
    st.set(0, money(opts[pick][1])); st.set(1, best[0]); st.set(2, money(best[1]), "bad");
  };
  const sg = seg({ label: "This year you will…", options: opts.map(([n], i) => ({ value: i, label: n })), value: pick, onChange: (v) => { pick = v; draw(); } });
  draw();
  return stage({ title: "One year, four ways to spend it", controls: [sg], body: [box, st.el], note: "Money value of each year in cash terms only (salary, profit, cost). Real choices also include fun, learning and risk, but the logic is the same: the cost is the <b>best</b> option you didn't take, not all of them added up." });
}

/* ---------------- incentives: the cobra bounty ---------------- */
function cobraSim() {
  let bounty = 2, months = 24, cancelAt = 18;
  const p = plot({ height: 260, x: [0, 24], y: [0, 6000], xLabel: "month", yLabel: "cobras", xFmt: (v) => Math.round(v), yFmt: (v) => num(v), label: "Cobras in the city" });
  const st = stats([{ label: "Bounties paid" }, { label: "Wild cobras at the end" }, { label: "Did it work?" }]);
  const draw = () => {
    let wild = 2000, B = 0, paid = 0;
    const W1 = [], F1 = [];
    for (let m = 0; m <= months; m++) {
      if (m < cancelAt) {
        const caught = Math.min(wild * 0.04 * bounty, wild * 0.4);
        B += bounty * 60;                 // breeding pays, so more people start farms
        paid += (caught + B * 0.5) * bounty; // hunters and farmers both cash in
        wild = wild - caught + wild * 0.02;
      } else if (B > 0) { wild += B; B = 0; } // worthless now: the farms let them go
      else wild *= 1.02;
      W1.push([m, wild]); F1.push([m, B]);
    }
    p.draw({ y: [0, Math.max(3000, ...W1.map((x) => x[1])) * 1.1], series: [{ name: "Wild cobras", color: "var(--bad)", pts: W1 }, { name: "Farmed (for the bounty)", color: W, pts: F1, dash: "6 5" }], vlines: [{ x: cancelAt, label: "bounty cancelled" }] });
    const end = W1.at(-1)[1];
    st.set(0, money(paid)); st.set(1, num(end)); st.set(2, end < 2000 ? "Yes" : "Backfired", end < 2000 ? "good" : "bad");
  };
  const a = slider({ label: "Bounty per dead cobra", min: 0, max: 5, step: 0.5, value: bounty, fmt: (v) => `${v} rupees`, onInput: (v) => { bounty = v; draw(); } });
  const b = slider({ label: "Cancel the bounty in month", min: 4, max: 24, value: cancelAt, onInput: (v) => { cancelAt = v; draw(); } });
  draw();
  return stage({ title: "The cobra effect", controls: [a, b], body: [p.el, st.el], note: "A stylised version of the colonial-Delhi story. The policy pays for <i>dead cobras</i>, not for <i>fewer cobras</i>. Those sound the same until someone works out that breeding is cheaper than hunting." });
}

/* ---------------- the margin: pizza ---------------- */
function pizzaSim() {
  const mb = [9, 7, 5, 3.5, 2, 1, 0.3, -1]; // value of each extra slice to you
  let price = 3, n = 3;
  const p = plot({ height: 260, x: [0.5, 8.5], y: [-2, 10], xLabel: "slice number", yLabel: "$ per slice", xFmt: (v) => Math.round(v), yFmt: (v) => money(v), xTicks: 8, label: "Marginal benefit and price" });
  const st = stats([{ label: "Slices you buy" }, { label: "Total joy (in $)" }, { label: "Spent" }, { label: "Net gain" }]);
  const draw = () => {
    const best = mb.filter((v) => v >= price).length;
    const joy = mb.slice(0, n).reduce((a, b) => a + b, 0), spent = n * price;
    p.draw({
      series: [{ name: "What the next slice is worth to you", color: W, pts: mb.map((v, i) => [i + 1, v]) }, { name: "Price of a slice", color: "var(--ink)", pts: [[0.5, price], [8.5, price]], dash: "6 5" }],
      dots: mb.map((v, i) => ({ x: i + 1, y: v, r: 7, color: i < n ? (v >= price ? "var(--up)" : "var(--down)") : "var(--surface)" })),
      vlines: [{ x: best + 0.5, label: `best: stop after ${best}` }],
    });
    st.set(0, String(n)); st.set(1, money(joy)); st.set(2, money(spent)); st.set(3, money(joy - spent), n === best ? "good" : "warn");
  };
  const a = slider({ label: "Price per slice", min: 0.5, max: 8, step: 0.5, value: price, fmt: (v) => money(v), onInput: (v) => { price = v; draw(); } });
  const b = slider({ label: "Slices you buy", min: 0, max: 8, value: n, onInput: (v) => { n = v; draw(); } });
  draw();
  return stage({ title: "One more slice?", controls: [a, b], body: [p.el, st.el], note: "Green dots are slices worth more than they cost, red ones are slices you regret. Net gain peaks exactly where the next slice is worth less than the price. That's the whole of marginal thinking." });
}

/* ---------------- trade: comparative advantage ---------------- */
function tradeSim() {
  // output per hour: [bread, shirts]
  let a = [6, 3], b = [2, 2], trade = true;
  const st = stats([{ label: "Ana gives up per shirt" }, { label: "Ben gives up per shirt" }, { label: "Total bread" }, { label: "Total shirts" }]);
  const out = h("div");
  const H = 8;
  const draw = () => {
    const ocA = a[0] / a[1], ocB = b[0] / b[1];
    // without trade: each splits time half and half
    const self = { bread: (a[0] + b[0]) * H / 2, shirt: (a[1] + b[1]) * H / 2 };
    // with trade: whoever has the lower opportunity cost of shirts makes shirts until shirts match the self-sufficient total, other makes bread
    let bread, shirt;
    const shirtMaker = ocA < ocB ? a : b, breadMaker = ocA < ocB ? b : a;
    const need = self.shirt;
    const hShirt = Math.min(H, need / shirtMaker[1]);
    shirt = hShirt * shirtMaker[1] + Math.max(0, need - hShirt * shirtMaker[1]);
    const breadHrsLeftMaker = H - hShirt;
    let extraShirtHrs = Math.max(0, (need - hShirt * shirtMaker[1]) / breadMaker[1]);
    bread = breadMaker[0] * (H - extraShirtHrs) + shirtMaker[0] * breadHrsLeftMaker;
    if (Math.abs(ocA - ocB) < 1e-9) bread = self.bread;
    const res = trade ? { bread, shirt } : self;
    st.set(0, `${num(ocA, 2)} bread`); st.set(1, `${num(ocB, 2)} bread`); st.set(2, num(res.bread), trade && res.bread > self.bread + 0.01 ? "good" : ""); st.set(3, num(res.shirt));
    out.replaceChildren(
      bars([{ label: "Bread, each makes their own", value: self.bread, color: "var(--line)" }, { label: "Bread, specialise and trade", value: bread, color: W }], { fmt: (v) => num(v) }),
      h("p.muted", { html: Math.abs(ocA - ocB) < 1e-9 ? "Same opportunity costs: no gain from trade. Specialisation only pays when people are <i>differently</i> good at things." : `<b>${ocA < ocB ? "Ana" : "Ben"}</b> gives up less bread per shirt, so ${ocA < ocB ? "she" : "he"} should make shirts${shirtMaker[0] <= breadMaker[0] && shirtMaker[1] <= breadMaker[1] ? `, even though ${ocA < ocB ? "she's" : "he's"} no better at making them` : ""}. Same shirts, <b>${num(bread - self.bread)} more bread</b> for the pair.` }));
  };
  const s1 = slider({ label: "Ana: bread per hour", min: 1, max: 10, value: a[0], onInput: (v) => { a[0] = v; draw(); } });
  const s2 = slider({ label: "Ana: shirts per hour", min: 1, max: 10, value: a[1], onInput: (v) => { a[1] = v; draw(); } });
  const s3 = slider({ label: "Ben: bread per hour", min: 1, max: 10, value: b[0], onInput: (v) => { b[0] = v; draw(); } });
  const s4 = slider({ label: "Ben: shirts per hour", min: 1, max: 10, value: b[1], onInput: (v) => { b[1] = v; draw(); } });
  const tg = seg({ label: "Arrangement", options: [{ value: false, label: "Each on their own" }, { value: true, label: "Specialise & trade" }], value: trade, onChange: (v) => { trade = v; draw(); } });
  draw();
  return stage({ title: "Ana and Ben, 8 hours each", controls: [s1, s2, s3, s4, tg], body: [st.el, out], note: "Ana starts better at both. Trade still helps, because what matters is the <b>opportunity cost</b>: what each person gives up to make one more shirt." });
}

export default {
  scarcity: {
    principle: "There is never enough of everything for everyone. So every society needs a way to decide <em>who gets what</em>.",
    hook: "<p>Every question in economics, from the price of coffee to why central banks raise rates, starts in the same place. People want more than there is. Time, land, oil, attention, apples: all <em>scarce</em>. Scarcity forces choices, and choices are what economics studies.</p>",
    parts: [
      { h: "Ten hours on an island", html: "<p>You're alone on an island with ten hours a day. You can fish or climb for coconuts. Every hour spent on one is an hour not spent on the other. Drag the slider and watch where you land.</p>", sim: islandSim,
        after: "<p>Three things to see. First, the frontier is a hard limit: wanting more doesn't move it. Second, a point inside it is waste, you could have more of both. Third, the frontier bows outwards, so the more you specialise in one thing, the more each extra unit costs. That's called <em>increasing opportunity cost</em>, and it's why countries and companies rarely go all-in on one thing.</p>" },
      { h: "So who gets the apples?", html: "<p>Scarcity means someone goes without. Every society picks a rule: first come first served (queues), lottery, force, a planner's decision, or a <em>price</em>. Here six people want three apples. Raise the price until it clears.</p>", sim: auctionSim,
        after: "<p>The price did something remarkable: it found the three people who value apples most, without anyone needing to know anyone. That's the core magic of markets, and also their core criticism: Fen might value an apple just as much but simply have less money. <em>Willingness to pay</em> mixes how much you want something with how much you have.</p>" },
      { h: "Growth moves the frontier", html: "<p>The only way to get more of everything is to push the frontier out: better tools, more skills, new ideas. A fishing net doubles your fish without costing coconuts. This is economic growth, and it's why people today are richer than kings were 300 years ago, even though they still face scarcity.</p>",
        sim: () => predict({ q: "You invent a net that doubles fish per hour. What happens to the cost of a coconut, measured in fish?", options: ["It falls", "It rises", "It stays the same"], answer: 1, why: "<p>Each hour now makes twice as many fish, so an hour spent on coconuts gives up twice as many fish. Coconuts got more expensive <em>in fish</em>, even though nothing about coconuts changed. Prices are always relative.</p>" }) },
    ],
    job: "<p>Consultants call scarcity <b>resource allocation</b>, and it's most of the job. A client has a budget, a team and twelve months. Every project they fund is a project they can't. The production frontier is the picture behind every portfolio review, capacity plan and \"we can't do everything\" slide.</p><p>Investors think in scarcity too: scarce assets (prime land, a patent, a brand, a licence) are worth more because nobody can make more of them.</p>",
    terms: [["Scarcity", "Wants exceed what can be produced, so choices must be made."], ["Production possibilities frontier", "The edge of everything an economy can make with what it has."], ["Willingness to pay", "The most someone would pay for something. Mixes desire and means."], ["Rationing", "Any rule for deciding who gets a scarce thing: price, queue, lottery, plan."], ["Economic growth", "Pushing the frontier outwards: more of everything from the same people."]],
    quiz: [
      ["A point <i>inside</i> the production frontier means…", ["The economy is using everything efficiently", "Resources are being wasted: more of both is possible", "The point is impossible to reach"], 1, "Inside the frontier, you could make more of one thing without giving up any of the other: idle workers, broken machines, bad organisation."],
      ["Why does the frontier usually bow outwards?", ["Because of inflation", "Resources aren't equally good at everything, so each extra unit of one good costs more of the other", "Because people want more of everything"], 1, "You use the most suitable resources first. The last hours of fishing are the least productive, so each extra fish costs more coconuts."],
      ["In a market, the price of something scarce does what?", ["Makes it less scarce", "Rations it towards people willing to pay the most", "Guarantees it goes to whoever needs it most"], 1, "Price rations by willingness to pay. That's efficient in one sense, but willingness depends on wealth too, which is why rationing is also a moral question."],
    ],
    recap: [["∞ vs finite", "Wants are endless; stuff isn't. Every choice follows from that."], ["Frontier", "The edge of what's possible. Waste lives inside it."], ["Price", "One way to ration: it finds who values it most, given what they can pay."]],
    see: ["opportunity", "supply-demand", "growth"],
  },

  opportunity: {
    principle: "The true cost of anything is <em>the best thing you gave up</em> to get it.",
    hook: "<p>A \"free\" concert ticket isn't free if you could have spent that evening working a $200 shift. Opportunity cost is the most-used idea in economics and the most-ignored idea in daily life, because the thing you gave up is invisible. Nobody sends you a bill for the road not taken.</p>",
    parts: [
      { h: "Four ways to spend a year", html: "<p>Pick what you'll do with the next year. The opportunity cost isn't all the other options added up: you could only have done one of them. It's the value of the <em>best one</em> you didn't pick.</p>", sim: choiceSim },
      { h: "The real price of a degree", html: "<p>A one-year master's has tuition of $30,000. You'd otherwise work a job paying $55,000 after tax. Living costs ($18,000) you pay either way.</p>",
        sim: () => calc({ q: "What's the true economic cost of the year of study, in dollars?", answer: 85000, tol: 0.001, unit: "$", hint: "Count tuition and what you give up by not working. Skip anything you'd pay anyway.", why: "<p>$30,000 tuition + $55,000 of wages you don't earn = <b>$85,000</b>. Rent and food don't count: you'd pay them in both worlds. Accountants would say the degree cost $30k; economists say $85k. Both are right about different questions.</p>" }),
        after: "<p>This is the split between <em>explicit costs</em> (money that leaves your pocket) and <em>implicit costs</em> (value you give up). Company accounts show only explicit costs, which is why a business can be \"profitable\" on paper while its owners would be richer doing something else. That gap is called <em>economic profit</em> versus accounting profit.</p>" },
      { h: "Where opportunity cost hides", html: "<ul><li><b>Cash on the balance sheet</b>: a company holding $10B earning 0% gives up whatever that money could earn elsewhere.</li><li><b>Your time</b>: three hours driving to save $40 on a TV costs more if your time is worth $25 an hour.</li><li><b>Inventory and empty seats</b>: a warehouse full of stock ties up cash; an empty flight seat earns nothing forever once the plane leaves.</li><li><b>Attention</b>: a CEO's afternoon on a small deal is an afternoon off the big one.</li></ul>",
        sim: () => predict({ q: "A company owns its office building outright, so it pays no rent. Is the office free?", options: ["Yes, nothing leaves the bank", "No: it could rent the building out to someone else", "Only if the building is paid off"], answer: 1, why: "<p>The building could earn rent from someone else, or be sold and the cash invested. That forgone rent is the real cost of using it. Owned assets have <em>opportunity costs</em> even with no bills attached.</p>" }) },
    ],
    job: "<p>In consulting and banking, opportunity cost shows up as the <b>hurdle rate</b>: a project must beat the return the money could earn elsewhere, or it destroys value even if it makes a profit. In private equity, a fund compares every deal against the next-best deal in the pipeline. When you hear \"what's the alternative?\" in a meeting, someone is asking about opportunity cost.</p>",
    terms: [["Opportunity cost", "The value of the best alternative you gave up."], ["Explicit cost", "Money that actually leaves your pocket."], ["Implicit cost", "Value you give up without paying anything: time, forgone income."], ["Economic profit", "Revenue minus explicit <i>and</i> implicit costs. Below zero means you'd do better elsewhere."], ["Hurdle rate", "The minimum return a project must beat to be worth doing."]],
    quiz: [
      ["You can work a shift ($120), go to a game (worth $90 to you) or nap (worth $40). You pick the game. What's the opportunity cost?", ["$160 (shift + nap)", "$120 (the shift)", "$40 (the nap)"], 1, "Only the best forgone option counts. You couldn't have done both the shift and the nap in the same time."],
      ["A firm earns $100k accounting profit. The owner could earn $130k working elsewhere. Economic profit is…", ["$100k", "$230k", "−$30k"], 2, "Economic profit subtracts implicit costs too: $100k − $130k = −$30k. On paper it's profitable; in reality the owner is losing by staying."],
      ["Which is NOT an opportunity cost of holding lots of cash?", ["Interest you could earn by investing it", "Projects you could fund with it", "The bank's account fee"], 2, "A fee is an explicit cost: money actually paid. The others are forgone value."],
    ],
    recap: [["Best forgone", "Cost = the best option you gave up, not all of them."], ["$85k", "A $30k degree really costs tuition plus lost wages."], ["Hurdle", "In finance, opportunity cost becomes the minimum return to beat."]],
    see: ["scarcity", "margin", "npv", "wacc", "mental-accounting"],
  },

  incentives: {
    principle: "People respond to incentives. <em>Design the reward, and you design the behaviour</em>, including behaviour you didn't intend.",
    hook: "<p>Pay people per line of code and you get long code. Pay sales teams on revenue and you get discounts that destroy margin. Ban something people want and you get a black market. Incentives are the plumbing behind every policy, contract and pay plan, and the most common mistake is assuming people will do what you <em>meant</em> instead of what you <em>paid for</em>.</p>",
    parts: [
      { h: "Pay for dead cobras", html: "<p>A city has too many cobras, so it pays a bounty for each dead one. At first it works. Then people start breeding cobras to collect the bounty. When the city cancels the program, the breeders release the now-worthless snakes.</p>", sim: cobraSim,
        after: "<p>This is called a <em>perverse incentive</em>, and its cousin is <em>Goodhart's law</em>: \"when a measure becomes a target, it ceases to be a good measure.\" Hospitals judged on wait times have reclassified patients. Schools judged on test scores teach to the test. Banks paid on loan volume made loans that blew up in 2008.</p>" },
      { h: "Carrots, sticks, and the hidden ones", html: "<p>Incentives come in three flavours:</p><ul><li><b>Financial</b>: prices, wages, bonuses, fines, taxes.</li><li><b>Social</b>: status, shame, reputation, belonging.</li><li><b>Moral</b>: what feels right.</li></ul><p>They can fight each other. In a famous study, a nursery started fining parents who picked up kids late. Late pickups went <em>up</em>: the fine turned a moral obligation (\"don't make the teachers wait\") into a price (\"$3 to be late, fair enough\").</p>",
        sim: () => predict({ q: "A government wants fewer people to smoke. Which change gives smokers the strongest incentive to quit?", options: ["A tax that raises the price of a pack by 50%", "A poster campaign", "Banning advertising for cigarettes"], answer: 0, why: "<p>All three help, but the price is the most reliable lever: studies across many countries find a 10% price rise cuts smoking by roughly 3-5%, more among young people, who have less money. How much people respond to price is called <em>elasticity</em>, the next world's topic.</p>" }) },
      { h: "Read any deal through incentives", html: "<p>Before trusting any advice, ask: <b>how is this person paid?</b></p>",
        sim: () => table(["Who", "Is paid by…", "So they lean towards…"], [["Estate agent", "a % of the sale price", "selling fast, not holding out for a slightly higher price (an extra $10k earns them ~$300)"], ["Financial adviser on commission", "fees on products sold", "products with high fees"], ["CEO with stock options", "the share price going up", "risk-taking and short-term price boosts"], ["PE fund manager", "20% of profits above a hurdle", "using debt to amplify returns"], ["Credit rating agency (pre-2008)", "the issuers of the bonds it rated", "generous ratings"]]) },
    ],
    job: "<p>Consultants design incentive schemes (sales comp, KPIs, bonus pools) and the first question in any org problem is \"what are people rewarded for?\" In private equity, aligning management with owners is the game: managers get <b>equity</b> (a management incentive plan) so they think like owners. In banking, regulators cap and delay bonuses (<i>clawbacks</i>, <i>deferral</i>) because of what short-term pay did before 2008.</p>",
    terms: [["Incentive", "Anything that changes the payoff of a choice: money, status, guilt."], ["Perverse incentive", "A reward that causes the opposite of what was intended."], ["Goodhart's law", "When a measure becomes a target, it stops measuring what you wanted."], ["Principal-agent problem", "When the person acting (agent) has different goals from the person they act for (principal)."], ["Clawback", "A clause that takes back bonuses if results later turn out bad."]],
    quiz: [
      ["A company pays support agents per ticket closed. What's the likely side effect?", ["Better answers", "Tickets closed quickly without solving the problem", "Fewer tickets"], 1, "They're paid for closing, not solving. Expect quick closes and re-opened tickets: Goodhart's law in action."],
      ["The nursery fine for late pickups increased lateness because…", ["The fine was too high", "It replaced a moral reason with a cheap price", "Parents didn't know about it"], 1, "A small fine turned guilt into a fee. Social and moral incentives can be stronger than small financial ones, and money can crowd them out."],
      ["Why do PE firms give company managers equity?", ["It's cheaper than salary", "So managers' rewards rise and fall with the owners'", "Regulation requires it"], 1, "Equity aligns the agent (manager) with the principal (owner). It's a direct fix for the principal-agent problem."],
    ],
    recap: [["What you pay for", "You get what you reward, not what you meant."], ["Goodhart", "Targets corrupt measures."], ["Ask", "How is this person paid? Then read their advice."]],
    see: ["information", "game-theory", "nudges", "pe-fund"],
  },

  margin: {
    principle: "Good decisions are about the <em>next</em> unit: compare the extra benefit with the extra cost, and ignore what's already spent.",
    hook: "<p>Should an airline sell an empty seat for $80 when the average cost per seat is $200? Yes, if flying one more passenger only costs $15 in snacks and fuel. The average is the wrong number. The <em>marginal</em> cost, what one more unit adds, is the right one. Almost every sharp business decision is a marginal one.</p>",
    parts: [
      { h: "One more slice?", html: "<p>Each slice of pizza is worth a bit less to you than the one before: the first is heaven, the eighth is regret. This is <em>diminishing marginal benefit</em>. Set the price, then choose how many to buy.</p>", sim: pizzaSim },
      { h: "Average versus marginal", html: "<p>A factory has fixed costs of $1,000 a day and each extra widget costs $4 in materials. Making 100 widgets, the <b>average</b> cost is $14. A customer offers $9 each for 50 extra widgets, and you have spare capacity.</p>",
        sim: () => predict({ q: "Should you take the order?", options: ["No: $9 is below the $14 average cost", "Yes: each widget adds $4 of cost and $9 of revenue", "Only if they buy 100"], answer: 1, why: "<p>The fixed $1,000 is paid either way. Each extra widget costs $4 and brings in $9: <b>$5 profit each, $250 on the order</b>. Using average cost here loses money. (The catch: don't let your regular customers find out, or they'll want $9 too. That's price discrimination, coming in the pricing lesson.)</p>" }) },
      { h: "Sunk costs don't count", html: "<p>Money already spent and unrecoverable is a <em>sunk cost</em>. It shouldn't affect the next decision, because no choice you make now brings it back. You've paid $60 for a concert, then feel ill. The only question is: would you rather be at the concert or at home <i>right now</i>? The $60 is gone either way.</p><p>Humans find this very hard. Companies keep funding failing projects because \"we've already put $50M in\". That's the <em>sunk cost fallacy</em>, and you'll meet it again in the psychology world.</p>",
        sim: () => flips([["Marginal cost", "What one more unit adds to total cost."], ["Marginal benefit", "What one more unit adds to total benefit."], ["The rule", "Keep going while marginal benefit ≥ marginal cost."], ["Sunk cost", "Already spent, can't get back. Ignore it."]]) },
    ],
    job: "<p>\"What's the incremental impact?\" is the marginal question, and you'll hear it in every finance meeting. In valuation you only count <b>incremental cash flows</b> of a project. In pricing, marginal cost sets the floor for any special deal. Airlines, hotels and software firms, with high fixed costs and tiny marginal costs, live and die by this logic: that's why they discount aggressively and run <i>yield management</i>.</p>",
    terms: [["Marginal", "The extra amount from one more unit."], ["Diminishing marginal benefit", "Each extra unit of something is worth a bit less than the last."], ["Fixed cost", "A cost that doesn't change with how much you make (rent, salaries)."], ["Variable cost", "A cost that grows with each unit (materials, shipping)."], ["Sunk cost", "Money already spent that can't be recovered. Irrelevant to the next decision."], ["Incremental", "Finance word for marginal: what changes because of this decision."]],
    quiz: [
      ["You'll keep buying slices as long as…", ["The total benefit is positive", "The next slice is worth at least its price", "The average slice is worth the price"], 1, "The marginal rule: compare the next unit's benefit to its cost."],
      ["A software company's marginal cost of one more user is nearly zero. What does that imply?", ["It can never be profitable", "Any price above zero covers the extra user, so discounts can make sense", "It should charge the average cost"], 1, "Once fixed costs are paid, each extra customer is almost pure profit. That's why software has huge margins at scale and loves freemium."],
      ["A project has cost $50M and needs $20M more. Finished, it's worth $15M. You should…", ["Finish it: $50M is already invested", "Stop: spend $20M to get $15M loses $5M", "Finish it if the $50M was borrowed"], 1, "The $50M is sunk. The marginal decision is $20M for $15M: a loss. Walk away."],
    ],
    recap: [["Next unit", "Compare marginal benefit with marginal cost."], ["$4 not $14", "Marginal cost, not average, decides special orders."], ["Sunk", "What's gone is gone. Don't let it steer."]],
    see: ["opportunity", "breakeven", "mental-accounting", "npv"],
  },

  trade: {
    principle: "Trade makes both sides richer whenever they're <em>differently</em> good at things, even if one is better at everything.",
    hook: "<p>Why doesn't a top lawyer type her own letters, even if she types faster than her assistant? Because every hour she types is an hour she isn't billing $500. The assistant is <em>comparatively</em> better at typing: he gives up less to do it. This idea, from David Ricardo in 1817, explains why countries trade, why firms outsource and why you don't grow your own food.</p>",
    parts: [
      { h: "Ana and Ben", html: "<p>Ana and Ben each work 8 hours making bread and shirts. Ana is better at both. Set their skills and compare going it alone with specialising.</p>", sim: tradeSim,
        after: "<p><b>Absolute advantage</b> is being better at something. <b>Comparative advantage</b> is giving up less to do it. You always have a comparative advantage in something, even if you're worse at everything, because your opportunity costs differ from other people's. That's why trade isn't a zero-sum game: the pie grows.</p>" },
      { h: "Who decides the deal?", html: "<p>For trade to work, the price must fall between the two people's opportunity costs. If Ana gives up 2 bread per shirt and Ben gives up 1, any price between 1 and 2 bread per shirt makes both better off. Where exactly it lands depends on bargaining power, which is a fight about <em>splitting</em> the gains, not about whether they exist.</p>",
        sim: () => calc({ q: "Ana gives up 2 bread per shirt she makes; Ben gives up 1 bread per shirt. Ben makes shirts and sells them to Ana. What's the <b>highest</b> price in bread per shirt Ana would accept?", answer: 2, tol: 0.001, unit: "bread", why: "<p>Ana can make a shirt herself for 2 bread. She'll never pay more than 2. Ben won't sell below 1. Any price from 1 to 2 helps both.</p>" }) },
      { h: "Trade has losers too", html: "<p>Comparative advantage says a country gains <i>overall</i>. It doesn't say everyone gains. When a country imports cheaper steel, steel buyers win and steelworkers lose. The winners gain more than the losers lose, in theory enough to compensate them, but in practice the compensation often doesn't happen. That gap explains a lot of politics, from tariffs to Brexit. You'll see the numbers in the trade world.</p>",
        sim: () => callout("real", "In the real world", "<p>The iPhone is designed in California, uses chips from Taiwan, a camera from Japan, glass from Kentucky, and is assembled in China and India. No single country could make it as cheaply. Each step goes to whoever has the comparative advantage in it.</p>") },
    ],
    job: "<p>Every <b>make-or-buy</b> and <b>outsourcing</b> decision is comparative advantage: should we run our own warehouses or pay a logistics firm? Consultants do this analysis constantly. In investing, globalisation and supply chains (who makes what, where) drive which companies win. And career advice in finance is comparative advantage too: focus where your edge over others is biggest.</p>",
    terms: [["Absolute advantage", "Producing more of something with the same resources."], ["Comparative advantage", "Producing something at a lower opportunity cost than others."], ["Specialisation", "Focusing on what you have a comparative advantage in."], ["Gains from trade", "The extra total output when people specialise and swap."], ["Terms of trade", "The rate at which one good swaps for another."]],
    quiz: [
      ["Ana makes 6 bread or 3 shirts an hour. Ben makes 2 bread or 2 shirts. Who has the comparative advantage in shirts?", ["Ana, she makes more shirts", "Ben: a shirt costs him 1 bread, it costs Ana 2", "Neither"], 1, "Compare opportunity costs, not output. Ana gives up 2 bread per shirt, Ben only 1."],
      ["If two people have exactly the same opportunity costs…", ["Trade still helps", "There are no gains from specialising and trading", "The richer one gains"], 1, "Gains from trade come from <i>differences</i> in opportunity cost."],
      ["Free trade makes a country richer overall. Does everyone gain?", ["Yes, always", "No: some industries and workers lose, even if total gains are larger", "No: nobody gains"], 1, "The total pie grows, but it's not shared evenly. That's the real debate about trade."],
    ],
    recap: [["Comparative", "What matters is what you give up, not raw skill."], ["Win-win", "Trade grows the pie when costs differ."], ["Not everyone", "Gains are total, not universal."]],
    see: ["opportunity", "trade-macro", "fx", "growth"],
  },
};

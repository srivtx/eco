// The home page: hero, paths and the world map.
import { h, store, done } from "./core.js";
import { WORLDS, ALL, byId, lessonUrl } from "./catalog.js";
import { topbar } from "./topbar.js";
import { penny, oink, icon } from "./pixel.js";

topbar("home");
const main = document.getElementById("main");

export const PATHS = [
  { id: "consultant", name: "Think like a consultant", who: "Case interviews, strategy, client work", color: "#0891b2", icon: "toolkit",
    ids: ["opportunity", "margin", "supply-demand", "elasticity", "competition", "mece", "sizing", "unit-economics", "frameworks", "pricing", "breakeven", "income-statement", "ratios", "case"] },
  { id: "pe", name: "Break into PE & banking", who: "Accounting, valuation, LBOs, deals", color: "#c2853a", icon: "private",
    ids: ["compound", "pv", "npv", "income-statement", "balance-sheet", "cash-flow", "three-link", "ev", "multiples", "wacc", "dcf", "capital-structure", "mna", "ib", "pe-fund", "lbo", "pe-returns", "cap-table"] },
  { id: "investor", name: "Invest without getting fooled", who: "Markets, risk, and your own brain", color: "#22c55e", icon: "stocks",
    ids: ["compound", "risk", "diversify", "personal", "shares", "order-book", "indices", "efficient", "capm", "bond-basics", "options", "prospect", "herding", "bubbles"] },
  { id: "news", name: "Understand the news", who: "Rates, inflation, recessions, crises", color: "#3b82f6", icon: "macro",
    ids: ["what-money", "banks", "central-bank", "inflation", "gdp", "jobs", "cycle", "fiscal", "trade-macro", "fx", "yield-curve", "bank-run", "crisis-2008"] },
  { id: "psych", name: "The psychology of money", who: "Why smart people do dumb things with money", color: "#d946ef", icon: "mind",
    ids: ["incentives", "two-systems", "prospect", "anchoring", "mental-accounting", "present-bias", "herding", "nudges", "persuasion", "negotiation", "information", "game-theory"] },
];

const nDone = ALL.filter((l) => done(l.id)).length;
const last = byId[store.get("last")];
const firstOpen = ALL.find((l) => !done(l.id)) || ALL[0];

const hero = h("section.hero",
  h("div.hero-t",
    h("div.eyebrow", "A course you can play with"),
    h("h1", "How money ", h("span.hl", "really"), " works."),
    h("p.hero-p", "Economics, markets, banks, bonds, private equity and the psychology behind every price, built up from first principles. ", h("b", `${ALL.length} lessons`), ", every one with things to drag, guess and break."),
    h("div.hero-cta",
      h("a.btn.big.primary", { href: lessonUrl((last && !done(last.id) ? last : firstOpen).id), style: { "--wc": "#6d4aff" } }, nDone ? `Continue: ${(last && !done(last.id) ? last : firstOpen).title}` : "Start at the very beginning"),
      h("a.btn.big", { href: "#map" }, "See the whole map")),
    h("div.hero-stats",
      h("div", h("b", WORLDS.length), h("span", "worlds")),
      h("div", h("b", ALL.length), h("span", "lessons")),
      h("div", h("b", nDone), h("span", "finished")))),
  h("div.hero-art", { "aria-hidden": "true" },
    h("div.ha-sky", WORLDS.map((w, i) => h("span.ha-ic", { style: { "--i": i, "--wc": w.color, left: `${(i * 37) % 88 + 3}%`, top: `${(i * 53) % 70 + 4}%` }, html: icon(w.icon, w.color) }))),
    h("div.ha-p", { html: penny("happy") }),
    h("div.ha-o", { html: oink("happy") }),
    h("div.ha-bub", "Every price is a story about what people want and what's scarce."),
    h("div.ha-ground")));

const paths = h("section.paths",
  h("div.sec-h", h("div", h("div.eyebrow", "Not sure where to start?"), h("h2", "Pick a path")), h("p.muted", "Each path cuts across worlds in the order a pro would learn it.")),
  h("div.path-g", PATHS.map((p) => {
    const n = p.ids.filter(done).length, nxt = p.ids.find((x) => !done(x)) || p.ids[0];
    return h("a.path", { href: lessonUrl(nxt), style: { "--wc": p.color } },
      h("span.path-i", { html: icon(p.icon, p.color) }),
      h("b", p.name), h("small", p.who),
      h("div.path-bar", h("i", { style: { width: `${(100 * n) / p.ids.length}%` } })),
      h("span.path-n", `${n}/${p.ids.length} · ${n ? "keep going" : "start"} →`));
  })));

const map = h("section.map#map",
  h("div.sec-h", h("div", h("div.eyebrow", "The whole map"), h("h2", `${WORLDS.length} worlds, from scarcity to 2008`)), h("p.muted", "Read in order for the full story, or jump to whatever you need. Each world assumes the ones before it.")),
  h("div.world-g", WORLDS.map((w, wi) => {
    const n = w.lessons.filter(([id]) => done(id)).length;
    return h("article.world", { id: w.id, style: { "--wc": w.color } },
      h("header.w-h", h("span.w-i", { html: icon(w.icon, w.color) }), h("div", h("small", `World ${wi + 1}`), h("h3", w.name), h("p", w.tag)), h("span.w-n", `${n}/${w.lessons.length}`)),
      h("div.w-bar", h("i", { style: { width: `${(100 * n) / w.lessons.length}%` } })),
      h("ol.w-l", w.lessons.map(([id, t, b]) => h("li", { "data-done": done(id) ? "1" : null }, h("a", { href: lessonUrl(id), title: b }, t)))));
  })));

main.replaceChildren(hero, paths, map);
if (location.hash) document.querySelector(location.hash)?.scrollIntoView();

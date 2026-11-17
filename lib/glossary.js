// Glossary: every term from every lesson, A to Z, searchable and filterable by world.
import { h } from "./core.js";
import { WORLDS, lessonUrl } from "./catalog.js";
import { topbar } from "./topbar.js";
import { icon, penny } from "./pixel.js";
import { loadAll, plain } from "./data.js";

topbar("glossary");
const main = document.getElementById("main");
const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

loadAll().then((all) => {
  // merge duplicates: one card per term, every lesson that defines it
  const map = new Map();
  for (const { meta, L } of all) for (const [t, d] of L.terms || []) {
    const k = t.toLowerCase();
    if (!map.has(k)) map.set(k, { t, d, where: [] });
    map.get(k).where.push(meta);
  }
  const letterOf = (t) => { const c = t.replace(/^[^a-z0-9]+/i, "")[0]?.toUpperCase() || "#"; return /[A-Z]/.test(c) ? c : "#"; };
  const bare = (t) => t.replace(/^[^a-z0-9]+/i, "");
  const terms = [...map.values()].sort((a, b) => { const la = letterOf(a.t), lb = letterOf(b.t); return la === lb ? bare(a.t).localeCompare(bare(b.t), "en", { sensitivity: "base" }) : la === "#" ? -1 : lb === "#" ? 1 : la.localeCompare(lb); });

  let q = "", world = "";
  const input = h("input.g-search", { type: "search", placeholder: `Search ${terms.length} terms…`, "aria-label": "Search the glossary", oninput: (e) => { q = e.target.value.trim().toLowerCase(); draw(); } });
  const chips = h("div.g-worlds", [{ id: "", name: "All worlds", color: "var(--ink)" }, ...WORLDS].map((w) => h("button.g-w", { type: "button", "aria-pressed": String(w.id === world), style: { "--cc": w.color }, onclick: () => { world = w.id; [...chips.children].forEach((b, i) => b.setAttribute("aria-pressed", String((i ? WORLDS[i - 1].id : "") === world))); draw(); } }, w.id ? h("span", { html: icon(w.icon, w.color) }) : null, w.name)));
  const az = h("nav.g-az", { "aria-label": "Jump to letter" });
  const list = h("div.g-list"), count = h("p.muted.g-count");

  const card = (x) => h("article.g-card", { id: `g-${slug(x.t)}`, style: { "--cc": x.where[0].world.color } },
    h("h3", x.t), h("p", { html: x.d }),
    h("div.g-where", x.where.map((m) => h("a", { href: `${lessonUrl(m.id)}#t-${slug(x.t)}`, style: { "--cc": m.world.color } }, h("i"), m.title))));

  function draw() {
    const hits = terms.filter((x) => (!world || x.where.some((m) => m.world.id === world)) && (!q || x.t.toLowerCase().includes(q) || plain(x.d).toLowerCase().includes(q)));
    const groups = new Map();
    for (const x of hits) { const L = letterOf(x.t); if (!groups.has(L)) groups.set(L, []); groups.get(L).push(x); }
    list.replaceChildren(...(hits.length ? [...groups].map(([L, xs]) => h("section.g-sec", { id: `L-${L}` }, h("h2.g-letter", h("span", L), h("small", `${xs.length}`)), h("div.g-grid", xs.map(card))))
      : [h("div.empty", h("span", { html: penny("think") }), h("h2", "No terms match"), h("p.muted", "Try a shorter word, or switch to all worlds."))]));
    az.replaceChildren(..."#ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((L) => groups.has(L) ? h("a", { href: `#L-${L}` }, L) : h("span", L)));
    count.textContent = `${hits.length} of ${terms.length} terms`;
  }

  main.replaceChildren(
    h("header.pg-head", h("div.eyebrow", "Glossary"), h("h1", "Every word, in plain English"), h("p.lede", `${terms.length} terms from ${all.length} lessons. Each one links back to where it's explained with something you can play with.`)),
    h("div.g-tools", input, chips, az, count), list);
  draw();
  if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
});

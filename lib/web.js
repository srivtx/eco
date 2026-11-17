// Concept web: every lesson as a node, every "connected idea" as an edge, laid out by a small force simulation.
import { h, s } from "./core.js";
import { WORLDS, ALL, byId, lessonUrl } from "./catalog.js";
import { topbar } from "./topbar.js";
import { icon } from "./pixel.js";
import { loadAll } from "./data.js";

topbar("web");
const main = document.getElementById("main");
const VW = 1000, VH = 720;

loadAll().then((all) => {
  const seeOf = Object.fromEntries(all.map(({ meta, L }) => [meta.id, (L.see || []).filter((x) => byId[x])]));
  const nodes = ALL.map((m, i) => ({ m, i, x: 0, y: 0, vx: 0, vy: 0 }));
  const idx = Object.fromEntries(nodes.map((n) => [n.m.id, n]));
  const key = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const edges = new Map();
  for (const [a, list] of Object.entries(seeOf)) for (const b of list) if (a !== b) edges.set(key(a, b), { a: idx[a], b: idx[b], kind: "see" });
  for (const w of WORLDS) for (let i = 1; i < w.lessons.length; i++) { const k = key(w.lessons[i - 1][0], w.lessons[i][0]); if (!edges.has(k)) edges.set(k, { a: idx[w.lessons[i - 1][0]], b: idx[w.lessons[i][0]], kind: "seq" }); }
  const E = [...edges.values()];
  const nbr = new Map(nodes.map((n) => [n, new Set()]));
  E.forEach((e) => { nbr.get(e.a).add(e.b); nbr.get(e.b).add(e.a); });

  // seed: each world on a ring, lessons in a small circle around its centre
  WORLDS.forEach((w, wi) => {
    const a = (wi / WORLDS.length) * Math.PI * 2, cx = VW / 2 + Math.cos(a) * 380, cy = VH / 2 + Math.sin(a) * 290;
    w.lessons.forEach(([id], li) => { const n = idx[id], b = (li / w.lessons.length) * Math.PI * 2; n.x = cx + Math.cos(b) * 40; n.y = cy + Math.sin(b) * 40; n.cx = cx; n.cy = cy; });
  });
  for (let it = 0; it < 420; it++) {
    const cool = 1 - it / 420;
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const p = nodes[i], q = nodes[j]; let dx = p.x - q.x, dy = p.y - q.y; const d2 = Math.max(80, dx * dx + dy * dy), f = 1500 / d2, d = Math.sqrt(d2);
      dx /= d; dy /= d; p.vx += dx * f; p.vy += dy * f; q.vx -= dx * f; q.vy -= dy * f;
    }
    for (const e of E) { const dx = e.b.x - e.a.x, dy = e.b.y - e.a.y, d = Math.hypot(dx, dy) || 1, L = e.kind === "seq" ? 46 : 120, k = (e.kind === "seq" ? 0.05 : 0.005) * (d - L); e.a.vx += (dx / d) * k; e.a.vy += (dy / d) * k; e.b.vx -= (dx / d) * k; e.b.vy -= (dy / d) * k; }
    for (const n of nodes) { n.vx += (n.cx - n.x) * 0.06 + (VW / 2 - n.x) * 0.001; n.vy += (n.cy - n.y) * 0.06 + (VH / 2 - n.y) * 0.001; n.x += n.vx * 0.5 * cool; n.y += n.vy * 0.5 * cool; n.vx *= 0.6; n.vy *= 0.6; }
  }
  // fit into the view box
  const xs = nodes.map((n) => n.x), ys = nodes.map((n) => n.y), [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  nodes.forEach((n) => { n.x = 70 + ((n.x - x0) / (x1 - x0 || 1)) * (VW - 140); n.y = 60 + ((n.y - y0) / (y1 - y0 || 1)) * (VH - 120); });

  const svg = s("svg", { viewBox: `0 0 ${VW} ${VH}`, class: "web-svg", role: "img", "aria-label": `Concept web of ${nodes.length} lessons and ${E.length} links` });
  const gE = s("g", { class: "web-e" }), gN = s("g", { class: "web-n" }), gL = s("g", { class: "web-l" });
  E.forEach((e) => { e.el = s("line", { x1: e.a.x, y1: e.a.y, x2: e.b.x, y2: e.b.y, "data-k": e.kind, stroke: e.kind === "seq" ? e.a.m.world.color : "var(--ink-3)" }); gE.append(e.el); });
  nodes.forEach((n) => {
    const deg = nbr.get(n).size;
    n.el = s("g", { class: "wn", transform: `translate(${n.x},${n.y})`, tabindex: 0, role: "link", "aria-label": n.m.title, onclick: () => pick(n), onkeydown: (ev) => { if (ev.key === "Enter") location.href = lessonUrl(n.m.id); }, onpointerenter: () => hl(n), onpointerleave: () => hl(sel), onfocus: () => pick(n) },
      s("circle", { r: 6 + Math.min(6, deg * 0.7), fill: n.m.world.color }), s("title", { text: n.m.title }));
    n.lab = s("text", { x: n.x, y: n.y - 13, "text-anchor": "middle", class: "wl", text: n.m.title });
    gN.append(n.el); gL.append(n.lab);
  });
  const gW = s("g", { class: "web-w" });
  WORLDS.forEach((w) => { const ns = w.lessons.map(([id]) => idx[id]), cx = ns.reduce((a, n) => a + n.x, 0) / ns.length, cy = ns.reduce((a, n) => a + n.y, 0) / ns.length, r = Math.max(...ns.map((n) => Math.hypot(n.x - cx, n.y - cy))) + 16;
    gW.append(s("circle", { cx, cy, r, fill: w.color, opacity: 0.08 })); });
  svg.append(gW, gE, gN, gL);

  let sel = null, wsel = "";
  const panel = h("aside.web-p");
  function hl(n) {
    const on = n ? new Set([n, ...nbr.get(n)]) : null;
    svg.classList.toggle("focus", !!n || !!wsel);
    nodes.forEach((x) => { const lit = n ? on.has(x) : wsel ? x.m.world.id === wsel : false; x.el.classList.toggle("lit", lit); x.lab.classList.toggle("lit", lit && (!!n || false)); x.el.classList.toggle("me", x === n); });
    E.forEach((e) => e.el.classList.toggle("lit", n ? e.a === n || e.b === n : wsel ? e.a.m.world.id === wsel && e.b.m.world.id === wsel : false));
  }
  function pick(n) {
    sel = n; hl(n);
    const m = n.m, links = [...nbr.get(n)].map((x) => x.m);
    panel.replaceChildren(h("div.web-pw", { style: { "--wc": m.world.color } }, h("span", { html: icon(m.world.icon, m.world.color) }), h("small", m.world.name)),
      h("h2", m.title), h("p", m.blurb), h("a.btn.primary", { href: lessonUrl(m.id), style: { "--wc": m.world.color } }, "Open lesson →"),
      h("div.eyebrow", `${links.length} connections`), h("div.chips", links.map((x) => h("a.chip", { href: lessonUrl(x.id), style: { "--cc": x.world.color }, onclick: (e) => { e.preventDefault(); pick(idx[x.id]); } }, h("i"), x.title))));
  }
  const legend = h("div.g-worlds", WORLDS.map((w) => h("button.g-w", { type: "button", "aria-pressed": "false", style: { "--cc": w.color }, onclick: (e) => {
    wsel = wsel === w.id ? "" : w.id; [...legend.children].forEach((b, i) => b.setAttribute("aria-pressed", String(WORLDS[i].id === wsel))); sel = null; hl(null);
    panel.replaceChildren(h("div.web-pw", { style: { "--wc": w.color } }, h("span", { html: icon(w.icon, w.color) }), h("small", "World")), h("h2", w.name), h("p", w.tag), h("div.chips", w.lessons.map(([id, t]) => h("a.chip", { href: lessonUrl(id), style: { "--cc": w.color }, onclick: (ev) => { ev.preventDefault(); pick(idx[id]); } }, h("i"), t))));
  } }, h("span", { html: icon(w.icon, w.color) }), w.name)));

  panel.replaceChildren(h("h2", "Everything connects"), h("p", "Each dot is a lesson; bigger dots have more connections. Coloured lines run through a world in order; grey lines are the \"connected ideas\" between worlds. Hover or tap a dot to light up its neighbours."), h("p.muted", "Try: Compound interest, Leverage and fire sales, or Loss aversion."));
  main.replaceChildren(
    h("header.pg-head", h("div.eyebrow", "Concept web"), h("h1", "How the ideas link up"), h("p.lede", `${nodes.length} lessons, ${E.length} links. Economics isn't a list of topics; it's one machine.`)),
    h("div.g-tools", legend),
    h("div.web", h("div.web-c", svg), panel));
  const start = new URLSearchParams(location.search).get("id");
  if (start && idx[start]) pick(idx[start]);
});

// Renders one lesson from its content object.
import { h, store, done } from "./core.js";
import { ALL, byId, lessonUrl } from "./catalog.js";
import { topbar } from "./topbar.js";
import { penny, oink, icon, burst } from "./pixel.js";
import { loadExtras, withExtras } from "./extras.js";

topbar("lesson");
const main = document.getElementById("main");
const id = new URLSearchParams(location.search).get("id") || ALL[0].id;
const meta = byId[id];

if (!meta) {
  main.replaceChildren(h("div.empty", h("span", { html: penny("sad") }), h("h1", "No lesson by that name"), h("p", h("a", { href: "/" }, "Back to the map"))));
} else render();

async function render() {
  const w = meta.world;
  document.title = `${meta.title} · Eco`;
  document.documentElement.style.setProperty("--wc", w.color);
  const [content, extras] = await Promise.all([import(`/content/${w.id}.js`).then((m) => m.default), loadExtras().catch(() => ({}))]);
  const L = content[id] && withExtras(content[id], extras[id]);
  if (!L) { main.replaceChildren(h("div.empty", h("span", { html: oink("sad") }), h("h1", meta.title), h("p", "This lesson is still being written."))); return; }
  const idx = ALL.indexOf(meta), prev = ALL[idx - 1], next = ALL[idx + 1];

  // side list of this world's lessons
  const side = h("aside.side", h("div.side-w", h("span.side-i", { html: icon(w.icon, w.color) }), h("div", h("small", `World ${meta.wi + 1}`), h("b", w.name))),
    h("ol.side-l", w.lessons.map(([lid, t]) => h("li", { "data-done": done(lid) ? "1" : null, "aria-current": lid === id ? "page" : null }, h("a", { href: lessonUrl(lid) }, t)))),
    h("nav.side-toc", { "aria-label": "On this page" }, h("small", "On this page"), (L.parts || []).map((p, i) => h("a", { href: `#p${i + 1}` }, p.h)), L.quiz?.length ? h("a", { href: "#quiz" }, "Check yourself") : null));

  const head = h("header.l-head",
    h("div.l-crumbs", h("a", { href: "/" }, "Map"), h("span", "›"), h("a", { href: `/#${w.id}` }, w.name), h("span", "›"), h("span", `Lesson ${meta.li + 1} of ${w.lessons.length}`)),
    h("div.l-title", h("span.l-icon", { html: icon(w.icon, w.color) }), h("div", h("h1", meta.title), h("p.lede", meta.blurb))),
    h("div.l-dots", w.lessons.map(([lid], i) => h("a", { href: lessonUrl(lid), title: w.lessons[i][1], "data-on": lid === id ? "1" : null, "data-done": done(lid) ? "1" : null }))));

  const principle = L.principle && h("div.principle", h("span.pr-m", { html: penny("think") }), h("div", h("div.eyebrow", "The first principle"), h("p", { html: L.principle })));
  const hook = L.hook && h("div.prose.hook", { html: L.hook });

  const parts = (L.parts || []).map((p, i) => {
    const sec = h("section.part", { id: `p${i + 1}` }, h("h2", h("span.pn", String(i + 1).padStart(2, "0")), p.h));
    if (p.html) sec.append(h("div.prose", { html: p.html }));
    if (p.sim) { try { const node = p.sim(); if (node) sec.append(node); } catch (e) { console.error(e); sec.append(h("p.muted", "This simulation failed to load.")); } }
    if (p.after) sec.append(h("div.prose", { html: p.after }));
    return sec;
  });

  const job = L.job && h("section.job", h("div.job-h", h("span.job-i", { html: icon("toolkit", w.color) }), h("div", h("div.eyebrow", "On the job"), h("h2", "How the pros use this"))), h("div.prose", { html: L.job }));

  const ins = L.insider && h("section.insider",
    h("div.ins-h", h("span.ins-i", { html: icon("eye", "#1b1530") }), h("div", h("div.eyebrow", "Insider's view"), h("h2", "How the powerful really play it"))),
    h("div.ins-g",
      h("div.ins-c", h("b", "The playbook"), h("div", { html: L.insider.use })),
      h("div.ins-c", h("b", "Where the line is"), h("div", { html: L.insider.line })),
      h("div.ins-c.file", h("b", "Case file"), h("div", { html: L.insider.file }))));

  const terms = L.terms?.length && h("section.terms", h("h2", "Words you now own"), h("div.term-grid", L.terms.map(([t, d]) => h("div.term", { id: `t-${slug(t)}` }, h("b", t), h("span", { html: d })))));

  const quiz = L.quiz?.length && quizBlock(L, w);
  const recap = L.recap && h("section.recap", h("h2", "Three things to keep"), h("div.recap-g", L.recap.map(([big, small], i) => h("div.rc", { style: { "--d": `${i * 90}ms` } }, h("b", big), h("span", { html: small })))));
  const see = L.see?.length && h("section.see", h("h2", "Connected ideas"), h("div.chips", L.see.filter((s) => byId[s]).map((s) => h("a.chip", { href: lessonUrl(s), style: { "--cc": byId[s].world.color } }, h("i"), byId[s].title))));
  const foot = h("nav.l-foot",
    prev ? h("a.prev", { href: lessonUrl(prev.id) }, h("small", "← Previous"), prev.title) : h("span"),
    next ? h("a.next", { href: lessonUrl(next.id), style: { "--cc": next.world.color } }, h("small", next.world !== w ? `Next world: ${next.world.name} →` : "Next →"), next.title) : h("a.next", { href: "/" }, h("small", "Finished"), "Back to the map"));

  main.replaceChildren(h("div.l-grid", side, h("article.lesson", head, principle, hook, parts, job, ins, terms, quiz, recap, see, foot)));
  store.set("last", id);
  const bar = h("div.readbar", { "aria-hidden": "true" });
  document.body.append(bar);
  const secs = [...main.querySelectorAll("section.part, section.quiz")], toc = [...main.querySelectorAll(".side-toc a")];
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
    let k = -1; secs.forEach((sec, i) => { if (sec.getBoundingClientRect().top < innerHeight * 0.4) k = i; });
    toc.forEach((a, i) => a.toggleAttribute("data-on", i === k));
  };
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
  if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
}

export const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function quizBlock(L, w) {
  const qs = L.quiz, got = new Map();
  const score = h("div.qz-score");
  const stamp = h("div.qz-stamp", { hidden: true }, h("span", { html: oink("wow") }), h("div", h("b", "Lesson complete"), h("small", "It's on your map now.")));
  const upd = () => {
    const right = [...got.values()].filter(Boolean).length;
    score.textContent = `${right} / ${qs.length} right`;
    if (got.size === qs.length) {
      const pass = right >= Math.ceil(qs.length * 0.66);
      if (pass && !done(id)) { store.set(`done:${id}`, Date.now()); burst(stamp, 28); document.querySelector(".side-l [aria-current] ")?.setAttribute("data-done", "1"); }
      stamp.hidden = !pass && !done(id);
      if (!pass) score.textContent += " · get two-thirds right to finish the lesson. Reload to try again.";
    }
  };
  const cards = qs.map(([q, opts, ans, why], qi) => {
    const out = h("div.qz-why");
    const btns = opts.map((o, i) => h("button.choice", { type: "button", onclick: () => {
      btns.forEach((b, j) => { b.disabled = true; b.classList.toggle("right", j === ans); b.classList.toggle("wrong", j === i && i !== ans); });
      got.set(qi, i === ans); out.innerHTML = `<b>${i === ans ? "Yes." : "Not quite."}</b> ${why}`;
      if (i === ans) burst(btns[i]);
      const qk = `q:${id}:${qi}`; store.set(qk, i === ans ? 1 : 0);
      upd();
    } }, h("span.choice-k", String.fromCharCode(65 + i)), h("span", { html: o })));
    return h("div.qz-q", h("p.q", h("span.qn", `Q${qi + 1}`), h("span", { html: q })), h("div.choices", btns), out);
  });
  if (done(id)) stamp.hidden = false;
  return h("section.quiz#quiz", h("div.qz-head", h("div", h("div.eyebrow", "Check yourself"), h("h2", `${qs.length} quick questions`)), score), cards, stamp);
}

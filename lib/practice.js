// Practice: a mixed quiz across worlds, a "weak spots" round, and spaced-repetition flashcards.
import { h, store, rng } from "./core.js";
import { WORLDS, lessonUrl } from "./catalog.js";
import { topbar } from "./topbar.js";
import { icon, penny, oink, burst } from "./pixel.js";
import { loadAll, plain } from "./data.js";

topbar("practice");
const main = document.getElementById("main");
const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const DAY = 864e5, GAPS = [0, 1, 3, 7, 16, 35]; // days until a card in box k comes back

loadAll().then((all) => {
  const picked = new Set(store.get("practice:worlds") || WORLDS.map((w) => w.id));
  const questions = all.flatMap(({ meta, L }) => (L.quiz || []).map(([q, opts, ans, why], qi) => ({ meta, q, opts, ans, why, key: `q:${meta.id}:${qi}` })));
  const cards = (() => { const m = new Map(); for (const { meta, L } of all) for (const [t, d] of L.terms || []) if (!m.has(t.toLowerCase())) m.set(t.toLowerCase(), { t, d, meta, key: `fc:${slug(t)}` }); return [...m.values()]; })();
  const inWorlds = (x) => picked.has(x.meta.world.id);
  const stage = h("div.pr-stage");

  const chips = h("div.g-worlds", WORLDS.map((w) => h("button.g-w", { type: "button", "aria-pressed": String(picked.has(w.id)), style: { "--cc": w.color }, onclick: (e) => {
    picked.has(w.id) ? picked.delete(w.id) : picked.add(w.id);
    if (!picked.size) picked.add(w.id);
    e.currentTarget.setAttribute("aria-pressed", String(picked.has(w.id)));
    store.set("practice:worlds", [...picked]); menu();
  } }, h("span", { html: icon(w.icon, w.color) }), w.name)));
  const allBtn = h("button.btn", { type: "button", onclick: () => { WORLDS.forEach((w) => picked.add(w.id)); [...chips.children].forEach((b) => b.setAttribute("aria-pressed", "true")); store.set("practice:worlds", [...picked]); menu(); } }, "Select all");

  /* ---------- menu ---------- */
  function menu() {
    const qs = questions.filter(inWorlds), weak = qs.filter((x) => store.get(x.key) === 0), cs = cards.filter(inWorlds);
    const due = cs.filter((c) => (store.get(c.key)?.due ?? 0) <= Date.now());
    const boxes = [0, 1, 2, 3, 4, 5].map((b) => cs.filter((c) => (store.get(c.key)?.b ?? 0) === b).length);
    stage.replaceChildren(h("div.pr-modes",
      mode("Quick-fire quiz", `10 random questions from ${qs.length} in the worlds you picked.`, "#ff7a45", "basics", () => quiz(shuffle(qs).slice(0, 10), "Quick-fire")),
      mode("Situation room", `${qs.filter((x) => x.q.includes('class="sit"')).length} real-world scenarios: what would you do, and what happened?`, "#b45309", "power", () => quiz(shuffle(qs.filter((x) => x.q.includes('class="sit"'))).slice(0, 10), "Situation room")),
      mode("Weak spots", weak.length ? `${weak.length} questions you got wrong before. Fix them.` : "Nothing yet: questions you miss in lessons or here land in this pile.", "#e11d48", "crashes", weak.length ? () => quiz(shuffle(weak).slice(0, 15), "Weak spots") : null),
      mode("Flashcards", `${due.length} of ${cs.length} terms due. Cards you know come back less often.`, "#8b5cf6", "mind", due.length ? () => flash(shuffle(due).slice(0, 20)) : null)),
      h("div.pr-boxes", h("div.eyebrow", "Your flashcard boxes"), h("div.pr-box-row", boxes.map((n, b) => h("div.pr-box", { style: { "--h": `${Math.max(4, (100 * n) / Math.max(1, ...boxes))}%` } }, h("i"), h("b", n), h("small", b ? `box ${b}` : "new")))), h("p.muted", "Every right answer moves a card up a box and pushes it further out: tomorrow, 3 days, a week, 16 days, 5 weeks. Wrong sends it back to box 1.")));
  }
  const mode = (t, d, c, ic, go) => h("button.pr-mode", { type: "button", disabled: !go, style: { "--cc": c }, onclick: go }, h("span.pr-mi", { html: icon(ic, c) }), h("b", t), h("small", d), h("span.pr-go", go ? "Start →" : "Nothing to do"));
  const r = rng(Date.now() % 1e6);
  const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

  /* ---------- quiz runner ---------- */
  function quiz(qs, title) {
    let i = 0, right = 0; const missed = [];
    const bar = h("div.pr-bar", h("i")), head = h("div.pr-head", h("b", title), h("span.pr-n"));
    const body = h("div.pr-q");
    const show = () => {
      bar.firstChild.style.width = `${(100 * i) / qs.length}%`;
      head.lastChild.textContent = `${i + 1} / ${qs.length} · ${right} right`;
      const x = qs[i], out = h("div.qz-why"), next = h("button.btn.primary", { type: "button", hidden: true, style: { "--wc": x.meta.world.color }, onclick: () => (++i < qs.length ? show() : end()) }, i + 1 < qs.length ? "Next →" : "See results");
      const btns = x.opts.map((o, k) => h("button.choice", { type: "button", onclick: () => {
        btns.forEach((b, j) => { b.disabled = true; b.classList.toggle("right", j === x.ans); b.classList.toggle("wrong", j === k && k !== x.ans); });
        const ok = k === x.ans; if (ok) { right++; burst(btns[k]); } else missed.push(x);
        store.set(x.key, ok ? 1 : 0);
        out.innerHTML = `<b>${ok ? "Yes." : "Not quite."}</b> ${x.why}`; next.hidden = false; next.focus();
        head.lastChild.textContent = `${i + 1} / ${qs.length} · ${right} right`;
      } }, h("span.choice-k", String.fromCharCode(65 + k)), h("span", { html: o })));
      body.replaceChildren(h("a.pr-from", { href: lessonUrl(x.meta.id), style: { "--cc": x.meta.world.color } }, h("i"), `${x.meta.world.name} · ${x.meta.title}`), h("p.q", { html: x.q }), h("div.choices", btns), out, h("div.pr-next", next));
    };
    const end = () => {
      bar.firstChild.style.width = "100%";
      const pct = right / qs.length;
      body.replaceChildren(h("div.pr-end", h("span.pr-end-m", { html: pct >= 0.8 ? oink("wow") : pct >= 0.5 ? penny("happy") : penny("think") }),
        h("h2", `${right} / ${qs.length}`), h("p", pct >= 0.8 ? "Excellent. You could teach this." : pct >= 0.5 ? "Solid. A few worth another look." : "Good practice. The lessons below will fix most of these."),
        missed.length ? h("div.chips", [...new Map(missed.map((x) => [x.meta.id, x.meta])).values()].map((m) => h("a.chip", { href: lessonUrl(m.id), style: { "--cc": m.world.color } }, h("i"), m.title))) : null,
        h("div.pr-next", h("button.btn", { type: "button", onclick: menu }, "← Back"), h("button.btn.primary", { type: "button", onclick: () => quiz(shuffle(qs), title) }, "Go again"))));
      if (pct >= 0.8) burst(body.querySelector("h2"), 30);
    };
    stage.replaceChildren(h("div.pr-run", head, bar, body));
    show();
  }

  /* ---------- flashcards ---------- */
  function flash(deck) {
    let i = 0, known = 0;
    const bar = h("div.pr-bar", h("i")), head = h("div.pr-head", h("b", "Flashcards"), h("span.pr-n")), body = h("div.pr-q");
    const show = () => {
      if (i >= deck.length) return end();
      bar.firstChild.style.width = `${(100 * i) / deck.length}%`; head.lastChild.textContent = `${i + 1} / ${deck.length}`;
      const c = deck[i], st = store.get(c.key) || { b: 0, due: 0 };
      const grade = (ok) => { const b = ok ? Math.min(5, st.b + 1) : 1; store.set(c.key, { b, due: Date.now() + GAPS[b] * DAY - (ok ? 0 : DAY) }); if (ok) known++; i++; show(); };
      const actions = h("div.fc-act", { hidden: true }, h("button.btn", { type: "button", onclick: () => grade(false) }, "Again"), h("button.btn.primary", { type: "button", style: { "--wc": "var(--good)" }, onclick: () => grade(true) }, "Got it"));
      const card = h("button.fc", { type: "button", style: { "--cc": c.meta.world.color }, onclick: () => { card.toggleAttribute("data-on", true); actions.hidden = false; } },
        h("span.fc-f", h("small", `${c.meta.world.name} · box ${st.b || "new"}`), h("b", c.t), h("em", "tap to flip")),
        h("span.fc-b", h("small", c.t), h("span", plain(c.d)), h("a", { href: `${lessonUrl(c.meta.id)}#t-${slug(c.t)}`, onclick: (e) => e.stopPropagation() }, `From: ${c.meta.title} →`)));
      body.replaceChildren(card, actions);
    };
    const end = () => { bar.firstChild.style.width = "100%"; body.replaceChildren(h("div.pr-end", h("span.pr-end-m", { html: oink("happy") }), h("h2", `${known} / ${deck.length} known`), h("p", "Cards you knew come back later; the rest come back tomorrow."), h("div.pr-next", h("button.btn.primary", { type: "button", onclick: menu }, "Done")))); };
    stage.replaceChildren(h("div.pr-run", head, bar, body));
    show();
  }

  main.replaceChildren(
    h("header.pg-head", h("div.eyebrow", "Practice"), h("h1", "Make it stick"), h("p.lede", `${questions.length} questions and ${cards.length} flashcards from every world. Pick the worlds you want, then choose how to practise.`)),
    h("div.g-tools", h("div.pr-pick", h("b", "Worlds"), allBtn), chips), stage);
  menu();
});

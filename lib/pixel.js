// Pixel art drawn in code. Every sprite is original and made from little ASCII maps,
// so it stays crisp at any size, follows the theme and costs a few hundred bytes.

/** Turn rows of characters into an SVG. pal maps a character to a colour; "." is empty. */
export function sprite(rows, pal, { cls = "", label = "" } = {}) {
  const H = rows.length, W = Math.max(...rows.map((r) => r.length));
  let out = "";
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; ) {
      const c = row[x];
      if (c === "." || c === " " || !pal[c]) { x++; continue; }
      let e = x; while (e + 1 < row.length && row[e + 1] === c) e++;
      out += `<rect x="${x}" y="${y}" width="${e - x + 1}" height="1" fill="${pal[c]}"/>`;
      x = e + 1;
    }
  });
  return `<svg class="px ${cls}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}>${out}</svg>`;
}

const INK = "#1b1530";

// ---- Penny: a gold coin who has opinions about compound interest ----
const PENNY = {
  base: [
    "....kkkkkkkk....",
    "..kkGGGGGGGGkk..",
    ".kGGyyyyyyyyGGk.",
    ".kGyyYYYYYYyyGk.",
    "kGyyYYYYYYYYyyGk",
    "kGyYYYYYYYYYYyGk",
    "kGyYY@@YY@@YYyGk",
    "kGyYY@wYY@wYYyGk",
    "kGyYYYYYYYYYYyGk",
    "kGyYppYYYYppYyGk",
    "kGyYYYMMMMYYYyGk",
    "kGyyYYYMMYYYyyGk",
    ".kGyyYYYYYYyyGk.",
    ".kGGyyyyyyyyGGk.",
    "..kkGGGGGGGGkk..",
    "....kkkkkkkk....",
  ],
};
const MOODS = {
  happy: { 6: "kGyYY@@YY@@YYyGk", 7: "kGyYY@wYY@wYYyGk", 10: "kGyYYMYYYYMYYyGk", 11: "kGyyYYMMMMYYyyGk" },
  wow: { 5: "kGyYY@@YY@@YYyGk", 6: "kGyY@ww@@ww@YyGk", 7: "kGyY@@@YY@@@YyGk", 10: "kGyYYYYMMYYYYyGk", 11: "kGyyYYYMMYYYyyGk" },
  think: { 6: "kGyYYYYYYYYYYyGk", 7: "kGyYY@@YY@@YYyGk", 10: "kGyYYYYYMMMYYyGk", 11: "kGyyYYYYYYYYyyGk" },
  sad: { 10: "kGyYYYMMMMYYYyGk", 11: "kGyyYYMYYMYYyyGk" },
  wink: { 6: "kGyYY@@YYYYYYyGk", 7: "kGyYY@wYY@@YYyGk", 10: "kGyYYMYYYYMYYyGk", 11: "kGyyYYMMMMYYyyGk" },
};
export function penny(mood = "happy", { label = "" } = {}) {
  const rows = [...PENNY.base];
  for (const [i, r] of Object.entries(MOODS[mood] || {})) rows[+i] = r;
  return sprite(rows, { k: INK, G: "#c98a00", y: "#ffd84d", Y: "#ffc21a", "@": INK, w: "#ffffff", p: "#ff8fa3", M: "#7a2e12" }, { cls: `mascot penny m-${mood}`, label });
}

// ---- Oink: a piggy bank who worries about inflation ----
const OINK = [
  "......kkk.......",
  "..kk.kPPPk......",
  ".kPPkkPPPPkkkk..",
  ".kPPPPPPPPPPPPk.",
  "kPPPPPPPPPPPPPPk",
  "kPP@PPPPPPPPPPPk",
  "kPPwPPPPPPPPPPPkk",
  "kSSPPPPPPPPPPPPkPk",
  "kSsSPPPPPPPPPPPkk.",
  "kSSPPPPPPPPPPPPk.",
  ".kPPPPPPPPPPPPk..",
  "..kPPkkkkkkPPk...",
  "..kDDk....kDDk...",
  "..kkkk....kkkk...",
];
export function oink(mood = "happy", { label = "" } = {}) {
  const rows = [...OINK];
  if (mood === "sad") rows[5] = "kPPPPPPPPPPPPPPk", rows[6] = "kP@@PPPPPPPPPPPkk";
  if (mood === "wow") rows[5] = "kP@@PPPPPPPPPPPk", rows[6] = "kP@wPPPPPPPPPPPkk";
  return sprite(rows, { k: INK, P: "#ff9ec4", S: "#ff6fa6", s: "#c2185b", D: "#e07aa8", "@": INK, w: "#ffffff" }, { cls: `mascot oink m-${mood}`, label });
}

// ---- 12×12 icons, one per world and a few extras. "a" is the accent colour, "l" a light tint ----
const ICONS = {
  basics: ["....kkkk....", "..kkaaaakk..", ".kaallllaak.", ".kalkkkklak.", "kaalkaakla.k", "kaalkaakla.k", "kaalkkkkla.k", ".kalllllak..", ".kkaaaaakk..", "...kkkkkk...", "...kwwwwk...", "....kkkk...."],
  markets: ["kk........kk", "kak......aak", ".kak....aak.", "..kak..aak..", "...kakaak...", "....kaak....", "....kaak....", "...kaakak...", "..kaak..kak.", ".kaak....kak", "kaak......kk", "kkk.........".replace(/k/g, ".")],
  money: ["............", ".kkkkkkkkkk.", "kaaaaaaaaaak", "kalllaallllk", "kalkllkkllak", "kallkklllak.".padEnd(12, "k"), "kallllkklllk", "kalkkllkllak", "kallllaallak", "kaaaaaaaaaak", ".kkkkkkkkkk.", "............"],
  macro: ["....kkkk....", "..kkaallkk..", ".kaaalllaak.", ".kalaaallak.", "kaaaaalaaaak", "kllaaaaaalak", "kllaaaaaaaak", "kaalaaaallak", ".kaaalaallk.", ".kaaaaaaaak.", "..kkaaaakk..", "....kkkk...."],
  time: ["....kkkk....", "..kkllllkk..", ".kllllallllk".slice(0, 12), ".kllllalllk.", "kllllaallllk", "klllllaaalll".replace(/l$/, "k"), "klllllllllk.".padEnd(12, "k"), "kllllllllllk", ".kllllllllk.", ".kllllllllk.", "..kkllllkk..", "....kkkk...."],
  accounting: [".kkkkkkkkkk.", ".kllllllllk.", ".klaaaaaalk.", ".kllllllllk.", ".klaaalaalk.", ".kllllllllk.", ".klaalaaalk.", ".kllllllllk.", ".klaaaaaalk.", ".kllllllllk.", ".kllllllllk.", ".kkkkkkkkkk."],
  valuation: ["............", ".....kk.....", "....kaak....", "...kaaaak...", "..kaallaak..", ".kaallllaak.", "kaallllllaak", ".kaallllaak.", "..kaallaak..", "...kaaaak...", "....kaak....", ".....kk....."],
  stocks: ["...........k", "..........kk", ".........kak", "....k...kak.", "...kak.kak..", "..kak.kak...", ".kak.kak....", "kak.kak.....", "kk..kk......", "k...........", "kkkkkkkkkkkk", "kkkkkkkkkkkk"],
  bonds: [".kkkkkkkkkk.", "kllllllllllk", "klaaaaaaaalk", "klallllllalk", "klalkkkklalk", "klalklllklak".slice(0, 11) + "k", "klalkkkklalk", "klallllllalk", "klaaaaaaaalk", "kllllllllllk", ".kkkkkkkkkk.", "............"],
  derivatives: ["............", "k...........", "k.........aa", "k........aa.", "k.......aa..", "k......aa...", "kaaaaaaa....", "k...........", "k...........", "kkkkkkkkkkkk", "............", "............"],
  private: ["...kkkkkk...", "..kaaaaaak..", "..kakkkkak..", ".kkkkkkkkkk.", "kllllllllllk", "kllllkklllk.".padEnd(12, "k"), "kaaaakkaaaak", "kaaaaaaaaaak", "kaaaaaaaaaak", "kaaaaaaaaaak", ".kkkkkkkkkk.", "............"],
  mind: ["...kkkkk....", ".kkaaaalkk..", "kaalaaaaaak.", "kaaaaaalaak.", "kalaaaaaaaak", "kaaaalaaaaak", ".kaaaaaaalk.", "..kkaaaaak..", "....kaak....", "....kaak....", "...kkkkk....", "............"],
  toolkit: ["............", "....kkkk....", "...kk..kk...", "kkkkkkkkkkkk", "kaaaaaaaaaak", "kaaaaaaaaaak", "kkkkkllkkkkk", "kaaaakkaaaak", "kaaaaaaaaaak", "kaaaaaaaaaak", "kkkkkkkkkkkk", "............"],
  crashes: ["k...........", "kk..........", "kak.........", ".kak....k...", "..kak..kak..", "...kakkaak..", "....kaa.kak.", ".........kak", "..........kk", "...........k", "kkkkkkkkkkkk", "kkkkkkkkkkkk"],
  power: ["............", "k....kk....k", "kk..kaak..kk", "kak.kaak.kak", "kaakaaaakaak", "kaaaalaaaaak", "kaaaaaaaaaak", "kalaaaaalaak", "kaaaaaaaaaak", "kkkkkkkkkkkk", "kllllllllllk", "kkkkkkkkkkkk"],
  eye: ["............", "............", "....kkkk....", "..kklllllkk.", ".kllkkkkllk.", "kllkaaaaklk.", "kllkakkakllk", "kllkaaaakllk", ".kllkkkkllk.", "..kkllllkk..", "....kkkk....", "............"],
  star: [".....kk.....", "....kaak....", "....kaak....", "kkkkkaakkkkk", "kaaaaaaaaaak", ".kaaaaaaaak.", "..kaaaaaak..", "..kaaaaaak..", ".kaaakkaaak.", ".kaak..kaak.", "kkk......kkk", "............"],
  check: ["............", "..........kk", ".........kak", "........kak.", "kk.....kak..", "kak...kak...", ".kak.kak....", "..kakak.....", "...kak......", "....k.......", "............", "............"],
  bolt: ["......kkk...", ".....kaak...", "....kaak....", "...kaak.....", "..kaaaaakk..", ".kkkkaaaak..", "....kaak....", "...kaak.....", "..kaak......", ".kaak.......", ".kk.........", "............"],
  cards: ["..kkkkkkk...", "..kllllllk..", "kkkkkkkklk..", "kaaaaaaaklk.", "kallllllaklk", "kalkkkklaklk", "kallllllak.k", "kalkkklaak..", "kallllllak..", "kaaaaaaaak..", "kkkkkkkkkk..", "............"],
};
export function icon(name, color = "var(--wc, var(--accent))", { label = "" } = {}) {
  const rows = ICONS[name] || ICONS.star;
  return sprite(rows, { k: "var(--icon-ink, " + INK + ")", a: color, l: `color-mix(in srgb, ${color} 35%, #fff)`, w: "#fff" }, { cls: "icon", label });
}

/** A burst of coloured pixel squares from an element: a right answer. Nothing with reduced motion. */
export function burst(el, n = 16) {
  const r = document.documentElement;
  if (!el?.getBoundingClientRect || r.dataset.motion === "reduce" || (matchMedia("(prefers-reduced-motion: reduce)").matches && r.dataset.motion !== "full")) return;
  const b = el.getBoundingClientRect(), box = document.createElement("div");
  box.className = "burst"; box.setAttribute("aria-hidden", "true");
  box.style.left = `${b.left + Math.min(b.width, 260) / 2}px`; box.style.top = `${b.top + b.height / 2}px`;
  const cols = ["#ff7a45", "#ffc21a", "#84cc16", "#0ea5e9", "#8b5cf6", "#ec4899"];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.4, d = 36 + Math.random() * 40, q = document.createElement("i");
    q.style.setProperty("--x", `${Math.cos(a) * d}px`); q.style.setProperty("--y", `${Math.sin(a) * d - 12}px`);
    q.style.background = cols[i % cols.length]; q.style.animationDelay = `${Math.random() * 60}ms`;
    box.append(q);
  }
  document.body.append(box);
  setTimeout(() => box.remove(), 900);
}

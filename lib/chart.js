// One small SVG plotting engine every simulation shares: lines, areas, dots, guides,
// a crosshair with a tooltip, and a hook for custom shapes in data coordinates.
import { h, s, clamp } from "./core.js";

/**
 * plot({height, x:[a,b], y:[a,b], xLabel, yLabel, xFmt, yFmt, xLog, hover, ticks})
 * -> {el, draw({series, areas, dots, vlines, hlines, bands, custom}), sx, sy}
 * series: [{name, color, pts:[[x,y]...], dash, width, area}]
 */
export function plot({ height = 260, width = 640, x = [0, 1], y = [0, 1], xLabel = "", yLabel = "", xFmt = (v) => v, yFmt = (v) => v, xLog = false, hover = true, xTicks = 5, yTicks = 4, label = "chart" } = {}) {
  const W = width, H = height, P = { l: 54, r: 14, t: 14, b: xLabel ? 42 : 26 };
  const iw = W - P.l - P.r, ih = H - P.t - P.b;
  let X = [...x], Y = [...y];
  const tx = (v) => (xLog ? Math.log10(v) : v);
  const sx = (v) => P.l + ((tx(v) - tx(X[0])) / (tx(X[1]) - tx(X[0]))) * iw;
  const sy = (v) => P.t + (1 - (v - Y[0]) / (Y[1] - Y[0])) * ih;
  const ix = (px) => { const t = (px - P.l) / iw; return xLog ? Math.pow(10, tx(X[0]) + t * (tx(X[1]) - tx(X[0]))) : X[0] + t * (X[1] - X[0]); };
  const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, class: "chart", role: "img", "aria-label": label });
  const gGrid = s("g"), gBand = s("g"), gArea = s("g"), gLine = s("g"), gTop = s("g"), gHover = s("g", { class: "hov", visibility: "hidden" });
  const clip = s("clipPath", { id: `cp${Math.random().toString(36).slice(2, 8)}` }, s("rect", { x: P.l, y: P.t - 2, width: iw, height: ih + 4 }));
  svg.append(s("defs", {}, clip), gGrid, gBand, gArea, gLine, gTop, gHover);
  [gArea, gLine].forEach((g) => g.setAttribute("clip-path", `url(#${clip.id})`));
  const legend = h("div.legend");
  const tip = h("div.chart-tip", { hidden: true });
  const el = h("div.chartbox", legend, h("div.chart-wrap", svg, tip));
  let cur = { series: [] };

  function grid() {
    gGrid.replaceChildren();
    gGrid.append(s("line", { x1: P.l, x2: W - P.r, y1: P.t + ih, y2: P.t + ih, class: "axis" }));
    for (const v of nice(Y[0], Y[1], yTicks)) {
      const yy = sy(v);
      if (Math.abs(yy - (P.t + ih)) > 1) gGrid.append(s("line", { x1: P.l, x2: W - P.r, y1: yy, y2: yy, class: Math.abs(v) < 1e-12 ? "axis" : "gl" }));
      gGrid.append(s("text", { x: P.l - 8, y: yy + 4, "text-anchor": "end", class: "tk", text: yFmt(v) }));
    }
    const xs = xLog ? Array.from({ length: xTicks + 1 }, (_, i) => Math.pow(10, tx(X[0]) + ((tx(X[1]) - tx(X[0])) * i) / xTicks)) : nice(X[0], X[1], xTicks);
    for (const v of xs) {
      const xx = sx(v);
      gGrid.append(s("text", { x: xx, y: H - P.b + 17, "text-anchor": xx < P.l + 14 ? "start" : xx > W - P.r - 14 ? "end" : "middle", class: "tk", text: xFmt(v) }));
    }
    if (xLabel) gGrid.append(s("text", { x: P.l + iw / 2, y: H - 6, "text-anchor": "middle", class: "al", text: xLabel }));
    if (yLabel) gGrid.append(s("text", { x: P.l, y: P.t - 2, class: "al", text: "" }));
    if (yLabel) svg.setAttribute("aria-label", `${label}: ${yLabel} against ${xLabel}`);
  }
  const path = (pts) => pts.map(([a, b], i) => `${i ? "L" : "M"}${sx(a).toFixed(1)},${sy(clamp(b, Y[0] - (Y[1] - Y[0]) * 2, Y[1] + (Y[1] - Y[0]) * 2)).toFixed(1)}`).join("");

  function draw(d) {
    cur = d;
    if (d.x) X = d.x; if (d.y) Y = d.y;
    grid();
    [gBand, gArea, gLine, gTop].forEach((g) => g.replaceChildren());
    for (const b of d.bands || []) gBand.append(s("rect", { x: sx(b.x0), width: Math.max(0, sx(b.x1) - sx(b.x0)), y: P.t, height: ih, fill: b.color, opacity: b.opacity ?? 0.12 }), b.label ? s("text", { x: (sx(b.x0) + sx(b.x1)) / 2, y: P.t + 14, "text-anchor": "middle", class: "lbl", text: b.label }) : null);
    for (const a of d.areas || []) gArea.append(s("path", { d: path(a.pts) + "Z", fill: a.color, opacity: a.opacity ?? 0.22, class: "area" }), a.label ? s("text", { x: sx(a.lx), y: sy(a.ly), "text-anchor": "middle", class: "lbl strong", text: a.label }) : null);
    for (const se of d.series || []) {
      if (se.area) gArea.append(s("path", { d: path([[se.pts[0][0], Y[0]], ...se.pts, [se.pts.at(-1)[0], Y[0]]]) + "Z", fill: se.color, opacity: 0.16 }));
      gLine.append(s("path", { d: path(se.pts), class: "ln", stroke: se.color, "stroke-width": se.width || 3, "stroke-dasharray": se.dash || null }));
      if (se.label) { const p = se.pts[se.labelAt ?? se.pts.length - 1]; gTop.append(s("text", { x: sx(p[0]) + (se.dx ?? 6), y: sy(p[1]) + (se.dy ?? 4), class: "lbl strong", fill: se.color, "text-anchor": se.anchor || "start", text: se.label })); }
    }
    for (const v of d.vlines || []) gTop.append(s("line", { x1: sx(v.x), x2: sx(v.x), y1: P.t, y2: P.t + ih, class: "guide", stroke: v.color || null }), v.label ? s("text", { x: sx(v.x) + 5, y: P.t + 12, class: "lbl", text: v.label }) : null);
    for (const v of d.hlines || []) gTop.append(s("line", { x1: P.l, x2: W - P.r, y1: sy(v.y), y2: sy(v.y), class: "guide", stroke: v.color || null }), v.label ? s("text", { x: W - P.r - 4, y: sy(v.y) - 6, "text-anchor": "end", class: "lbl", text: v.label }) : null);
    for (const p of d.dots || []) gTop.append(s("circle", { cx: sx(p.x), cy: sy(p.y), r: p.r || 7, class: "dot", fill: p.color || "var(--ink)" }), p.label ? s("text", { x: sx(p.x) + (p.dx ?? 11), y: sy(p.y) + (p.dy ?? -9), class: "lbl strong", "text-anchor": p.anchor || "start", text: p.label }) : null);
    d.custom?.(gTop, sx, sy);
    const named = (d.series || []).filter((se) => se.name);
    legend.replaceChildren(...named.map((se) => h("span", h("i", { style: { background: se.color, ...(se.dash ? { backgroundImage: "none", border: `2px dashed ${se.color}`, background: "transparent" } : {}) } }), se.name)));
    legend.hidden = named.length < 2 && !d.legend;
  }

  // hover: crosshair + value of every series at that x
  const vline = s("line", { class: "cross", y1: P.t, y2: P.t + ih }), marks = s("g");
  gHover.append(vline, marks);
  const at = (pts, xv) => {
    if (!pts.length || xv < pts[0][0] || xv > pts.at(-1)[0]) return null;
    let i = pts.findIndex((p) => p[0] >= xv); if (i <= 0) return pts[Math.max(0, i)][1];
    const [a, b] = [pts[i - 1], pts[i]]; return a[1] + ((b[1] - a[1]) * (xv - a[0])) / (b[0] - a[0] || 1);
  };
  function move(e) {
    const r = svg.getBoundingClientRect(), px = ((e.clientX - r.left) / r.width) * W;
    if (px < P.l || px > W - P.r || !cur.series?.length) return leave();
    const xv = ix(px), rows = [];
    vline.setAttribute("x1", px); vline.setAttribute("x2", px);
    marks.replaceChildren();
    for (const se of cur.series) {
      if (se.noHover) continue;
      const v = at(se.pts, xv); if (v == null) continue;
      marks.append(s("circle", { cx: px, cy: sy(v), r: 5, fill: se.color, class: "hdot" }));
      rows.push(h("div", h("i", { style: { background: se.color } }), h("span", se.name || yLabel || "value"), h("b", yFmt(v))));
    }
    gHover.setAttribute("visibility", "visible");
    tip.replaceChildren(h("div.tt-h", `${xLabel ? xLabel + ": " : ""}${xFmt(xv)}`), ...rows);
    tip.hidden = false;
    const left = (px / W) * r.width;
    tip.style.left = `${left > r.width * 0.6 ? left - tip.offsetWidth - 14 : left + 14}px`;
    tip.style.top = `8px`;
  }
  function leave() { gHover.setAttribute("visibility", "hidden"); tip.hidden = true; }
  if (hover) { svg.addEventListener("pointermove", move); svg.addEventListener("pointerleave", leave); svg.addEventListener("pointerdown", move); }
  grid();
  return { el, svg, draw, sx, sy, get x() { return X; }, get y() { return Y; } };
}

/** "Nice" tick values (1, 2, 5 × 10^k steps) between a and b. */
export function nice(a, b, n = 5) {
  const raw = (b - a) / Math.max(1, n), p = Math.pow(10, Math.floor(Math.log10(raw || 1))), m = raw / p;
  const st = (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p, out = [];
  for (let v = Math.ceil(a / st - 1e-9) * st; v <= b + st * 1e-6; v += st) out.push(+v.toPrecision(12));
  return out;
}

/** Sample a function into points. */
export const curve = (f, a, b, n = 120) => Array.from({ length: n + 1 }, (_, i) => { const x = a + ((b - a) * i) / n; return [x, f(x)]; });

/**
 * Vertical bar chart with hover. items: [{label, value, color, parts?:[{v,color,name}]}]
 */
export function columns(items, { height = 220, fmt = (v) => v, max, label = "bar chart", baseline = 0 } = {}) {
  const W = 640, H = height, P = { l: 10, r: 10, t: 24, b: 30 };
  const lo = Math.min(baseline, ...items.map((i) => i.value)), hi = max ?? Math.max(...items.map((i) => i.value), baseline + 1e-9);
  const sy = (v) => P.t + (1 - (v - lo) / (hi - lo || 1)) * (H - P.t - P.b);
  const bw = (W - P.l - P.r) / items.length;
  const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, class: "chart cols", role: "img", "aria-label": label });
  svg.append(s("line", { x1: P.l, x2: W - P.r, y1: sy(0), y2: sy(0), class: "axis" }));
  items.forEach((it, i) => {
    const x = P.l + i * bw + bw * 0.15, w = bw * 0.7;
    const g = s("g", { class: "col" }, s("title", { text: `${it.label}: ${fmt(it.value)}` }));
    if (it.parts) {
      let acc = 0;
      for (const p of it.parts) { const y0 = sy(acc), y1 = sy(acc + p.v); g.append(s("rect", { x, width: w, y: Math.min(y0, y1), height: Math.abs(y1 - y0), fill: p.color, rx: 3, class: "seg" })); acc += p.v; }
    } else g.append(s("rect", { x, width: w, y: Math.min(sy(it.value), sy(0)), height: Math.abs(sy(it.value) - sy(0)), fill: it.color || "var(--wc)", rx: 4, class: "bar" }));
    g.append(s("text", { x: x + w / 2, y: (it.value >= 0 ? sy(it.value) - 6 : sy(it.value) - 8), "text-anchor": "middle", class: "lbl strong", text: it.show ?? fmt(it.value) }));
    g.append(s("text", { x: x + w / 2, y: H - 10, "text-anchor": "middle", class: "tk", text: it.label }));
    svg.append(g);
  });
  return h("div.chartbox", svg);
}

/** A waterfall (bridge) chart: [{label, value, total?:bool}] */
export function waterfall(steps, { height = 240, fmt = (v) => v, label = "waterfall" } = {}) {
  let acc = 0;
  const rows = steps.map((st) => { const from = st.total ? 0 : acc, to = st.total ? st.value : acc + st.value; if (!st.total) acc = to; else acc = st.value; return { ...st, from, to }; });
  const lo = Math.min(0, ...rows.map((r) => Math.min(r.from, r.to))), hi = Math.max(...rows.map((r) => Math.max(r.from, r.to)));
  const W = 640, H = height, P = { l: 8, r: 8, t: 24, b: 34 }, bw = (W - P.l - P.r) / rows.length;
  const sy = (v) => P.t + (1 - (v - lo) / (hi - lo || 1)) * (H - P.t - P.b);
  const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, class: "chart wf", role: "img", "aria-label": label });
  svg.append(s("line", { x1: P.l, x2: W - P.r, y1: sy(0), y2: sy(0), class: "axis" }));
  rows.forEach((r, i) => {
    const x = P.l + i * bw + bw * 0.14, w = bw * 0.72, col = r.color || (r.total ? "var(--ink)" : r.value >= 0 ? "var(--up)" : "var(--down)");
    svg.append(s("rect", { x, width: w, y: sy(Math.max(r.from, r.to)), height: Math.max(1.5, Math.abs(sy(r.from) - sy(r.to))), fill: col, rx: 3, class: "bar" }, s("title", { text: `${r.label}: ${fmt(r.value)}` })));
    if (i < rows.length - 1) svg.append(s("line", { x1: x + w, x2: x + bw, y1: sy(r.to), y2: sy(r.to), class: "gl" }));
    svg.append(s("text", { x: x + w / 2, y: sy(Math.max(r.from, r.to)) - 6, "text-anchor": "middle", class: "lbl strong", text: (r.total || r.value < 0 ? "" : "+") + fmt(r.value) }));
    svg.append(s("text", { x: x + w / 2, y: H - 12, "text-anchor": "middle", class: "tk", text: r.label }));
  });
  return h("div.chartbox", svg);
}

/** Donut: [{name, v, color}] */
export function donut(parts, { size = 180, center = "", sub = "" } = {}) {
  const tot = parts.reduce((a, p) => a + p.v, 0) || 1, R = 70, r = 44, c = 90;
  let a0 = -Math.PI / 2;
  const svg = s("svg", { viewBox: "0 0 180 180", class: "donut", width: size, height: size, role: "img", "aria-label": parts.map((p) => `${p.name} ${Math.round((p.v / tot) * 100)}%`).join(", ") });
  for (const p of parts) {
    if (p.v <= 0) continue;
    const a1 = a0 + (p.v / tot) * Math.PI * 2 - 0.0001, big = a1 - a0 > Math.PI ? 1 : 0;
    const pt = (rad, a) => `${c + rad * Math.cos(a)},${c + rad * Math.sin(a)}`;
    svg.append(s("path", { d: `M${pt(R, a0)}A${R},${R} 0 ${big} 1 ${pt(R, a1)}L${pt(r, a1)}A${r},${r} 0 ${big} 0 ${pt(r, a0)}Z`, fill: p.color, class: "slice" }, s("title", { text: `${p.name}: ${Math.round((p.v / tot) * 100)}%` })));
    a0 = a1;
  }
  svg.append(s("text", { x: 90, y: 92, "text-anchor": "middle", class: "d-c", text: center }), s("text", { x: 90, y: 110, "text-anchor": "middle", class: "d-s", text: sub }));
  return h("div.donutbox", svg, h("div.legend.v", parts.map((p) => h("span", h("i", { style: { background: p.color } }), `${p.name} · ${Math.round((p.v / tot) * 100)}%`))));
}

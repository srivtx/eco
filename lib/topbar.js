// Header on every page: brand, nav, theme switch.
import { h, store } from "./core.js";
import { penny } from "./pixel.js";

export function topbar(active = "") {
  const top = document.getElementById("top");
  if (!top) return;
  const link = (href, label, key) => h("a", { href, "aria-current": active === key ? "page" : null }, label);
  const theme = () => document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const tbtn = h("button.theme", { type: "button", "aria-label": "Switch light or dark", onclick: () => {
    const next = theme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next; store.set("theme", next); tbtn.textContent = next === "dark" ? "☀" : "☾";
  } }, theme() === "dark" ? "☀" : "☾");
  top.replaceChildren(
    h("a.brand", { href: "/" }, h("span.brand-m", { html: penny("happy") }), h("span", "Eco"), h("small", "money · markets · minds")),
    h("nav.topnav", link("/", "Map", "home"), link("/glossary", "Glossary", "glossary"), link("/practice", "Practice", "practice"), link("/web", "Concept web", "web"), tbtn),
  );
}

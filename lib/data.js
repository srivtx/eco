// Loads every world's content once, for the pages that look across the whole course.
import { WORLDS, byId } from "./catalog.js";
import { loadExtras, withExtras } from "./extras.js";

let cache;
/** -> [{ meta, L }] in course order */
export function loadAll() {
  cache ||= Promise.all([loadExtras().catch(() => ({})), ...WORLDS.map((w) => import(`/content/${w.id}.js`).then((m) => m.default))])
    .then(([x, ...mods]) => WORLDS.flatMap((w, i) => w.lessons.filter(([id]) => mods[i][id]).map(([id]) => ({ meta: byId[id], L: withExtras(mods[i][id], x[id]) }))));
  return cache;
}

/** Strip tags from the small bits of HTML used in definitions. */
export const plain = (html) => String(html).replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ");

// Loads every world's content once, for the pages that look across the whole course.
import { WORLDS, byId } from "./catalog.js";

let cache;
/** -> [{ meta, L }] in course order */
export function loadAll() {
  cache ||= Promise.all(WORLDS.map((w) => import(`/content/${w.id}.js`).then((m) => m.default)))
    .then((mods) => WORLDS.flatMap((w, i) => w.lessons.filter(([id]) => mods[i][id]).map(([id]) => ({ meta: byId[id], L: mods[i][id] }))));
  return cache;
}

/** Strip tags from the small bits of HTML used in definitions. */
export const plain = (html) => String(html).replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ");

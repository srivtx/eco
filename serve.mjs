// Zero-dependency dev server with the same clean URLs as production (/learn -> learn.html).
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const ROOT = resolve(process.cwd());
const PORT = Number(process.env.PORT ?? 4173);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".webp": "image/webp" };

async function exists(p) { try { return (await stat(p)).isFile(); } catch { return false; } }

createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  let p = join(ROOT, normalize(decodeURIComponent(url.pathname)));
  if (!p.startsWith(ROOT)) return res.writeHead(403).end();
  if (url.pathname.endsWith("/")) p = join(p, "index.html");
  else if (!extname(p) && (await exists(p + ".html"))) p += ".html";
  if (!(await exists(p))) return res.writeHead(404, { "content-type": "text/plain" }).end("not found");
  res.writeHead(200, { "content-type": TYPES[extname(p)] ?? "application/octet-stream", "cache-control": "no-cache" });
  res.end(await readFile(p));
}).listen(PORT, () => console.log(`Eco on http://localhost:${PORT}`));

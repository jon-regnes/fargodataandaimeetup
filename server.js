// Static file server + beehiiv signup endpoint. No dependencies. Railway runs `npm start`.
const http = require("http"), fs = require("fs"), path = require("path");

// Tiny .env loader for local dev (Railway injects real env vars).
try {
  for (const l of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch (_) {}

const PUB_ID = process.env.BEEHIIV_PUBLICATION_ID || "pub_5446fdae-9f5e-42bd-b8e7-b1ba3503d8ea";
const API_KEY = process.env.BEEHIIV_API_KEY;
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon", ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml; charset=utf-8" };
const root = __dirname;
const hits = new Map(); // ip -> [timestamps]

function json(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(obj));
}

function limited(ip) {
  const now = Date.now(), recent = (hits.get(ip) || []).filter((t) => now - t < 60000);
  recent.push(now); hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 5;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0, buf = "";
    req.on("data", (c) => { size += c.length; if (size > 4096) { reject(new Error("too large")); req.destroy(); } else buf += c; });
    req.on("end", () => resolve(buf));
    req.on("error", reject);
  });
}

async function subscribe(req, res) {
  const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  if (limited(ip)) return json(res, 429, { ok: false, error: "Too many tries. Give it a minute." });
  let data;
  try { data = JSON.parse(await readBody(req)); } catch (_) { return json(res, 400, { ok: false, error: "Bad request." }); }
  if (data.comment) return json(res, 200, { ok: true }); // honeypot: pretend success
  const email = String(data.email || "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 200) return json(res, 400, { ok: false, error: "That email doesn't look right." });
  if (!API_KEY) { console.error("BEEHIIV_API_KEY is not set"); return json(res, 503, { ok: false, error: "Signup isn't switched on yet. Please try again soon." }); }
  try {
    const r = await fetch(`https://api.beehiiv.com/v2/publications/${PUB_ID}/subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({ email, reactivate_existing: false, send_welcome_email: true, utm_source: "website", utm_medium: "fargodataandai" }),
    });
    if (r.ok) return json(res, 200, { ok: true });
    console.error("beehiiv error", r.status, (await r.text()).slice(0, 300));
    return json(res, 502, { ok: false, error: "Signup failed. Try again in a bit." });
  } catch (e) {
    console.error("beehiiv fetch failed", e.message);
    return json(res, 502, { ok: false, error: "Signup failed. Try again in a bit." });
  }
}

http.createServer((req, res) => {
  if (req.method === "POST" && req.url.split("?")[0] === "/api/subscribe") return subscribe(req, res);
  if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); return res.end(); }
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  const file = path.join(root, path.normalize(p));
  const rel = path.relative(root, file);
  if (rel.startsWith("..") || /^(server\.js|package(-lock)?\.json|\.env.*|\.gitignore|\.claude|\.git|node_modules)/.test(rel)) { res.writeHead(404); return res.end("Not found"); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
    res.end(req.method === "HEAD" ? undefined : data);
  });
}).listen(process.env.PORT || 8123, () => console.log("listening on", process.env.PORT || 8123));

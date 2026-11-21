// Backend Codecontenu — assistant FAQ (Groq). Node 18+, aucune dépendance.
// Lancer : cd backend && node server.js   (la clé GROQ_API_KEY est lue dans backend/.env)
import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const envPath = join(dirname(fileURLToPath(import.meta.url)), ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const PORT = Number(process.env.PORT || 8787);
const ORIGINS = (process.env.ALLOWED_ORIGINS || "*").split(",").map((s) => s.trim());
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const SYSTEM = `Tu es l'assistant de Codecontenu, une boutique qui vend des fichiers, formations, séances de coaching et services.
Réponds en français, brièvement et poliment.
Faits : le paiement se fait par Airtel Money via le bouton d'achat, qui compose automatiquement le code avec le montant.
Après le paiement, le client confirme avec son nom, son numéro WhatsApp et la référence de transaction.
Chaque paiement est vérifié manuellement, puis l'accès (fichier, formation, lien de réservation) est envoyé sur WhatsApp.
Ne communique jamais de numéro de téléphone. Si tu ne sais pas, invite le client à finaliser son achat ou à patienter pour la vérification.`;

function cors(req, res) {
  const o = req.headers.origin;
  res.setHeader("Access-Control-Allow-Origin", ORIGINS.includes("*") ? "*" : ORIGINS.includes(o) ? o : ORIGINS[0]);
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
const json = (res, code, body) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };

http.createServer(async (req, res) => {
  cors(req, res);
  if (req.method === "OPTIONS") return res.writeHead(204).end();
  if (req.method === "GET" && req.url === "/api/health") return json(res, 200, { ok: true, groq: !!process.env.GROQ_API_KEY });
  if (req.method !== "POST" || req.url !== "/api/faq") return json(res, 404, { error: "not_found" });

  if (!process.env.GROQ_API_KEY) return json(res, 503, { error: "GROQ_API_KEY manquante dans backend/.env" });
  let raw = "";
  for await (const c of req) { raw += c; if (raw.length > 20000) return json(res, 413, { error: "too_large" }); }
  let messages;
  try {
    messages = (JSON.parse(raw).messages || [])
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-12).map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));
  } catch { return json(res, 400, { error: "bad_json" }); }
  if (!messages.length) return json(res, 400, { error: "empty" });

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, temperature: 0.3, max_tokens: 400, messages: [{ role: "system", content: SYSTEM }, ...messages] }),
    });
    const body = await r.json();
    if (!r.ok) { console.error("Groq", r.status, body); return json(res, 502, { error: "groq_error", status: r.status }); }
    return json(res, 200, { reply: body.choices?.[0]?.message?.content ?? "" });
  } catch (e) { console.error(e); return json(res, 502, { error: "groq_unreachable" }); }
}).listen(PORT, () => console.log(`Codecontenu backend : http://localhost:${PORT}`));

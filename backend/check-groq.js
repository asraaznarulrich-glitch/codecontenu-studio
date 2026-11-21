// Vérifie que la clé Groq fonctionne : node check-groq.js
const r = await fetch(`http://localhost:${process.env.PORT || 8787}/api/faq`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: "Comment payer ?" }] }) });
console.log(r.status, await r.text());

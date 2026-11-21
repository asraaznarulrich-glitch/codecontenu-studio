import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { MessageCircle, X, Send } from "lucide-react";
import { BACKEND_URL } from "@/lib/config";

type Msg = { role: "user" | "assistant"; content: string };

export function FaqChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", content: "Bonjour ! Une question sur un produit, le paiement Airtel Money ou la livraison ?" }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    const q = input.trim();
    if (!q || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: q }];
    setMsgs(next); setInput(""); setBusy(true);
    try {
      const r = await fetch(`${BACKEND_URL}/api/faq`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next.slice(1) }) });
      const j = await r.json();
      setMsgs([...next, { role: "assistant", content: r.ok ? j.reply : "L'assistant est momentanément indisponible. Réessayez plus tard." }]);
    } catch {
      setMsgs([...next, { role: "assistant", content: "L'assistant est momentanément indisponible. Réessayez plus tard." }]);
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open ? (
        <div className="flex h-[480px] w-[340px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
            <span className="text-sm font-medium">Questions fréquentes</span>
            <button onClick={() => setOpen(false)} aria-label="Fermer"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "user" ? "ml-8 rounded-xl bg-secondary px-3 py-2" : "mr-8 rounded-xl bg-muted px-3 py-2"}>
                <div className="prose prose-sm max-w-none"><ReactMarkdown>{m.content}</ReactMarkdown></div>
              </div>
            ))}
            {busy ? <div className="mr-8 rounded-xl bg-muted px-3 py-2 text-muted-foreground">…</div> : null}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 border-t border-border p-3">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Votre question…" className="flex-1 rounded-full border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
            <button type="submit" disabled={busy} className="rounded-full bg-primary p-2 text-primary-foreground disabled:opacity-50" aria-label="Envoyer"><Send className="h-4 w-4" /></button>
          </form>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl" aria-label="Questions fréquentes">
          <MessageCircle className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}

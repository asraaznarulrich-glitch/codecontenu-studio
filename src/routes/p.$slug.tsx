import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Check, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { SiteFooter, SiteHeader } from "@/components/Logo";
import { buyLabel, TYPE_LABELS, type Product } from "@/lib/products";
import { formatFcfa, ussdCode, ussdLink, WHATSAPP_ALERT } from "@/lib/config";
import { createOrder, getPublished } from "@/lib/store";

export const Route = createFileRoute("/p/$slug")({
  head: () => ({
    meta: [
      { title: "Produit — Codecontenu" },
      { name: "description", content: "Détails du produit et paiement Airtel Money sur Codecontenu." },
      { property: "og:title", content: "Produit — Codecontenu" },
      { property: "og:description", content: "Détails du produit et paiement Airtel Money." },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const [p, setP] = useState<Product | null | undefined>(undefined);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [form, setForm] = useState({ name: "", phone: "", ref: "" });
  const [sending, setSending] = useState(false);
  useEffect(() => { getPublished(slug).then(setP).catch(() => setP(null)); }, [slug]);

  if (p === undefined) return <div className="min-h-screen"><SiteHeader /><p className="mt-20 text-center text-muted-foreground">Chargement…</p></div>;
  if (p === null) return <div className="min-h-screen"><SiteHeader /><div className="mt-20 text-center"><p className="text-muted-foreground">Produit introuvable.</p><Link to="/" className="mt-4 inline-block underline">Retour à la boutique</Link></div></div>;

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!p) return;
    if (form.name.trim().length < 2 || form.phone.replace(/\D/g, "").length < 8) { toast.error("Indiquez votre nom et votre numéro."); return; }
    setSending(true);
    try {
      await createOrder({ product_id: p.id, product_name: p.name, amount: p.price, customer_name: form.name.trim(), customer_phone: form.phone.trim(), txn_ref: form.ref.trim() });
      const msg = `Nouveau paiement à vérifier\nProduit : ${p.name} (${TYPE_LABELS[p.type]})\nMontant : ${formatFcfa(p.price)}\nClient : ${form.name}\nTéléphone : ${form.phone}\nRéf. transaction : ${form.ref || "—"}`;
      window.open(`https://wa.me/${WHATSAPP_ALERT}?text=${encodeURIComponent(msg)}`, "_blank");
      setStep(2);
    } catch { toast.error("Envoi impossible, réessayez."); } finally { setSending(false); }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto grid max-w-6xl gap-10 px-5 md:grid-cols-[1.1fr_1fr]">
        <div>
          <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Boutique</Link>
          <img src={p.cover_url} alt={p.name} className="aspect-square w-full rounded-2xl border border-border object-cover" />
        </div>
        <div className="md:pt-10">
          <div className="flex gap-2 text-xs">
            <span className="rounded-full border border-border bg-sand/40 px-3 py-0.5">{TYPE_LABELS[p.type]}</span>
            <span className="rounded-full border border-border px-3 py-0.5 text-muted-foreground">{p.category}</span>
          </div>
          <h1 className="mt-3 text-3xl font-medium tracking-tight">{p.name}</h1>
          <p className="mt-2 text-muted-foreground">{p.short_description}</p>
          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-3xl font-medium">{formatFcfa(p.price)}</span>
            {p.compare_price ? <span className="text-muted-foreground line-through">{formatFcfa(p.compare_price)}</span> : null}
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-card p-5">
            {step === 0 && (
              <>
                <a href={ussdLink(p.price)} onClick={() => setStep(1)} className="block rounded-full bg-buy py-3 text-center font-medium text-buy-foreground hover:opacity-90">{buyLabel(p.type)}</a>
                <p className="mt-3 text-center text-xs text-muted-foreground">Paiement Airtel Money : le code <span className="font-mono">{ussdCode(p.price)}</span> s'ouvre sur votre téléphone.</p>
                <button onClick={() => setStep(1)} className="mt-2 w-full text-center text-xs underline text-muted-foreground">J'ai déjà payé</button>
              </>
            )}
            {step === 1 && (
              <form onSubmit={confirm} className="space-y-3">
                <p className="text-sm">Après le paiement, confirmez ici. Votre achat sera vérifié puis livré sur WhatsApp.</p>
                <input required placeholder="Votre nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                <input required placeholder="Votre numéro WhatsApp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                <input placeholder="Référence de la transaction (SMS Airtel)" value={form.ref} onChange={(e) => setForm({ ...form, ref: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                <button disabled={sending} className="w-full rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">{sending ? "Envoi…" : "Confirmer mon paiement"}</button>
                <a href={ussdLink(p.price)} className="block text-center text-xs underline text-muted-foreground">Relancer le paiement</a>
              </form>
            )}
            {step === 2 && (
              <div className="text-center">
                <Check className="mx-auto h-8 w-8" />
                <p className="mt-2 font-medium">Paiement signalé</p>
                <p className="mt-1 text-sm text-muted-foreground">Il est en cours de vérification. Vous recevrez votre accès sur WhatsApp.</p>
              </div>
            )}
          </div>

          {p.benefits.length > 0 && (
            <ul className="mt-6 space-y-2">
              {p.benefits.map((b, i) => <li key={i} className="flex gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0" />{b}</li>)}
            </ul>
          )}
          <div className="prose prose-sm mt-6 max-w-none"><ReactMarkdown>{p.description}</ReactMarkdown></div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

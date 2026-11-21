import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { formatFcfa, WHATSAPP_ALERT } from "@/lib/config";
import { slugify, TYPE_LABELS, validateProduct, type Order, type Product, type ProductPrivate, type ProductType } from "@/lib/products";
import { adminDeleteProduct, adminListOrders, adminListProducts, adminSaveProduct, adminSetOrderStatus, isDemo, supabase, uploadFile } from "@/lib/store";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Espace privé — Codecontenu" },
      { name: "description", content: "Espace privé." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Espace privé — Codecontenu" },
      { property: "og:description", content: "Espace privé." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Admin,
});

const DEMO_PASS = (import.meta.env['VITE_ADMIN_PASSCODE'] as string | undefined) ?? "codecontenu";

function Admin() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    if (isDemo) { setOk(sessionStorage.getItem("cc_admin") === "1"); return; }
    supabase!.auth.getSession().then(async ({ data }) => {
      if (!data.session) { setOk(false); return; }
      const { data: isAdmin } = await supabase!.rpc("is_admin");
      setOk(!!isAdmin);
    });
  }, []);
  if (ok === null) return null;
  return ok ? <Dashboard onLogout={async () => { if (supabase) await supabase.auth.signOut(); sessionStorage.removeItem("cc_admin"); setOk(false); }} /> : <Login onOk={() => setOk(true)} />;
}

function Login({ onOk }: { onOk: () => void }) {
  const [email, setEmail] = useState(""); const [pass, setPass] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (isDemo) { if (pass === DEMO_PASS) { sessionStorage.setItem("cc_admin", "1"); onOk(); } else toast.error("Code incorrect"); return; }
    const { error } = await supabase!.auth.signInWithPassword({ email, password: pass });
    if (error) { toast.error("Identifiants incorrects"); return; }
    const { data } = await supabase!.rpc("is_admin");
    if (!data) { await supabase!.auth.signOut(); toast.error("Accès refusé"); return; }
    onOk();
  }
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-3 rounded-2xl border border-border bg-card p-6">
        <Logo />
        {!isDemo && <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />}
        <input type="password" placeholder={isDemo ? "Code d'accès" : "Mot de passe"} value={pass} onChange={(e) => setPass(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        <button className="w-full rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground">Entrer</button>
      </form>
    </div>
  );
}

type Row = Product & { priv?: ProductPrivate | undefined };
const empty = (): { p: Partial<Product>; v: Omit<ProductPrivate, "product_id"> } => ({
  p: { type: "fichier", name: "", short_description: "", description: "", price: 0, compare_price: null, cover_url: "", category: "", benefits: [], published: false },
  v: { content_url: "", delivery_message: "" },
});

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<"produits" | "commandes">("produits");
  const [rows, setRows] = useState<Row[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [edit, setEdit] = useState<ReturnType<typeof empty> | null>(null);
  const reload = () => { adminListProducts().then(setRows).catch((e) => toast.error(e.message)); adminListOrders().then(setOrders).catch(() => {}); };
  useEffect(reload, []);

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-5 py-6">
      <div className="flex items-center justify-between">
        <Logo />
        <button onClick={onLogout} className="text-sm text-muted-foreground hover:text-foreground">Déconnexion</button>
      </div>
      {isDemo && <p className="mt-4 rounded-lg bg-sand/50 px-4 py-2 text-sm">Mode démo : les données restent dans ce navigateur tant que Supabase n'est pas configuré.</p>}
      <div className="mt-6 flex gap-2">
        {(["produits", "commandes"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full border px-4 py-1.5 text-sm capitalize ${tab === t ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
            {t}{t === "commandes" ? ` (${orders.filter((o) => o.status === "en_attente").length})` : ""}
          </button>
        ))}
        {tab === "produits" && <button onClick={() => setEdit(empty())} className="ml-auto rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground">+ Nouveau produit</button>}
      </div>

      {edit ? <Editor init={edit} onClose={() => { setEdit(null); reload(); }} /> : tab === "produits" ? (
        <div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card">
          {rows.length === 0 && <p className="p-8 text-center text-muted-foreground">Aucun produit. Créez le premier.</p>}
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-4 p-3">
              <img src={r.cover_url} alt="" className="h-14 w-14 rounded-lg object-cover" />
              <div className="flex-1">
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">{TYPE_LABELS[r.type]} · {formatFcfa(r.price)} · {r.published ? "En ligne" : "Brouillon"}</p>
              </div>
              <button onClick={() => setEdit({ p: r, v: { content_url: r.priv?.content_url ?? "", delivery_message: r.priv?.delivery_message ?? "" } })} className="text-sm underline">Modifier</button>
              <button onClick={async () => { if (confirm("Supprimer ?")) { await adminDeleteProduct(r.id); reload(); } }} className="text-sm text-destructive">Supprimer</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card">
          {orders.length === 0 && <p className="p-8 text-center text-muted-foreground">Aucune commande.</p>}
          {orders.map((o) => {
            const priv = rows.find((r) => r.id === o.product_id)?.priv;
            const msg = `Bonjour ${o.customer_name}, votre paiement pour « ${o.product_name} » est confirmé. Merci !\n${priv?.delivery_message ?? ""}\n${priv?.content_url ?? ""}`;
            return (
              <div key={o.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                <div className="min-w-[220px] flex-1">
                  <p className="font-medium">{o.product_name} — {formatFcfa(o.amount)}</p>
                  <p className="text-xs text-muted-foreground">{o.customer_name} · {o.customer_phone} · réf. {o.txn_ref || "—"} · {new Date(o.created_at).toLocaleString("fr-FR")}</p>
                </div>
                <span className="rounded-full border border-border px-2 py-0.5 text-xs">{o.status === "en_attente" ? "En attente" : o.status === "verifie" ? "Vérifié" : "Refusé"}</span>
                {o.status === "en_attente" && <>
                  <button onClick={async () => { await adminSetOrderStatus(o.id, "verifie"); reload(); }} className="underline">Valider</button>
                  <button onClick={async () => { await adminSetOrderStatus(o.id, "refuse"); reload(); }} className="text-destructive">Refuser</button>
                </>}
                {o.status === "verifie" && <a target="_blank" rel="noreferrer" href={`https://wa.me/${o.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`} className="underline">Envoyer l'accès (WhatsApp)</a>}
              </div>
            );
          })}
          <p className="p-3 text-xs text-muted-foreground">Alertes de paiement envoyées au +{WHATSAPP_ALERT}.</p>
        </div>
      )}
    </div>
  );
}

function Editor({ init, onClose }: { init: ReturnType<typeof empty>; onClose: () => void }) {
  const [p, setP] = useState(init.p); const [v, setV] = useState(init.v);
  const [benefits, setBenefits] = useState((init.p.benefits ?? []).join("\n"));
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const field = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";

  async function up(f: File | undefined, kind: "covers" | "contents") {
    if (!f) return; setBusy(true);
    try { const url = await uploadFile(f, kind); kind === "covers" ? setP((x) => ({ ...x, cover_url: url })) : setV((x) => ({ ...x, content_url: url })); toast.success("Fichier envoyé"); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }
  async function save(publish: boolean) {
    const full = { ...p, benefits: benefits.split("\n").map((s) => s.trim()).filter(Boolean), slug: p.slug || `${slugify(p.name ?? "")}-${Math.random().toString(36).slice(2, 6)}`, published: publish };
    const errs = publish ? validateProduct(full, v) : (!full.name ? ["Nom obligatoire."] : []);
    setErrors(errs); if (errs.length) return;
    setBusy(true);
    try { await adminSaveProduct(full, v); toast.success(publish ? "Publié" : "Brouillon enregistré"); onClose(); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="mt-6 grid gap-4 rounded-2xl border border-border bg-card p-6 md:grid-cols-2">
      <label className="space-y-1 text-sm">Type
        <select value={p.type} onChange={(e) => setP({ ...p, type: e.target.value as ProductType })} className={field}>
          {Object.entries(TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </label>
      <label className="space-y-1 text-sm">Catégorie<input value={p.category} onChange={(e) => setP({ ...p, category: e.target.value })} placeholder="ex. Marketing, Design…" className={field} /></label>
      <label className="space-y-1 text-sm md:col-span-2">Nom du produit<input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} className={field} /></label>
      <label className="space-y-1 text-sm md:col-span-2">Résumé (affiché sous le titre)<input value={p.short_description} onChange={(e) => setP({ ...p, short_description: e.target.value })} className={field} /></label>
      <label className="space-y-1 text-sm md:col-span-2">Description complète (Markdown accepté)<textarea rows={6} value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} className={field} /></label>
      <label className="space-y-1 text-sm">Prix (FCFA)<input type="number" min={0} value={p.price || ""} onChange={(e) => setP({ ...p, price: Number(e.target.value) })} className={field} /></label>
      <label className="space-y-1 text-sm">Prix barré (optionnel)<input type="number" min={0} value={p.compare_price ?? ""} onChange={(e) => setP({ ...p, compare_price: e.target.value ? Number(e.target.value) : null })} className={field} /></label>
      <label className="space-y-1 text-sm md:col-span-2">Ce que le client obtient (une ligne par point)<textarea rows={3} value={benefits} onChange={(e) => setBenefits(e.target.value)} className={field} /></label>
      <div className="space-y-1 text-sm">Image de couverture
        <input type="file" accept="image/*" onChange={(e) => up(e.target.files?.[0], "covers")} className="block text-xs" />
        <input placeholder="…ou lien de l'image" value={p.cover_url} onChange={(e) => setP({ ...p, cover_url: e.target.value })} className={field} />
        {p.cover_url && <img src={p.cover_url} alt="" className="h-24 w-24 rounded-lg object-cover" />}
      </div>
      <div className="space-y-1 text-sm">Contenu livré (PDF, vidéo, lien de réservation…) — privé
        <input type="file" accept=".pdf,video/*,.zip,image/*" onChange={(e) => up(e.target.files?.[0], "contents")} className="block text-xs" />
        <input placeholder="…ou lien (Drive, YouTube non répertorié, Calendly…)" value={v.content_url} onChange={(e) => setV({ ...v, content_url: e.target.value })} className={field} />
      </div>
      <label className="space-y-1 text-sm md:col-span-2">Message envoyé après validation du paiement<textarea rows={2} value={v.delivery_message} onChange={(e) => setV({ ...v, delivery_message: e.target.value })} className={field} /></label>
      {errors.length > 0 && <ul className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive md:col-span-2">{errors.map((e) => <li key={e}>• {e}</li>)}</ul>}
      <div className="flex gap-2 md:col-span-2">
        <button disabled={busy} onClick={() => save(true)} className="rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground disabled:opacity-50">Publier</button>
        <button disabled={busy} onClick={() => save(false)} className="rounded-full border border-border px-5 py-2 text-sm">Enregistrer en brouillon</button>
        <button onClick={onClose} className="ml-auto text-sm text-muted-foreground">Annuler</button>
      </div>
    </div>
  );
}

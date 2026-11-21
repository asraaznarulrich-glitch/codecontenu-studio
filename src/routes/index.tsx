import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteFooter, SiteHeader } from "@/components/Logo";
import { ProductCard } from "@/components/ProductCard";
import { FILTERS, type Product, type ProductType } from "@/lib/products";
import { listPublished } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Boutique Codecontenu — Fichiers, formations, coaching, services" },
      { name: "description", content: "Achetez les fichiers, formations, séances de coaching et services de Codecontenu. Paiement Airtel Money." },
      { property: "og:title", content: "Boutique Codecontenu" },
      { property: "og:description", content: "Fichiers, formations, coaching et services. Paiement Airtel Money." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Boutique,
});

function Boutique() {
  const [items, setItems] = useState<Product[] | null>(null);
  const [filter, setFilter] = useState<ProductType | "tous">("tous");
  useEffect(() => { listPublished().then(setItems).catch(() => setItems([])); }, []);
  const shown = (items ?? []).filter((p) => filter === "tous" || p.type === filter);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5">
        <h1 className="mt-4 text-4xl font-medium tracking-tight">Boutique</h1>
        <div className="mt-6 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${filter === f.key ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"}`}>
              {f.label}
            </button>
          ))}
        </div>
        {items === null ? (
          <p className="mt-16 text-center text-muted-foreground">Chargement…</p>
        ) : shown.length === 0 ? (
          <p className="mt-16 rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">Aucun produit pour le moment.</p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

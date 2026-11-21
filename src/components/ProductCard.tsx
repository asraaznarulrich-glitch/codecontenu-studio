import { Link } from "@tanstack/react-router";
import { buyLabel, TYPE_LABELS, type Product } from "@/lib/products";
import { formatFcfa } from "@/lib/config";

export function ProductCard({ p }: { p: Product }) {
  return (
    <article className="group flex flex-col rounded-2xl border border-border bg-card p-2.5 transition-shadow hover:shadow-lg">
      <Link to="/p/$slug" params={{ slug: p.slug }} className="block overflow-hidden rounded-xl bg-muted">
        <img src={p.cover_url} alt={p.name} className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" />
      </Link>
      <div className="flex flex-1 flex-col gap-2 px-2 pb-2 pt-4">
        <span className="w-fit rounded-full border border-border bg-sand/40 px-3 py-0.5 text-xs">{TYPE_LABELS[p.type]}</span>
        <Link to="/p/$slug" params={{ slug: p.slug }} className="line-clamp-2 font-medium leading-snug hover:underline">{p.name}</Link>
        <div className="mt-auto flex items-baseline gap-2 pt-1">
          <span className="text-2xl font-medium">{formatFcfa(p.price)}</span>
          {p.compare_price ? <span className="text-sm text-muted-foreground line-through">{formatFcfa(p.compare_price)}</span> : null}
        </div>
        <Link to="/p/$slug" params={{ slug: p.slug }} className="mt-1 rounded-full bg-buy py-2.5 text-center text-sm font-medium text-buy-foreground hover:opacity-90">
          {buyLabel(p.type)}
        </Link>
      </div>
    </article>
  );
}

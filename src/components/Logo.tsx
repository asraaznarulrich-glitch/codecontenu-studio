import { Link } from "@tanstack/react-router";

export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="10 10 80 80" className={className} aria-hidden="true">
      <path fill="currentColor" fillRule="evenodd" d="M10 50 A40 40 0 1 0 90 50 A40 40 0 1 0 10 50 Z M44 36 L66 50 L44 64 Z" />
    </svg>
  );
}
export function Logo({ small = false }: { small?: boolean }) {
  return (
    <Link to="/" className="inline-flex items-center gap-2.5 text-foreground">
      <LogoMark className={small ? "h-4 w-4" : "h-7 w-7"} />
      <span className={`font-medium tracking-tight ${small ? "text-base" : "text-2xl"}`}>Codecontenu</span>
    </Link>
  );
}
export function SiteHeader() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
      <Logo />
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">Produits</Link>
    </header>
  );
}
export function SiteFooter() {
  return (
    <footer className="mt-20 flex justify-center py-10 text-muted-foreground opacity-80">
      <Logo small />
    </footer>
  );
}

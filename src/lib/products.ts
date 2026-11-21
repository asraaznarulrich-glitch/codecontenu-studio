export type ProductType = "fichier" | "formation" | "coaching" | "service";

export const TYPE_LABELS: Record<ProductType, string> = {
  fichier: "Fichier",
  formation: "Formation",
  coaching: "Coaching",
  service: "Service",
};
export const FILTERS: { key: ProductType | "tous"; label: string }[] = [
  { key: "tous", label: "Tous" },
  { key: "fichier", label: "Fichiers" },
  { key: "formation", label: "Formations" },
  { key: "coaching", label: "Coaching" },
  { key: "service", label: "Services" },
];
export function buyLabel(t: ProductType) {
  return t === "fichier" ? "Télécharger" : t === "formation" ? "Prendre la formation" : "Réserver";
}

/** Même fiche pour les 4 types (même politique de mise en ligne). */
export interface Product {
  id: string;
  type: ProductType;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  price: number;
  compare_price: number | null;
  cover_url: string;
  category: string;
  benefits: string[];
  published: boolean;
  created_at: string;
}
/** Partie privée : jamais lue par les visiteurs. */
export interface ProductPrivate {
  product_id: string;
  content_url: string;
  delivery_message: string;
}
export interface Order {
  id: string;
  product_id: string;
  product_name: string;
  amount: number;
  customer_name: string;
  customer_phone: string;
  txn_ref: string;
  status: "en_attente" | "verifie" | "refuse";
  created_at: string;
}

export function slugify(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Règles de publication : identiques pour tous les types. Renvoie la liste des erreurs. */
export function validateProduct(p: Partial<Product>, priv: Partial<ProductPrivate>): string[] {
  const e: string[] = [];
  if (!p.type) e.push("Choisissez un type.");
  if (!p.name || p.name.trim().length < 3) e.push("Nom : 3 caractères minimum.");
  if (!p.short_description || p.short_description.trim().length < 10) e.push("Résumé : 10 caractères minimum.");
  if (!p.description || p.description.trim().length < 30) e.push("Description : 30 caractères minimum.");
  if (!p.price || p.price < 100) e.push("Prix : 100 FCFA minimum.");
  if (p.compare_price != null && p.price != null && p.compare_price <= p.price) e.push("Le prix barré doit être supérieur au prix.");
  if (!p.cover_url) e.push("Image de couverture obligatoire.");
  if (!p.category || !p.category.trim()) e.push("Catégorie obligatoire.");
  if (!priv.content_url) e.push("Contenu livré (fichier, vidéo ou lien) obligatoire.");
  return e;
}

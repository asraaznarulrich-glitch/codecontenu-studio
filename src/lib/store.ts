import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";
import type { Order, Product, ProductPrivate } from "./products";

export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
export const isDemo = !supabase;

// --- Mode démo (Supabase pas encore configuré) : stockage local du navigateur ---
const LS = { p: "cc_products", v: "cc_private", o: "cc_orders" };
const read = <T,>(k: string, d: T): T => {
  if (typeof window === "undefined") return d;
  try { return JSON.parse(localStorage.getItem(k) ?? "") as T; } catch { return d; }
};
const write = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));
const uid = () => crypto.randomUUID();

export async function listPublished(): Promise<Product[]> {
  if (supabase) {
    const { data, error } = await supabase.from("products").select("*").eq("published", true).order("created_at", { ascending: false });
    if (error) throw error;
    return data as Product[];
  }
  return read<Product[]>(LS.p, []).filter((p) => p.published);
}
export async function getPublished(slug: string): Promise<Product | null> {
  if (supabase) {
    const { data } = await supabase.from("products").select("*").eq("slug", slug).eq("published", true).maybeSingle();
    return (data as Product) ?? null;
  }
  return read<Product[]>(LS.p, []).find((p) => p.slug === slug && p.published) ?? null;
}
export async function createOrder(o: Omit<Order, "id" | "created_at" | "status">) {
  if (supabase) {
    const { error } = await supabase.from("orders").insert(o);
    if (error) throw error;
    return;
  }
  write(LS.o, [{ ...o, id: uid(), status: "en_attente", created_at: new Date().toISOString() }, ...read<Order[]>(LS.o, [])]);
}

// --- Admin ---
export async function adminListProducts(): Promise<(Product & { priv?: ProductPrivate | undefined })[]> {
  if (supabase) {
    const { data, error } = await supabase.from("products").select("*, priv:product_private(*)").order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({ ...r, priv: Array.isArray(r.priv) ? r.priv[0] : r.priv }));
  }
  const privs = read<ProductPrivate[]>(LS.v, []);
  return read<Product[]>(LS.p, []).map((p) => ({ ...p, priv: privs.find((x) => x.product_id === p.id) }));
}
export async function adminSaveProduct(p: Partial<Product>, priv: Omit<ProductPrivate, "product_id">) {
  if (supabase) {
    const { priv: _x, ...clean } = p as any;
    const { data, error } = await supabase.from("products").upsert(clean).select().single();
    if (error) throw error;
    const { error: e2 } = await supabase.from("product_private").upsert({ product_id: data.id, ...priv });
    if (e2) throw e2;
    return;
  }
  const all = read<Product[]>(LS.p, []);
  const id = p.id ?? uid();
  const full = { ...p, id, created_at: p.created_at ?? new Date().toISOString() } as Product;
  delete (full as any).priv;
  write(LS.p, [full, ...all.filter((x) => x.id !== id)]);
  write(LS.v, [{ product_id: id, ...priv }, ...read<ProductPrivate[]>(LS.v, []).filter((x) => x.product_id !== id)]);
}
export async function adminDeleteProduct(id: string) {
  if (supabase) { const { error } = await supabase.from("products").delete().eq("id", id); if (error) throw error; return; }
  write(LS.p, read<Product[]>(LS.p, []).filter((x) => x.id !== id));
}
export async function adminListOrders(): Promise<Order[]> {
  if (supabase) {
    const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data as Order[];
  }
  return read<Order[]>(LS.o, []);
}
export async function adminSetOrderStatus(id: string, status: Order["status"]) {
  if (supabase) { const { error } = await supabase.from("orders").update({ status }).eq("id", id); if (error) throw error; return; }
  write(LS.o, read<Order[]>(LS.o, []).map((o) => (o.id === id ? { ...o, status } : o)));
}
/** Envoi d'un PDF / vidéo / image vers le stockage Supabase (bucket « products »). */
export async function uploadFile(file: File, folder: "covers" | "contents"): Promise<string> {
  if (!supabase) {
    if (file.size > 1_500_000) throw new Error("Mode démo : fichier trop lourd. Collez plutôt un lien, ou configurez Supabase.");
    return await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(file); });
  }
  const path = `${folder}/${uid()}-${file.name.replace(/[^\w.-]/g, "_")}`;
  const bucket = folder === "covers" ? "covers" : "contents";
  const { error } = await supabase.storage.from(bucket).upload(path, file);
  if (error) throw error;
  if (bucket === "covers") return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  const { data, error: e2 } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
  if (e2) throw e2;
  return data.signedUrl;
}

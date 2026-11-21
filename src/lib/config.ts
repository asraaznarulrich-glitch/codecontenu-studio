// Paiement & contact — les numéros ne sont jamais affichés dans la boutique.
export const AIRTEL_USSD_PREFIX = "*436*6*1*";
export const WHATSAPP_ALERT = "23564043744";
export const SUPABASE_URL = import.meta.env['VITE_SUPABASE_URL'] as string | undefined;
export const SUPABASE_ANON_KEY = import.meta.env['VITE_SUPABASE_ANON_KEY'] as string | undefined;
export const BACKEND_URL = (import.meta.env['VITE_BACKEND_URL'] as string | undefined) ?? "http://localhost:8787";

/** Lien « tel: » qui compose *436*6*1*montant# (le # est encodé). */
export function ussdLink(amount: number) {
  return `tel:${encodeURIComponent(`${AIRTEL_USSD_PREFIX}${Math.round(amount)}#`)}`;
}
export function ussdCode(amount: number) {
  return `${AIRTEL_USSD_PREFIX}${Math.round(amount)}#`;
}
export function formatFcfa(n: number) {
  return `${new Intl.NumberFormat("fr-FR").format(n).replace(/\u202f|\u00a0/g, " ")} FCFA`;
}

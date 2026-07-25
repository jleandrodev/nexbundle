/**
 * Fonte de verdade da prioridade de locale do ADMIN:
 *   override no DB (ShopPreference) → ?locale= do Shopify → fallback (pt-BR)
 *
 * O override manual do lojista vence o ?locale= que o Shopify reinjeta a cada load,
 * senão a escolha manual "sumiria" ao navegar.
 */
import prisma from "../db.server";
import { normalizeLocale, type SupportedLng } from "./config";
import { localeCookie } from "./i18next.server";

/** Resolve o locale efetivo do admin para uma loja autenticada. */
export async function resolveAdminLocale(
  request: Request,
  shop: string,
): Promise<SupportedLng> {
  const pref = await prisma.shopPreference.findUnique({ where: { shop } });
  const override = pref?.adminLocale ?? null;
  const shopParam = new URL(request.url).searchParams.get("locale");
  return normalizeLocale(override ?? shopParam);
}

/** Serializa o cookie-espelho do locale (usado em Set-Cookie). */
export function serializeLocaleCookie(locale: SupportedLng): Promise<string> {
  return localeCookie.serialize(locale);
}

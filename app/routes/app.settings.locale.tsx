/**
 * Resource route (sem UI) que persiste a escolha manual de idioma do lojista.
 * Grava em ShopPreference (fonte de verdade) e espelha no cookie de locale.
 */
import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { normalizeLocale } from "../i18n/config";
import { serializeLocaleCookie } from "../i18n/resolve.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const locale = normalizeLocale(String(formData.get("locale") ?? ""));

  await prisma.shopPreference.upsert({
    where: { shop: session.shop },
    create: { shop: session.shop, adminLocale: locale },
    update: { adminLocale: locale },
  });

  return json(
    { locale },
    { headers: { "Set-Cookie": await serializeLocaleCookie(locale) } },
  );
};

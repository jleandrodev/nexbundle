/**
 * Info básica da loja (cacheável no futuro). Hoje: timezone IANA da loja,
 * usado como fuso de exibição padrão do dashboard/timeline.
 */
type AdminGraphql = {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
};

const SHOP_INFO_QUERY = `#graphql
  query ShopInfo {
    shop {
      ianaTimezone
      currencyCode
    }
  }
`;

export type ShopInfo = { timezone: string; currency: string };

const FALLBACK: ShopInfo = { timezone: "America/Sao_Paulo", currency: "BRL" };

export async function getShopInfo(admin: AdminGraphql, _shop: string): Promise<ShopInfo> {
  try {
    const res = await admin.graphql(SHOP_INFO_QUERY);
    const body = (await res.json()) as {
      data?: { shop?: { ianaTimezone?: string; currencyCode?: string } };
    };
    const shop = body?.data?.shop;
    return {
      timezone: shop?.ianaTimezone || FALLBACK.timezone,
      currency: shop?.currencyCode || FALLBACK.currency,
    };
  } catch {
    return FALLBACK;
  }
}

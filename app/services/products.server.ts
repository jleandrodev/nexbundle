/**
 * Enriquecimento de produtos via Admin GraphQL.
 * Padrão do boilerplate (admin-graphql-patterns.md): 1 query barata com nodes(ids:[...]),
 * campos mínimos, cuidado com custo. Resolve título, imagem, preço e 1ª variante disponível.
 */

export type EnrichedProduct = {
  productId: string; // gid://shopify/Product/...
  variantId: string | null; // numérico? não — aqui é o id numérico da variante para /cart/add.js
  title: string;
  image: string | null;
  price: number; // em centavos
  available: boolean;
  url: string;
};

// Extrai o id numérico de um gid (gid://shopify/ProductVariant/123 -> "123").
function numericId(gid: string | null | undefined): string | null {
  if (!gid) return null;
  const m = String(gid).match(/(\d+)$/);
  return m ? m[1] : null;
}

const PRODUCTS_QUERY = `#graphql
  query BuyTogetherProducts($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        id
        title
        handle
        onlineStoreUrl
        featuredImage { url(transform: { maxWidth: 200, maxHeight: 200 }) altText }
        variants(first: 1) {
          nodes {
            id
            price
            availableForSale
          }
        }
      }
    }
  }
`;

type AdminGraphql = (
  query: string,
  options?: { variables?: Record<string, unknown> },
) => Promise<Response>;

/**
 * Recebe uma lista de { productId (gid), variantId? (gid) } e devolve os produtos
 * enriquecidos, preservando a ordem e ignorando os que não resolverem.
 */
export async function enrichProducts(
  admin: { graphql: AdminGraphql },
  items: Array<{ productId: string; variantId?: string | null }>,
): Promise<EnrichedProduct[]> {
  const ids = items.map((i) => i.productId).filter(Boolean);
  if (ids.length === 0) return [];

  const res = await admin.graphql(PRODUCTS_QUERY, { variables: { ids } });
  const body = (await res.json()) as {
    data?: { nodes?: Array<any | null> };
  };
  const nodes = body?.data?.nodes ?? [];

  // Mapa por productId para reidratar na ordem de `items`.
  const byId = new Map<string, any>();
  for (const node of nodes) {
    if (node && node.id) byId.set(node.id, node);
  }

  const result: EnrichedProduct[] = [];
  for (const item of items) {
    const node = byId.get(item.productId);
    if (!node) continue;
    const firstVariant = node.variants?.nodes?.[0];
    // Variante escolhida no painel, senão a 1ª disponível.
    const chosenVariantGid = item.variantId || firstVariant?.id || null;
    const priceStr = firstVariant?.price ?? "0";
    const priceCents = Math.round(parseFloat(priceStr) * 100);
    result.push({
      productId: node.id,
      variantId: numericId(chosenVariantGid),
      title: node.title ?? "",
      image: node.featuredImage?.url ?? null,
      price: isNaN(priceCents) ? 0 : priceCents,
      available: Boolean(firstVariant?.availableForSale),
      url: node.onlineStoreUrl || (node.handle ? `/products/${node.handle}` : "#"),
    });
  }
  return result;
}

/** Enriquece um único produto (ex.: o principal). */
export async function enrichOne(
  admin: { graphql: AdminGraphql },
  productId: string,
): Promise<EnrichedProduct | null> {
  const [p] = await enrichProducts(admin, [{ productId }]);
  return p ?? null;
}

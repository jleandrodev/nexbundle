/**
 * Enriquecimento de produtos via Admin GraphQL.
 * Padrão do boilerplate (admin-graphql-patterns.md): 1 query barata com nodes(ids:[...]),
 * campos mínimos, cuidado com custo. Resolve título, imagem, preço e as variantes
 * (com opções) que o componente usa nos seletores do storefront.
 */

export type EnrichedVariant = {
  id: string; // id NUMÉRICO (é o que /cart/add.js aceita)
  title: string; // "Preto / M"
  price: number; // centavos
  compareAtPrice: number | null; // centavos (preço "de")
  available: boolean;
  image: string | null; // imagem da variante (cai para a do produto quando nula)
  options: Array<{ name: string; value: string }>; // selectedOptions
};

export type EnrichedProduct = {
  productId: string; // gid://shopify/Product/...
  variantId: string | null; // id numérico da variante escolhida (padrão do componente)
  title: string;
  image: string | null;
  price: number; // em centavos (da variante escolhida)
  compareAtPrice: number | null; // em centavos
  available: boolean;
  url: string;
  // Nomes das opções na ordem do produto ("Cor", "Tamanho"). Vazio quando o produto
  // só tem a variante default ("Title / Default Title") — aí não há o que escolher.
  optionNames: string[];
  variants: EnrichedVariant[];
};

// Extrai o id numérico de um gid (gid://shopify/ProductVariant/123 -> "123").
function numericId(gid: string | null | undefined): string | null {
  if (!gid) return null;
  const m = String(gid).match(/(\d+)$/);
  return m ? m[1] : null;
}

function toCents(v: string | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = Math.round(parseFloat(String(v)) * 100);
  return isNaN(n) ? null : n;
}

// Produto sem opções reais vem com a opção sintética "Title" = "Default Title".
function isDefaultOption(o: { name?: string; value?: string }): boolean {
  return o?.name === "Title" && o?.value === "Default Title";
}

// Limite de variantes trazidas por produto. Cuidado com o custo da query (gotcha #13):
// nodes() com 50 variantes por produto já é o teto confortável para ~5 produtos.
const VARIANTS_LIMIT = 50;

const PRODUCTS_QUERY = `#graphql
  query BuyTogetherProducts($ids: [ID!]!, $variants: Int!) {
    nodes(ids: $ids) {
      ... on Product {
        id
        title
        handle
        featuredImage { url(transform: { maxWidth: 300, maxHeight: 300 }) altText }
        variants(first: $variants) {
          nodes {
            id
            title
            price
            compareAtPrice
            availableForSale
            image { url(transform: { maxWidth: 300, maxHeight: 300 }) }
            selectedOptions { name value }
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

  // Blindagem: um erro do Admin API (scope, custo, produto removido) NÃO pode derrubar
  // a página inteira. Degrada para "sem enriquecimento" (a UI cai no id/nome salvo).
  let nodes: Array<any | null> = [];
  try {
    const res = await admin.graphql(PRODUCTS_QUERY, {
      variables: { ids, variants: VARIANTS_LIMIT },
    });
    const body = (await res.json()) as { data?: { nodes?: Array<any | null> } };
    nodes = body?.data?.nodes ?? [];
  } catch (e) {
    console.error("[enrichProducts] Admin API falhou:", e);
    return [];
  }

  // Mapa por productId para reidratar na ordem de `items`.
  const byId = new Map<string, any>();
  for (const node of nodes) {
    if (node && node.id) byId.set(node.id, node);
  }

  const result: EnrichedProduct[] = [];
  for (const item of items) {
    const node = byId.get(item.productId);
    if (!node) continue;

    const productImage = node.featuredImage?.url ?? null;
    const variants: EnrichedVariant[] = (node.variants?.nodes ?? [])
      .filter((v: any) => v && v.id)
      .map((v: any) => ({
        id: numericId(v.id) as string,
        title: v.title ?? "",
        price: toCents(v.price) ?? 0,
        compareAtPrice: toCents(v.compareAtPrice),
        available: Boolean(v.availableForSale),
        image: v.image?.url ?? null,
        options: (v.selectedOptions ?? [])
          .filter((o: any) => !isDefaultOption(o))
          .map((o: any) => ({ name: o.name, value: o.value })),
      }))
      .filter((v: EnrichedVariant) => v.id);

    // Variante escolhida no painel; senão a 1ª disponível; senão a 1ª.
    const chosenId = numericId(item.variantId);
    const chosen =
      variants.find((v) => v.id === chosenId) ||
      variants.find((v) => v.available) ||
      variants[0];
    if (!chosen) continue;

    // Nomes das opções na ordem em que aparecem nas variantes.
    const optionNames: string[] = [];
    for (const v of variants) {
      for (const o of v.options) {
        if (!optionNames.includes(o.name)) optionNames.push(o.name);
      }
    }

    result.push({
      productId: node.id,
      variantId: chosen.id,
      title: node.title ?? "",
      image: chosen.image || productImage,
      price: chosen.price,
      compareAtPrice: chosen.compareAtPrice,
      available: variants.some((v) => v.available),
      url: node.handle ? `/products/${node.handle}` : "#",
      optionNames,
      variants,
    });
  }
  return result;
}

const CURRENCY_QUERY = `#graphql
  query BuyTogetherShopCurrency {
    shop { currencyCode }
  }
`;

/** Moeda da loja — usada só para formatar o preview do painel. */
export async function getShopCurrency(admin: { graphql: AdminGraphql }): Promise<string> {
  try {
    const res = await admin.graphql(CURRENCY_QUERY);
    const body = (await res.json()) as { data?: { shop?: { currencyCode?: string } } };
    return body?.data?.shop?.currencyCode || "BRL";
  } catch {
    return "BRL";
  }
}

/** Enriquece um único produto (ex.: o principal). */
export async function enrichOne(
  admin: { graphql: AdminGraphql },
  productId: string,
  variantId?: string | null,
): Promise<EnrichedProduct | null> {
  const [p] = await enrichProducts(admin, [{ productId, variantId }]);
  return p ?? null;
}

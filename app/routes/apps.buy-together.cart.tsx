/**
 * App Proxy — GET /apps/buy-together/cart?product_ids=<id,id,...>
 * Cross-sell da PÁGINA DE CARRINHO: recebe os produtos que já estão no carrinho e
 * devolve { enabled, suggestions } — companheiros de todos eles, sem os que já estão
 * no carrinho, deduplicados, disponíveis e limitados. Mesma origem (App Proxy):
 * sem CORS, sem session token; authenticate.public.appProxy verifica o HMAC.
 */
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { resolveCartCompanions } from "../services/relationships.server";
import { enrichProducts } from "../services/products.server";

// Máximo de sugestões exibidas no carrinho (evita poluir a página).
const MAX_SUGGESTIONS = 4;

// Normaliza product_id para gid (aceita numérico ou gid).
function toProductGid(raw: string): string | null {
  if (!raw) return null;
  if (raw.startsWith("gid://")) return raw;
  const m = raw.match(/(\d+)$/);
  return m ? `gid://shopify/Product/${m[1]}` : null;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, admin } = await authenticate.public.appProxy(request);
  if (!session || !admin) return json({ enabled: false });

  const url = new URL(request.url);
  const raw = url.searchParams.get("product_ids") || "";
  // Dedup dos ids do carrinho (várias linhas podem ser do mesmo produto).
  const productIds = Array.from(
    new Set(
      raw
        .split(",")
        .map((s) => toProductGid(s.trim()))
        .filter((v): v is string => Boolean(v)),
    ),
  );
  if (productIds.length === 0) return json({ enabled: false });

  const candidates = await resolveCartCompanions(session.shop, productIds);
  if (candidates.length === 0) return json({ enabled: false });

  const enriched = await enrichProducts(
    admin,
    candidates.map((c) => ({ productId: c.productId, variantId: c.variantId })),
  );

  // Reidrata relationshipId/discount por produto e mantém só disponíveis.
  const byId = new Map(candidates.map((c) => [c.productId, c]));
  const suggestions = enriched
    .filter((p) => p.variantId && p.available)
    .map((p) => {
      const c = byId.get(p.productId);
      return {
        ...p,
        relationshipId: c?.relationshipId ?? null,
        discount: c?.discount ?? { type: "none", value: 0 },
      };
    })
    .slice(0, MAX_SUGGESTIONS);

  if (suggestions.length === 0) return json({ enabled: false });

  return json({ enabled: true, suggestions });
}

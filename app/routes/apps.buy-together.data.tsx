/**
 * App Proxy — GET /apps/buy-together/data?product_id=<gid|numeric>
 * Retorna { enabled, config, mainProduct, companions } para o storefront.
 *
 * App Proxy = MESMA ORIGEM (loja.myshopify.com/apps/...): sem CORS, sem preflight,
 * sem network_access grant, sem session token. authenticate.public.appProxy verifica
 * a assinatura HMAC e devolve session (offline) + admin já autenticado.
 */
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { resolveForProduct } from "../services/relationships.server";
import { enrichProducts, enrichOne } from "../services/products.server";
import { parseStyle } from "../lib/templates";

// Normaliza product_id para gid (aceita numérico ou gid).
function toProductGid(raw: string | null): string | null {
  if (!raw) return null;
  if (raw.startsWith("gid://")) return raw;
  const m = raw.match(/(\d+)$/);
  return m ? `gid://shopify/Product/${m[1]}` : null;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, admin } = await authenticate.public.appProxy(request);

  // Loja não instalada / sessão ausente -> desliga silenciosamente.
  if (!session || !admin) return json({ enabled: false });

  const url = new URL(request.url);
  const mainProductId = toProductGid(url.searchParams.get("product_id"));
  if (!mainProductId) return json({ enabled: false });

  // O bloco de tema informa seu layout; só resolve componente com esse template.
  const layout = url.searchParams.get("layout");
  const resolved = await resolveForProduct(session.shop, mainProductId, layout);
  if (!resolved || resolved.companions.length === 0) {
    return json({ enabled: false });
  }

  // Enriquece companheiros + produto principal numa via barata.
  const [companions, mainProduct] = await Promise.all([
    enrichProducts(admin, resolved.companions),
    enrichOne(admin, mainProductId),
  ]);

  const usable = companions.filter((c) => c.variantId && c.available);
  if (usable.length === 0) return json({ enabled: false });

  return json({
    enabled: true,
    // Id do relacionamento: vai como propriedade de linha (_bt_bundle) no /cart/add.js
    // e é a chave que a Shopify Function usa para achar o desconto do bundle.
    relationshipId: resolved.id,
    mainProductId,
    template: resolved.template, // side-by-side | list | compact
    style: parseStyle(resolved.style), // estilo por componente (mesclado com defaults)
    discount: resolved.discount, // { type, value } — o front só EXIBE; quem aplica é a Function
    mainProduct,
    companions: usable,
  });
}

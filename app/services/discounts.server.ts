/**
 * Ciclo de vida do desconto automático (Shopify Function) do Buy Together.
 *
 * 1 desconto por loja. A configuração de TODOS os bundles vive num metafield JSON no
 * discount node; a Function (extensions/buy-together-discount) lê esse metafield e casa
 * pela propriedade de linha `_bt_bundle` = Relationship.id.
 *
 * Nada aqui pode derrubar o save do relacionamento: as falhas são logadas e devolvidas
 * como { ok: false, reason }, nunca lançadas.
 */
import prisma from "../db.server";
import { normalizeDiscount } from "../lib/templates";

export const DISCOUNT_NAMESPACE = "$app:buy-together";
export const DISCOUNT_KEY = "function-configuration";
/** Precisa bater com o `name` do extensions/buy-together-discount/shopify.extension.toml. */
export const FUNCTION_TITLE = "Buy Together Discount";
const DISCOUNT_TITLE = "Buy Together — desconto do bundle";

type AdminGraphql = (
  query: string,
  options?: { variables?: Record<string, unknown> },
) => Promise<Response>;
type Admin = { graphql: AdminGraphql };

export type SyncResult =
  | { ok: true; nodeId: string | null }
  | { ok: false; reason: string };

const FUNCTIONS_QUERY = `#graphql
  query BuyTogetherFunctions {
    shopifyFunctions(first: 50) {
      nodes {
        id
        title
        apiType
      }
    }
  }
`;

const CREATE_MUTATION = `#graphql
  mutation BuyTogetherDiscountCreate($discount: DiscountAutomaticAppInput!) {
    discountAutomaticAppCreate(automaticAppDiscount: $discount) {
      automaticAppDiscount { discountId }
      userErrors { field message }
    }
  }
`;

const METAFIELDS_SET = `#graphql
  mutation BuyTogetherDiscountConfig($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { id }
      userErrors { field message }
    }
  }
`;

const NODE_EXISTS = `#graphql
  query BuyTogetherDiscountNode($id: ID!) {
    discountNode(id: $id) { id }
  }
`;

async function gql<T>(admin: Admin, query: string, variables?: Record<string, unknown>) {
  const res = await admin.graphql(query, variables ? { variables } : undefined);
  return (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
}

function firstUserError(payload: any): string | null {
  const errs = payload?.userErrors;
  if (Array.isArray(errs) && errs.length) return errs[0]?.message || "userError";
  return null;
}

/** Monta o JSON de configuração a partir dos relacionamentos com desconto da loja. */
export async function buildConfig(shop: string) {
  const rels = await prisma.relationship.findMany({
    where: { shop, enabled: true, discountType: { not: "none" } },
    select: { id: true, name: true, discountType: true, discountValue: true },
  });
  const bundles: Record<string, { type: string; value: number; title: string }> = {};
  for (const r of rels) {
    const d = normalizeDiscount(r.discountType, r.discountValue);
    if (d.type === "none") continue;
    bundles[r.id] = { type: d.type, value: d.value, title: r.name || DISCOUNT_TITLE };
  }
  return { bundles };
}

/** Acha o id da Function pelo título da extensão (fallback: 1ª function de desconto). */
async function findFunctionId(admin: Admin): Promise<string | null> {
  const body = await gql<{ shopifyFunctions: { nodes: Array<any> } }>(admin, FUNCTIONS_QUERY);
  const nodes = body?.data?.shopifyFunctions?.nodes ?? [];
  const byTitle = nodes.find((n) => n?.title === FUNCTION_TITLE);
  if (byTitle?.id) return byTitle.id;
  const byType = nodes.find((n) => String(n?.apiType || "").includes("discount"));
  return byType?.id ?? null;
}

async function nodeStillExists(admin: Admin, nodeId: string): Promise<boolean> {
  try {
    const body = await gql<{ discountNode: { id: string } | null }>(admin, NODE_EXISTS, {
      id: nodeId,
    });
    return Boolean(body?.data?.discountNode?.id);
  } catch {
    return false;
  }
}

async function writeConfig(admin: Admin, nodeId: string, value: string): Promise<string | null> {
  const body = await gql<{ metafieldsSet: any }>(admin, METAFIELDS_SET, {
    metafields: [
      {
        ownerId: nodeId,
        namespace: DISCOUNT_NAMESPACE,
        key: DISCOUNT_KEY,
        type: "json",
        value,
      },
    ],
  });
  if (body?.errors?.length) return body.errors[0].message;
  return firstUserError(body?.data?.metafieldsSet);
}

/**
 * Garante que o desconto automático existe e está com a configuração atual.
 * Idempotente: chame depois de todo create/update/delete de relacionamento.
 */
export async function syncBundleDiscount(admin: Admin, shop: string): Promise<SyncResult> {
  try {
    const config = await buildConfig(shop);
    const value = JSON.stringify(config);
    const saved = await prisma.appDiscount.findUnique({ where: { shop } });

    // Já existe: só reescreve o metafield (se o desconto não foi apagado no admin).
    if (saved && (await nodeStillExists(admin, saved.nodeId))) {
      const err = await writeConfig(admin, saved.nodeId, value);
      if (err) return { ok: false, reason: err };
      await prisma.appDiscount.update({
        where: { shop },
        data: { nodeId: saved.nodeId, functionId: saved.functionId },
      });
      return { ok: true, nodeId: saved.nodeId };
    }

    // Sem bundles com desconto e sem desconto criado: não cria nada.
    if (Object.keys(config.bundles).length === 0) return { ok: true, nodeId: null };

    const functionId = await findFunctionId(admin);
    if (!functionId) {
      return { ok: false, reason: "function-not-found" };
    }

    const body = await gql<{ discountAutomaticAppCreate: any }>(admin, CREATE_MUTATION, {
      discount: {
        title: DISCOUNT_TITLE,
        functionId,
        startsAt: new Date().toISOString(),
        combinesWith: {
          orderDiscounts: true,
          productDiscounts: false,
          shippingDiscounts: true,
        },
        metafields: [
          {
            namespace: DISCOUNT_NAMESPACE,
            key: DISCOUNT_KEY,
            type: "json",
            value,
          },
        ],
      },
    });
    if (body?.errors?.length) return { ok: false, reason: body.errors[0].message };
    const userError = firstUserError(body?.data?.discountAutomaticAppCreate);
    if (userError) return { ok: false, reason: userError };

    const nodeId = body?.data?.discountAutomaticAppCreate?.automaticAppDiscount?.discountId;
    if (!nodeId) return { ok: false, reason: "missing-discount-id" };

    await prisma.appDiscount.upsert({
      where: { shop },
      create: { shop, nodeId, functionId },
      update: { nodeId, functionId },
    });
    return { ok: true, nodeId };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "unknown" };
  }
}

/**
 * Wrapper "não estrague o save": loga a falha e segue. O componente continua funcionando —
 * só o desconto no checkout fica pendente até a próxima sincronização.
 */
export async function syncBundleDiscountSafe(admin: Admin, shop: string) {
  const result = await syncBundleDiscount(admin, shop);
  if (!result.ok) {
    console.warn(`[buy-together] falha ao sincronizar desconto (${shop}): ${result.reason}`);
  }
  return result;
}

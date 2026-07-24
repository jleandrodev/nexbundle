/**
 * CRUD de relacionamentos Buy Together (1 produto principal -> N companheiros).
 * Multi-tenant: TODA query é filtrada por `shop`.
 */
import prisma from "../db.server";

export type CompanionInput = {
  companionProductId: string; // gid
  companionVariantId?: string | null; // gid opcional
};

/** Nº de relacionamentos (produtos principais) da loja — usado para o limite do plano. */
export async function countRelationships(shop: string) {
  return prisma.relationship.count({ where: { shop } });
}

export async function listRelationships(shop: string) {
  return prisma.relationship.findMany({
    where: { shop },
    include: { companions: { orderBy: { position: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getRelationship(shop: string, id: string) {
  return prisma.relationship.findFirst({
    where: { id, shop },
    include: { companions: { orderBy: { position: "asc" } } },
  });
}

/** Busca pelo produto principal (usado pelo App Proxy no storefront). */
export async function getRelationshipByMain(shop: string, mainProductId: string) {
  return prisma.relationship.findFirst({
    where: { shop, mainProductId, enabled: true },
    include: { companions: { orderBy: { position: "asc" } } },
  });
}

export async function createRelationship(
  shop: string,
  data: {
    mainProductId: string;
    layout?: string;
    enabled?: boolean;
    companions: CompanionInput[];
  },
) {
  return prisma.relationship.create({
    data: {
      shop,
      mainProductId: data.mainProductId,
      layout: data.layout ?? "A",
      enabled: data.enabled ?? true,
      companions: {
        create: data.companions.map((c, i) => ({
          companionProductId: c.companionProductId,
          companionVariantId: c.companionVariantId ?? null,
          position: i,
        })),
      },
    },
    include: { companions: true },
  });
}

export async function updateRelationship(
  shop: string,
  id: string,
  data: {
    mainProductId: string;
    layout?: string;
    enabled?: boolean;
    companions: CompanionInput[];
  },
) {
  // Garante que o registro pertence à loja antes de mutar.
  const existing = await prisma.relationship.findFirst({ where: { id, shop } });
  if (!existing) return null;

  // Substitui os companheiros (delete + recreate mantém a ordenação simples).
  return prisma.relationship.update({
    where: { id },
    data: {
      mainProductId: data.mainProductId,
      layout: data.layout ?? existing.layout,
      enabled: data.enabled ?? existing.enabled,
      companions: {
        deleteMany: {},
        create: data.companions.map((c, i) => ({
          companionProductId: c.companionProductId,
          companionVariantId: c.companionVariantId ?? null,
          position: i,
        })),
      },
    },
    include: { companions: true },
  });
}

/** Faz o parse dos campos hidden (JSON) enviados pelo RelationshipForm. */
export function parseRelationshipForm(form: FormData):
  | {
      ok: true;
      value: {
        mainProductId: string;
        layout: string;
        enabled: boolean;
        companions: CompanionInput[];
      };
    }
  | { ok: false; error: string } {
  try {
    const mainRaw = String(form.get("main") || "");
    const compRaw = String(form.get("companions") || "[]");
    const layout = String(form.get("layout") || "A");
    const enabled = String(form.get("enabled") || "1") === "1";

    const main = mainRaw && mainRaw !== '""' ? JSON.parse(mainRaw) : null;
    if (!main?.productId) {
      return { ok: false, error: "Selecione o produto principal." };
    }
    const companionsParsed = JSON.parse(compRaw) as Array<{
      productId: string;
      variantId?: string | null;
    }>;
    const companions = (companionsParsed || [])
      .filter((c) => c?.productId)
      .map((c) => ({
        companionProductId: c.productId,
        companionVariantId: c.variantId ?? null,
      }));
    if (companions.length === 0) {
      return { ok: false, error: "Selecione ao menos um produto companheiro." };
    }
    return {
      ok: true,
      value: { mainProductId: main.productId, layout, enabled, companions },
    };
  } catch (e) {
    return { ok: false, error: "Dados do formulário inválidos." };
  }
}

export async function deleteRelationship(shop: string, id: string) {
  const existing = await prisma.relationship.findFirst({ where: { id, shop } });
  if (!existing) return false;
  await prisma.relationship.delete({ where: { id } }); // companions caem por cascade
  return true;
}

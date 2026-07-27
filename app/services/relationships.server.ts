/**
 * CRUD de relacionamentos Buy Together (1 produto principal -> N companheiros).
 * Multi-tenant: TODA query é filtrada por `shop`.
 */
import prisma from "../db.server";
import { normalizeDiscount, type BundleDiscount } from "../lib/templates";

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

/**
 * Resolve o que mostrar na página de um produto (App Proxy), tratando uni/bi:
 *  1) Se o produto é PRINCIPAL de um relacionamento ativo → mostra os companheiros dele.
 *  2) Senão, se é COMPANHEIRO de um relacionamento BIDIRECIONAL ativo → mostra o principal.
 * Retorna layout + a lista de produtos (gid + variante) para o proxy enriquecer.
 */
export async function resolveForProduct(shop: string, productId: string) {
  // Pode haver mais de um componente com o mesmo principal: mostra o 1º ativo
  // (o mais antigo), de forma determinística.
  const asMain = await prisma.relationship.findFirst({
    where: { shop, mainProductId: productId, enabled: true },
    orderBy: { createdAt: "asc" },
    include: { companions: { orderBy: { position: "asc" } } },
  });
  if (asMain && asMain.companions.length > 0) {
    return {
      id: asMain.id,
      template: asMain.template,
      style: asMain.style,
      discount: normalizeDiscount(asMain.discountType, asMain.discountValue),
      companions: asMain.companions.map((c) => ({
        productId: c.companionProductId,
        variantId: c.companionVariantId,
      })),
    };
  }

  const asCompanion = await prisma.relationship.findFirst({
    where: {
      shop,
      enabled: true,
      direction: "bi",
      companions: { some: { companionProductId: productId } },
    },
  });
  if (asCompanion) {
    return {
      id: asCompanion.id,
      template: asCompanion.template,
      style: asCompanion.style,
      discount: normalizeDiscount(asCompanion.discountType, asCompanion.discountValue),
      companions: [{ productId: asCompanion.mainProductId, variantId: null }],
    };
  }

  return null;
}

export async function createRelationship(
  shop: string,
  data: {
    mainProductId: string;
    name?: string;
    template?: string;
    style?: string;
    direction?: string;
    enabled?: boolean;
    discount?: BundleDiscount;
    companions: CompanionInput[];
  },
) {
  const discount = normalizeDiscount(data.discount?.type, data.discount?.value);
  return prisma.relationship.create({
    data: {
      shop,
      name: data.name ?? "",
      mainProductId: data.mainProductId,
      template: data.template ?? "side-by-side",
      style: data.style ?? "{}",
      direction: data.direction ?? "uni",
      enabled: data.enabled ?? true,
      discountType: discount.type,
      discountValue: discount.value,
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
    name?: string;
    template?: string;
    style?: string;
    direction?: string;
    enabled?: boolean;
    discount?: BundleDiscount;
    companions: CompanionInput[];
  },
) {
  // Garante que o registro pertence à loja antes de mutar.
  const existing = await prisma.relationship.findFirst({ where: { id, shop } });
  if (!existing) return null;

  const discount = data.discount
    ? normalizeDiscount(data.discount.type, data.discount.value)
    : normalizeDiscount(existing.discountType, existing.discountValue);

  // Substitui os companheiros (delete + recreate mantém a ordenação simples).
  return prisma.relationship.update({
    where: { id },
    data: {
      name: data.name ?? existing.name,
      mainProductId: data.mainProductId,
      template: data.template ?? existing.template,
      style: data.style ?? existing.style,
      direction: data.direction ?? existing.direction,
      enabled: data.enabled ?? existing.enabled,
      discountType: discount.type,
      discountValue: discount.value,
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
        name: string;
        template: string;
        style: string;
        direction: string;
        enabled: boolean;
        discount: BundleDiscount;
        companions: CompanionInput[];
      };
    }
  | { ok: false; error: string } {
  try {
    const mainRaw = String(form.get("main") || "");
    const compRaw = String(form.get("companions") || "[]");
    const name = String(form.get("name") || "").trim();
    const template = String(form.get("template") || "side-by-side");
    const style = String(form.get("style") || "{}");
    const direction = String(form.get("direction") || "uni") === "bi" ? "bi" : "uni";
    const enabled = String(form.get("enabled") || "1") === "1";
    const discount = normalizeDiscount(
      String(form.get("discountType") || "none"),
      String(form.get("discountValue") || "0"),
    );

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
    // Nome vazio → usa o título do produto principal como fallback.
    const finalName = name || String(main.title || "Componente Buy Together");
    return {
      ok: true,
      value: {
        mainProductId: main.productId,
        name: finalName,
        template,
        style,
        direction,
        enabled,
        discount,
        companions,
      },
    };
  } catch (e) {
    return { ok: false, error: "Dados do formulário inválidos." };
  }
}

export async function setRelationshipEnabled(
  shop: string,
  id: string,
  enabled: boolean,
) {
  const existing = await prisma.relationship.findFirst({ where: { id, shop } });
  if (!existing) return false;
  await prisma.relationship.update({ where: { id }, data: { enabled } });
  return true;
}

export async function deleteRelationship(shop: string, id: string) {
  const existing = await prisma.relationship.findFirst({ where: { id, shop } });
  if (!existing) return false;
  await prisma.relationship.delete({ where: { id } }); // companions caem por cascade
  return true;
}

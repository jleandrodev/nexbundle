/**
 * Config de estilo GLOBAL por loja. getStyling é idempotente (cria default na 1ª vez),
 * para nunca quebrar tela em loja nova. Ver configurable-apps.md.
 */
import prisma from "../db.server";

export type StylingData = {
  backgroundColor: string;
  textColor: string;
  titleColor: string;
  buttonColor: string;
  buttonTextColor: string;
  addButtonText: string;
  titleText: string;
};

export const STYLING_DEFAULTS: StylingData = {
  backgroundColor: "#ffffff",
  textColor: "#1a1a1a",
  titleColor: "#1a1a1a",
  buttonColor: "#000000",
  buttonTextColor: "#ffffff",
  addButtonText: "Adicionar ambos ao carrinho",
  titleText: "Compre junto",
};

export async function getStyling(shop: string): Promise<StylingData> {
  const existing = await prisma.stylingConfig.findUnique({ where: { shop } });
  if (existing) {
    const { shop: _s, updatedAt: _u, ...rest } = existing;
    return rest;
  }
  return { ...STYLING_DEFAULTS };
}

export async function upsertStyling(
  shop: string,
  data: Partial<StylingData>,
): Promise<StylingData> {
  const merged = { ...STYLING_DEFAULTS, ...data };
  const saved = await prisma.stylingConfig.upsert({
    where: { shop },
    create: { shop, ...merged },
    update: merged,
  });
  const { shop: _s, updatedAt: _u, ...rest } = saved;
  return rest;
}

/**
 * Promoções agendadas — acesso ao banco + mapeamento para o tipo do app.
 * A lógica de janelas/status vive em app/lib/schedule.ts (pura); aqui só re-exporta.
 */
import prisma from "../db.server";
import {
  formatWeekdays,
  nextWindowOf,
  parseWeekdays,
  promotionStatus,
  type Recurrence,
} from "../lib/schedule";

export { nextWindowOf, promotionStatus };

/** Promoção no formato do app (weekdays já como number[]). */
export type Promotion = {
  id: string;
  shop: string;
  name: string;
  enabled: boolean;
  timezone: string;
  recurrence: Recurrence | string;
  weekdays: number[];
  startTime: string;
  endTime: string;
  validFrom: Date | null;
  validUntil: Date | null;
  syncError: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type Row = {
  id: string; shop: string; name: string; enabled: boolean; timezone: string;
  recurrence: string; weekdays: string; startTime: string; endTime: string;
  validFrom: Date | null; validUntil: Date | null; syncError: string | null;
  createdAt: Date; updatedAt: Date;
};

function toPromotion(r: Row): Promotion {
  return { ...r, weekdays: parseWeekdays(r.weekdays) };
}

export async function listPromotions(shop: string): Promise<Promotion[]> {
  const rows = await prisma.promotion.findMany({
    where: { shop },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(toPromotion);
}

export async function getPromotion(shop: string, id: string): Promise<Promotion | null> {
  const r = await prisma.promotion.findFirst({ where: { shop, id } });
  return r ? toPromotion(r) : null;
}

/** Nº de promoções ativas (contam para o limite do plano). */
export async function countActivePromotions(shop: string): Promise<number> {
  return prisma.promotion.count({ where: { shop, enabled: true } });
}

export type PromotionInput = {
  name: string;
  enabled: boolean;
  timezone: string;
  recurrence: Recurrence | string;
  weekdays: number[];
  startTime: string;
  endTime: string;
  validFrom: Date | null;
  validUntil: Date | null;
};

export async function createPromotion(shop: string, input: PromotionInput): Promise<Promotion> {
  const r = await prisma.promotion.create({
    data: { shop, ...input, weekdays: formatWeekdays(input.weekdays) },
  });
  return toPromotion(r);
}

export async function updatePromotion(
  shop: string,
  id: string,
  input: PromotionInput,
): Promise<Promotion | null> {
  const res = await prisma.promotion.updateMany({
    where: { shop, id },
    data: { ...input, weekdays: formatWeekdays(input.weekdays) },
  });
  if (res.count === 0) return null;
  return getPromotion(shop, id);
}

export async function deletePromotion(shop: string, id: string): Promise<void> {
  await prisma.promotion.deleteMany({ where: { shop, id } });
}

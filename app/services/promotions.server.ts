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

const HHMM = /^([01]?\d|2[0-3]):[0-5]\d$/;

/** Só 0..6, a partir de CSV ("1,3,5") ou JSON ("[1,3,5]"). */
function parseWeekdaysField(raw: string): number[] {
  const s = (raw || "").trim();
  if (!s) return [];
  let nums: number[] = [];
  if (s.startsWith("[")) {
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) nums = arr.map((n) => parseInt(String(n), 10));
    } catch {
      nums = [];
    }
  } else {
    nums = s.split(",").map((x) => parseInt(x, 10));
  }
  return [...new Set(nums)].filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
}

/** Data local simples (meia-noite local) a partir de "yyyy-mm-dd"; vazio → null. */
function parseDateField(raw: string): Date | null {
  const s = (raw || "").trim();
  if (!s) return null;
  const d = new Date(`${s}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Lê o FormData do PromotionForm e valida. Erro → chave i18n (namespace "promotions").
 */
export function parsePromotionForm(
  form: FormData,
):
  | { ok: true; value: PromotionInput }
  | { ok: false; error: string } {
  const name = String(form.get("name") || "").trim();
  const enabled = String(form.get("enabled") || "1") === "1";
  const recRaw = String(form.get("recurrence") || "daily");
  const recurrence: Recurrence =
    recRaw === "once" || recRaw === "weekly" ? recRaw : "daily";
  const weekdays = parseWeekdaysField(String(form.get("weekdays") || ""));
  const startTime = String(form.get("startTime") || "").trim();
  const endTime = String(form.get("endTime") || "").trim();
  const timezone = String(form.get("timezone") || "").trim() || "America/Sao_Paulo";
  const validFrom = parseDateField(String(form.get("validFrom") || ""));
  const validUntil = parseDateField(String(form.get("validUntil") || ""));

  if (!name) return { ok: false, error: "errors.name" };
  if (recurrence === "weekly" && weekdays.length < 1) {
    return { ok: false, error: "errors.weekdays" };
  }
  if (!HHMM.test(startTime) || !HHMM.test(endTime)) {
    return { ok: false, error: "errors.time" };
  }

  return {
    ok: true,
    value: {
      name,
      enabled,
      timezone,
      recurrence,
      weekdays: recurrence === "weekly" ? weekdays : [],
      startTime,
      endTime,
      validFrom,
      validUntil,
    },
  };
}

/**
 * Métricas Buy Together. Event log cru (MetricEvent) -> agregação por groupBy.
 * A gravação NUNCA deve derrubar a resposta ao storefront (try/catch no caller).
 */
import prisma from "../db.server";

export type MetricInput = {
  type: "impression" | "click";
  mainProductId: string;
  companionProductId?: string | null;
  layout?: string | null;
};

export async function recordEvent(shop: string, input: MetricInput) {
  if (input.type !== "impression" && input.type !== "click") return;
  if (!input.mainProductId) return;
  await prisma.metricEvent.create({
    data: {
      shop,
      type: input.type,
      mainProductId: input.mainProductId,
      companionProductId: input.companionProductId ?? null,
      layout: input.layout ?? null,
    },
  });
}

/** Série diária (impressões e cliques por dia) para o gráfico. Eixo contínuo. */
export async function getDailyMetrics(shop: string, days = 30) {
  const now = Date.now();
  const from = new Date(now - days * 86400000);
  const events = await prisma.metricEvent.findMany({
    where: { shop, createdAt: { gte: from } },
    select: { createdAt: true, type: true },
  });

  const buckets = new Map<string, { impressions: number; clicks: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const key = new Date(now - i * 86400000).toISOString().slice(0, 10);
    buckets.set(key, { impressions: 0, clicks: 0 });
  }
  for (const e of events) {
    const key = e.createdAt.toISOString().slice(0, 10);
    const b = buckets.get(key);
    if (!b) continue;
    if (e.type === "click") b.clicks++;
    else b.impressions++;
  }
  return Array.from(buckets.entries()).map(([day, v]) => ({ day, ...v }));
}

/** Últimos eventos (para a tabela de atividade). */
export async function getRecentEvents(shop: string, limit = 12) {
  const rows = await prisma.metricEvent.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    mainProductId: r.mainProductId,
    layout: r.layout,
    createdAt: r.createdAt.toISOString(),
  }));
}

export type MetricsSummary = {
  impressions: number;
  clicks: number;
  ctr: number;
  byLayout: Array<{ layout: string; impressions: number; clicks: number; ctr: number }>;
  byProduct: Array<{
    mainProductId: string;
    impressions: number;
    clicks: number;
    ctr: number;
  }>;
};

function ctr(clicks: number, impressions: number) {
  return impressions > 0 ? clicks / impressions : 0;
}

/** Agrega métricas por loja numa janela (dias). */
export async function getMetrics(shop: string, days = 30): Promise<MetricsSummary> {
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const grouped = await prisma.metricEvent.groupBy({
    by: ["type", "layout", "mainProductId"],
    where: { shop, createdAt: { gte: from } },
    _count: { _all: true },
  });

  let impressions = 0;
  let clicks = 0;
  const layoutMap = new Map<string, { impressions: number; clicks: number }>();
  const productMap = new Map<string, { impressions: number; clicks: number }>();

  for (const row of grouped) {
    const count = row._count._all;
    const isClick = row.type === "click";
    if (isClick) clicks += count;
    else impressions += count;

    const layout = row.layout || "?";
    const l = layoutMap.get(layout) || { impressions: 0, clicks: 0 };
    if (isClick) l.clicks += count;
    else l.impressions += count;
    layoutMap.set(layout, l);

    const p = productMap.get(row.mainProductId) || { impressions: 0, clicks: 0 };
    if (isClick) p.clicks += count;
    else p.impressions += count;
    productMap.set(row.mainProductId, p);
  }

  return {
    impressions,
    clicks,
    ctr: ctr(clicks, impressions),
    byLayout: Array.from(layoutMap.entries()).map(([layout, v]) => ({
      layout,
      impressions: v.impressions,
      clicks: v.clicks,
      ctr: ctr(v.clicks, v.impressions),
    })),
    byProduct: Array.from(productMap.entries())
      .map(([mainProductId, v]) => ({
        mainProductId,
        impressions: v.impressions,
        clicks: v.clicks,
        ctr: ctr(v.clicks, v.impressions),
      }))
      .sort((a, b) => b.clicks - a.clicks),
  };
}

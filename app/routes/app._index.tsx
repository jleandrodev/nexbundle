/**
 * Dashboard — "o que está no ar agora e o que vem a seguir".
 * A linha do tempo semanal é a tela-assinatura do app: as faixas saem das
 * ocorrências reais (mesmo motor que registra no Shopify), não de texto solto.
 */
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link as RemixLink, useLoaderData } from "@remix-run/react";
import {
  BlockStack,
  Box,
  Button,
  Card,
  EmptyState,
  Icon,
  InlineGrid,
  InlineStack,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";
import { CalendarTimeIcon, ClockIcon, DiscountIcon } from "@shopify/polaris-icons";
import { useTranslation } from "react-i18next";

import { authenticate } from "../shopify.server";
import { getEntitlement } from "../services/billing.server";
import { getShopInfo } from "../services/shop-info.server";
import {
  countActivePromotions,
  listPromotions,
  nextWindowOf,
  promotionStatus,
} from "../services/promotions.server";
import { isUnlimited } from "../plans";
import WeekTimeline from "../components/WeekTimeline";
import Countdown from "../components/Countdown";
import PromotionStatusBadge from "../components/PromotionStatusBadge";
import { describeWindow } from "../components/NextOccurrences";
import LocaleSwitcher from "../components/LocaleSwitcher";

export const handle = { i18n: ["dashboard", "promotions", "common"] };

export async function loader({ request }: LoaderFunctionArgs) {
  const ctx = await authenticate.admin(request);
  const [promotions, entitlement, info, used] = await Promise.all([
    listPromotions(ctx.session.shop),
    getEntitlement(ctx),
    getShopInfo(ctx.admin, ctx.session.shop),
    countActivePromotions(ctx.session.shop),
  ]);

  const now = new Date();
  const enriched = promotions.map((p) => {
    const win = nextWindowOf(p, now);
    return {
      id: p.id,
      name: p.name,
      enabled: p.enabled,
      timezone: p.timezone,
      recurrence: p.recurrence,
      weekdays: p.weekdays,
      startTime: p.startTime,
      endTime: p.endTime,
      validFrom: p.validFrom ? p.validFrom.toISOString() : null,
      validUntil: p.validUntil ? p.validUntil.toISOString() : null,
      status: promotionStatus(p, now),
      windowStart: win?.startsAt.toISOString() ?? null,
      windowEnd: win?.endsAt.toISOString() ?? null,
    };
  });

  return json({
    promotions: enriched,
    live: enriched.filter((p) => p.status === "live"),
    upcoming: enriched
      .filter((p) => p.status === "scheduled" && p.windowStart)
      .sort((a, b) => String(a.windowStart).localeCompare(String(b.windowStart)))
      .slice(0, 3),
    scheduledCount: enriched.filter((p) => p.status === "scheduled").length,
    errors: enriched.filter((p) => p.status === "error").length,
    displayTimezone: info.timezone,
    limit: entitlement.limit,
    unlimited: isUnlimited(entitlement.limit),
    used,
  });
}

export default function Dashboard() {
  const data = useLoaderData<typeof loader>();
  const { t, i18n } = useTranslation("dashboard");
  const { t: tp } = useTranslation("promotions");

  if (data.promotions.length === 0) {
    return (
      <Page title={t("title")}>
        <Card>
          <EmptyState
            heading={t("empty.heading")}
            action={{ content: t("empty.action"), url: "/app/promotions/new" }}
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>{t("empty.body")}</p>
          </EmptyState>
        </Card>
      </Page>
    );
  }

  return (
    <Page
      title={t("title")}
      subtitle={t("subtitle", { tz: data.displayTimezone })}
      primaryAction={{ content: t("newPromotion"), url: "/app/promotions/new" }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <InlineGrid columns={{ xs: 1, sm: 3 }} gap="400">
              <StatCard
                icon={DiscountIcon}
                tint="#1FA971"
                label={t("stats.live")}
                value={String(data.live.length)}
              />
              <StatCard
                icon={CalendarTimeIcon}
                tint="#FFB020"
                label={t("stats.scheduled")}
                value={String(data.scheduledCount)}
              />
              <StatCard
                icon={ClockIcon}
                tint="#3B82F6"
                label={t("stats.usage")}
                value={data.unlimited ? String(data.used) : `${data.used}/${data.limit}`}
              />
            </InlineGrid>

            <WeekTimeline
              promotions={data.promotions}
              displayTimezone={data.displayTimezone}
            />
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  {t("liveNow")}
                </Text>
                {data.live.length === 0 ? (
                  <Text as="p" tone="subdued" variant="bodySm">
                    {t("nothingLive")}
                  </Text>
                ) : (
                  data.live.map((p) => (
                    <BlockStack gap="100" key={p.id}>
                      <InlineStack align="space-between" blockAlign="center">
                        <RemixLink to={`/app/promotions/${p.id}`}>
                          <Text as="span" fontWeight="semibold">
                            {p.name}
                          </Text>
                        </RemixLink>
                        <PromotionStatusBadge status="live" />
                      </InlineStack>
                      {p.windowEnd ? (
                        <InlineStack gap="100">
                          <Text as="span" tone="subdued" variant="bodySm">
                            {t("endsIn")}
                          </Text>
                          <Countdown to={p.windowEnd} tone="success" />
                        </InlineStack>
                      ) : null}
                    </BlockStack>
                  ))
                )}
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  {t("upNext")}
                </Text>
                {data.upcoming.length === 0 ? (
                  <Text as="p" tone="subdued" variant="bodySm">
                    {t("nothingUpcoming")}
                  </Text>
                ) : (
                  data.upcoming.map((p) => (
                    <BlockStack gap="050" key={p.id}>
                      <RemixLink to={`/app/promotions/${p.id}`}>
                        <Text as="span" fontWeight="semibold">
                          {p.name}
                        </Text>
                      </RemixLink>
                      {p.windowStart && p.windowEnd ? (
                        <>
                          <Text as="span" tone="subdued" variant="bodySm">
                            {describeWindow(
                              new Date(p.windowStart),
                              new Date(p.windowEnd),
                              p.timezone,
                              i18n.language,
                            )}
                          </Text>
                          <Countdown to={p.windowStart} />
                        </>
                      ) : null}
                    </BlockStack>
                  ))
                )}
              </BlockStack>
            </Card>

            {data.errors > 0 ? (
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd" tone="critical">
                    {t("syncIssues", { count: data.errors })}
                  </Text>
                  <Text as="p" tone="subdued" variant="bodySm">
                    {tp("sync.dashboardHint")}
                  </Text>
                  <Button url="/app/promotions">{tp("list.title")}</Button>
                </BlockStack>
              </Card>
            ) : null}

            <Card>
              <LocaleSwitcher />
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function StatCard({
  icon,
  label,
  value,
  tint,
}: {
  icon: any;
  label: string;
  value: string;
  tint: string;
}) {
  return (
    <Card>
      <InlineStack gap="400" blockAlign="center" wrap={false}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            // 1F = ~12% de opacidade: dá o tom da marca sem brigar com o Polaris.
            background: `${tint}1F`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "0 0 auto",
          }}
        >
          <Icon source={icon} />
        </div>
        <BlockStack gap="050">
          <Text as="span" tone="subdued" variant="bodySm">
            {label}
          </Text>
          <Box>
            <Text as="p" variant="heading2xl">
              {value}
            </Text>
          </Box>
        </BlockStack>
      </InlineStack>
    </Card>
  );
}

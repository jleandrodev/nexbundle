/**
 * Dashboard — visão geral do Buy Together: status, plano, KPIs, guia de início,
 * ativação no tema e métricas. Visual inspirado em apps de referência (Polaris).
 */
import { useMemo } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams, Link as RemixLink } from "@remix-run/react";
import { Trans, useTranslation } from "react-i18next";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  InlineGrid,
  Text,
  DataTable,
  ButtonGroup,
  Button,
  Box,
  EmptyState,
  Badge,
  Icon,
} from "@shopify/polaris";
import {
  ViewIcon,
  CartIcon,
  ChartVerticalIcon,
  CheckCircleIcon,
  PaintBrushFlatIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { getMetrics } from "../services/metrics.server";
import {
  listRelationships,
  countRelationships,
} from "../services/relationships.server";
import { getEntitlement } from "../services/billing.server";
import { isUnlimited } from "../plans";
import LocaleSwitcher from "../components/LocaleSwitcher";

export const handle = { i18n: ["dashboard", "common"] };

export async function loader({ request }: LoaderFunctionArgs) {
  const ctx = await authenticate.admin(request);
  const { session } = ctx;
  const url = new URL(request.url);
  const days = url.searchParams.get("days") === "7" ? 7 : 30;
  const [metrics, relationships, entitlement, used] = await Promise.all([
    getMetrics(session.shop, days),
    listRelationships(session.shop),
    getEntitlement(ctx),
    countRelationships(session.shop),
  ]);

  const apiKey = process.env.SHOPIFY_API_KEY || "";
  const editorBase = `https://${session.shop}/admin/themes/current/editor`;
  const themeLinks = {
    section: `${editorBase}?template=product&addAppBlockId=${apiKey}/layout-a&target=newAppsSection`,
    inline: `${editorBase}?template=product&addAppBlockId=${apiKey}/layout-b&target=mainSection`,
    cart: `${editorBase}?template=cart&addAppBlockId=${apiKey}/layout-cart&target=newAppsSection`,
  };

  return json({
    metrics,
    days,
    hasRelationships: relationships.length > 0,
    plan: entitlement.plan,
    isDev: entitlement.isDev,
    subscribed: entitlement.subscribed,
    limit: entitlement.limit,
    unlimited: isUnlimited(entitlement.limit),
    used,
    themeLinks,
  });
}

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}
function shortId(gid: string) {
  const m = gid.match(/(\d+)$/);
  return m ? `#${m[1]}` : gid;
}
function templateKey(v: string): string | null {
  if (v === "side-by-side" || v === "A") return "side-by-side";
  if (v === "list") return "list";
  if (v === "compact" || v === "B") return "compact";
  return null;
}

const TINTS: Record<string, string> = {
  info: "rgba(0, 122, 255, 0.12)",
  success: "rgba(0, 128, 96, 0.12)",
  magic: "rgba(128, 81, 255, 0.12)",
};

function StatCard({
  icon,
  label,
  value,
  tint,
}: {
  icon: any;
  label: string;
  value: string;
  tint: keyof typeof TINTS;
}) {
  return (
    <Card>
      <InlineStack gap="400" blockAlign="center" wrap={false}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: TINTS[tint],
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
          <Text as="p" variant="heading2xl">
            {value}
          </Text>
        </BlockStack>
      </InlineStack>
    </Card>
  );
}

function Step({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <InlineStack gap="200" blockAlign="center" wrap={false}>
      {done ? (
        <Icon source={CheckCircleIcon} tone="success" />
      ) : (
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 999,
            border: "2px solid #C9CCCF",
            flex: "0 0 auto",
          }}
        />
      )}
      <Text as="span" tone={done ? "subdued" : undefined}>
        {children}
      </Text>
    </InlineStack>
  );
}

export default function Dashboard() {
  const {
    metrics,
    days,
    hasRelationships,
    plan,
    isDev,
    subscribed,
    limit,
    unlimited,
    used,
    themeLinks,
  } = useLoaderData<typeof loader>();
  const [, setSearchParams] = useSearchParams();
  const { t } = useTranslation("dashboard");
  const { t: tc } = useTranslation("common");

  const planLabel = isDev
    ? t("planDevelopment")
    : plan ?? t("planNone");
  const usageLabel = unlimited
    ? t("usageUnlimited")
    : t("usage", { used, limit });
  const nearLimit = !unlimited && !isDev && limit > 0 && used / limit >= 0.8;

  const steps = [
    { key: "plan", label: t("guide.stepPlan"), done: isDev || subscribed },
    { key: "component", label: t("guide.stepComponent"), done: hasRelationships },
    { key: "theme", label: t("guide.stepTheme"), done: false },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const showGuide = doneCount < 2;

  const productRows = useMemo(
    () =>
      metrics.byProduct.map((p) => [
        shortId(p.mainProductId),
        String(p.impressions),
        String(p.clicks),
        pct(p.ctr),
      ]),
    [metrics.byProduct],
  );
  const layoutRows = useMemo(
    () =>
      metrics.byLayout.map((l) => {
        const key = templateKey(l.layout);
        return [
          key ? tc(`templates.${key}`) : l.layout,
          String(l.impressions),
          String(l.clicks),
          pct(l.ctr),
        ];
      }),
    [metrics.byLayout, tc],
  );

  return (
    <Page
      title={t("title")}
      primaryAction={{ content: tc("createComponent"), url: "/app/relationships/new" }}
    >
      <BlockStack gap="500">
        {/* Marca + idioma */}
        <InlineStack align="space-between" blockAlign="center">
          <Box paddingBlockEnd="100">
            <img
              src="/logo.png"
              alt="NexBundle"
              style={{ height: 34, width: "auto", display: "block" }}
            />
          </Box>
          <LocaleSwitcher />
        </InlineStack>

        {/* Status + Plano */}
        <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
          <Card>
            <BlockStack gap="200">
              <InlineStack gap="200" blockAlign="center">
                <Text as="h3" variant="headingSm">
                  {t("status.heading")}
                </Text>
                <Badge tone={hasRelationships ? "success" : "attention"}>
                  {hasRelationships ? t("status.active") : t("status.noComponents")}
                </Badge>
              </InlineStack>
              <Text as="p" tone="subdued">
                {hasRelationships ? t("status.configured") : t("status.empty")}
              </Text>
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <InlineStack gap="200" blockAlign="center">
                  <Text as="h3" variant="headingSm">
                    {t("plan.heading", { plan: planLabel })}
                  </Text>
                  {isDev ? <Badge tone="info">{t("plan.devStore")}</Badge> : null}
                  {nearLimit ? <Badge tone="warning">{t("plan.nearLimit")}</Badge> : null}
                </InlineStack>
                {!isDev ? (
                  <Button url="/app/plans" variant={nearLimit ? "primary" : "tertiary"}>
                    {plan ? t("plan.change") : t("plan.choose")}
                  </Button>
                ) : null}
              </InlineStack>
              <Text as="p" tone="subdued">
                {t("plan.usage", { usage: usageLabel })}
              </Text>
            </BlockStack>
          </Card>
        </InlineGrid>

        {/* KPIs */}
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingMd">
            {t("kpis.overview", { days })}
          </Text>
          <ButtonGroup variant="segmented">
            <Button pressed={days === 7} onClick={() => setSearchParams({ days: "7" })}>
              {t("kpis.days7")}
            </Button>
            <Button pressed={days === 30} onClick={() => setSearchParams({ days: "30" })}>
              {t("kpis.days30")}
            </Button>
          </ButtonGroup>
        </InlineStack>
        <InlineGrid columns={{ xs: 1, sm: 3 }} gap="400">
          <StatCard icon={ViewIcon} tint="info" label={t("kpis.impressions")} value={String(metrics.impressions)} />
          <StatCard icon={CartIcon} tint="success" label={t("kpis.clicks")} value={String(metrics.clicks)} />
          <StatCard icon={ChartVerticalIcon} tint="magic" label={t("kpis.ctr")} value={pct(metrics.ctr)} />
        </InlineGrid>

        {/* Guia de início */}
        {showGuide ? (
          <Card>
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h3" variant="headingMd">
                  {t("guide.heading")}
                </Text>
                <Badge>{t("guide.progress", { done: doneCount, total: steps.length })}</Badge>
              </InlineStack>
              <BlockStack gap="200">
                {steps.map((s) => (
                  <Step key={s.key} done={s.done}>
                    {s.label}
                  </Step>
                ))}
              </BlockStack>
              <InlineStack gap="200">
                {!isDev && !subscribed ? (
                  <Button url="/app/plans">{t("guide.choosePlan")}</Button>
                ) : null}
                {!hasRelationships ? (
                  <Button variant="primary" url="/app/relationships/new">
                    {t("guide.createComponent")}
                  </Button>
                ) : null}
              </InlineStack>
            </BlockStack>
          </Card>
        ) : null}

        {/* Ativar no tema */}
        <Card>
          <BlockStack gap="300">
            <InlineStack gap="200" blockAlign="center">
              <Icon source={PaintBrushFlatIcon} tone="base" />
              <Text as="h3" variant="headingMd">
                {t("theme.heading")}
              </Text>
            </InlineStack>
            <Text as="p" tone="subdued">
              <Trans t={t} i18nKey="theme.body" components={{ bold: <b /> }} />
            </Text>
            <InlineStack gap="300" wrap>
              <Button url={themeLinks.section} target="_blank" variant="primary">
                {t("theme.addSection")}
              </Button>
              <Button url={themeLinks.inline} target="_blank">
                {t("theme.addInline")}
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>

        {/* Cross-sell no carrinho */}
        <Card>
          <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
            <div
              style={{
                borderRadius: 12,
                overflow: "hidden",
                background: TINTS.info,
                aspectRatio: "4 / 3",
              }}
            >
              <img
                src="/cart.png"
                alt={t("cart.heading")}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
            <BlockStack gap="300" inlineAlign="start">
              <InlineStack gap="200" blockAlign="center">
                <Icon source={CartIcon} tone="base" />
                <Text as="h3" variant="headingMd">
                  {t("cart.heading")}
                </Text>
                <Badge tone="info">{tc("new")}</Badge>
              </InlineStack>
              <Text as="p" tone="subdued">
                {t("cart.body")}
              </Text>
              <Button url={themeLinks.cart} target="_blank" variant="primary">
                {t("cart.add")}
              </Button>
            </BlockStack>
          </InlineGrid>
        </Card>

        {/* Métricas detalhadas */}
        {!hasRelationships ? (
          <Card>
            <EmptyState
              heading={t("metrics.emptyHeading")}
              action={{ content: tc("createComponent"), url: "/app/relationships/new" }}
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <p>{t("metrics.emptyBody")}</p>
            </EmptyState>
          </Card>
        ) : (
          <Layout>
            <Layout.Section variant="oneHalf">
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    {t("metrics.byTemplate")}
                  </Text>
                  {layoutRows.length ? (
                    <DataTable
                      columnContentTypes={["text", "numeric", "numeric", "numeric"]}
                      headings={[
                        t("metrics.colTemplate"),
                        t("metrics.colImpressions"),
                        t("metrics.colClicks"),
                        t("metrics.colCtr"),
                      ]}
                      rows={layoutRows}
                    />
                  ) : (
                    <Box padding="400">
                      <Text as="p" tone="subdued">
                        {t("metrics.noEvents")}
                      </Text>
                    </Box>
                  )}
                </BlockStack>
              </Card>
            </Layout.Section>
            <Layout.Section variant="oneHalf">
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h3" variant="headingMd">
                      {t("metrics.byProduct")}
                    </Text>
                    <RemixLink to="/app/relationships">{tc("viewComponents")}</RemixLink>
                  </InlineStack>
                  {productRows.length ? (
                    <DataTable
                      columnContentTypes={["text", "numeric", "numeric", "numeric"]}
                      headings={[
                        t("metrics.colProduct"),
                        t("metrics.colImpressions"),
                        t("metrics.colClicks"),
                        t("metrics.colCtr"),
                      ]}
                      rows={productRows}
                    />
                  ) : (
                    <Box padding="400">
                      <Text as="p" tone="subdued">
                        {t("metrics.noEventsAlt")}
                      </Text>
                    </Box>
                  )}
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        )}
      </BlockStack>
    </Page>
  );
}

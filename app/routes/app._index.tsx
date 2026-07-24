/**
 * Dashboard — visão geral do Buy Together: status, plano, KPIs, guia de início,
 * ativação no tema e métricas. Visual inspirado em apps de referência (Polaris).
 */
import { useMemo } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams, Link as RemixLink } from "@remix-run/react";
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
function templateLabel(v: string) {
  if (v === "side-by-side" || v === "A") return "Lado a lado";
  if (v === "list") return "Lista";
  if (v === "compact" || v === "B") return "Compacto";
  return v;
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

  const planLabel = isDev ? "Desenvolvimento (grátis)" : plan ?? "Sem plano";
  const usageLabel = unlimited ? "Ilimitado" : `${used} / ${limit} produtos`;
  const nearLimit = !unlimited && !isDev && limit > 0 && used / limit >= 0.8;

  const steps = [
    { label: "Escolher um plano", done: isDev || subscribed },
    { label: "Criar um componente", done: hasRelationships },
    { label: "Ativar o bloco no tema", done: false },
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
      metrics.byLayout.map((l) => [
        templateLabel(l.layout),
        String(l.impressions),
        String(l.clicks),
        pct(l.ctr),
      ]),
    [metrics.byLayout],
  );

  return (
    <Page
      title="Painel"
      primaryAction={{ content: "Criar componente", url: "/app/relationships/new" }}
    >
      <BlockStack gap="500">
        {/* Marca */}
        <Box paddingBlockEnd="100">
          <img
            src="/logo.png"
            alt="NexBundle"
            style={{ height: 34, width: "auto", display: "block" }}
          />
        </Box>

        {/* Status + Plano */}
        <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
          <Card>
            <BlockStack gap="200">
              <InlineStack gap="200" blockAlign="center">
                <Text as="h3" variant="headingSm">
                  Status do Buy Together
                </Text>
                <Badge tone={hasRelationships ? "success" : "attention"}>
                  {hasRelationships ? "Ativo" : "Sem componentes"}
                </Badge>
              </InlineStack>
              <Text as="p" tone="subdued">
                {hasRelationships
                  ? "Seus componentes de compra conjunta estão configurados. Verifique se o bloco está no tema."
                  : "Crie seu primeiro componente para começar a sugerir produtos juntos."}
              </Text>
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <InlineStack gap="200" blockAlign="center">
                  <Text as="h3" variant="headingSm">
                    Plano {planLabel}
                  </Text>
                  {isDev ? <Badge tone="info">Dev store</Badge> : null}
                  {nearLimit ? <Badge tone="warning">Perto do limite</Badge> : null}
                </InlineStack>
                {!isDev ? (
                  <Button url="/app/plans" variant={nearLimit ? "primary" : "tertiary"}>
                    {plan ? "Mudar" : "Escolher"}
                  </Button>
                ) : null}
              </InlineStack>
              <Text as="p" tone="subdued">
                Produtos com Buy Together: {usageLabel}
              </Text>
            </BlockStack>
          </Card>
        </InlineGrid>

        {/* KPIs */}
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingMd">
            Visão geral · últimos {days} dias
          </Text>
          <ButtonGroup variant="segmented">
            <Button pressed={days === 7} onClick={() => setSearchParams({ days: "7" })}>
              7 dias
            </Button>
            <Button pressed={days === 30} onClick={() => setSearchParams({ days: "30" })}>
              30 dias
            </Button>
          </ButtonGroup>
        </InlineStack>
        <InlineGrid columns={{ xs: 1, sm: 3 }} gap="400">
          <StatCard icon={ViewIcon} tint="info" label="Impressões" value={String(metrics.impressions)} />
          <StatCard icon={CartIcon} tint="success" label="Cliques (add ao carrinho)" value={String(metrics.clicks)} />
          <StatCard icon={ChartVerticalIcon} tint="magic" label="CTR" value={pct(metrics.ctr)} />
        </InlineGrid>

        {/* Guia de início */}
        {showGuide ? (
          <Card>
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h3" variant="headingMd">
                  Guia de início
                </Text>
                <Badge>{`${doneCount}/${steps.length} concluídos`}</Badge>
              </InlineStack>
              <BlockStack gap="200">
                {steps.map((s) => (
                  <Step key={s.label} done={s.done}>
                    {s.label}
                  </Step>
                ))}
              </BlockStack>
              <InlineStack gap="200">
                {!isDev && !subscribed ? (
                  <Button url="/app/plans">Escolher plano</Button>
                ) : null}
                {!hasRelationships ? (
                  <Button variant="primary" url="/app/relationships/new">
                    Criar componente
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
                Ative o Buy Together no seu tema
              </Text>
            </InlineStack>
            <Text as="p" tone="subdued">
              O widget não aparece sozinho: adicione o bloco à página de produto pelo
              editor de tema. Escolha onde ele entra — abre o editor com o bloco já
              inserido; depois é só posicionar e <b>Salvar</b>.
            </Text>
            <InlineStack gap="300" wrap>
              <Button url={themeLinks.section} target="_blank" variant="primary">
                Adicionar em seção própria
              </Button>
              <Button url={themeLinks.inline} target="_blank">
                Adicionar junto ao produto
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>

        {/* Métricas detalhadas */}
        {!hasRelationships ? (
          <Card>
            <EmptyState
              heading="Crie seu primeiro componente"
              action={{ content: "Criar componente", url: "/app/relationships/new" }}
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <p>
                Vincule um produto principal a produtos que combinam. Depois adicione o
                bloco “Buy Together” na página de produto pelo editor de tema.
              </p>
            </EmptyState>
          </Card>
        ) : (
          <Layout>
            <Layout.Section variant="oneHalf">
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    Por template
                  </Text>
                  {layoutRows.length ? (
                    <DataTable
                      columnContentTypes={["text", "numeric", "numeric", "numeric"]}
                      headings={["Template", "Impressões", "Cliques", "CTR"]}
                      rows={layoutRows}
                    />
                  ) : (
                    <Box padding="400">
                      <Text as="p" tone="subdued">
                        Sem eventos ainda neste período.
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
                      Por produto
                    </Text>
                    <RemixLink to="/app/relationships">Ver componentes</RemixLink>
                  </InlineStack>
                  {productRows.length ? (
                    <DataTable
                      columnContentTypes={["text", "numeric", "numeric", "numeric"]}
                      headings={["Produto", "Impressões", "Cliques", "CTR"]}
                      rows={productRows}
                    />
                  ) : (
                    <Box padding="400">
                      <Text as="p" tone="subdued">
                        Ainda não há eventos neste período.
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

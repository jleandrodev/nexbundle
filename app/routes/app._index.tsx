/**
 * Dashboard — métricas Buy Together (impressões, cliques, CTR; por layout e por produto).
 * Substitui a demo productCreate do template.
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
  Text,
  DataTable,
  ButtonGroup,
  Button,
  Box,
  EmptyState,
  Badge,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { getMetrics } from "../services/metrics.server";
import { listRelationships } from "../services/relationships.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const days = url.searchParams.get("days") === "7" ? 7 : 30;
  const [metrics, relationships] = await Promise.all([
    getMetrics(session.shop, days),
    listRelationships(session.shop),
  ]);
  return json({ metrics, days, hasRelationships: relationships.length > 0 });
}

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function shortId(gid: string) {
  const m = gid.match(/(\d+)$/);
  return m ? `#${m[1]}` : gid;
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <BlockStack gap="100">
        <Text as="span" tone="subdued" variant="bodySm">
          {label}
        </Text>
        <Text as="p" variant="heading2xl">
          {value}
        </Text>
      </BlockStack>
    </Card>
  );
}

export default function Dashboard() {
  const { metrics, days, hasRelationships } = useLoaderData<typeof loader>();
  const [, setSearchParams] = useSearchParams();

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
        l.layout === "A" ? "A — Lado a lado" : l.layout === "B" ? "B — Compacto" : l.layout,
        String(l.impressions),
        String(l.clicks),
        pct(l.ctr),
      ]),
    [metrics.byLayout],
  );

  return (
    <Page
      title="Buy Together"
      subtitle="Desempenho do widget de compre junto"
      primaryAction={{
        content: "Novo relacionamento",
        url: "/app/relationships/new",
      }}
    >
      <BlockStack gap="500">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingMd">
            Últimos {days} dias
          </Text>
          <ButtonGroup variant="segmented">
            <Button
              pressed={days === 7}
              onClick={() => setSearchParams({ days: "7" })}
            >
              7 dias
            </Button>
            <Button
              pressed={days === 30}
              onClick={() => setSearchParams({ days: "30" })}
            >
              30 dias
            </Button>
          </ButtonGroup>
        </InlineStack>

        {!hasRelationships ? (
          <Card>
            <EmptyState
              heading="Crie seu primeiro relacionamento"
              action={{ content: "Novo relacionamento", url: "/app/relationships/new" }}
              secondaryAction={{ content: "Configurar estilo", url: "/app/styling" }}
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <p>
                Vincule um produto principal a produtos que combinam. Depois adicione o
                bloco “Buy Together” na página de produto pelo editor de tema.
              </p>
            </EmptyState>
          </Card>
        ) : (
          <>
            <Layout>
              <Layout.Section variant="oneThird">
                <StatTile label="Impressões" value={String(metrics.impressions)} />
              </Layout.Section>
              <Layout.Section variant="oneThird">
                <StatTile label="Cliques (add ao carrinho)" value={String(metrics.clicks)} />
              </Layout.Section>
              <Layout.Section variant="oneThird">
                <StatTile label="CTR" value={pct(metrics.ctr)} />
              </Layout.Section>
            </Layout>

            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingMd">
                  Por layout
                </Text>
                {layoutRows.length ? (
                  <DataTable
                    columnContentTypes={["text", "numeric", "numeric", "numeric"]}
                    headings={["Layout", "Impressões", "Cliques", "CTR"]}
                    rows={layoutRows}
                  />
                ) : (
                  <Box padding="400">
                    <Text as="p" tone="subdued">
                      Sem eventos ainda. Assim que o bloco for exibido/clicado na loja, os
                      números aparecem aqui.
                    </Text>
                  </Box>
                )}
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h3" variant="headingMd">
                    Por produto principal
                  </Text>
                  <RemixLink to="/app/relationships">Ver relacionamentos</RemixLink>
                </InlineStack>
                {productRows.length ? (
                  <DataTable
                    columnContentTypes={["text", "numeric", "numeric", "numeric"]}
                    headings={["Produto", "Impressões", "Cliques", "CTR"]}
                    rows={productRows}
                  />
                ) : (
                  <Box padding="400">
                    <InlineStack gap="200" blockAlign="center">
                      <Badge tone="info">Aguardando dados</Badge>
                      <Text as="span" tone="subdued">
                        Ainda não há eventos neste período.
                      </Text>
                    </InlineStack>
                  </Box>
                )}
              </BlockStack>
            </Card>
          </>
        )}
      </BlockStack>
    </Page>
  );
}

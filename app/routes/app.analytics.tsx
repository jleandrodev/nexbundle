/**
 * Análise — KPIs, gráfico de impressões/cliques por dia e atividade recente.
 */
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  InlineGrid,
  Text,
  Icon,
  ButtonGroup,
  Button,
  DataTable,
  Box,
  Badge,
} from "@shopify/polaris";
import { ViewIcon, CartIcon, ChartVerticalIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import {
  getMetrics,
  getDailyMetrics,
  getRecentEvents,
} from "../services/metrics.server";
import MiniLineChart from "../components/MiniLineChart";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const days = url.searchParams.get("days") === "7" ? 7 : 30;
  const [metrics, daily, recent] = await Promise.all([
    getMetrics(session.shop, days),
    getDailyMetrics(session.shop, days),
    getRecentEvents(session.shop, 12),
  ]);
  return json({ metrics, daily, recent, days });
}

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}
function shortId(gid: string) {
  const m = gid.match(/(\d+)$/);
  return m ? `#${m[1]}` : gid;
}
function templateLabel(v: string | null) {
  if (v === "side-by-side" || v === "A") return "Lado a lado";
  if (v === "list") return "Lista";
  if (v === "compact" || v === "B") return "Compacto";
  return v || "—";
}

const TINTS: Record<string, string> = {
  info: "rgba(0, 122, 255, 0.12)",
  success: "rgba(0, 128, 96, 0.12)",
  magic: "rgba(128, 81, 255, 0.12)",
};
function StatCard({ icon, label, value, tint }: { icon: any; label: string; value: string; tint: keyof typeof TINTS }) {
  return (
    <Card>
      <InlineStack gap="400" blockAlign="center" wrap={false}>
        <div
          style={{
            width: 44, height: 44, borderRadius: 12, background: TINTS[tint],
            display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto",
          }}
        >
          <Icon source={icon} />
        </div>
        <BlockStack gap="050">
          <Text as="span" tone="subdued" variant="bodySm">{label}</Text>
          <Text as="p" variant="heading2xl">{value}</Text>
        </BlockStack>
      </InlineStack>
    </Card>
  );
}

export default function Analytics() {
  const { metrics, daily, recent, days } = useLoaderData<typeof loader>();
  const [, setSearchParams] = useSearchParams();

  const rows = recent.map((e) => [
    new Date(e.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
    e.type === "click" ? "Clique" : "Impressão",
    shortId(e.mainProductId),
    templateLabel(e.layout),
  ]);

  return (
    <Page title="Análise" backAction={{ content: "Painel", url: "/app" }}>
      <BlockStack gap="500">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingMd">
            Últimos {days} dias
          </Text>
          <ButtonGroup variant="segmented">
            <Button pressed={days === 7} onClick={() => setSearchParams({ days: "7" })}>7 dias</Button>
            <Button pressed={days === 30} onClick={() => setSearchParams({ days: "30" })}>30 dias</Button>
          </ButtonGroup>
        </InlineStack>

        <InlineGrid columns={{ xs: 1, sm: 3 }} gap="400">
          <StatCard icon={ViewIcon} tint="info" label="Impressões" value={String(metrics.impressions)} />
          <StatCard icon={CartIcon} tint="success" label="Cliques (add ao carrinho)" value={String(metrics.clicks)} />
          <StatCard icon={ChartVerticalIcon} tint="magic" label="CTR" value={pct(metrics.ctr)} />
        </InlineGrid>

        <Card>
          <BlockStack gap="300">
            <Text as="h3" variant="headingMd">Impressões e cliques por dia</Text>
            <MiniLineChart data={daily} />
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="300">
            <Text as="h3" variant="headingMd">Atividade recente</Text>
            {rows.length ? (
              <DataTable
                columnContentTypes={["text", "text", "text", "text"]}
                headings={["Quando", "Evento", "Produto", "Template"]}
                rows={rows}
              />
            ) : (
              <Box padding="400">
                <InlineStack gap="200" blockAlign="center">
                  <Badge tone="info">Sem dados</Badge>
                  <Text as="span" tone="subdued">
                    Assim que o widget for exibido/clicado na loja, os eventos aparecem aqui.
                  </Text>
                </InlineStack>
              </Box>
            )}
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}

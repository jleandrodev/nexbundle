/**
 * Inbox da equipe: conversas (lojas) com preview + não-lidas. Poll ~15s.
 */
import { useEffect } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useRevalidator, Link } from "@remix-run/react";
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  InlineGrid,
  Text,
  Badge,
  Box,
  EmptyState,
} from "@shopify/polaris";
import { requireStaff } from "../support-auth.server";
import {
  listConversations,
  getTicketMetrics,
} from "../services/support.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireStaff(request);
  const [conversations, metrics] = await Promise.all([
    listConversations(),
    getTicketMetrics(),
  ]);
  return json({ conversations, metrics });
}

const STATE_BADGE: Record<
  string,
  { tone: "attention" | "info" | "success"; label: string }
> = {
  waiting: { tone: "attention", label: "Aguardando" },
  active: { tone: "info", label: "Em andamento" },
  closed: { tone: "success", label: "Finalizado" },
};

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <BlockStack gap="100">
        <Text as="span" tone="subdued" variant="bodySm">
          {label}
        </Text>
        <Text as="p" variant="heading2xl">
          {String(value)}
        </Text>
      </BlockStack>
    </Card>
  );
}

function timeAgo(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SupportInbox() {
  const { conversations, metrics } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();

  useEffect(() => {
    const t = setInterval(() => revalidator.revalidate(), 15000);
    return () => clearInterval(t);
  }, [revalidator]);

  return (
    <Page title="Conversas">
      <Box paddingBlockEnd="400">
        <InlineGrid columns={{ xs: 2, sm: 4 }} gap="300">
          <MetricCard label="Total de tickets" value={metrics.total} />
          <MetricCard label="Aguardando" value={metrics.waiting} />
          <MetricCard label="Em andamento" value={metrics.active} />
          <MetricCard label="Finalizados" value={metrics.closed} />
        </InlineGrid>
      </Box>
      {conversations.length === 0 ? (
        <Card>
          <EmptyState heading="Nenhuma conversa ainda" image="">
            <p>Quando um lojista enviar uma mensagem pelo chat, ela aparece aqui.</p>
          </EmptyState>
        </Card>
      ) : (
        <Card padding="0">
          <BlockStack gap="0">
            {conversations.map((c, i) => (
              <Link
                key={c.shop}
                to={`/support/${encodeURIComponent(c.shop)}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <Box
                  padding="400"
                  borderBlockEndWidth={i < conversations.length - 1 ? "025" : undefined}
                  borderColor="border"
                  background={c.unread > 0 ? "bg-surface-selected" : undefined}
                >
                  <InlineStack align="space-between" blockAlign="center" wrap={false} gap="300">
                    <BlockStack gap="050">
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="span" fontWeight="semibold">
                          {c.shop}
                        </Text>
                        <Badge tone={STATE_BADGE[c.state]?.tone}>
                          {STATE_BADGE[c.state]?.label ?? c.state}
                        </Badge>
                        {c.unread > 0 ? <Badge tone="critical">{String(c.unread)}</Badge> : null}
                      </InlineStack>
                      <Text as="span" tone="subdued" variant="bodySm">
                        {c.lastSender === "staff" ? "Você: " : ""}
                        {c.preview || "—"}
                      </Text>
                    </BlockStack>
                    <Text as="span" tone="subdued" variant="bodySm">
                      {timeAgo(c.lastMessageAt)}
                    </Text>
                  </InlineStack>
                </Box>
              </Link>
            ))}
          </BlockStack>
        </Card>
      )}
    </Page>
  );
}

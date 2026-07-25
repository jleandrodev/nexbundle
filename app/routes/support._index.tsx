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
  Text,
  Badge,
  Box,
  EmptyState,
} from "@shopify/polaris";
import { requireStaff } from "../support-auth.server";
import { listConversations } from "../services/support.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireStaff(request);
  return json({ conversations: await listConversations() });
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
  const { conversations } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();

  useEffect(() => {
    const t = setInterval(() => revalidator.revalidate(), 15000);
    return () => clearInterval(t);
  }, [revalidator]);

  return (
    <Page title="Conversas">
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

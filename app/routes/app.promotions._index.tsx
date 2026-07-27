/**
 * Lista de promoções agendadas: nome, status e resumo do agendamento
 * (próxima janela quando houver, senão a descrição da recorrência).
 */
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Card,
  EmptyState,
  IndexTable,
  Page,
  Text,
} from "@shopify/polaris";
import { useTranslation } from "react-i18next";

import { authenticate } from "../shopify.server";
import {
  listPromotions,
  nextWindowOf,
  promotionStatus,
} from "../services/promotions.server";
import PromotionStatusBadge from "../components/PromotionStatusBadge";
import { describeWindow } from "../components/NextOccurrences";

export const handle = { i18n: ["promotions", "common"] };

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const promotions = await listPromotions(session.shop);
  const now = new Date();

  return json({
    promotions: promotions.map((p) => {
      const win = nextWindowOf(p, now);
      return {
        id: p.id,
        name: p.name,
        timezone: p.timezone,
        recurrence: p.recurrence,
        status: promotionStatus(p, now),
        windowStart: win?.startsAt.toISOString() ?? null,
        windowEnd: win?.endsAt.toISOString() ?? null,
      };
    }),
  });
}

export default function PromotionsList() {
  const { promotions } = useLoaderData<typeof loader>();
  const { t, i18n } = useTranslation("promotions");
  const navigate = useNavigate();

  const summary = (p: (typeof promotions)[number]) => {
    if (p.windowStart && p.windowEnd) {
      return describeWindow(
        new Date(p.windowStart),
        new Date(p.windowEnd),
        p.timezone,
        i18n.language,
      );
    }
    const key =
      p.recurrence === "weekly"
        ? "scheduleSummary.recurrenceWeekly"
        : p.recurrence === "once"
          ? "scheduleSummary.recurrenceOnce"
          : "scheduleSummary.recurrenceDaily";
    return t(key);
  };

  return (
    <Page
      title={t("list.heading")}
      primaryAction={{ content: t("list.new"), url: "/app/promotions/new" }}
      backAction={{ content: t("form.back"), url: "/app" }}
    >
      <Card padding="0">
        {promotions.length === 0 ? (
          <EmptyState
            heading={t("list.empty")}
            action={{ content: t("list.new"), url: "/app/promotions/new" }}
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>{t("list.emptyBody")}</p>
          </EmptyState>
        ) : (
          <IndexTable
            resourceName={{
              singular: t("list.resourceSingular", { defaultValue: "promotion" }),
              plural: t("list.resourcePlural", { defaultValue: "promotions" }),
            }}
            itemCount={promotions.length}
            selectable={false}
            headings={[
              { title: t("list.colName") },
              { title: t("list.colStatus") },
              { title: t("list.colSchedule") },
            ]}
          >
            {promotions.map((p, index) => (
              <IndexTable.Row
                id={p.id}
                key={p.id}
                position={index}
                onClick={() => navigate(`/app/promotions/${p.id}`)}
              >
                <IndexTable.Cell>
                  <Text as="span" fontWeight="semibold">
                    {p.name}
                  </Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <PromotionStatusBadge status={p.status} />
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Text as="span" tone="subdued">
                    {summary(p)}
                  </Text>
                </IndexTable.Cell>
              </IndexTable.Row>
            ))}
          </IndexTable>
        )}
      </Card>
    </Page>
  );
}

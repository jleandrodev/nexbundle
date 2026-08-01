/**
 * Seleção de plano. Loja real sem assinatura cai aqui (redirect do app.tsx).
 * Cada botão inicia a assinatura via billing.request → confirmação da Shopify.
 */
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Form, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Badge,
  List,
  Box,
} from "@shopify/polaris";
import { useTranslation } from "react-i18next";
import { authenticate } from "../shopify.server";
import { getEntitlement, billingIsTest } from "../services/billing.server";
import { redirectKeepingContext } from "../utils/embedded-redirect.server";
import {
  PLANS,
  TRIAL_DAYS,
  ESSENTIAL_PLAN,
  PRO_PLAN,
  ENTERPRISE_PLAN,
} from "../plans";

export const handle = { i18n: ["plans", "common"] };

export async function loader({ request }: LoaderFunctionArgs) {
  const ctx = await authenticate.admin(request);
  const entitlement = await getEntitlement(ctx);
  return json({ plans: PLANS, trialDays: TRIAL_DAYS, current: entitlement.plan });
}

export async function action({ request }: ActionFunctionArgs) {
  const { billing } = await authenticate.admin(request);
  const form = await request.formData();
  const plan = String(form.get("plan"));
  if (plan !== ESSENTIAL_PLAN && plan !== PRO_PLAN && plan !== ENTERPRISE_PLAN) {
    return redirectKeepingContext(request, "/app/plans");
  }
  // Redireciona para a confirmação de cobrança da Shopify (com trial).
  return billing.request({ plan, isTest: billingIsTest });
}

export default function Plans() {
  const { plans, trialDays, current } = useLoaderData<typeof loader>();
  const { t, i18n } = useTranslation("plans");
  const nav = useNavigation();
  const submittingPlan =
    nav.state === "submitting" ? String(nav.formData?.get("plan")) : null;

  return (
    <Page
      title={t("title")}
      subtitle={t("subtitle", { days: trialDays })}
    >
      <Layout>
        {plans.map((p) => {
          const isCurrent = current === p.name;
          const planName = t(`${p.id}.name`);
          const features = t(`${p.id}.features`, {
            returnObjects: true,
          }) as string[];
          const price = new Intl.NumberFormat(i18n.language, {
            style: "currency",
            currency: p.currency,
          }).format(p.price);
          return (
            <Layout.Section variant="oneThird" key={p.name}>
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingLg">
                      {planName}
                    </Text>
                    {isCurrent ? (
                      <Badge tone="success">{t("current")}</Badge>
                    ) : null}
                  </InlineStack>

                  <InlineStack blockAlign="baseline" gap="100">
                    <Text as="span" variant="heading2xl">
                      {price}
                    </Text>
                    <Text as="span" tone="subdued">
                      {t("perMonth")}
                    </Text>
                  </InlineStack>

                  <Box>
                    <Badge tone="info">
                      {p.unlimited
                        ? t("unlimited")
                        : t("upTo", { limit: p.limit })}
                    </Badge>
                  </Box>

                  <List>
                    {features.map((f) => (
                      <List.Item key={f}>{f}</List.Item>
                    ))}
                  </List>

                  <Form method="post">
                    <input type="hidden" name="plan" value={p.name} />
                    <Button
                      submit
                      variant="primary"
                      fullWidth
                      loading={submittingPlan === p.name}
                      disabled={isCurrent}
                    >
                      {isCurrent
                        ? t("active")
                        : t("subscribe", { plan: planName, days: trialDays })}
                    </Button>
                  </Form>
                </BlockStack>
              </Card>
            </Layout.Section>
          );
        })}
      </Layout>
    </Page>
  );
}

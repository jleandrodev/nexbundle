/**
 * Galeria de templates. Escolher um leva ao editor daquele componente.
 */
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Box,
  Button,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { TEMPLATES } from "../lib/templates";

export const handle = { i18n: ["relationships", "templates", "common"] };

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);
  return json({ templates: TEMPLATES });
}

export default function TemplateGallery() {
  const { templates } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { t } = useTranslation("relationships");
  const { t: tt } = useTranslation("templates");

  return (
    <Page
      title={t("gallery.title")}
      subtitle={t("gallery.subtitle")}
      backAction={{ content: t("gallery.back"), url: "/app/relationships" }}
    >
      <Layout>
        {templates.map((tpl) => (
          <Layout.Section variant="oneThird" key={tpl.id}>
            <Card padding="0">
              <BlockStack gap="0">
                {/* Imagem do template (placeholder até o usuário enviar as artes) */}
                <div
                  style={{
                    aspectRatio: "16 / 10",
                    background:
                      "linear-gradient(135deg, #EEF1F6 0%, #E3E8F0 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#8C9196",
                    fontSize: 13,
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                    backgroundImage: tpl.image ? `url(${tpl.image})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  {tpl.image ? "" : t("gallery.previewPlaceholder")}
                </div>
                <Box padding="400">
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingMd">
                      {tt(`${tpl.id}.name`)}
                    </Text>
                    <Text as="p" tone="subdued">
                      {tt(`${tpl.id}.description`)}
                    </Text>
                    <Button
                      variant="primary"
                      onClick={() => navigate(`/app/relationships/create/${tpl.id}`)}
                    >
                      {t("gallery.useTemplate")}
                    </Button>
                  </BlockStack>
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>
        ))}
      </Layout>
    </Page>
  );
}

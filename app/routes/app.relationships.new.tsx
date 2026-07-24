/**
 * Galeria de templates. Escolher um leva ao editor daquele componente.
 */
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
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

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);
  return json({ templates: TEMPLATES });
}

export default function TemplateGallery() {
  const { templates } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <Page
      title="Escolha um template"
      subtitle="Selecione o formato do componente. Você personaliza o estilo em seguida."
      backAction={{ content: "Relacionamentos", url: "/app/relationships" }}
    >
      <Layout>
        {templates.map((t) => (
          <Layout.Section variant="oneThird" key={t.id}>
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
                    backgroundImage: t.image ? `url(${t.image})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  {t.image ? "" : "Prévia do template"}
                </div>
                <Box padding="400">
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingMd">
                      {t.name}
                    </Text>
                    <Text as="p" tone="subdued">
                      {t.description}
                    </Text>
                    <Button
                      variant="primary"
                      onClick={() => navigate(`/app/relationships/create/${t.id}`)}
                    >
                      Usar este template
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

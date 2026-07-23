/**
 * Config de estilo GLOBAL do widget Buy Together, com preview ao vivo dos dois layouts.
 */
import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useActionData, useNavigation, Form } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Button,
  Banner,
  Box,
  InlineGrid,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import {
  getStyling,
  upsertStyling,
  STYLING_DEFAULTS,
  type StylingData,
} from "../services/styling.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  return json({ styling: await getStyling(session.shop) });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const data: StylingData = {
    backgroundColor: String(form.get("backgroundColor") || STYLING_DEFAULTS.backgroundColor),
    textColor: String(form.get("textColor") || STYLING_DEFAULTS.textColor),
    titleColor: String(form.get("titleColor") || STYLING_DEFAULTS.titleColor),
    buttonColor: String(form.get("buttonColor") || STYLING_DEFAULTS.buttonColor),
    buttonTextColor: String(form.get("buttonTextColor") || STYLING_DEFAULTS.buttonTextColor),
    addButtonText: String(form.get("addButtonText") || STYLING_DEFAULTS.addButtonText),
    titleText: String(form.get("titleText") || STYLING_DEFAULTS.titleText),
  };
  await upsertStyling(session.shop, data);
  return json({ ok: true });
}

function ColorField({
  label,
  value,
  onChange,
  name,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  name: string;
}) {
  return (
    <InlineStack gap="300" blockAlign="center" wrap={false}>
      <label
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          overflow: "hidden",
          border: "1px solid rgba(0,0,0,0.15)",
          flex: "0 0 auto",
          cursor: "pointer",
        }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: 56,
            height: 56,
            margin: -8,
            border: "none",
            padding: 0,
            background: "none",
            cursor: "pointer",
          }}
        />
      </label>
      <div style={{ flex: 1 }}>
        <TextField
          label={label}
          name={name}
          value={value}
          onChange={onChange}
          autoComplete="off"
        />
      </div>
    </InlineStack>
  );
}

/** Mini preview que espelha os layouts do storefront usando os valores atuais. */
function Preview({ s }: { s: StylingData }) {
  const card: React.CSSProperties = {
    display: "flex",
    gap: 10,
    alignItems: "center",
    padding: 8,
    border: "1px solid rgba(0,0,0,0.1)",
    borderRadius: 10,
  };
  const thumb: React.CSSProperties = {
    width: 40,
    height: 40,
    borderRadius: 6,
    background: "rgba(0,0,0,0.08)",
    flex: "0 0 auto",
  };
  const btn: React.CSSProperties = {
    background: s.buttonColor,
    color: s.buttonTextColor,
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 600,
    fontSize: 13,
    cursor: "default",
    width: "100%",
  };
  const box: React.CSSProperties = {
    background: s.backgroundColor,
    color: s.textColor,
    border: "1px solid rgba(0,0,0,0.1)",
    borderRadius: 12,
    padding: 16,
  };
  const title: React.CSSProperties = {
    color: s.titleColor,
    fontWeight: 600,
    fontSize: 15,
    margin: "0 0 12px",
  };

  return (
    <BlockStack gap="400">
      <Box>
        <Text as="p" tone="subdued" variant="bodySm">
          Layout A — Lado a lado
        </Text>
        <div style={{ ...box, marginTop: 8 }}>
          <p style={title}>{s.titleText}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10 }}>
            <div style={card}>
              <div style={thumb} />
              <div>
                <div>Produto A</div>
                <strong>R$ 79,90</strong>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", opacity: 0.5 }}>+</div>
            <div style={card}>
              <div style={thumb} />
              <div>
                <div>Produto B</div>
                <strong>R$ 49,90</strong>
              </div>
            </div>
          </div>
          <div
            style={{
              marginTop: 12,
              padding: 12,
              border: "1px dashed rgba(0,0,0,0.15)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ opacity: 0.8, fontSize: 12 }}>Total dos dois itens</div>
              <div style={{ color: s.titleColor, fontWeight: 700, fontSize: 18 }}>
                R$ 129,80
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <button style={btn}>{s.addButtonText}</button>
            </div>
          </div>
        </div>
      </Box>

      <Box>
        <Text as="p" tone="subdued" variant="bodySm">
          Layout B — Compacto
        </Text>
        <div style={{ ...box, marginTop: 8 }}>
          <p style={title}>{s.titleText}</p>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ ...card, flex: "1 1 200px" }}>
              <div style={thumb} />
              <div>
                <div>Produto B</div>
                <strong>R$ 49,90</strong>
              </div>
            </div>
            <div style={{ flex: "1 1 160px" }}>
              <button style={btn}>{s.addButtonText}</button>
            </div>
          </div>
        </div>
      </Box>
    </BlockStack>
  );
}

export default function Styling() {
  const { styling } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const saving = nav.state === "submitting";
  const [s, setS] = useState<StylingData>(styling);

  const set = (k: keyof StylingData) => (v: string) =>
    setS((prev) => ({ ...prev, [k]: v }));

  return (
    <Page
      title="Estilo do widget"
      subtitle="Aplica-se a todos os produtos. As cores valem para os dois layouts."
      backAction={{ content: "Dashboard", url: "/app" }}
    >
      <Form method="post">
        <BlockStack gap="400">
          {actionData?.ok ? (
            <Banner tone="success" title="Estilo salvo">
              <p>As mudanças já valem na loja.</p>
            </Banner>
          ) : null}
          <Layout>
            <Layout.Section>
              <BlockStack gap="400">
                <Card>
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingMd">
                      Cores
                    </Text>
                    <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
                      <ColorField
                        label="Fundo"
                        name="backgroundColor"
                        value={s.backgroundColor}
                        onChange={set("backgroundColor")}
                      />
                      <ColorField
                        label="Texto"
                        name="textColor"
                        value={s.textColor}
                        onChange={set("textColor")}
                      />
                      <ColorField
                        label="Título"
                        name="titleColor"
                        value={s.titleColor}
                        onChange={set("titleColor")}
                      />
                      <ColorField
                        label="Botão"
                        name="buttonColor"
                        value={s.buttonColor}
                        onChange={set("buttonColor")}
                      />
                      <ColorField
                        label="Texto do botão"
                        name="buttonTextColor"
                        value={s.buttonTextColor}
                        onChange={set("buttonTextColor")}
                      />
                    </InlineGrid>
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingMd">
                      Textos
                    </Text>
                    <TextField
                      label="Título do bloco"
                      name="titleText"
                      value={s.titleText}
                      onChange={set("titleText")}
                      autoComplete="off"
                    />
                    <TextField
                      label="Texto do botão"
                      name="addButtonText"
                      value={s.addButtonText}
                      onChange={set("addButtonText")}
                      autoComplete="off"
                    />
                  </BlockStack>
                </Card>

                <InlineStack align="end">
                  <Button submit variant="primary" loading={saving}>
                    Salvar estilo
                  </Button>
                </InlineStack>
              </BlockStack>
            </Layout.Section>

            <Layout.Section variant="oneThird">
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    Pré-visualização
                  </Text>
                  <Preview s={s} />
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        </BlockStack>
      </Form>
    </Page>
  );
}

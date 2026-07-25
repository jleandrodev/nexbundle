/**
 * Editor de um componente Buy Together: preview grande + sidebar com abas
 * "Configurações" (produtos, direção) e "Estilo" (cores, título, borda).
 * Serializa tudo em campos hidden e envia via Remix Form.
 */
import { useState, useCallback } from "react";
import { Form, useNavigation, useSubmit } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Thumbnail,
  Box,
  Checkbox,
  ChoiceList,
  TextField,
  RangeSlider,
  Banner,
  Divider,
  Tabs,
} from "@shopify/polaris";
import ColorField from "./ColorField";
import ComponentPreview, { type PreviewProduct } from "./ComponentPreview";
import {
  DEFAULT_STYLE,
  type ComponentStyle,
  type TemplateId,
} from "../lib/templates";

export type PickedProduct = {
  productId: string;
  variantId?: string | null;
  title: string;
  image?: string | null;
};

export type EditorValue = {
  id?: string;
  name: string;
  main: PickedProduct | null;
  companions: PickedProduct[];
  template: TemplateId;
  direction: string;
  enabled: boolean;
  style: ComponentStyle;
};

declare global {
  interface Window {
    shopify?: {
      resourcePicker: (options: {
        type: "product";
        multiple?: boolean;
      }) => Promise<any[] | undefined>;
    };
  }
}

function fromPicker(sel: any[]): PickedProduct[] {
  return (sel || []).map((p) => ({
    productId: p.id,
    variantId: p.variants?.[0]?.id ?? null,
    title: p.title,
    image: p.images?.[0]?.originalSrc || p.images?.[0]?.url || null,
  }));
}

function toPreview(p?: PickedProduct | null): PreviewProduct | null {
  if (!p) return null;
  return { title: p.title, image: p.image };
}

export default function RelationshipEditor({
  value,
  mode,
  actionError,
}: {
  value: EditorValue;
  mode: "create" | "edit";
  actionError?: string | null;
}) {
  const nav = useNavigation();
  const submit = useSubmit();
  const { t } = useTranslation("relationships");
  const { t: tt } = useTranslation("templates");
  const submitting = nav.state === "submitting";

  const [name, setName] = useState(value.name || "");
  const [main, setMain] = useState<PickedProduct | null>(value.main);
  const [companions, setCompanions] = useState<PickedProduct[]>(value.companions);
  const [direction, setDirection] = useState(value.direction || "uni");
  const [enabled, setEnabled] = useState(value.enabled);
  const [style, setStyle] = useState<ComponentStyle>({ ...DEFAULT_STYLE, ...value.style });
  const [tab, setTab] = useState(0);

  const setS = <K extends keyof ComponentStyle>(k: K, v: ComponentStyle[K]) =>
    setStyle((prev) => ({ ...prev, [k]: v }));

  const pickMain = useCallback(async () => {
    const sel = await window.shopify?.resourcePicker({ type: "product" });
    if (sel && sel.length) setMain(fromPicker(sel)[0]);
  }, []);
  const pickCompanions = useCallback(async () => {
    const sel = await window.shopify?.resourcePicker({ type: "product", multiple: true });
    if (sel && sel.length) {
      setCompanions(fromPicker(sel).filter((p) => p.productId !== main?.productId));
    }
  }, [main?.productId]);
  const removeCompanion = (id: string) =>
    setCompanions((prev) => prev.filter((c) => c.productId !== id));

  const templateName = tt(`${value.template}.name`);
  const canSubmit = Boolean(main) && companions.length > 0 && !submitting;

  const onDelete = () => {
    if (confirm(t("editor.confirmDelete"))) {
      submit({ intent: "delete" }, { method: "post" });
    }
  };

  const tabs = [
    { id: "config", content: t("editor.tabConfig") },
    { id: "style", content: t("editor.tabStyle") },
  ];

  return (
    <Page
      title={
        mode === "create"
          ? t("editor.titleCreate", { name: templateName })
          : t("editor.titleEdit", { name: templateName })
      }
      backAction={{
        content: mode === "create" ? t("editor.backTemplates") : t("editor.backRelationships"),
        url: mode === "create" ? "/app/relationships/new" : "/app/relationships",
      }}
      secondaryActions={
        mode === "edit"
          ? [{ content: t("editor.delete"), destructive: true, onAction: onDelete }]
          : undefined
      }
    >
      <Form method="post">
        <input type="hidden" name="name" value={name} />
        <input type="hidden" name="main" value={JSON.stringify(main ?? "")} />
        <input type="hidden" name="companions" value={JSON.stringify(companions)} />
        <input type="hidden" name="template" value={value.template} />
        <input type="hidden" name="direction" value={direction} />
        <input type="hidden" name="enabled" value={enabled ? "1" : "0"} />
        <input type="hidden" name="style" value={JSON.stringify(style)} />

        <BlockStack gap="400">
          {actionError ? (
            <Banner tone="critical" title={t("editor.saveError")}>
              <p>{actionError}</p>
            </Banner>
          ) : null}

          <Layout>
            {/* Preview grande em destaque */}
            <Layout.Section>
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    {t("editor.previewHeading")}
                  </Text>
                  <Box background="bg-surface-secondary" padding="400" borderRadius="300">
                    <ComponentPreview
                      template={value.template}
                      style={style}
                      main={toPreview(main)}
                      companions={companions.map((c) => toPreview(c)!).filter(Boolean)}
                    />
                  </Box>
                  <Text as="span" tone="subdued" variant="bodySm">
                    {t("editor.previewHelp")}
                  </Text>
                </BlockStack>
              </Card>
            </Layout.Section>

            {/* Sidebar com abas */}
            <Layout.Section variant="oneThird">
              <Card padding="0">
                <Tabs tabs={tabs} selected={tab} onSelect={setTab}>
                  <Box padding="400">
                    {tab === 0 ? (
                      <BlockStack gap="400">
                        <TextField
                          label={t("editor.nameLabel")}
                          value={name}
                          onChange={setName}
                          autoComplete="off"
                          placeholder={t("editor.namePlaceholder")}
                          helpText={t("editor.nameHelp")}
                        />

                        <Divider />

                        <BlockStack gap="200">
                          <Text as="h4" variant="headingSm">
                            {t("editor.mainProduct")}
                          </Text>
                          {main ? (
                            <InlineStack gap="300" blockAlign="center" align="space-between">
                              <InlineStack gap="200" blockAlign="center">
                                <Thumbnail source={main.image || ""} alt={main.title} size="small" />
                                <Text as="span" variant="bodyMd">
                                  {main.title}
                                </Text>
                              </InlineStack>
                              <Button variant="tertiary" onClick={pickMain}>
                                {t("editor.swap")}
                              </Button>
                            </InlineStack>
                          ) : (
                            <Button onClick={pickMain}>{t("editor.selectMain")}</Button>
                          )}
                        </BlockStack>

                        <Divider />

                        <BlockStack gap="200">
                          <InlineStack align="space-between" blockAlign="center">
                            <Text as="h4" variant="headingSm">
                              {t("editor.companions")}
                            </Text>
                            <Button onClick={pickCompanions} disabled={!main} variant="tertiary">
                              {companions.length ? t("editor.edit") : t("editor.select")}
                            </Button>
                          </InlineStack>
                          {companions.length === 0 ? (
                            <Text as="span" tone="subdued" variant="bodySm">
                              {t("editor.companionsEmpty")}
                            </Text>
                          ) : (
                            companions.map((c) => (
                              <InlineStack
                                key={c.productId}
                                gap="200"
                                blockAlign="center"
                                align="space-between"
                              >
                                <InlineStack gap="200" blockAlign="center">
                                  <Thumbnail source={c.image || ""} alt={c.title} size="small" />
                                  <Text as="span" variant="bodySm">
                                    {c.title}
                                  </Text>
                                </InlineStack>
                                <Button
                                  variant="tertiary"
                                  tone="critical"
                                  onClick={() => removeCompanion(c.productId)}
                                >
                                  {t("editor.remove")}
                                </Button>
                              </InlineStack>
                            ))
                          )}
                        </BlockStack>

                        <Divider />

                        <ChoiceList
                          title={t("editor.directionTitle")}
                          choices={[
                            {
                              label: t("direction.uni"),
                              value: "uni",
                              helpText: t("editor.directionUniHelp"),
                            },
                            {
                              label: t("direction.bi"),
                              value: "bi",
                              helpText: t("editor.directionBiHelp"),
                            },
                          ]}
                          selected={[direction]}
                          onChange={(v) => setDirection(v[0] || "uni")}
                        />

                        <Checkbox
                          label={t("editor.activeLabel")}
                          checked={enabled}
                          onChange={setEnabled}
                          helpText={t("editor.activeHelp")}
                        />
                      </BlockStack>
                    ) : (
                      <BlockStack gap="400">
                        <ColorField
                          label={t("editor.styleBackground")}
                          value={style.backgroundColor}
                          onChange={(v) => setS("backgroundColor", v)}
                        />
                        <ColorField
                          label={t("editor.styleText")}
                          value={style.textColor}
                          onChange={(v) => setS("textColor", v)}
                        />

                        <Divider />

                        <Checkbox
                          label={t("editor.showTitle")}
                          checked={style.showTitle}
                          onChange={(v) => setS("showTitle", v)}
                        />
                        {style.showTitle ? (
                          <>
                            <TextField
                              label={t("editor.titleTextLabel")}
                              value={style.titleText}
                              onChange={(v) => setS("titleText", v)}
                              autoComplete="off"
                            />
                            <ColorField
                              label={t("editor.titleColor")}
                              value={style.titleColor}
                              onChange={(v) => setS("titleColor", v)}
                            />
                            <RangeSlider
                              label={t("editor.titleSize", { size: style.titleSize })}
                              min={12}
                              max={40}
                              value={style.titleSize}
                              onChange={(v) => setS("titleSize", Array.isArray(v) ? v[0] : v)}
                              output
                            />
                          </>
                        ) : null}

                        <Divider />

                        <ColorField
                          label={t("editor.button")}
                          value={style.buttonColor}
                          onChange={(v) => setS("buttonColor", v)}
                        />
                        <ColorField
                          label={t("editor.buttonHover")}
                          value={style.buttonHoverColor}
                          onChange={(v) => setS("buttonHoverColor", v)}
                        />
                        <ColorField
                          label={t("editor.buttonTextColor")}
                          value={style.buttonTextColor}
                          onChange={(v) => setS("buttonTextColor", v)}
                        />
                        <TextField
                          label={t("editor.buttonLabel")}
                          value={style.addButtonText}
                          onChange={(v) => setS("addButtonText", v)}
                          autoComplete="off"
                        />

                        <Divider />

                        <Checkbox
                          label={t("editor.cardBorder")}
                          checked={style.cardBorder}
                          onChange={(v) => setS("cardBorder", v)}
                        />
                      </BlockStack>
                    )}
                  </Box>
                </Tabs>
              </Card>

              <Box paddingBlockStart="300">
                <Button
                  submit
                  variant="primary"
                  fullWidth
                  disabled={!canSubmit}
                  loading={submitting}
                >
                  {t("editor.save")}
                </Button>
              </Box>
            </Layout.Section>
          </Layout>
        </BlockStack>
      </Form>
    </Page>
  );
}

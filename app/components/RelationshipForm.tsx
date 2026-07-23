/**
 * Formulário compartilhado (criar/editar) de relacionamento Buy Together.
 * Usa o resource picker do App Bridge (window.shopify.resourcePicker):
 *  - produto principal: seleção única
 *  - companheiros: seleção múltipla (1:N)
 * Serializa a seleção em campos hidden e envia via Remix Form.
 */
import { useState, useCallback } from "react";
import { Form, useNavigation } from "@remix-run/react";
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Thumbnail,
  Box,
  Select,
  Checkbox,
  Banner,
  Divider,
} from "@shopify/polaris";

export type PickedProduct = {
  productId: string; // gid
  variantId?: string | null; // gid (1ª variante)
  title: string;
  image?: string | null;
};

export type RelationshipFormValue = {
  id?: string;
  main: PickedProduct | null;
  companions: PickedProduct[];
  layout: string;
  enabled: boolean;
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

function fromPickerSelection(sel: any[]): PickedProduct[] {
  return (sel || []).map((p) => ({
    productId: p.id,
    variantId: p.variants?.[0]?.id ?? null,
    title: p.title,
    image: p.images?.[0]?.originalSrc || p.images?.[0]?.url || null,
  }));
}

export default function RelationshipForm({
  initialValue,
  actionError,
}: {
  initialValue: RelationshipFormValue;
  actionError?: string | null;
}) {
  const nav = useNavigation();
  const submitting = nav.state === "submitting";
  const [main, setMain] = useState<PickedProduct | null>(initialValue.main);
  const [companions, setCompanions] = useState<PickedProduct[]>(
    initialValue.companions,
  );
  const [layout, setLayout] = useState(initialValue.layout);
  const [enabled, setEnabled] = useState(initialValue.enabled);

  const pickMain = useCallback(async () => {
    const sel = await window.shopify?.resourcePicker({ type: "product" });
    if (sel && sel.length) setMain(fromPickerSelection(sel)[0]);
  }, []);

  const pickCompanions = useCallback(async () => {
    const sel = await window.shopify?.resourcePicker({
      type: "product",
      multiple: true,
    });
    if (sel && sel.length) {
      const picked = fromPickerSelection(sel).filter(
        (p) => p.productId !== main?.productId,
      );
      setCompanions(picked);
    }
  }, [main?.productId]);

  const removeCompanion = (productId: string) =>
    setCompanions((prev) => prev.filter((c) => c.productId !== productId));

  const canSubmit = Boolean(main) && companions.length > 0 && !submitting;

  return (
    <Form method="post">
      <input type="hidden" name="main" value={JSON.stringify(main ?? "")} />
      <input type="hidden" name="companions" value={JSON.stringify(companions)} />
      <input type="hidden" name="layout" value={layout} />
      <input type="hidden" name="enabled" value={enabled ? "1" : "0"} />

      <BlockStack gap="400">
        {actionError ? (
          <Banner tone="critical" title="Não foi possível salvar">
            <p>{actionError}</p>
          </Banner>
        ) : null}

        <Card>
          <BlockStack gap="300">
            <Text as="h3" variant="headingMd">
              Produto principal
            </Text>
            <Text as="p" tone="subdued">
              A página deste produto mostrará a sugestão de compra conjunta.
            </Text>
            {main ? (
              <InlineStack gap="300" blockAlign="center" align="space-between">
                <InlineStack gap="300" blockAlign="center">
                  <Thumbnail
                    source={main.image || ""}
                    alt={main.title}
                    size="small"
                  />
                  <Text as="span" variant="bodyMd" fontWeight="medium">
                    {main.title}
                  </Text>
                </InlineStack>
                <Button onClick={pickMain} variant="tertiary">
                  Trocar
                </Button>
              </InlineStack>
            ) : (
              <Box>
                <Button onClick={pickMain}>Selecionar produto principal</Button>
              </Box>
            )}
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h3" variant="headingMd">
                Produtos companheiros
              </Text>
              <Button onClick={pickCompanions} disabled={!main}>
                {companions.length ? "Editar seleção" : "Selecionar companheiros"}
              </Button>
            </InlineStack>
            {!main ? (
              <Text as="p" tone="subdued">
                Selecione o produto principal primeiro.
              </Text>
            ) : companions.length === 0 ? (
              <Text as="p" tone="subdued">
                Nenhum companheiro selecionado. O widget só aparece com ao menos um.
              </Text>
            ) : (
              <BlockStack gap="200">
                {companions.map((c, i) => (
                  <div key={c.productId}>
                    {i > 0 ? <Divider /> : null}
                    <Box paddingBlock="200">
                      <InlineStack
                        gap="300"
                        blockAlign="center"
                        align="space-between"
                      >
                        <InlineStack gap="300" blockAlign="center">
                          <Thumbnail
                            source={c.image || ""}
                            alt={c.title}
                            size="small"
                          />
                          <Text as="span" variant="bodyMd">
                            {c.title}
                          </Text>
                        </InlineStack>
                        <Button
                          variant="tertiary"
                          tone="critical"
                          onClick={() => removeCompanion(c.productId)}
                        >
                          Remover
                        </Button>
                      </InlineStack>
                    </Box>
                  </div>
                ))}
              </BlockStack>
            )}
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="300">
            <Text as="h3" variant="headingMd">
              Exibição
            </Text>
            <Select
              label="Layout preferido"
              helpText="A posição real é definida ao arrastar o bloco no editor de tema."
              options={[
                { label: "A — Lado a lado (com total)", value: "A" },
                { label: "B — Compacto (perto do botão comprar)", value: "B" },
              ]}
              value={layout}
              onChange={setLayout}
            />
            <Checkbox
              label="Ativo"
              checked={enabled}
              onChange={setEnabled}
              helpText="Desative para esconder o widget sem apagar o relacionamento."
            />
          </BlockStack>
        </Card>

        <InlineStack align="end" gap="200">
          <Button submit variant="primary" disabled={!canSubmit} loading={submitting}>
            Salvar
          </Button>
        </InlineStack>
      </BlockStack>
    </Form>
  );
}

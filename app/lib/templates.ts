/**
 * Registro de templates de componente e do estilo por componente.
 * Fonte única usada pela galeria, pelo editor (preview + form) e pelo storefront.
 */

export type TemplateId = "side-by-side" | "list" | "compact";

export type TemplateMeta = {
  id: TemplateId;
  name: string;
  description: string;
  // Imagem do card da galeria (servida de public/ — ex.: /side-by-side.png).
  image: string | null;
};

export const TEMPLATES: TemplateMeta[] = [
  {
    id: "side-by-side",
    name: "Produtos lado a lado",
    description:
      "Cards dos dois produtos no formato de vitrine e uma coluna com o total e o botão.",
    image: "/side-by-side.png",
  },
  {
    id: "list",
    name: "Lista de produtos",
    description:
      "Lista vertical dos produtos que combinam, com o total e um botão para levar tudo.",
    image: "/list.png",
  },
  {
    id: "compact",
    name: "Compacto",
    description:
      "Faixa enxuta com o produto sugerido e o botão — ideal perto do botão comprar.",
    image: "/compact.png",
  },
];

export function isTemplateId(v: string): v is TemplateId {
  return TEMPLATES.some((t) => t.id === v);
}

/** Estilo editável por componente. */
export type ComponentStyle = {
  backgroundColor: string;
  textColor: string;
  // Título ("Compre junto") — a seção pode ter ou não título.
  showTitle: boolean;
  titleText: string;
  titleColor: string;
  titleSize: number; // px
  // Botão + estado hover.
  buttonColor: string;
  buttonHoverColor: string;
  buttonTextColor: string;
  addButtonText: string;
  // Botão secundário "comprar agora" (leva direto ao checkout).
  showBuyNow: boolean;
  buyNowText: string;
  // Borda do card (pode ter ou não).
  cardBorder: boolean;
  // Controles por item no storefront.
  showQuantity: boolean; // stepper − 1 +
  showVariantPicker: boolean; // dropdown de variante (Cor: Preto)
};

export const DEFAULT_STYLE: ComponentStyle = {
  backgroundColor: "#ffffff",
  textColor: "#1a1a1a",
  showTitle: true,
  titleText: "Compre junto",
  titleColor: "#1a1a1a",
  titleSize: 18,
  buttonColor: "#4f46e5",
  buttonHoverColor: "#4338ca",
  buttonTextColor: "#ffffff",
  addButtonText: "Adicionar ao carrinho",
  showBuyNow: true,
  buyNowText: "Comprar agora",
  cardBorder: true,
  showQuantity: true,
  showVariantPicker: true,
};

/** Desconto do bundle (por relacionamento). */
export type DiscountType = "none" | "percentage" | "fixed";

export type BundleDiscount = {
  type: DiscountType;
  value: number; // % quando percentage; valor na moeda da loja quando fixed
};

export const NO_DISCOUNT: BundleDiscount = { type: "none", value: 0 };

export function isDiscountType(v: string): v is DiscountType {
  return v === "none" || v === "percentage" || v === "fixed";
}

/** Normaliza o que veio do DB/form (clampa % em 0–100 e não deixa valor negativo). */
export function normalizeDiscount(
  type?: string | null,
  value?: number | string | null,
): BundleDiscount {
  const t = typeof type === "string" && isDiscountType(type) ? type : "none";
  let v = typeof value === "string" ? parseFloat(value.replace(",", ".")) : value ?? 0;
  if (typeof v !== "number" || isNaN(v) || v < 0) v = 0;
  if (t === "percentage") v = Math.min(v, 100);
  if (t === "none" || v === 0) return { ...NO_DISCOUNT };
  return { type: t, value: v };
}

export type BundleTotals = {
  subtotal: number; // soma dos itens, em centavos
  total: number; // com desconto, em centavos
  savings: number; // subtotal - total, em centavos
  percent: number; // economia arredondada, para o badge (-14%)
};

/**
 * Totais do bundle a partir do subtotal em centavos.
 * Fonte única do cálculo — o storefront (JS puro) replica esta mesma regra.
 */
export function computeTotals(
  subtotalCents: number,
  discount?: BundleDiscount | null,
): BundleTotals {
  const subtotal = Math.max(0, Math.round(subtotalCents || 0));
  const d = discount && discount.type !== "none" ? discount : null;
  let savings = 0;
  if (d) {
    savings =
      d.type === "percentage"
        ? Math.round((subtotal * d.value) / 100)
        : Math.round(d.value * 100);
  }
  if (savings > subtotal) savings = subtotal;
  const total = subtotal - savings;
  const percent = subtotal > 0 ? Math.round((savings / subtotal) * 100) : 0;
  return { subtotal, total, savings, percent };
}

/** Mescla um estilo parcial (do DB) com os defaults, garantindo todos os campos. */
export function mergeStyle(partial?: Partial<ComponentStyle> | null): ComponentStyle {
  return { ...DEFAULT_STYLE, ...(partial || {}) };
}

/** Parse seguro do JSON de estilo salvo no relacionamento. */
export function parseStyle(json?: string | null): ComponentStyle {
  if (!json) return { ...DEFAULT_STYLE };
  try {
    return mergeStyle(JSON.parse(json));
  } catch {
    return { ...DEFAULT_STYLE };
  }
}

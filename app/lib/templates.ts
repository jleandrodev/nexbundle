/**
 * Registro de templates de componente e do estilo por componente.
 * Fonte única usada pela galeria, pelo editor (preview + form) e pelo storefront.
 */

export type TemplateId = "side-by-side" | "list" | "compact";

export type TemplateMeta = {
  id: TemplateId;
  name: string;
  description: string;
  // Imagem do card da galeria (o usuário vai fornecer depois). Placeholder por enquanto.
  image: string | null;
};

export const TEMPLATES: TemplateMeta[] = [
  {
    id: "side-by-side",
    name: "Produtos lado a lado",
    description:
      "Cards dos dois produtos no formato de vitrine e uma coluna com o total e o botão.",
    image: null,
  },
  {
    id: "list",
    name: "Lista de produtos",
    description:
      "Lista vertical dos produtos que combinam, com o total e um botão para levar tudo.",
    image: null,
  },
  {
    id: "compact",
    name: "Compacto",
    description:
      "Faixa enxuta com o produto sugerido e o botão — ideal perto do botão comprar.",
    image: null,
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
  // Borda do card (pode ter ou não).
  cardBorder: boolean;
};

export const DEFAULT_STYLE: ComponentStyle = {
  backgroundColor: "#ffffff",
  textColor: "#1a1a1a",
  showTitle: true,
  titleText: "Compre junto",
  titleColor: "#1a1a1a",
  titleSize: 18,
  buttonColor: "#000000",
  buttonHoverColor: "#333333",
  buttonTextColor: "#ffffff",
  addButtonText: "Adicionar ambos ao carrinho",
  cardBorder: true,
};

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

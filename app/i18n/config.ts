/**
 * Configuração isomórfica do i18next (compartilhada entre server e client).
 * pt-BR é a língua-fonte (todas as strings originais estão em pt-BR) e o fallback.
 */

export const supportedLngs = ["pt-BR", "en", "es"] as const;
export type SupportedLng = (typeof supportedLngs)[number];

export const fallbackLng: SupportedLng = "pt-BR";
export const defaultNS = "common";

/** Namespaces por feature. Mantidos em sincronia com os arquivos em app/locales/<lng>/. */
export const namespaces = [
  "common",
  "nav",
  "dashboard",
  "relationships",
  "analytics",
  "plans",
  "templates",
  "auth",
  "support",
  "promotions",
] as const;

/**
 * Normaliza qualquer locale recebido (Shopify pode mandar variantes: en-US, pt-PT,
 * es-ES, fr, de…) para o subconjunto suportado. Fora disso, cai em pt-BR.
 * CRÍTICO: sem isso o i18next fica sem recurso e o texto some.
 */
export function normalizeLocale(raw?: string | null): SupportedLng {
  if (!raw) return fallbackLng;
  const lower = raw.toLowerCase();
  const base = lower.split("-")[0];

  // pt-BR e pt-PT (ou qualquer pt-*) → pt-BR
  if (base === "pt") return "pt-BR";
  if (base === "es") return "es";
  if (base === "en") return "en";

  return fallbackLng;
}

/**
 * Traduções do Polaris por locale — módulo server-only (.server) para que os 3 JSONs
 * NÃO sejam bundlados no cliente. O loader (server) escolhe o correto e serializa no
 * payload. Import dinâmico de node_modules não é analisável pelo Vite, então usamos
 * um mapa estático.
 */
import type { AppProviderProps } from "@shopify/polaris";
import en from "@shopify/polaris/locales/en.json";
import es from "@shopify/polaris/locales/es.json";
import ptBR from "@shopify/polaris/locales/pt-BR.json";

import type { SupportedLng } from "./config";

type PolarisI18n = AppProviderProps["i18n"];

const POLARIS_TRANSLATIONS: Record<SupportedLng, PolarisI18n> = {
  en: en as PolarisI18n,
  es: es as PolarisI18n,
  "pt-BR": ptBR as PolarisI18n,
};

export function polarisTranslations(locale: SupportedLng): PolarisI18n {
  return POLARIS_TRANSLATIONS[locale];
}

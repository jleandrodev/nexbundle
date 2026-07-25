/**
 * Seletor de idioma do painel admin. Submete para /app/settings/locale via fetcher
 * (sem navegar); a revalidação do Remix recarrega os loaders e o root troca a língua.
 */
import { useCallback } from "react";
import { Select } from "@shopify/polaris";
import { useFetcher } from "@remix-run/react";
import { useTranslation } from "react-i18next";

import { supportedLngs, type SupportedLng } from "../i18n/config";

const LABELS: Record<SupportedLng, string> = {
  "pt-BR": "Português (BR)",
  en: "English",
  es: "Español",
};

export default function LocaleSwitcher() {
  const fetcher = useFetcher();
  const { t, i18n } = useTranslation("common");

  const current = (
    supportedLngs.includes(i18n.language as SupportedLng)
      ? i18n.language
      : "pt-BR"
  ) as SupportedLng;

  const onChange = useCallback(
    (value: string) => {
      fetcher.submit(
        { locale: value },
        { method: "post", action: "/app/settings/locale" },
      );
    },
    [fetcher],
  );

  const options = supportedLngs.map((lng) => ({ label: LABELS[lng], value: lng }));

  return (
    <Select
      label={t("language")}
      labelInline
      options={options}
      value={current}
      onChange={onChange}
      disabled={fetcher.state !== "idle"}
    />
  );
}

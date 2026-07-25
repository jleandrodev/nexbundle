/**
 * Entrada do cliente com i18next hidratando na MESMA língua do servidor.
 * (O Remix usa um entry.client default quando este arquivo não existe; aqui
 *  precisamos dele para inicializar o i18next antes da hidratação.)
 */
import { RemixBrowser } from "@remix-run/react";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { getInitialNamespaces } from "remix-i18next/client";

import {
  defaultNS,
  fallbackLng,
  supportedLngs,
} from "./i18n/config";
import { resources } from "./i18n/resources";

async function hydrate() {
  await i18next
    .use(initReactI18next)
    .use(LanguageDetector)
    .init({
      supportedLngs: [...supportedLngs],
      fallbackLng,
      defaultNS,
      resources,
      ns: getInitialNamespaces(),
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
      detection: {
        // Lê a MESMA fonte que o servidor: cookie (override) e ?locale= do Shopify.
        order: ["cookie", "querystring", "htmlTag"],
        lookupCookie: "bt_locale",
        lookupQuerystring: "locale",
        caches: [],
      },
    });

  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <I18nextProvider i18n={i18next}>
          <RemixBrowser />
        </I18nextProvider>
      </StrictMode>
    );
  });
}

if (window.requestIdleCallback) {
  window.requestIdleCallback(hydrate);
} else {
  window.setTimeout(hydrate, 1);
}

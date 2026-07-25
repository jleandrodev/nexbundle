/**
 * Instância server-side do remix-i18next + o cookie de locale.
 *
 * O cookie é apenas um ESPELHO do override persistido no banco (ShopPreference).
 * A fonte de verdade é o DB (ver resolve.server.ts); o cookie existe só para que
 * entry.server/root resolvam o locale sem consultar o banco a cada request.
 *
 * Ordem de detecção: cookie (override) → searchParams (?locale= do Shopify) → header.
 */
import { createCookie } from "@remix-run/node";
import { RemixI18Next } from "remix-i18next/server";

import {
  defaultNS,
  fallbackLng,
  namespaces,
  supportedLngs,
} from "./config";
import { resources } from "./resources";

export const localeCookie = createCookie("bt_locale", {
  path: "/",
  sameSite: "none",
  secure: true,
  httpOnly: false,
  maxAge: 60 * 60 * 24 * 365,
});

export const i18n = new RemixI18Next({
  detection: {
    supportedLanguages: [...supportedLngs],
    fallbackLanguage: fallbackLng,
    order: ["cookie", "searchParams", "header"],
    cookie: localeCookie,
    searchParamKey: "locale",
  },
  i18next: {
    resources,
    supportedLngs: [...supportedLngs],
    fallbackLng,
    defaultNS,
    ns: [...namespaces],
    interpolation: { escapeValue: false },
  },
});

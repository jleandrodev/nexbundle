import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import { useTranslation } from "react-i18next";
import { useChangeLanguage } from "remix-i18next/react";

import { i18n } from "./i18n/i18next.server";

export const handle = { i18n: ["common"] };

// Fallback: no Remix v2 o meta da rota folha SUBSTITUI o do root, então isto vale
// só para as telas que não declaram o próprio (ex.: painel embedado).
export const meta: MetaFunction = () => [{ title: "NexBundle" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const locale = await i18n.getLocale(request);
  return json({ locale });
}

export default function App() {
  const { locale } = useLoaderData<typeof loader>();
  const { i18n: i18nInstance } = useTranslation();

  // Mantém o i18next do cliente na língua resolvida pelo servidor.
  useChangeLanguage(locale);

  return (
    <html lang={locale} dir={i18nInstance.dir(locale)}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

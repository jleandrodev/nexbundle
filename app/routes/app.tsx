import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import { useTranslation } from "react-i18next";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

import { authenticate } from "../shopify.server";
import { getEntitlement } from "../services/billing.server";
import { redirectKeepingContext } from "../utils/embedded-redirect.server";
import SupportChat from "../components/SupportChat";
import { resolveAdminLocale, serializeLocaleCookie } from "../i18n/resolve.server";
import { polarisTranslations } from "../i18n/polaris.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const handle = { i18n: ["nav", "common", "support"] };

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const ctx = await authenticate.admin(request);
  const entitlement = await getEntitlement(ctx);

  // Loja real sem assinatura → manda escolher um plano (exceto já na própria página).
  // O redirect PRECISA preservar shop/host/embedded: sem eles o document request
  // seguinte perde a sessão e o admin acaba mostrando o OAuth dentro do iframe.
  const pathname = new URL(request.url).pathname;
  if (!entitlement.subscribed && !pathname.startsWith("/app/plans")) {
    throw redirectKeepingContext(request, "/app/plans");
  }

  const locale = await resolveAdminLocale(request, ctx.session.shop);

  return json(
    {
      apiKey: process.env.SHOPIFY_API_KEY || "",
      entitlement,
      polarisTranslations: polarisTranslations(locale),
    },
    // Espelha o override do DB no cookie para entry.server/root ficarem alinhados.
    { headers: { "Set-Cookie": await serializeLocaleCookie(locale) } },
  );
};

export default function App() {
  const { apiKey, polarisTranslations } = useLoaderData<typeof loader>();
  const { t } = useTranslation("nav");

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey} i18n={polarisTranslations}>
      <NavMenu>
        <Link to="/app" rel="home">
          {t("dashboard")}
        </Link>
        <Link to="/app/relationships">{t("components")}</Link>
        <Link to="/app/analytics">{t("analytics")}</Link>
        <Link to="/app/plans">{t("plans")}</Link>
      </NavMenu>
      <div style={{ paddingBlockEnd: 80 }}>
        <Outlet />
      </div>
      <SupportChat />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

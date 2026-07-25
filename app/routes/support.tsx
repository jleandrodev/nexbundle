/**
 * Layout do front de atendimento (equipe). Standalone (fora do embedded).
 * Guarda de auth própria (requireStaff) + Polaris NÃO-embedded + logo.
 * As rotas de login/logout usam prefixo `support_.` para escapar deste layout.
 */
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Outlet, useLoaderData, Form, Link } from "@remix-run/react";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { requireStaff } from "../support-auth.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export async function loader({ request }: LoaderFunctionArgs) {
  const staff = await requireStaff(request);
  return json({ staff });
}

export default function SupportLayout() {
  const { staff } = useLoaderData<typeof loader>();
  return (
    <PolarisAppProvider i18n={enTranslations}>
      <div style={{ minHeight: "100vh", background: "#F6F6F7" }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 20px",
            background: "#fff",
            borderBottom: "1px solid #E1E3E5",
          }}
        >
          <Link to="/support" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/logo.png" alt="NexBundle" style={{ height: 28 }} />
            <span style={{ fontWeight: 600, color: "#202223" }}>Atendimento</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ color: "#6D7175", fontSize: 13 }}>{staff.name}</span>
            <Form method="post" action="/support/logout">
              <button
                type="submit"
                style={{ border: "none", background: "none", color: "#5C6AC4", cursor: "pointer", fontSize: 13 }}
              >
                Sair
              </button>
            </Form>
          </div>
        </header>
        <main style={{ maxWidth: 1040, margin: "0 auto", padding: 20 }}>
          <Outlet />
        </main>
      </div>
    </PolarisAppProvider>
  );
}

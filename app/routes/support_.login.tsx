/**
 * Login da equipe de atendimento. Fora do layout support.tsx (prefixo support_.)
 * para não cair no requireStaff (evita loop de redirect).
 */
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useSearchParams } from "@remix-run/react";
import { getStaffUser, login, createStaffSession } from "../support-auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getStaffUser(request);
  if (user) return redirect("/support");
  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") || "");
  const password = String(form.get("password") || "");
  const next = String(form.get("next") || "/support");
  const user = await login(email, password);
  if (!user) return json({ error: "E-mail ou senha inválidos." }, { status: 401 });
  const safeNext = next.startsWith("/support") ? next : "/support";
  return createStaffSession(user.id, safeNext);
}

export default function SupportLogin() {
  const actionData = useActionData<typeof action>();
  const [params] = useSearchParams();
  const next = params.get("next") || "/support";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F6F6F7",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      <div
        style={{
          width: 360,
          maxWidth: "90vw",
          background: "#fff",
          borderRadius: 14,
          boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
          padding: 28,
        }}
      >
        <img src="/logo.png" alt="NexBundle" style={{ height: 30, marginBottom: 6 }} />
        <h1 style={{ fontSize: 18, margin: "8px 0 2px" }}>Atendimento</h1>
        <p style={{ color: "#6D7175", fontSize: 13, marginTop: 0 }}>Acesso da equipe NexBundle.</p>

        <Form method="post" style={{ marginTop: 16 }}>
          <input type="hidden" name="next" value={next} />
          <label style={{ fontSize: 13, color: "#202223" }}>E-mail</label>
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            style={{ width: "100%", padding: "10px 12px", border: "1px solid #C9CCCF", borderRadius: 8, margin: "4px 0 12px", fontSize: 14 }}
          />
          <label style={{ fontSize: 13, color: "#202223" }}>Senha</label>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            style={{ width: "100%", padding: "10px 12px", border: "1px solid #C9CCCF", borderRadius: 8, margin: "4px 0 12px", fontSize: 14 }}
          />
          {actionData?.error ? (
            <p style={{ color: "#D72C0D", fontSize: 13, margin: "0 0 12px" }}>{actionData.error}</p>
          ) : null}
          <button
            type="submit"
            style={{ width: "100%", background: "#5C6AC4", color: "#fff", border: "none", borderRadius: 8, padding: "11px", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
          >
            Entrar
          </button>
        </Form>
      </div>
    </div>
  );
}

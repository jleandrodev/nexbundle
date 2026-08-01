/**
 * Editor de criação de um componente a partir do template escolhido na galeria.
 */
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import {
  createRelationship,
  countRelationships,
  parseRelationshipForm,
} from "../services/relationships.server";
import { getEntitlement } from "../services/billing.server";
import { syncBundleDiscountSafe } from "../services/discounts.server";
import { getShopCurrency } from "../services/products.server";
import { isUnlimited } from "../plans";
import { isTemplateId, DEFAULT_STYLE, type TemplateId } from "../lib/templates";
import { i18n } from "../i18n/i18next.server";
import RelationshipEditor from "../components/RelationshipEditor";
import { redirectKeepingContext } from "../utils/embedded-redirect.server";

export const handle = { i18n: ["relationships", "templates", "common"] };

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { admin } = await authenticate.admin(request);
  const template = params.template || "";
  if (!isTemplateId(template))
    throw redirectKeepingContext(request, "/app/relationships/new");
  const currency = await getShopCurrency(admin);
  return json({ template: template as TemplateId, currency });
}

export async function action({ request }: ActionFunctionArgs) {
  const ctx = await authenticate.admin(request);
  const { session } = ctx;
  const form = await request.formData();
  const t = await i18n.getFixedT(request, "relationships");
  const parsed = parseRelationshipForm(form);
  if (!parsed.ok) return json({ error: parsed.error }, { status: 400 });

  const entitlement = await getEntitlement(ctx);
  const used = await countRelationships(session.shop);
  if (!isUnlimited(entitlement.limit) && used >= entitlement.limit) {
    return json(
      {
        error: t("errors.limitReached", { limit: entitlement.limit }),
      },
      { status: 400 },
    );
  }

  try {
    await createRelationship(session.shop, parsed.value);
    // Desconto do bundle: registra/atualiza o desconto automático da Function.
    await syncBundleDiscountSafe(ctx.admin, session.shop);
  } catch (e: any) {
    if (String(e?.code) === "P2002") {
      return json(
        { error: t("errors.duplicate") },
        { status: 400 },
      );
    }
    throw e;
  }
  return redirectKeepingContext(request, "/app/relationships");
}

export default function CreateRelationship() {
  const { template, currency } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  return (
    <RelationshipEditor
      mode="create"
      currency={currency}
      actionError={actionData?.error}
      value={{
        name: "",
        main: null,
        companions: [],
        template,
        direction: "uni",
        enabled: true,
        discount: { type: "none", value: 0 },
        style: { ...DEFAULT_STYLE },
      }}
    />
  );
}

/**
 * Editor de criação de um componente a partir do template escolhido na galeria.
 */
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import {
  createRelationship,
  countRelationships,
  parseRelationshipForm,
} from "../services/relationships.server";
import { getEntitlement } from "../services/billing.server";
import { isUnlimited } from "../plans";
import { isTemplateId, DEFAULT_STYLE, type TemplateId } from "../lib/templates";
import { i18n } from "../i18n/i18next.server";
import RelationshipEditor from "../components/RelationshipEditor";

export const handle = { i18n: ["relationships", "templates", "common"] };

export async function loader({ request, params }: LoaderFunctionArgs) {
  await authenticate.admin(request);
  const template = params.template || "";
  if (!isTemplateId(template)) throw redirect("/app/relationships/new");
  return json({ template: template as TemplateId });
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
  } catch (e: any) {
    if (String(e?.code) === "P2002") {
      return json(
        { error: t("errors.duplicate") },
        { status: 400 },
      );
    }
    throw e;
  }
  return redirect("/app/relationships");
}

export default function CreateRelationship() {
  const { template } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  return (
    <RelationshipEditor
      mode="create"
      actionError={actionData?.error}
      value={{
        name: "",
        main: null,
        companions: [],
        template,
        direction: "uni",
        enabled: true,
        style: { ...DEFAULT_STYLE },
      }}
    />
  );
}

/**
 * Criar relacionamento Buy Together.
 */
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData } from "@remix-run/react";
import { Page } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import {
  createRelationship,
  countRelationships,
  parseRelationshipForm,
} from "../services/relationships.server";
import { getEntitlement } from "../services/billing.server";
import { isUnlimited } from "../plans";
import RelationshipForm from "../components/RelationshipForm";

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);
  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  const ctx = await authenticate.admin(request);
  const { session } = ctx;
  const form = await request.formData();
  const parsed = parseRelationshipForm(form);
  if (!parsed.ok) return json({ error: parsed.error }, { status: 400 });

  // Trava de limite do plano (nº de produtos com Buy Together).
  const entitlement = await getEntitlement(ctx);
  const used = await countRelationships(session.shop);
  if (!isUnlimited(entitlement.limit) && used >= entitlement.limit) {
    return json(
      {
        error: `Você atingiu o limite do seu plano (${entitlement.limit} produtos). Faça upgrade em "Planos" para adicionar mais.`,
      },
      { status: 400 },
    );
  }

  try {
    await createRelationship(session.shop, parsed.value);
  } catch (e: any) {
    if (String(e?.code) === "P2002") {
      return json(
        { error: "Já existe um relacionamento para este produto principal." },
        { status: 400 },
      );
    }
    throw e;
  }
  return redirect("/app/relationships");
}

export default function NewRelationship() {
  const actionData = useActionData<typeof action>();
  return (
    <Page
      title="Novo relacionamento"
      backAction={{ content: "Relacionamentos", url: "/app/relationships" }}
    >
      <RelationshipForm
        actionError={actionData?.error}
        initialValue={{ main: null, companions: [], layout: "A", enabled: true }}
      />
    </Page>
  );
}

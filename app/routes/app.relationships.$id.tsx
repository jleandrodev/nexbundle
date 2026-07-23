/**
 * Editar / excluir relacionamento Buy Together.
 */
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit } from "@remix-run/react";
import { Page, Button } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import {
  getRelationship,
  updateRelationship,
  deleteRelationship,
  parseRelationshipForm,
} from "../services/relationships.server";
import { enrichProducts, enrichOne } from "../services/products.server";
import RelationshipForm, {
  type PickedProduct,
} from "../components/RelationshipForm";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);
  const rel = await getRelationship(session.shop, params.id!);
  if (!rel) throw new Response("Not found", { status: 404 });

  const [mainEnriched, companionsEnriched] = await Promise.all([
    enrichOne(admin, rel.mainProductId),
    enrichProducts(
      admin,
      rel.companions.map((c) => ({
        productId: c.companionProductId,
        variantId: c.companionVariantId,
      })),
    ),
  ]);

  const main: PickedProduct | null = mainEnriched
    ? {
        productId: mainEnriched.productId,
        variantId: null,
        title: mainEnriched.title,
        image: mainEnriched.image,
      }
    : {
        productId: rel.mainProductId,
        title: rel.mainProductId,
        image: null,
      };

  const companions: PickedProduct[] = rel.companions.map((c) => {
    const e = companionsEnriched.find((x) => x.productId === c.companionProductId);
    return {
      productId: c.companionProductId,
      variantId: c.companionVariantId,
      title: e?.title || c.companionProductId,
      image: e?.image || null,
    };
  });

  return json({
    id: rel.id,
    value: { main, companions, layout: rel.layout, enabled: rel.enabled },
  });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();

  if (form.get("intent") === "delete") {
    await deleteRelationship(session.shop, params.id!);
    return redirect("/app/relationships");
  }

  const parsed = parseRelationshipForm(form);
  if (!parsed.ok) return json({ error: parsed.error }, { status: 400 });

  try {
    const updated = await updateRelationship(session.shop, params.id!, parsed.value);
    if (!updated) throw new Response("Not found", { status: 404 });
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

export default function EditRelationship() {
  const { id, value } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();

  const onDelete = () => {
    if (confirm("Excluir este relacionamento? Esta ação não pode ser desfeita.")) {
      submit({ intent: "delete" }, { method: "post" });
    }
  };

  return (
    <Page
      title="Editar relacionamento"
      backAction={{ content: "Relacionamentos", url: "/app/relationships" }}
      secondaryActions={
        <Button tone="critical" variant="tertiary" onClick={onDelete}>
          Excluir
        </Button>
      }
    >
      <RelationshipForm
        key={id}
        actionError={actionData?.error}
        initialValue={{ id, ...value }}
      />
    </Page>
  );
}

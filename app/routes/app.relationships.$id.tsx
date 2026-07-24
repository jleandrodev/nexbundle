/**
 * Editar / excluir um componente Buy Together (usa o editor com preview + abas).
 */
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import {
  getRelationship,
  updateRelationship,
  deleteRelationship,
  parseRelationshipForm,
} from "../services/relationships.server";
import { enrichProducts, enrichOne } from "../services/products.server";
import { parseStyle, isTemplateId, type TemplateId } from "../lib/templates";
import RelationshipEditor, {
  type PickedProduct,
} from "../components/RelationshipEditor";

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

  const main: PickedProduct = {
    productId: rel.mainProductId,
    variantId: null,
    title: mainEnriched?.title || rel.mainProductId,
    image: mainEnriched?.image || null,
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

  const template = (isTemplateId(rel.template) ? rel.template : "side-by-side") as TemplateId;

  return json({
    id: rel.id,
    value: {
      main,
      companions,
      template,
      direction: rel.direction,
      enabled: rel.enabled,
      style: parseStyle(rel.style),
    },
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
        { error: "Já existe um componente para este produto principal." },
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
  return (
    <RelationshipEditor
      key={id}
      mode="edit"
      actionError={actionData?.error}
      value={{ id, ...value }}
    />
  );
}

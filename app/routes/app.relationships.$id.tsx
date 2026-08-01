/**
 * Editar / excluir um componente Buy Together (usa o editor com preview + abas).
 */
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import {
  getRelationship,
  updateRelationship,
  deleteRelationship,
  parseRelationshipForm,
} from "../services/relationships.server";
import {
  enrichProducts,
  enrichOne,
  getShopCurrency,
} from "../services/products.server";
import { syncBundleDiscountSafe } from "../services/discounts.server";
import {
  parseStyle,
  isTemplateId,
  normalizeDiscount,
  type TemplateId,
} from "../lib/templates";
import { i18n } from "../i18n/i18next.server";
import { redirectKeepingContext } from "../utils/embedded-redirect.server";
import RelationshipEditor, {
  type PickedProduct,
} from "../components/RelationshipEditor";

export const handle = { i18n: ["relationships", "templates", "common"] };

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);
  const rel = await getRelationship(session.shop, params.id!);
  if (!rel) throw new Response("Not found", { status: 404 });

  const [mainEnriched, companionsEnriched, currency] = await Promise.all([
    enrichOne(admin, rel.mainProductId),
    enrichProducts(
      admin,
      rel.companions.map((c) => ({
        productId: c.companionProductId,
        variantId: c.companionVariantId,
      })),
    ),
    getShopCurrency(admin),
  ]);

  const main: PickedProduct = {
    productId: rel.mainProductId,
    variantId: null,
    title: mainEnriched?.title || rel.mainProductId,
    image: mainEnriched?.image || null,
    price: mainEnriched?.price ?? null,
    compareAtPrice: mainEnriched?.compareAtPrice ?? null,
    optionNames: mainEnriched?.optionNames ?? [],
  };
  const companions: PickedProduct[] = rel.companions.map((c) => {
    const e = companionsEnriched.find((x) => x.productId === c.companionProductId);
    return {
      productId: c.companionProductId,
      variantId: c.companionVariantId,
      title: e?.title || c.companionProductId,
      image: e?.image || null,
      price: e?.price ?? null,
      compareAtPrice: e?.compareAtPrice ?? null,
      optionNames: e?.optionNames ?? [],
    };
  });

  const template = (isTemplateId(rel.template) ? rel.template : "side-by-side") as TemplateId;

  return json({
    id: rel.id,
    currency,
    value: {
      name: rel.name,
      main,
      companions,
      template,
      direction: rel.direction,
      enabled: rel.enabled,
      discount: normalizeDiscount(rel.discountType, rel.discountValue),
      style: parseStyle(rel.style),
    },
  });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);
  const form = await request.formData();

  if (form.get("intent") === "delete") {
    await deleteRelationship(session.shop, params.id!);
    // Tira o bundle da config do desconto (a Function deixa de casar com ele).
    await syncBundleDiscountSafe(admin, session.shop);
    return redirectKeepingContext(request, "/app/relationships");
  }

  const parsed = parseRelationshipForm(form);
  if (!parsed.ok) return json({ error: parsed.error }, { status: 400 });

  try {
    const updated = await updateRelationship(session.shop, params.id!, parsed.value);
    if (!updated) throw new Response("Not found", { status: 404 });
    await syncBundleDiscountSafe(admin, session.shop);
  } catch (e: any) {
    if (String(e?.code) === "P2002") {
      const t = await i18n.getFixedT(request, "relationships");
      return json(
        { error: t("errors.duplicate") },
        { status: 400 },
      );
    }
    throw e;
  }
  return redirectKeepingContext(request, "/app/relationships");
}

export default function EditRelationship() {
  const { id, value, currency } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  return (
    <RelationshipEditor
      key={id}
      mode="edit"
      currency={currency}
      actionError={actionData?.error}
      value={{ id, ...value }}
    />
  );
}

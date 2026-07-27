/**
 * Criar promoção agendada. O timezone padrão vem da loja (getShopInfo).
 */
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData } from "@remix-run/react";

import { authenticate } from "../shopify.server";
import { getShopInfo } from "../services/shop-info.server";
import {
  createPromotion,
  parsePromotionForm,
} from "../services/promotions.server";
import PromotionForm from "../components/PromotionForm";

export const handle = { i18n: ["promotions", "common"] };

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);
  const info = await getShopInfo(admin, session.shop);
  return json({ defaultTimezone: info.timezone });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();

  const parsed = parsePromotionForm(form);
  if (!parsed.ok) return json({ error: parsed.error }, { status: 400 });

  await createPromotion(session.shop, parsed.value);
  return redirect("/app/promotions");
}

export default function NewPromotion() {
  const { defaultTimezone } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  return (
    <PromotionForm
      mode="create"
      defaultTimezone={defaultTimezone}
      actionError={actionData?.error}
    />
  );
}

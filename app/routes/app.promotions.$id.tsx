/**
 * Editar / excluir uma promoção agendada.
 */
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, useLoaderData } from "@remix-run/react";

import { authenticate } from "../shopify.server";
import {
  deletePromotion,
  getPromotion,
  parsePromotionForm,
  updatePromotion,
} from "../services/promotions.server";
import PromotionForm from "../components/PromotionForm";

export const handle = { i18n: ["promotions", "common"] };

/** Date → "yyyy-mm-dd" (dia local aproximado; casa com parseDateField). */
function toDateInput(d: Date | null): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const p = await getPromotion(session.shop, params.id!);
  if (!p) throw new Response("Not found", { status: 404 });

  return json({
    value: {
      id: p.id,
      name: p.name,
      enabled: p.enabled,
      timezone: p.timezone,
      recurrence: p.recurrence,
      weekdays: p.weekdays,
      startTime: p.startTime,
      endTime: p.endTime,
      validFrom: toDateInput(p.validFrom),
      validUntil: toDateInput(p.validUntil),
    },
  });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();

  if (form.get("intent") === "delete") {
    await deletePromotion(session.shop, params.id!);
    return redirect("/app/promotions");
  }

  const parsed = parsePromotionForm(form);
  if (!parsed.ok) return json({ error: parsed.error }, { status: 400 });

  const updated = await updatePromotion(session.shop, params.id!, parsed.value);
  if (!updated) throw new Response("Not found", { status: 404 });
  return redirect("/app/promotions");
}

export default function EditPromotion() {
  const { value } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  return (
    <PromotionForm
      key={value.id}
      mode="edit"
      value={value}
      actionError={actionData?.error}
    />
  );
}

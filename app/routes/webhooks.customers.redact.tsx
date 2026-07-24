/**
 * GDPR — customers/redact.
 * Não guardamos dados vinculados a um cliente específico, então não há o que apagar.
 * Respondemos 200 (idempotente).
 */
import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`[GDPR] ${topic} para ${shop} — nenhum dado de cliente para apagar.`);
  return new Response();
};

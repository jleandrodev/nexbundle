/**
 * GDPR — customers/data_request.
 * O Buy Together NÃO armazena dados pessoais de clientes (só ids de produto, config e
 * eventos agregados por loja). Não há PII para devolver. Respondemos 200.
 */
import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`[GDPR] ${topic} para ${shop} — app não armazena PII de cliente.`);
  return new Response();
};

/**
 * GDPR — shop/redact (chega ~48h após desinstalar).
 * Apaga TODOS os dados da loja: relacionamentos (+ companheiros por cascade),
 * estilo, métricas e sessões. Idempotente e filtrado por shop.
 */
import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`[GDPR] ${topic} para ${shop} — apagando todos os dados da loja.`);

  await db.$transaction([
    db.relationship.deleteMany({ where: { shop } }), // Companion cai por cascade
    db.stylingConfig.deleteMany({ where: { shop } }),
    db.metricEvent.deleteMany({ where: { shop } }),
    db.session.deleteMany({ where: { shop } }),
  ]);

  return new Response();
};

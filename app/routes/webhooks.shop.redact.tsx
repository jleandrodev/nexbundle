/**
 * GDPR — shop/redact (chega ~48h após desinstalar).
 * Apaga TODOS os dados da loja: relacionamentos (+ companheiros por cascade),
 * estilo, métricas, preferências, conversas/mensagens de suporte (+ anexos no
 * disco) e sessões. Idempotente e filtrado por shop.
 */
import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { deleteAttachmentFiles } from "../lib/uploads.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`[GDPR] ${topic} para ${shop} — apagando todos os dados da loja.`);

  // Anexos de suporte: remove os arquivos do disco antes de apagar os registros.
  const attachments = await db.supportAttachment.findMany({
    where: { shop },
    select: { id: true },
  });
  await deleteAttachmentFiles(attachments.map((a) => a.id));

  await db.$transaction([
    db.relationship.deleteMany({ where: { shop } }), // Companion cai por cascade
    db.stylingConfig.deleteMany({ where: { shop } }),
    db.metricEvent.deleteMany({ where: { shop } }),
    db.shopPreference.deleteMany({ where: { shop } }),
    db.supportAttachment.deleteMany({ where: { shop } }),
    db.supportMessage.deleteMany({ where: { shop } }),
    db.conversation.deleteMany({ where: { shop } }),
    db.session.deleteMany({ where: { shop } }),
  ]);

  return new Response();
};

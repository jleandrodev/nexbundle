/**
 * Endpoint de chat do LOJISTA (dentro do embedded, via App Bridge token).
 * Fora de /app de propósito: o widget faz polling e não deve disparar o gate de
 * billing do app.tsx a cada request. authenticate.admin valida o session token.
 *
 * GET /chat            -> mensagens + marca como lidas (widget aberto)
 * GET /chat?peek=1     -> só a contagem de não-lidas (badge, widget fechado)
 * POST /chat           -> envia mensagem { body, attachmentIds? }
 */
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { i18n } from "../i18n/i18next.server";
import {
  listMessages,
  postMessage,
  markRead,
  unreadForMerchant,
  getOrCreateConversation,
  countMessagesSinceReset,
} from "../services/support.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const url = new URL(request.url);

  if (url.searchParams.get("peek") === "1") {
    return json({ unread: await unreadForMerchant(shop) });
  }

  await getOrCreateConversation(shop);
  const messages = await listMessages(shop);
  await markRead(shop, "merchant");
  return json({
    messages: messages.map((m) => ({
      id: m.id,
      sender: m.sender,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      attachments: m.attachments,
    })),
    unread: 0,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const body = String(form.get("body") || "").trim();
  const attachmentIds = String(form.get("attachmentIds") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!body && attachmentIds.length === 0) {
    return json({ error: "Mensagem vazia." }, { status: 400 });
  }

  await getOrCreateConversation(session.shop);
  // 1º contato do ticket = ainda não há mensagens desde o último encerramento.
  const isFirstContact = (await countMessagesSinceReset(session.shop)) === 0;

  await postMessage({
    shop: session.shop,
    sender: "merchant",
    body: body || "(anexo)",
    attachmentIds,
  });

  // Resposta automática, no idioma do painel do lojista.
  if (isFirstContact) {
    const t = await i18n.getFixedT(request, "support");
    await postMessage({
      shop: session.shop,
      sender: "staff",
      automated: true,
      body: t("autoReply"),
    });
  }

  return json({ ok: true });
}

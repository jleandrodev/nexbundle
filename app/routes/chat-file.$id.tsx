/**
 * Serve um anexo para o LOJISTA. Só se o anexo for da mesma loja (session.shop).
 * GET /chat-file/:id
 */
import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getAttachment } from "../services/support.server";
import { fileStreamResponse } from "../lib/uploads.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const att = await getAttachment(params.id!);
  if (!att || att.shop !== session.shop) {
    return new Response("Not found", { status: 404 });
  }
  return fileStreamResponse(att.path, { name: att.name, mime: att.mime });
}

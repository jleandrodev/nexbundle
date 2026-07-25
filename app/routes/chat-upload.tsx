/**
 * Upload de anexo do LOJISTA. Multipart → memória → disco (UPLOAD_DIR).
 * POST /chat-upload (campo "file") -> { id, name, mime, size }
 */
import type { ActionFunctionArgs } from "@remix-run/node";
import {
  json,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/node";
import { randomUUID } from "node:crypto";
import { authenticate } from "../shopify.server";
import { createAttachment } from "../services/support.server";
import { i18n } from "../i18n/i18next.server";
import {
  ALLOWED_MIME,
  MAX_UPLOAD_BYTES,
  saveBuffer,
  attachmentPath,
} from "../lib/uploads.server";

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const t = await i18n.getFixedT(request, "support");

  const form = await unstable_parseMultipartFormData(
    request,
    unstable_createMemoryUploadHandler({ maxPartSize: MAX_UPLOAD_BYTES }),
  );
  const file = form.get("file");
  if (!file || typeof file === "string") {
    return json({ error: t("uploadNoFile") }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return json({ error: t("uploadBadType") }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return json({ error: t("uploadTooLarge") }, { status: 400 });
  }

  const id = randomUUID();
  const buffer = Buffer.from(await file.arrayBuffer());
  await saveBuffer(id, buffer);
  const att = await createAttachment({
    id,
    shop: session.shop,
    name: file.name || "arquivo",
    mime: file.type,
    size: file.size,
    path: attachmentPath(id),
  });
  return json({ id: att.id, name: att.name, mime: att.mime, size: att.size });
}

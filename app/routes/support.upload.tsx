/**
 * Upload de anexo da EQUIPE (staff). POST /support/upload (campos file + shop).
 */
import type { ActionFunctionArgs } from "@remix-run/node";
import {
  json,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/node";
import { randomUUID } from "node:crypto";
import { requireStaff } from "../support-auth.server";
import { createAttachment } from "../services/support.server";
import {
  ALLOWED_MIME,
  MAX_UPLOAD_BYTES,
  saveBuffer,
  attachmentPath,
} from "../lib/uploads.server";

export async function action({ request }: ActionFunctionArgs) {
  await requireStaff(request);

  const form = await unstable_parseMultipartFormData(
    request,
    unstable_createMemoryUploadHandler({ maxPartSize: MAX_UPLOAD_BYTES }),
  );
  const file = form.get("file");
  const shop = String(form.get("shop") || "");
  if (!shop) return json({ error: "Loja não informada." }, { status: 400 });
  if (!file || typeof file === "string") {
    return json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return json({ error: "Tipo de arquivo não permitido." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return json({ error: "Arquivo muito grande (máx. 10MB)." }, { status: 400 });
  }

  const id = randomUUID();
  const buffer = Buffer.from(await file.arrayBuffer());
  await saveBuffer(id, buffer);
  const att = await createAttachment({
    id,
    shop,
    name: file.name || "arquivo",
    mime: file.type,
    size: file.size,
    path: attachmentPath(id),
  });
  return json({ id: att.id, name: att.name, mime: att.mime, size: att.size });
}

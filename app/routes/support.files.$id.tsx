/**
 * Serve um anexo para a EQUIPE (qualquer loja). Auth via cookie de staff
 * (o <img>/link envia o cookie por ser mesma origem).
 * GET /support/files/:id
 */
import type { LoaderFunctionArgs } from "@remix-run/node";
import { requireStaff } from "../support-auth.server";
import { getAttachment } from "../services/support.server";
import { fileStreamResponse } from "../lib/uploads.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  await requireStaff(request);
  const att = await getAttachment(params.id!);
  if (!att) return new Response("Not found", { status: 404 });
  return fileStreamResponse(att.path, { name: att.name, mime: att.mime });
}

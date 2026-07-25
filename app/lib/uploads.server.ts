/**
 * Armazenamento de anexos em disco (UPLOAD_DIR, persistente na VPS).
 * O arquivo é salvo como <id>; nome/mime/size vão para o banco.
 */
import { mkdirSync, createReadStream, statSync, existsSync } from "node:fs";
import { writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";

export const UPLOAD_DIR =
  process.env.UPLOAD_DIR || join(process.cwd(), "uploads");

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
export const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
]);

export function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
}

export function attachmentPath(id: string) {
  return join(UPLOAD_DIR, id);
}

export async function saveBuffer(id: string, buffer: Buffer) {
  ensureUploadDir();
  const path = attachmentPath(id);
  await writeFile(path, buffer);
  return path;
}

/** Remove o arquivo do anexo do disco (idempotente; ignora se já não existe). */
export async function deleteAttachmentFiles(ids: string[]) {
  await Promise.all(
    ids.map((id) => unlink(attachmentPath(id)).catch(() => {})),
  );
}

export function fileStreamResponse(
  path: string,
  opts: { name: string; mime: string },
): Response {
  if (!existsSync(path)) return new Response("Not found", { status: 404 });
  const size = statSync(path).size;
  const stream = createReadStream(path) as unknown as ReadableStream;
  return new Response(stream, {
    headers: {
      "Content-Type": opts.mime,
      "Content-Length": String(size),
      "Content-Disposition": `inline; filename="${opts.name.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}

/**
 * Recursos de tradução bundled estaticamente (sem backend http/fs).
 * Usa import.meta.glob do Vite para carregar todos os JSONs de app/locales/<lng>/<ns>.json
 * em build time — em server e client — evitando carga assíncrona (principal causa de
 * hydration mismatch em SSR).
 */
import type { Resource } from "i18next";

const modules = import.meta.glob("../locales/**/*.json", {
  eager: true,
  import: "default",
}) as Record<string, Record<string, unknown>>;

export const resources: Resource = {};

for (const [path, data] of Object.entries(modules)) {
  // path: "../locales/pt-BR/common.json" → lng = "pt-BR", ns = "common"
  const match = path.match(/\/locales\/([^/]+)\/([^/]+)\.json$/);
  if (!match) continue;
  const [, lng, ns] = match;
  resources[lng] ??= {};
  (resources[lng] as Record<string, unknown>)[ns] = data;
}

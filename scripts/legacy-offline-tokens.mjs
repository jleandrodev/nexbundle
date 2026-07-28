/**
 * Token offline OBSOLETO: diagnóstico e limpeza.
 *
 * O painel do parceiro (Monitoramento › Integridade da API) acusa "uso de token
 * offline obsoleto" quando o app chama a Admin API com um token offline PERMANENTE.
 * O `expiringOfflineAccessTokens: true` em app/shopify.server.ts já faz toda
 * instalação NOVA nascer com token expirável — mas as sessões gravadas ANTES dessa
 * mudança continuam permanentes, e o token exchange nunca as troca sozinho: sem
 * `expires`, a sessão parece válida para sempre e é reusada em cada chamada
 * (inclusive no App Proxy, que roda sem o merchant por perto).
 *
 * Por isso a migração é manual: apagar a sessão offline legada. No próximo
 * carregamento do app no admin, o token exchange grava uma sessão nova, expirável
 * e com refresh token.
 *
 * ATENÇÃO ao custo: entre o apagar e o merchant abrir o app, o App Proxy fica sem
 * sessão e os blocos somem do storefront daquela loja. Rode o diagnóstico antes.
 *
 * Uso (na VPS, na raiz do projeto):
 *   node scripts/legacy-offline-tokens.mjs            # só relatório (padrão)
 *   node scripts/legacy-offline-tokens.mjs --delete   # apaga as sessões legadas
 *   node scripts/legacy-offline-tokens.mjs --delete --shop minha-loja.myshopify.com
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "node:fs";

function loadDbUrl() {
  if (process.env.DATABASE_URL) return;
  for (const f of [".env.production", ".env"]) {
    if (!existsSync(f)) continue;
    const line = readFileSync(f, "utf8")
      .split("\n")
      .find((l) => l.startsWith("DATABASE_URL="));
    if (line) {
      process.env.DATABASE_URL = line
        .slice("DATABASE_URL=".length)
        .trim()
        .replace(/^["']|["']$/g, "");
      return;
    }
  }
}

loadDbUrl();

const args = process.argv.slice(2);
const doDelete = args.includes("--delete");
const shopIdx = args.indexOf("--shop");
const onlyShop = shopIdx >= 0 ? args[shopIdx + 1] : null;

const prisma = new PrismaClient();

try {
  // Sessão offline legada = permanente: sem `expires`. A expirável sempre tem.
  const where = {
    isOnline: false,
    expires: null,
    ...(onlyShop ? { shop: onlyShop } : {}),
  };

  const legacy = await prisma.session.findMany({
    where,
    select: { id: true, shop: true, scope: true, refreshToken: true },
  });
  const total = await prisma.session.count({
    where: { isOnline: false, ...(onlyShop ? { shop: onlyShop } : {}) },
  });

  console.log(`Sessões offline: ${total} | legadas (token permanente): ${legacy.length}`);
  for (const s of legacy) {
    console.log(`  - ${s.shop}  scope=${s.scope ?? "-"}  refreshToken=${s.refreshToken ? "sim" : "não"}`);
  }

  if (legacy.length === 0) {
    console.log("\nNada a migrar. O aviso some sozinho quando os 30 dias da janela passarem.");
  } else if (!doDelete) {
    console.log("\nRelatório apenas. Rode com --delete para apagar essas sessões.");
    console.log("Depois abra o app no admin de cada loja para gerar o token novo.");
  } else {
    const res = await prisma.session.deleteMany({ where });
    console.log(`\n${res.count} sessão(ões) apagada(s).`);
    console.log("Abra o app no admin de cada loja: o token exchange grava a sessão expirável.");
    console.log("Até lá, o App Proxy dessas lojas responde sem sugestões.");
  }
} finally {
  await prisma.$disconnect();
}

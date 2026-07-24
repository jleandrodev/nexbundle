/**
 * Cobrança do NexBundle (planos por limite de produtos):
 *  - Development store → GRÁTIS, tudo liberado (sem tela de cobrança).
 *  - Loja real         → precisa assinar Essencial (50) ou Pro (200). Trial 7 dias.
 *
 * getEntitlement resolve o "direito de uso" atual (plano + limite) e é a fonte
 * de verdade para o gate (app.tsx) e para a trava de criação (relationships).
 */
import { authenticate } from "../shopify.server";
import {
  ESSENTIAL_PLAN,
  PRO_PLAN,
  ENTERPRISE_PLAN,
  PLAN_LIMITS,
  PLAN_RANK,
  DEV_FREE_LIMIT,
} from "../plans";

const SHOP_PLAN_QUERY = `#graphql
  query ShopPlan {
    shop {
      plan {
        partnerDevelopment
        shopifyPlus
      }
    }
  }
`;

type AdminGraphql = {
  graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response>;
};

export async function isDevelopmentStore(admin: AdminGraphql): Promise<boolean> {
  try {
    const res = await admin.graphql(SHOP_PLAN_QUERY);
    const body = (await res.json()) as {
      data?: { shop?: { plan?: { partnerDevelopment?: boolean } } };
    };
    return Boolean(body?.data?.shop?.plan?.partnerDevelopment);
  } catch {
    // Em caso de erro na checagem, não bloqueia o app (fail-open no gate).
    return true;
  }
}

/** Modo teste de cobrança: sempre fora de produção (dev stores nem chegam a cobrar). */
export const billingIsTest = process.env.NODE_ENV !== "production";

export type Entitlement = {
  plan: string | null; // "Essencial" | "Pro" | "dev-free" | null (sem assinatura)
  limit: number; // limite de produtos com Buy Together
  isDev: boolean; // dev store (grátis/ilimitado)
  subscribed: boolean; // tem acesso liberado (dev ou assinatura ativa)
};

type AuthAdmin = Awaited<ReturnType<typeof authenticate.admin>>;

/** Direito de uso atual da loja. Usa os tipos reais do shopify-app-remix. */
export async function getEntitlement(ctx: AuthAdmin): Promise<Entitlement> {
  const { admin, billing } = ctx;

  if (await isDevelopmentStore(admin)) {
    return { plan: "dev-free", limit: DEV_FREE_LIMIT, isDev: true, subscribed: true };
  }

  const check = await billing.check({
    plans: [ESSENTIAL_PLAN, PRO_PLAN, ENTERPRISE_PLAN],
    isTest: billingIsTest,
  });

  if (!check.hasActivePayment) {
    return { plan: null, limit: 0, isDev: false, subscribed: false };
  }

  // Havendo mais de uma assinatura ativa, o plano de maior rank manda.
  const plan = check.appSubscriptions
    .map((s) => s.name)
    .filter((n) => n in PLAN_RANK)
    .sort((a, b) => PLAN_RANK[b] - PLAN_RANK[a])[0];

  if (!plan) {
    return { plan: null, limit: 0, isDev: false, subscribed: false };
  }
  return { plan, limit: PLAN_LIMITS[plan], isDev: false, subscribed: true };
}

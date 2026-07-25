/**
 * Definição dos planos do NexBundle (fonte única — usada pelo billing config,
 * pelo gate e pela UI). Limite = nº de relacionamentos (produtos principais) ativos.
 */
export const ESSENTIAL_PLAN = "Essencial";
export const PRO_PLAN = "Pro";
export const ENTERPRISE_PLAN = "Enterprise";

export type PlanName =
  | typeof ESSENTIAL_PLAN
  | typeof PRO_PLAN
  | typeof ENTERPRISE_PLAN;

// Sentinela de "ilimitado" (JSON não serializa Infinity). Grande o bastante p/ nunca travar.
export const UNLIMITED = 1_000_000;

// Slug ESTÁVEL usado apenas para chaves de tradução (i18n). NÃO confundir com
// `name`, que é a chave de billing e não pode mudar.
export type PlanId = "essential" | "pro" | "enterprise";

export const PLANS: Array<{
  id: PlanId;
  name: PlanName;
  price: number;
  currency: string;
  limit: number;
  unlimited?: boolean;
}> = [
  {
    id: "essential",
    name: ESSENTIAL_PLAN,
    price: 6.99,
    currency: "USD",
    limit: 50,
  },
  {
    id: "pro",
    name: PRO_PLAN,
    price: 19.99,
    currency: "USD",
    limit: 200,
  },
  {
    id: "enterprise",
    name: ENTERPRISE_PLAN,
    price: 39.99,
    currency: "USD",
    limit: UNLIMITED,
    unlimited: true,
  },
];

export const PLAN_LIMITS: Record<string, number> = Object.fromEntries(
  PLANS.map((p) => [p.name, p.limit]),
);

// Ordem de prioridade quando há assinatura ativa (maior manda).
export const PLAN_RANK: Record<string, number> = {
  [ESSENTIAL_PLAN]: 1,
  [PRO_PLAN]: 2,
  [ENTERPRISE_PLAN]: 3,
};

export const TRIAL_DAYS = 7;

// Dev store: tudo liberado, ilimitado.
export const DEV_FREE_LIMIT = UNLIMITED;

export function isUnlimited(limit: number) {
  return limit >= UNLIMITED;
}

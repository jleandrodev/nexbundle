// @ts-check
/**
 * Buy Together — desconto do bundle (purchase.product-discount.run).
 *
 * Contrato:
 *  - O storefront adiciona as linhas do bundle com a propriedade `_bt_bundle` = id do
 *    relacionamento (só quando há 2+ itens selecionados).
 *  - O app mantém um metafield de configuração no discount node:
 *      { "bundles": { "<relationshipId>": { "type": "percentage"|"fixed", "value": 10, "title": "..." } } }
 *  - Aqui: agrupa as linhas por `_bt_bundle`, exige 2+ linhas no grupo (bundle de verdade)
 *    e aplica o desconto configurado só nessas linhas.
 *
 * Nunca lança: qualquer input inesperado vira "sem desconto".
 */

const EMPTY = /** @type {const} */ ({
  discountApplicationStrategy: "ALL",
  discounts: [],
});

const MIN_LINES = 2; // bundle = 2+ itens; a mesma regra do storefront

/**
 * @param {any} input
 * @returns {any}
 */
export function run(input) {
  const config = parseConfig(input?.discountNode?.metafield?.value);
  if (!config) return EMPTY;

  const lines = Array.isArray(input?.cart?.lines) ? input.cart.lines : [];
  /** @type {Map<string, any[]>} */
  const groups = new Map();
  for (const line of lines) {
    const key = line?.bundle?.value;
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(line);
  }
  if (groups.size === 0) return EMPTY;

  const discounts = [];
  for (const [relationshipId, groupLines] of groups) {
    if (groupLines.length < MIN_LINES) continue;
    const rule = config[relationshipId];
    if (!rule) continue;

    const value = discountValue(rule);
    if (!value) continue;

    discounts.push({
      message: typeof rule.title === "string" && rule.title ? rule.title : "Bundle",
      targets: groupLines.map((line) => ({ cartLine: { id: line.id } })),
      value,
    });
  }

  if (discounts.length === 0) return EMPTY;
  return { discountApplicationStrategy: "ALL", discounts };
}

/**
 * Config = { bundles: { <id>: { type, value, title } } }. Aceita também o mapa cru.
 * @param {string | null | undefined} raw
 */
function parseConfig(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const bundles = parsed && parsed.bundles ? parsed.bundles : parsed;
    return bundles && typeof bundles === "object" ? bundles : null;
  } catch (e) {
    return null;
  }
}

/** Converte a regra salva no metafield no `value` que a Function espera. */
function discountValue(rule) {
  const amount = Number(rule?.value);
  if (!isFinite(amount) || amount <= 0) return null;

  if (rule.type === "percentage") {
    return { percentage: { value: String(Math.min(amount, 100)) } };
  }
  if (rule.type === "fixed") {
    // Valor fixo aplicado UMA vez sobre o conjunto de linhas do bundle.
    return { fixedAmount: { amount: String(amount), appliesToEachItem: false } };
  }
  return null;
}

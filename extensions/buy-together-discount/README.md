# Buy Together — Discount Function

Aplica no checkout o desconto que o componente mostra na vitrine.

## Como funciona

1. O storefront (`extensions/buy-together-theme/assets/buy-together.js`) adiciona as linhas
   do bundle com a propriedade de linha `_bt_bundle` = `Relationship.id` — só quando há
   **2 ou mais itens** selecionados e o relacionamento tem desconto configurado.
2. O app mantém um **desconto automático** (`discountAutomaticAppCreate`) apontando para esta
   Function, com um metafield de configuração (`$app:buy-together` / `function-configuration`):

```json
{
  "bundles": {
    "clx123...": { "type": "percentage", "value": 10, "title": "Fone + Capa" },
    "clx456...": { "type": "fixed", "value": 20, "title": "Kit viagem" }
  }
}
```

3. A Function agrupa as linhas por `_bt_bundle`, exige 2+ linhas no grupo e aplica o desconto
   apenas nessas linhas (`cartLine` targets).

O ciclo de vida do desconto (criar/atualizar o metafield a cada save) fica em
`app/services/discounts.server.ts`.

## Build / deploy

```bash
cd extensions/buy-together-discount
npm run build     # gera dist/function.wasm (javy)
cd ../.. && npm run deploy
```

## Requisitos

- Scope **`write_discounts`** no `shopify.app.toml` — mudar scope exige **reinstalar** o app
  (gotcha #6 do boilerplate).
- `api_version = "2025-01"`, igual à do Admin API usada pelo app (`ApiVersion.January25`).
  Se subir a versão do Admin API, revise o target: a partir de 2025-10 a Discounts API
  unificada usa `cart.lines.discounts.generate.run` no lugar de `purchase.product-discount.run`.
- O nome da extensão (`Buy Together Discount`) é o que `discounts.server.ts` procura em
  `shopifyFunctions` para achar o `functionId`. Renomeou aqui, ajuste lá.

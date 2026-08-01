# Instruções de teste para a App Review (itens 4.5.4 e 4.5.5)

Texto pronto para colar no **Partner Dashboard → app → Distribution → App Store listing →
"Testing instructions" / "App review instructions"**.

> ⚠️ Antes de colar, preencha os campos marcados 🔵 — só você tem esses dados.
> Depois da aprovação, **esvazie `REVIEW_SHOPS`** no `.env.production` e faça
> `pm2 reload ecosystem.config.cjs --update-env`.

---

## Antes de submeter — checklist rápido

- [ ] Pôr a loja do reviewer em `REVIEW_SHOPS` no `.env.production` e recarregar
      (`pm2 reload ecosystem.config.cjs --update-env`). Sem isso o reviewer para na tela
      de planos. Loja da review de 01/08/2026 ("Fabricator"): `ysghzc-g1.myshopify.com`.
- [ ] 🔵 Criar o login de atendimento dedicado à review:
      ```bash
      set -a; source .env.production; set +a
      npm run staff:add -- review@n1.ag "Shopify Review" "<senha-forte>"
      ```
      e preencher e-mail/senha na seção "Support back-office" abaixo.
- [ ] A loja demo `nexbundle.myshopify.com` está com o app instalado, com pelo menos
      um componente Buy Together criado e o app block ativo na product page.
- [ ] `npm run deploy` (VPS) e `shopify app deploy` (extensões + toml) rodados.

---

## Texto para colar (EN)

```
TEST STORE
Storefront: https://nexbundle.myshopify.com
Storefront password: 1
(The store is password-protected. Enter "1" to view the storefront.)

No login is required to use the app itself — NexBundle is embedded in the Shopify
admin and authenticates through the merchant's Shopify session.

WHAT THE APP DOES
NexBundle turns a product page into a "frequently bought together" bundle. The
merchant links a main product to companion products; a block on the product page
lets the shopper pick variants and quantities and add the whole set to the cart,
and a Shopify Function applies the bundle discount at checkout (no discount code).

HOW TO TEST (about 5 minutes)

1. Install the app. You land on the NexBundle dashboard inside the Shopify admin.

2. Create a bundle
   - Go to "Components" > "New component".
   - Pick a template (Side by side / List / Compact).
   - Choose a main product and one or more companion products.
   - Set a bundle discount (for example 10%) and save.

3. Turn the block on in the theme
   - The dashboard has a "Activate in theme" button that opens the theme editor
     on the product template with the app block ready to add.
   - Alternatively: Online Store > Themes > Customize > Product template >
     "Add block" > Apps > "NexBundle — Side by side".
   - Save the theme.

4. See it on the storefront
   - Open the product page of the main product you linked in step 2.
   - The bundle block shows both products with checkboxes, variant pickers and
     quantities, the bundle total and the discount badge.
   - Click "Add bundle to cart".

5. Check the discount at checkout
   - Go to the cart and then to checkout.
   - The bundle discount is applied automatically by the Shopify Function.
   - Test card: 1 (any future expiry, any CVC) — the store is in test mode.

6. Metrics
   - Back in the admin, the dashboard shows impressions, clicks and CTR for the
     bundle you just viewed (metrics can take a few seconds to appear).

BILLING
The app charges through the Shopify Billing API (Essential / Pro / Enterprise,
7-day free trial). Your review store (ysghzc-g1.myshopify.com) has been granted
full free access, so no charge is requested at any point during the review. If
you review from a different store, tell us its .myshopify.com domain and we will
grant it the same access immediately.

LANGUAGES
The admin and the storefront block are available in English, Portuguese (BR) and
Spanish. Use the language selector on the dashboard to switch.

SUPPORT BACK-OFFICE (optional — not required to review the app)
The same domain also hosts our internal support desk, used by our team to answer
the in-app chat. It is not part of the merchant experience.
URL: https://nexbundle.sprezzia.live/support
Email: <PREENCHER>
Password: <PREENCHER>

CONTACT
<PREENCHER e-mail de suporte>
```

---

## Notas (não colar)

- **Cartão de teste**: a loja demo é dev store, então o checkout aceita o cartão de teste
  Bogus Gateway (`1` repetido). Confirme que o gateway de teste está ligado antes de submeter.
- **Senha da vitrine `1`**: a página de senha hoje é a hospedada pela Shopify (comportamento de
  dev store), não o template do tema.
- O reviewer **não** precisa do `/support`; ele está listado só para transparência (o domínio
  responde nessa rota). Se preferir não expor, remova a seção inteira do texto.

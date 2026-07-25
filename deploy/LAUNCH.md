# Lançamento — NexBundle na Shopify App Store

Guia de go-live do app **público**, no domínio **`nexbundle.sprezzia.live`**.
Complementa o `DEPLOY.md` (que cobre a mecânica de VPS/PM2/Nginx).

> Legenda: 🔴 bloqueia a aprovação · 🟠 alto · 🟡 recomendado · ✅ já feito no código

---

## 0. O que já está pronto no código (✅)
- Distribuição `AppDistribution.AppStore` em `app/shopify.server.ts`.
- Billing API (Essencial/Pro/Enterprise, mensal, trial) + gate antes de usar (`app.tsx`).
- Webhooks GDPR com verificação HMAC: `customers/data_request`, `customers/redact`, `shop/redact` (agora apaga **todos** os dados da loja, incluídos suporte e anexos) e `app/uninstalled`.
- Scopes mínimos (`read_products`), App Bridge v4, new embedded auth.
- i18n EN/PT-BR/ES (admin + vitrine). Marca padronizada como **NexBundle**.
- Páginas legais: `/legal/privacy` e `/legal/terms` (trilíngues). Landing page pública em `/`.
- Domínio atualizado para `nexbundle.sprezzia.live` no `shopify.app.toml` e docs.

---

## 1. Infra do novo domínio (você executa) 🔴
O código já aponta para `nexbundle.sprezzia.live`. Falta a infra:

1. **DNS**: criar registro A/AAAA de `nexbundle.sprezzia.live` → IP da VPS.
2. **Nginx**: no `deploy/nginx.conf.example`, trocar o `server_name` para `nexbundle.sprezzia.live`; recarregar.
3. **TLS**: `sudo certbot --nginx -d nexbundle.sprezzia.live`.
4. **.env.production** na VPS: `SHOPIFY_APP_URL=https://nexbundle.sprezzia.live` (e conferir `SUPPORT_SESSION_SECRET`, `UPLOAD_DIR`, `DATABASE_URL`).
5. **Partner/Dev Dashboard** → app → atualizar:
   - **application_url** = `https://nexbundle.sprezzia.live`
   - **Redirect URLs** = `https://nexbundle.sprezzia.live/auth/callback` (e as demais do `toml`)
   - **App proxy** = `https://nexbundle.sprezzia.live/apps/buy-together`, subpath `buy-together`, prefix `apps`
6. Confirme: `curl -I https://nexbundle.sprezzia.live/` → **200** (a landing page).

---

## 2. Deploy desta versão 🔴
```bash
# no seu PC:
git push            # e merge na main

# na VPS:
./scripts/deploy.sh # git pull + npm ci + prisma migrate deploy + build + pm2 reload

# no seu PC (extensão de tema → Shopify):
npm run deploy
```
As migrations novas (`add_shop_preference`, `support_ticket_reset`) são aplicadas pelo `migrate deploy`. Faça backup do `.sqlite` antes (ver DEPLOY.md).

---

## 3. Placeholders a preencher antes de submeter 🔴
Trocar nos arquivos (procure por `TODO`/colchetes):
- **Páginas legais** (`app/routes/legal.privacy.tsx`, `legal.terms.tsx`): `[RAZÃO SOCIAL]`, `[CNPJ]`, `[ENDEREÇO]`, `[DATA]` (última atualização) e o e-mail de contato.
- **Landing / legais**: e-mail de suporte (placeholder `suporte@nexbundle.sprezzia.live`) — confirme o e-mail real e o MX do domínio.
- ⚖️ **Revisão jurídica**: as políticas são um MODELO. Peça a um advogado revisar Privacidade + Termos antes do lançamento público.

---

## 4. Listagem na App Store (Partner Dashboard → App listing) 🟠
- **Nome**: NexBundle · **Ícone** (1200×1200 recomendado).
- **Screenshots**: painel (dashboard, editor de componente, análise, planos) + o bloco na vitrine.
- **Descrição** curta e longa (posso gerar nos 3 idiomas — a App Store suporta listagem multilíngue).
- **Categoria**: Merchandising / Upsell & cross-sell.
- **Pricing**: declarar Essencial/Pro/Enterprise (bate com o Billing API).
- **URLs**: privacidade = `https://nexbundle.sprezzia.live/legal/privacy`; termos = `/legal/terms`; suporte = e-mail/chat.
- **Loja de demonstração + instruções de teste** para o revisor (passo a passo: instalar → criar componente → adicionar bloco no tema → ver na vitrine → assinar um plano de teste).
- **Contato de emergência**.

---

## 5. Antes de clicar "Submit for review" — smoke test em produção 🟡
- [ ] Instalar numa loja de teste via link (custom/dev) — OAuth completa, grava token.
- [ ] Criar um componente, adicionar o bloco no tema, ver na página de produto (3 layouts).
- [ ] Trocar idioma do painel (auto + seletor) — admin e vitrine acompanham.
- [ ] Billing: assinar um plano (com trial), trocar de plano, e testar o gate.
- [ ] Chat de suporte: 1º contato dispara a auto-reply no idioma; encerrar ticket; métricas no `/support`.
- [ ] Desinstalar → confirmar que os webhooks GDPR respondem 200 e limpam os dados.
- [ ] Console do navegador sem erros; vitrine sem impacto perceptível de performance.

---

## 6. Submeter e revisar
Dashboard → app → **Distribution** → **Public distribution (App Store)** → completar o checklist → **Submit for review**.
Espere feedback iterativo do revisor (dias a semanas). Corrija, re-deploye (VPS/`npm run deploy`), responda. Aprovado → listado publicamente.

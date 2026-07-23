# Buy Together — app Shopify

Widget de "compre junto" na **página de produto**: o lojista vincula um produto principal a
produtos companheiros, escolhe o estilo, e o storefront mostra dois layouts com botão de
adicionar ambos ao carrinho. Métricas de impressão/clique no painel.

- **Painel** (Remix + Polaris, embedded): Dashboard de métricas, Relacionamentos (1:N via
  resource picker), Estilo global (cores/textos + preview).
- **Storefront** (Theme App Extension): 2 app blocks arrastáveis no editor de tema.
  - `Buy Together — Lado a lado` (Layout A): principal + companheiro + **total dos dois** + botão.
  - `Buy Together — Compacto` (Layout B): companheiro + botão, para perto do "comprar".
- **Ponte de dados**: **App Proxy** (`/apps/buy-together/*`) — mesma origem, sem CORS.

Arquitetura e pegadinhas: ver `../shopify-app-workflow/docs/learnings/{theme-app-extensions,app-proxy}.md`.

## Rodar (passos interativos exigem seu login na Shopify)

Estes comandos abrem o navegador / pedem escolhas — rode você mesmo:

```bash
cd buy-together-app
npm install                     # (já feito) instala dependências
npm run config:link             # vincula a um app do seu Partner Dashboard (preenche client_id e a URL do app_proxy)
npm run dev                     # sobe tunnel + backend + preview da extensão
```

Ao rodar `npm run dev` pela primeira vez:
1. Abra o app no admin (**Apps → Buy Together**) — isso grava o **token offline** (necessário pro App Proxy).
2. No **editor de tema** da loja de dev, entre numa **página de produto** e **arraste** o bloco
   *Buy Together — Lado a lado* (ou *Compacto*) para onde quiser (o Compacto vai bem dentro da
   product-information, acima/abaixo do botão comprar). Salve.
3. No painel: crie um **Relacionamento** (produto principal + companheiros) e ajuste o **Estilo**.
4. Abra a product page na vitrine: o widget aparece com as cores do painel; "adicionar ambos"
   coloca os dois no carrinho. Volte ao **Dashboard** para ver impressões/cliques/CTR.

## Dev com TUNNEL FIXO (recomendado — o App Proxy exige)

O `shopify app dev` cria um tunnel `*.trycloudflare.com` que **muda a cada run**, e a
`app_proxy.url` **não** é auto-atualizada → o widget na vitrine para de buscar dados. Resolva
com um **domínio estático do ngrok** (free dá 1) — aí a URL do proxy vale para sempre.

**Uma vez só:**
1. Conta free em https://ngrok.com → copie o authtoken.
2. `ngrok config add-authtoken <SEU_TOKEN>`
3. Reserve um domínio em https://dashboard.ngrok.com/domains (ex.: `seu-app.ngrok-free.app`).
4. Em `shopify.app.toml`, troque `YOUR-STATIC-DOMAIN` pelo seu domínio:
   `url = "https://seu-app.ngrok-free.app/apps/buy-together"`.

**No dia a dia** (um comando; sobe ngrok + shopify dev juntos):
```bash
TUNNEL_DOMAIN=seu-app.ngrok-free.app npm run dev:fixed
# ou:  npm run dev:fixed -- seu-app.ngrok-free.app
```
O `ngrok` já está instalado em `~/.local/bin`. A porta padrão é 9292 (mude com `TUNNEL_PORT`).
Detalhes/pegadinhas: `../shopify-app-workflow/docs/learnings/app-proxy.md`.

> Sem tunnel fixo, use `npm run dev` (quick tunnel) e reajuste `app_proxy.url` a cada sessão.

## Deploy

```bash
npm run deploy                  # publica a extensão + registra config/scopes
```

Produção: hospedar o backend Remix (URL fixa), Postgres no lugar do SQLite, e abrir o app 1x.
Ver `../shopify-app-workflow/docs/learnings/production-and-hosting.md`.

## Comandos úteis

```bash
npx prisma studio               # inspecionar os dados (Relationship, StylingConfig, MetricEvent)
npx prisma migrate dev          # nova migração ao mudar o schema
npm run build                   # build de produção (valida rotas/tipos)
npx tsc --noEmit                # typecheck
```

## Estrutura

```
app/
├── routes/
│   ├── app._index.tsx                 # Dashboard de métricas
│   ├── app.relationships._index.tsx   # lista
│   ├── app.relationships.new.tsx      # criar (resource picker 1:N)
│   ├── app.relationships.$id.tsx      # editar/excluir
│   ├── app.styling.tsx                # estilo global + preview
│   ├── apps.buy-together.data.tsx     # App Proxy GET (config + companheiros)
│   └── apps.buy-together.events.tsx   # App Proxy POST (métricas)
├── services/  relationships · styling · metrics · products (Admin GraphQL)
└── components/RelationshipForm.tsx
extensions/buy-together-theme/
├── blocks/ layout-a.liquid · layout-b.liquid
├── assets/ buy-together.js · buy-together.css
└── locales/en.default.json
prisma/schema.prisma                   # Relationship, Companion, StylingConfig, MetricEvent
```

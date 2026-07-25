# Deploy na VPS (PM2 + Nginx + SQLite)

Backend Remix (painel admin + App Proxy) rodando na sua VPS Linux, com URL fixa.
A **extensão de tema** NÃO vai pra VPS — é publicada pela Shopify com `shopify app deploy`
(do seu PC). Ver `../../shopify-app-workflow/docs/learnings/production-and-hosting.md`.

```
Bloco na product page (Shopify) ─┐
Painel admin (embedded)          ─┼─►  Backend Remix na VPS (https://app.seudominio.com)  ─►  Admin API + SQLite
App Proxy /apps/buy-together/*   ─┘
```

## Pré-requisitos na VPS (uma vez)
```bash
# Node >= 20.19 (nvm ou nodesource), git, nginx, certbot
sudo apt-get update && sudo apt-get install -y nginx
npm i -g pm2

# DB + anexos do chat persistentes FORA do diretório de deploy
sudo mkdir -p /var/data/buy-together/uploads
sudo chown -R $USER:$USER /var/data/buy-together
```

## 1. Código + env
```bash
git clone <seu-repo> buy-together-app && cd buy-together-app
cp deploy/env.production.example .env.production
# edite .env.production: SHOPIFY_API_KEY/SECRET, SHOPIFY_APP_URL, DATABASE_URL, PORT
```
> `SHOPIFY_API_KEY/SECRET` vêm de Partners → seu app → API credentials.
> `SHOPIFY_APP_URL=https://app.seudominio.com` (o mesmo domínio no Dashboard e no app_proxy).

## 2. Nginx + TLS
```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/buy-together
# troque app.seudominio.com dentro do arquivo
sudo ln -s /etc/nginx/sites-available/buy-together /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d app.seudominio.com     # emite o cert e liga o 443
```

## 3. Primeiro deploy
```bash
./scripts/deploy.sh --no-pull   # já está no código clonado; build + migrate + pm2 start
pm2 startup                     # (siga a linha que ele imprime) — resurrect no boot
pm2 save
```
Confira: `curl -sS -o /dev/null -w "HTTP %{http_code}\n" https://app.seudominio.com/` → **200**.
(Endpoints sem sessão dando 410/403 é esperado — gotcha #15.)

## 4. Registrar URLs no app (Dashboard — NÃO rode `dev` contra a config de prod!)
No app (Partners/Dev Dashboard):
- **application_url** = `https://app.seudominio.com`
- **App proxy**: URL = `https://app.seudominio.com/apps/buy-together`, subpath `buy-together`, prefix `apps`
- **Redirect URLs**: `https://app.seudominio.com/auth/callback` (e o que o app usar)

No `shopify.app.toml`, `app_proxy.url` deve ser `https://app.seudominio.com/apps/buy-together`.
Depois publique a extensão + config do seu PC:
```bash
npm run deploy      # shopify app deploy — publica os app blocks e a config
```
⚠️ **Não rode `shopify app dev` apontando pra esse app** depois disso: com
`automatically_update_urls_on_dev = true` ele reescreve a URL registrada pro tunnel e
derruba a produção. Use um config/app separado pra dev (ou o tunnel fixo do README).

## 5. Instalar na loja (custom distribution)
Partners → app → Distribuição → **Custom distribution** → informe o `.myshopify.com` →
gere o link → instale. Isso concede os scopes e grava o **token offline** no SQLite.
Abra o app 1x no admin (Apps → Buy Together).

## Atualizar (o fluxo do dia a dia)
No seu PC: commit + push. Na VPS:
```bash
./scripts/deploy.sh     # git pull + npm ci + prisma migrate deploy + build + pm2 reload
```
Mudou a **extensão** (blocks/js/css)? Rode `npm run deploy` do PC (vai pra Shopify, não pra VPS).

## Suporte / chat (front da equipe em /support)

O mesmo app serve o chat do lojista (widget no painel) e o **front de atendimento**
em `https://nexbundle.homolog.live/support` (login próprio da equipe).

1. No `.env.production`, defina `SUPPORT_SESSION_SECRET` (string aleatória longa) e
   `UPLOAD_DIR=/var/data/buy-together/uploads` (ver `env.production.example`).
2. Crie um atendente (roda com as envs carregadas):
   ```bash
   set -a; source .env.production; set +a
   npm run staff:add -- voce@n1.ag "Seu Nome" "uma-senha-forte"
   ```
   (Rode de novo para adicionar outros atendentes ou trocar a senha de um e-mail.)
3. Acesse `https://nexbundle.homolog.live/support` → login → conversas.

> Anexos ficam em `UPLOAD_DIR` (persistente). Servidos só por rota autenticada
> (lojista: mesma loja; equipe: cookie de staff). Inclua o `UPLOAD_DIR` no backup.

## Backup do SQLite (recomendado)
```bash
# cron diário
0 3 * * * sqlite3 /var/data/buy-together/prod.sqlite ".backup '/var/data/buy-together/backup-$(date +\%F).sqlite'"
```
Escalou? Troque o Prisma para Postgres (só `provider` + `DATABASE_URL`).

## Comandos PM2 úteis
```bash
pm2 logs buy-together      # logs ao vivo
pm2 status                 # estado
pm2 reload buy-together    # reinício zero-downtime
pm2 restart buy-together   # reinício hard
```

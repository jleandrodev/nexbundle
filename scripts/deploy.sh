#!/usr/bin/env bash
# Redeploy na VPS (PM2). Rode DENTRO do diretório do app, na VPS, após configurar
# .env.production (ver deploy/DEPLOY.md). Faz: pull -> deps -> prisma -> build -> pm2.
#
#   ./scripts/deploy.sh            # git pull + build + restart
#   ./scripts/deploy.sh --no-pull  # pula o git pull (se você já puxou)
#
# Idempotente: primeira vez faz `pm2 start`, depois `pm2 reload` (zero-downtime).
set -euo pipefail
cd "$(dirname "$0")/.."   # raiz do app

PULL=1
[[ "${1:-}" == "--no-pull" ]] && PULL=0

echo "▶ [1/6] Verificando .env.production"
if [[ ! -f .env.production ]]; then
  echo "ERRO: .env.production não existe. Copie de deploy/env.production.example e preencha." >&2
  exit 1
fi
# Carrega as variáveis (SHOPIFY_*, DATABASE_URL, PORT...) para o processo do PM2.
set -a; # shellcheck disable=SC1091
source .env.production; set +a

if [[ "$PULL" == "1" ]]; then
  echo "▶ [2/6] git pull"
  git pull --ff-only
else
  echo "▶ [2/6] pulando git pull (--no-pull)"
fi

echo "▶ [3/6] Instalando dependências (npm ci)"
npm ci

echo "▶ [4/6] Prisma generate + migrate deploy"
npx prisma generate
npx prisma migrate deploy

echo "▶ [5/6] Build de produção"
npm run build

echo "▶ [6/6] (Re)iniciando no PM2"
mkdir -p logs
if pm2 describe buy-together > /dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs --update-env
else
  pm2 start ecosystem.config.cjs --update-env
fi
pm2 save

echo "✅ Deploy concluído. Logs: pm2 logs buy-together"

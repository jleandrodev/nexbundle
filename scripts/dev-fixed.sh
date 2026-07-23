#!/usr/bin/env bash
# Dev com TUNNEL FIXO (ngrok domínio estático) — a URL não muda entre sessões,
# então o app_proxy.url no shopify.app.toml fica válido para sempre.
#
# Pré-requisitos (uma vez só):
#   1) Conta free em https://ngrok.com
#   2) ngrok config add-authtoken <SEU_TOKEN>
#   3) Reserve um domínio estático no dashboard do ngrok (free dá 1):
#      https://dashboard.ngrok.com/domains  -> ex.: seu-app.ngrok-free.app
#   4) Coloque esse domínio em shopify.app.toml [app_proxy].url:
#         url = "https://seu-app.ngrok-free.app/apps/buy-together"
#      e informe-o aqui (variável TUNNEL_DOMAIN abaixo ou via ambiente/arg).
#
# Uso:
#   TUNNEL_DOMAIN=seu-app.ngrok-free.app npm run dev:fixed
#   # ou:  npm run dev:fixed -- seu-app.ngrok-free.app
set -euo pipefail

PORT="${TUNNEL_PORT:-9292}"
DOMAIN="${1:-${TUNNEL_DOMAIN:-}}"

if [[ -z "$DOMAIN" ]]; then
  echo "ERRO: defina o domínio estático do ngrok." >&2
  echo "  TUNNEL_DOMAIN=seu-app.ngrok-free.app npm run dev:fixed" >&2
  echo "  (ou)  npm run dev:fixed -- seu-app.ngrok-free.app" >&2
  exit 1
fi

if ! command -v ngrok >/dev/null 2>&1; then
  echo "ERRO: ngrok não encontrado no PATH (~/.local/bin)." >&2
  exit 1
fi

echo "▶ Subindo ngrok: https://$DOMAIN  ->  localhost:$PORT"
ngrok http "$PORT" --domain="$DOMAIN" --log=stdout > /tmp/ngrok-buy-together.log 2>&1 &
NGROK_PID=$!
trap 'echo; echo "⏹ Encerrando ngrok ($NGROK_PID)"; kill $NGROK_PID 2>/dev/null || true' EXIT

# Espera o túnel ficar de pé
for i in $(seq 1 20); do
  if curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | grep -q "$DOMAIN"; then
    echo "✔ Túnel ativo em https://$DOMAIN"
    break
  fi
  sleep 0.5
done

echo "▶ shopify app dev --tunnel-url=https://$DOMAIN:$PORT"
npm run dev -- --tunnel-url="https://$DOMAIN:$PORT"

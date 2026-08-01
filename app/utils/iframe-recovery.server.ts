/**
 * Recuperação para quando uma rota NÃO-embedded (`/auth/login`) é carregada
 * dentro do iframe do admin.
 *
 * O form de login manda o browser para `admin.shopify.com/.../oauth/install`;
 * dentro do iframe isso vira `accounts.shopify.com`, que recusa framing e
 * mostra "refused to connect" — o erro que reprovou a App Review (item 2.1.1).
 *
 * Em vez do form, servimos uma página que usa o App Bridge para descobrir a loja
 * e volta para `/app` COM os params, resolvendo a sessão sem sair do iframe.
 */

/** O request está sendo carregado dentro de um frame? */
export function isFramedRequest(request: Request): boolean {
  const dest = request.headers.get("Sec-Fetch-Dest");
  if (dest === "iframe" || dest === "frame") return true;
  // Fallback para browsers sem Sec-Fetch-* (o script cliente marca o retorno).
  return new URL(request.url).searchParams.get("embedded") === "1";
}

/**
 * Documento mínimo de recuperação. Não passa pelo `entry.server` (é uma Response
 * crua) e não emite `frame-ancestors`, então continua embutível no admin.
 *
 * Só pode ser servida por uma resource route (`RECOVER_PATH`): numa rota com
 * componente o Remix trata a Response como dado, e um `throw` de Response 200 cai
 * no error boundary. Quem precisa dela redireciona para lá.
 */
export function iframeRecoveryResponse(): Response {
  const apiKey = process.env.SHOPIFY_API_KEY || "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>NexBundle</title>
<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" data-api-key="${apiKey}"></script>
<style>
  body { font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
         color: #303030; margin: 0; padding: 48px 24px; text-align: center; }
  a { color: #5b3df5; }
</style>
</head>
<body>
<p id="msg">Reconnecting to your Shopify admin&hellip;</p>
<p><a href="/" target="_top">Open NexBundle in a new tab</a></p>
<script>
(function () {
  var tries = 0;
  function recover() {
    var cfg = (window.shopify && window.shopify.config) || {};
    var shop = cfg.shop;
    if (shop) {
      var host = cfg.host;
      if (!host) {
        // host = base64 de "admin.shopify.com/store/<slug>"
        host = btoa("admin.shopify.com/store/" + String(shop).split(".")[0]);
      }
      window.location.replace(
        "/app?shop=" + encodeURIComponent(shop) +
        "&host=" + encodeURIComponent(host) +
        "&embedded=1"
      );
      return;
    }
    if (++tries < 10) { setTimeout(recover, 300); return; }
    document.getElementById("msg").textContent =
      "Open NexBundle from your Shopify admin to continue.";
  }
  recover();
})();
</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

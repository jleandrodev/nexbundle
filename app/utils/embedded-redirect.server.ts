/**
 * Redirect interno seguro para as rotas embedded (`/app/*`).
 *
 * Um `redirect("/app/x")` cru perde `shop`/`host`/`embedded`/`id_token` quando o
 * browser segue o `Location` num document request dentro do iframe do admin. Sem
 * esses params, `authenticate.admin` cai em `/auth/login`, que renderiza o form
 * de login DENTRO do iframe; o submit manda o browser para o OAuth da Shopify,
 * que recusa framing → "accounts.shopify.com refused to connect" (o erro que
 * reprovou a App Review no item 2.1.1).
 *
 * Regra: em app embedded, todo redirect interno preserva o contexto.
 */
import { redirect } from "@remix-run/node";

/** Params que o embedded precisa para se reautenticar sem sair do iframe. */
const KEEP = [
  "shop",
  "host",
  "embedded",
  "id_token",
  "hmac",
  "session",
  "locale",
] as const;

/**
 * Redireciona para `path` mantendo os params do embedded que vieram no request.
 * Se `path` já trouxer um param com o mesmo nome, o de `path` prevalece.
 */
export function redirectKeepingContext(
  request: Request,
  path: string,
  init?: number | ResponseInit,
): Response {
  const incoming = new URL(request.url).searchParams;

  // `path` é sempre interno; a base só existe para o URL parser aceitar o input.
  const target = new URL(path, "https://embedded.invalid");

  for (const key of KEEP) {
    const value = incoming.get(key);
    if (value && !target.searchParams.has(key)) {
      target.searchParams.set(key, value);
    }
  }

  return redirect(`${target.pathname}${target.search}${target.hash}`, init);
}

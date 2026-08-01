/**
 * Resource route (sem componente) que serve a página de recuperação do iframe.
 *
 * Precisa ser resource route: numa rota com componente, o Remix trata a Response
 * devolvida pelo loader como DADO (o componente renderiza com `undefined` → 500),
 * e um `throw` de Response 200 cai no error boundary. Aqui a Response passa
 * direto, e quem precisa dela só faz `redirect("/embedded-recover")`.
 */
import { iframeRecoveryResponse } from "../utils/iframe-recovery.server";

export function loader() {
  return iframeRecoveryResponse();
}

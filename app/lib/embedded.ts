/**
 * Constantes compartilhadas entre server e cliente para o contexto embedded.
 * (Fica fora de `*.server.ts` porque o bundle do cliente também importa daqui.)
 */

/** Resource route que serve a página de recuperação do iframe do admin. */
export const RECOVER_PATH = "/embedded-recover";

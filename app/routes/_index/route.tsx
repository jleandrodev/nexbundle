import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

// {/* TODO: confirmar e-mail/branding */}
const SUPPORT_EMAIL = "suporte@nexbundle.sprezzia.live";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  // Comportamento preservado da template: loja embedada volta pro app.
  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

/* Ícone de "check" reaproveitado em várias seções. */
function Check({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 10.5l3.5 3.5L16 5.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Index() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.page}>
      {/* ---------------- Nav ---------------- */}
      <header className={styles.nav}>
        <nav className={`${styles.shell} ${styles.navInner}`} aria-label="Principal">
          <a className={styles.brand} href="#topo" aria-label="NexBundle, página inicial">
            <span className={styles.mark} aria-hidden="true">
              +
            </span>
            NexBundle
          </a>
          <div className={styles.navLinks}>
            <a className={styles.hideMobile} href="#recursos">
              Recursos
            </a>
            <a className={styles.hideMobile} href="#como-funciona">
              Como funciona
            </a>
            <a className={styles.hideMobile} href="#precos">
              Preços
            </a>
            <a className={`${styles.btn} ${styles.btnAccent} ${styles.btnSmall}`} href="#comecar">
              Começar
            </a>
          </div>
        </nav>
      </header>

      <main id="topo">
        {/* ---------------- Hero ---------------- */}
        <section className={styles.hero}>
          <div className={`${styles.shell} ${styles.heroGrid}`}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Compre junto para Shopify</p>
              <h1 className={styles.h1}>
                Venda dois quando você venderia <em>apenas um</em>.
              </h1>
              <p className={styles.lead}>
                O NexBundle mostra produtos que combinam na página do seu produto e
                deixa o cliente levar tudo com um clique. Mais itens por pedido, mais
                ticket médio, zero código.
              </p>
              <div className={styles.heroCtas}>
                <a className={`${styles.btn} ${styles.btnAccent}`} href="#comecar">
                  Instalar na minha loja
                </a>
                <a className={`${styles.btn} ${styles.btnGhost}`} href="#como-funciona">
                  Ver como funciona
                </a>
              </div>
              <div className={styles.trustRow}>
                <span className={styles.trustItem}>
                  <Check className={styles.check} /> Teste grátis
                </span>
                <span className={styles.trustItem}>
                  <Check className={styles.check} /> Sem tocar em código
                </span>
                <span className={styles.trustItem}>
                  <Check className={styles.check} /> Painel em PT, EN e ES
                </span>
              </div>
            </div>

            {/* Assinatura: o próprio bloco "compre junto" que o lojista instala. */}
            <div className={styles.mockWrap}>
              <div className={styles.metricChip} aria-hidden="true">
                <span className={styles.num}>+18% CTR</span>
                <span className={styles.lbl}>últimos 7 dias</span>
              </div>
              <div className={styles.mock} role="img" aria-label="Exemplo do bloco Compre junto exibido na página de um produto, com dois produtos e o botão adicionar ambos ao carrinho.">
                <p className={styles.mockHead}>
                  Compre junto
                  <span className={styles.mockTag}>lado a lado</span>
                </p>
                <div className={styles.bundleRow}>
                  <div className={styles.prod}>
                    <svg className={styles.thumb} viewBox="0 0 120 96" aria-hidden="true">
                      <rect width="120" height="96" rx="10" fill="#efeaff" />
                      <rect x="30" y="20" width="60" height="46" rx="6" fill="#5b3df5" />
                      <rect x="42" y="70" width="36" height="8" rx="4" fill="#c9bdfb" />
                    </svg>
                    <p className={styles.prodName}>Tênis Runner</p>
                    <p className={styles.prodPrice}>R$ 299</p>
                  </div>
                  <div className={styles.plus} aria-hidden="true">
                    +
                  </div>
                  <div className={styles.prod}>
                    <svg className={styles.thumb} viewBox="0 0 120 96" aria-hidden="true">
                      <rect width="120" height="96" rx="10" fill="#ffe9e2" />
                      <circle cx="60" cy="44" r="24" fill="#ff6a45" />
                      <rect x="42" y="72" width="36" height="8" rx="4" fill="#ffc3b2" />
                    </svg>
                    <p className={styles.prodName}>Meia Esportiva</p>
                    <p className={styles.prodPrice}>R$ 49</p>
                  </div>
                </div>
                <div className={styles.mockTotal}>
                  Total do combo <b>R$ 348</b>
                </div>
                <button className={styles.mockCta} type="button" tabIndex={-1} aria-hidden="true">
                  Adicionar ambos ao carrinho
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- Recursos ---------------- */}
        <section id="recursos" className={styles.section}>
          <div className={styles.shell}>
            <div className={styles.sectionHead}>
              <p className={styles.eyebrow}>Recursos</p>
              <h2 className={styles.h2}>Tudo que precisa para sugerir o próximo item</h2>
              <p className={styles.sectionSub}>
                Configurável, mensurável e feito para rodar sozinho depois de ativo.
              </p>
            </div>

            <div className={styles.features}>
              <article className={styles.feature}>
                <div className={styles.fIcon} aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="7" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                    <rect x="14" y="4" width="7" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </div>
                <h3 className={styles.fTitle}>3 layouts</h3>
                <p className={styles.fText}>
                  Lado a lado, lista ou compacto. Escolha o formato que combina com a
                  página do seu produto.
                </p>
              </article>

              <article className={styles.feature}>
                <div className={styles.fIcon} aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2" />
                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <h3 className={styles.fTitle}>Estilo sem código</h3>
                <p className={styles.fText}>
                  Cores, título, botão e borda ajustáveis direto no painel. Combine com
                  a identidade da loja em minutos.
                </p>
              </article>

              <article className={styles.feature}>
                <div className={styles.fIcon} aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M4 20V4M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M8 16l3-4 3 2 4-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className={styles.fTitle}>Métricas de verdade</h3>
                <p className={styles.fText}>
                  Impressões, cliques e CTR no painel. Veja quais combos convertem e
                  aposte nos que dão resultado.
                </p>
              </article>

              <article className={styles.feature}>
                <div className={styles.fIcon} aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M7 8l-4 4 4 4M17 8l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M14 5l-4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <h3 className={styles.fTitle}>Uni ou bidirecional</h3>
                <p className={styles.fText}>
                  O principal sugere o companheiro, e o companheiro sugere o principal.
                  Você decide o sentido da recomendação.
                </p>
              </article>

              <article className={styles.feature}>
                <div className={styles.fIcon} aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                    <path d="M8 21h8M12 18v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M7 9l2.5 2.5L7 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className={styles.fTitle}>Instala no editor de tema</h3>
                <p className={styles.fText}>
                  Adicione o bloco pelo editor de tema do Shopify. Nada de mexer em
                  Liquid ou pedir ajuda pra dev.
                </p>
              </article>

              <article className={styles.feature}>
                <div className={styles.fIcon} aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                    <path d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.7-3.8-9S9.5 5.5 12 3z" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </div>
                <h3 className={styles.fTitle}>Painel trilíngue</h3>
                <p className={styles.fText}>
                  Português, Inglês e Espanhol. O painel se adapta ao idioma de quem
                  gerencia a loja, sem configuração extra.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* ---------------- Como funciona ---------------- */}
        <section id="como-funciona" className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.shell}>
            <div className={styles.sectionHead}>
              <p className={styles.eyebrow}>Como funciona</p>
              <h2 className={styles.h2}>No ar em três passos</h2>
              <p className={styles.sectionSub}>
                Do install ao primeiro combo recomendado sem sair do Shopify.
              </p>
            </div>

            <ol className={styles.steps}>
              <li className={styles.step}>
                <div className={styles.stepBar} aria-hidden="true" />
                <span className={styles.stepNum}>Passo 01</span>
                <h3 className={styles.stepTitle}>Adicione o bloco</h3>
                <p className={styles.stepText}>
                  Ative o bloco do NexBundle no editor de tema e escolha onde ele
                  aparece na página do produto.
                </p>
              </li>
              <li className={styles.step}>
                <div className={styles.stepBar} aria-hidden="true" />
                <span className={styles.stepNum}>Passo 02</span>
                <h3 className={styles.stepTitle}>Vincule os produtos</h3>
                <p className={styles.stepText}>
                  Conecte cada produto principal aos seus companheiros e defina se a
                  sugestão é uni ou bidirecional.
                </p>
              </li>
              <li className={styles.step}>
                <div className={styles.stepBar} aria-hidden="true" />
                <span className={styles.stepNum}>Passo 03</span>
                <h3 className={styles.stepTitle}>Acompanhe e ajuste</h3>
                <p className={styles.stepText}>
                  Veja impressões, cliques e CTR no painel e refine os combos que mais
                  levantam o ticket médio.
                </p>
              </li>
            </ol>

            <div className={styles.statsBand}>
              <div className={styles.stat}>
                <div className={styles.statNum}>3</div>
                <div className={styles.statLbl}>layouts prontos para usar</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statNum}>3</div>
                <div className={styles.statLbl}>idiomas no painel do lojista</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statNum}>0</div>
                <div className={styles.statLbl}>linha de código para instalar</div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- Preços ---------------- */}
        <section id="precos" className={styles.section}>
          <div className={styles.shell}>
            <div className={styles.sectionHead}>
              <p className={styles.eyebrow}>Planos</p>
              <h2 className={styles.h2}>Comece grátis, cresça quando fizer sentido</h2>
              <p className={styles.sectionSub}>
                Todos os planos incluem teste grátis e suporte por chat dentro do app.
              </p>
            </div>

            <div className={styles.plans}>
              {/* Essencial */}
              <article className={styles.plan}>
                <div className={styles.planName}>Essencial</div>
                {/* TODO: confirmar preços dos planos */}
                <div className={styles.planPrice}>—</div>
                <p className={styles.planDesc}>Para começar a recomendar combos.</p>
                <ul className={styles.planList}>
                  <li>
                    <Check /> Bloco compre junto na página de produto
                  </li>
                  <li>
                    <Check /> 3 layouts e estilo personalizável
                  </li>
                  <li>
                    <Check /> Métricas de impressões e cliques
                  </li>
                </ul>
                <div className={styles.planCtaWrap}>
                  <a className={`${styles.btn} ${styles.btnGhost}`} href="#comecar">
                    Começar grátis
                  </a>
                </div>
              </article>

              {/* Pro — destacado */}
              <article className={`${styles.plan} ${styles.planFeatured}`}>
                <div className={styles.planName}>
                  Pro <span className={styles.planBadge}>Popular</span>
                </div>
                {/* TODO: confirmar preços dos planos */}
                <div className={styles.planPrice}>—</div>
                <p className={styles.planDesc}>Para escalar cross-sell com dados.</p>
                <ul className={styles.planList}>
                  <li>
                    <Check /> Tudo do Essencial
                  </li>
                  <li>
                    <Check /> Direção uni e bidirecional
                  </li>
                  <li>
                    <Check /> CTR e relatórios completos
                  </li>
                  <li>
                    <Check /> Painel em PT, EN e ES
                  </li>
                </ul>
                <div className={styles.planCtaWrap}>
                  <a className={`${styles.btn} ${styles.btnAccent}`} href="#comecar">
                    Testar o Pro
                  </a>
                </div>
              </article>

              {/* Enterprise */}
              <article className={styles.plan}>
                <div className={styles.planName}>Enterprise</div>
                {/* TODO: confirmar preços dos planos */}
                <div className={styles.planPrice}>—</div>
                <p className={styles.planDesc}>Para catálogos grandes e times.</p>
                <ul className={styles.planList}>
                  <li>
                    <Check /> Tudo do Pro
                  </li>
                  <li>
                    <Check /> Volume alto de combos
                  </li>
                  <li>
                    <Check /> Suporte prioritário por chat
                  </li>
                </ul>
                <div className={styles.planCtaWrap}>
                  <a className={`${styles.btn} ${styles.btnGhost}`} href={`mailto:${SUPPORT_EMAIL}`}>
                    Falar com o time
                  </a>
                </div>
              </article>
            </div>
            <p className={styles.plansNote}>
              {/* TODO: confirmar valores e limites exatos de cada plano */}
              Valores exibidos na loja de apps do Shopify no momento da instalação.
            </p>
          </div>
        </section>

        {/* ---------------- CTA / login por shop domain ---------------- */}
        <section id="comecar" className={styles.section}>
          <div className={styles.shell}>
            <div className={styles.cta}>
              <p className={styles.eyebrow} style={{ color: "#fff", justifyContent: "center" }}>
                Começar
              </p>
              <h2 className={styles.h2}>Ative o NexBundle na sua loja</h2>
              <p className={styles.ctaSub}>
                Informe o domínio da sua loja Shopify para entrar e instalar. Leva
                alguns minutos e você já sai com o primeiro combo no ar.
              </p>

              {showForm ? (
                <Form className={styles.loginForm} method="post" action="/auth/login">
                  <label className={styles.loginField}>
                    <span>Domínio da loja</span>
                    <input
                      className={styles.input}
                      type="text"
                      name="shop"
                      placeholder="minha-loja.myshopify.com"
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                    />
                    <span className={styles.hint}>ex.: minha-loja.myshopify.com</span>
                  </label>
                  <button className={styles.loginSubmit} type="submit">
                    Entrar e instalar
                  </button>
                </Form>
              ) : (
                <div className={styles.ctaSimple}>
                  <a
                    className={`${styles.btn} ${styles.btnAccent}`}
                    href="https://apps.shopify.com"
                  >
                    Instalar pela Shopify App Store
                  </a>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* ---------------- Footer ---------------- */}
      <footer className={styles.footer}>
        <div className={styles.shell}>
          <div className={styles.footGrid}>
            <div>
              <a className={styles.brand} href="#topo">
                <span className={styles.mark} aria-hidden="true">
                  +
                </span>
                NexBundle
              </a>
              <p className={styles.footTag}>
                Compre junto e cross-sell para lojas Shopify. Mais itens por pedido,
                sem código.
              </p>
            </div>

            <div className={styles.footCols}>
              <div className={styles.footCol}>
                <h4>Produto</h4>
                <a href="#recursos">Recursos</a>
                <a href="#como-funciona">Como funciona</a>
                <a href="#precos">Preços</a>
              </div>
              <div className={styles.footCol}>
                <h4>Legal</h4>
                <a href="/legal/privacy">Privacidade</a>
                <a href="/legal/terms">Termos</a>
              </div>
              <div className={styles.footCol}>
                <h4>Suporte</h4>
                {/* TODO: confirmar e-mail/branding */}
                <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
                <span>Chat dentro do app</span>
              </div>
            </div>
          </div>

          <div className={styles.footBottom}>
            <span>© 2026 NexBundle. Todos os direitos reservados.</span>
            <span className={styles.langBadge}>
              <span className={styles.langPill}>PT</span>
              <span className={styles.langPill}>EN</span>
              <span className={styles.langPill}>ES</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

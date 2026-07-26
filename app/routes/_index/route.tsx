import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

// {/* TODO: confirmar e-mail/branding */}
const SUPPORT_EMAIL = "suporte@nexbundle.sprezzia.live";

const SITE_URL = "https://nexbundle.sprezzia.live";
const TITLE = "Frequently Bought Together for Shopify | NexBundle";
const DESCRIPTION =
  "Turn any product page into a bundle: suggest matching products, let shoppers pick variants and quantities, and apply a real discount at checkout. No code.";

/** SEO da página pública. Título ≤60 e descrição ≤155 para não truncar no Google. */
export const meta: MetaFunction = () => [
  { title: TITLE },
  { name: "description", content: DESCRIPTION },
  { tagName: "link", rel: "canonical", href: `${SITE_URL}/` },
  // Open Graph / Twitter — o link é compartilhado em grupos de lojistas.
  { property: "og:type", content: "website" },
  { property: "og:site_name", content: "NexBundle" },
  { property: "og:title", content: TITLE },
  { property: "og:description", content: DESCRIPTION },
  { property: "og:url", content: `${SITE_URL}/` },
  { property: "og:image", content: `${SITE_URL}/logo.png` },
  { property: "og:locale", content: "en_US" },
  { name: "twitter:card", content: "summary_large_image" },
  { name: "twitter:title", content: TITLE },
  { name: "twitter:description", content: DESCRIPTION },
  { name: "twitter:image", content: `${SITE_URL}/logo.png` },
];

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

/* Marca: logo real (wordmark + símbolo) servida de /public/logo.png. */
function Brand({ className }: { className?: string }) {
  return (
    <img
      className={`${styles.logo}${className ? " " + className : ""}`}
      src="/logo.png"
      alt="NexBundle"
      width={1408}
      height={327}
    />
  );
}

export default function Index() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    // Página de marketing pública — sempre em inglês, independente do locale do admin.
    <div className={styles.page} lang="en">
      {/* ---------------- Nav ---------------- */}
      <header className={styles.nav}>
        <nav className={`${styles.shell} ${styles.navInner}`} aria-label="Main">
          <a className={styles.brand} href="#top" aria-label="NexBundle, home">
            <Brand />
          </a>
          <div className={styles.navLinks}>
            <a className={styles.hideMobile} href="#features">
              Features
            </a>
            <a className={styles.hideMobile} href="#how-it-works">
              How it works
            </a>
            <a className={styles.hideMobile} href="#pricing">
              Pricing
            </a>
            <a className={`${styles.btn} ${styles.btnAccent} ${styles.btnSmall}`} href="#get-started">
              Get started
            </a>
          </div>
        </nav>
      </header>

      <main id="top">
        {/* ---------------- Hero ---------------- */}
        <section className={styles.hero}>
          <div className={`${styles.shell} ${styles.heroGrid}`}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Buy together for Shopify</p>
              <h1 className={styles.h1}>
                Sell two where you were selling <em>just one</em>.
              </h1>
              <p className={styles.lead}>
                NexBundle shows matching products right on your product page and lets
                shoppers take the whole set in one click — with a real discount applied
                at checkout. More items per order, no code.
              </p>
              <div className={styles.heroCtas}>
                <a className={`${styles.btn} ${styles.btnAccent}`} href="#get-started">
                  Install on my store
                </a>
                <a className={`${styles.btn} ${styles.btnGhost}`} href="#how-it-works">
                  See how it works
                </a>
              </div>
              <div className={styles.trustRow}>
                <span className={styles.trustItem}>
                  <Check className={styles.check} /> Free trial
                </span>
                <span className={styles.trustItem}>
                  <Check className={styles.check} /> No code required
                </span>
                <span className={styles.trustItem}>
                  <Check className={styles.check} /> Admin in EN, PT &amp; ES
                </span>
              </div>
            </div>

            {/* Assinatura: o próprio bloco "compre junto" que o lojista instala. */}
            <div className={styles.mockWrap}>
              <div className={styles.metricChip} aria-hidden="true">
                <span className={styles.num}>+18% CTR</span>
                <span className={styles.lbl}>last 7 days</span>
              </div>
              <div
                className={styles.mock}
                role="img"
                aria-label="Example of the buy-together block on a product page, with two products, the bundle total and an add to cart button."
              >
                <p className={styles.mockHead}>
                  Frequently bought together
                  <span className={styles.mockTag}>side by side</span>
                </p>
                <div className={styles.bundleRow}>
                  <div className={styles.prod}>
                    <svg className={styles.thumb} viewBox="0 0 120 96" aria-hidden="true">
                      <rect width="120" height="96" rx="10" fill="#efeaff" />
                      <rect x="30" y="20" width="60" height="46" rx="6" fill="#5b3df5" />
                      <rect x="42" y="70" width="36" height="8" rx="4" fill="#c9bdfb" />
                    </svg>
                    <p className={styles.prodName}>Runner Sneakers</p>
                    <p className={styles.prodPrice}>$89.00</p>
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
                    <p className={styles.prodName}>Sport Socks</p>
                    <p className={styles.prodPrice}>$19.00</p>
                  </div>
                </div>
                <div className={styles.mockTotal}>
                  Total price <s>$108.00</s> <b>$97.20</b>
                  <span className={styles.mockBadge}>-10%</span>
                </div>
                <button className={styles.mockCta} type="button" tabIndex={-1} aria-hidden="true">
                  Add bundle to cart
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- Features ---------------- */}
        <section id="features" className={styles.section}>
          <div className={styles.shell}>
            <div className={styles.sectionHead}>
              <p className={styles.eyebrow}>Features</p>
              <h2 className={styles.h2}>Everything you need to sell the next item</h2>
              <p className={styles.sectionSub}>
                Configurable, measurable and built to run on its own once it is live.
              </p>
            </div>

            <div className={styles.features}>
              <article className={styles.feature}>
                <div className={styles.fIcon} aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" />
                  </svg>
                </div>
                <h3 className={styles.fTitle}>Real discount at checkout</h3>
                <p className={styles.fText}>
                  Set a percentage or fixed bundle discount. A Shopify Function applies it
                  at checkout — no discount codes to hand out.
                </p>
              </article>

              <article className={styles.feature}>
                <div className={styles.fIcon} aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="7" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                    <rect x="14" y="4" width="7" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </div>
                <h3 className={styles.fTitle}>Three layouts</h3>
                <p className={styles.fText}>
                  Side by side, list or compact. Pick the shape that fits your product
                  page — from a full showcase to a slim strip.
                </p>
              </article>

              <article className={styles.feature}>
                <div className={styles.fIcon} aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="5" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2" />
                    <path d="M5 9l1.5 1.5L9 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M14 7h7M14 12h7M14 17h7M3 17h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <h3 className={styles.fTitle}>Shoppers build the bundle</h3>
                <p className={styles.fText}>
                  Every item has its own checkbox, variant picker and quantity, and the
                  total updates live as the shopper changes their mind.
                </p>
              </article>

              <article className={styles.feature}>
                <div className={styles.fIcon} aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2" />
                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <h3 className={styles.fTitle}>Styling without code</h3>
                <p className={styles.fText}>
                  Colors, title, buttons and borders straight from the admin. Match your
                  store identity in minutes.
                </p>
              </article>

              <article className={styles.feature}>
                <div className={styles.fIcon} aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M4 20V4M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M8 16l3-4 3 2 4-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className={styles.fTitle}>Metrics that matter</h3>
                <p className={styles.fText}>
                  Impressions, clicks and CTR in your dashboard. See which bundles convert
                  and double down on the ones that pay off.
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
                <h3 className={styles.fTitle}>Installs from the theme editor</h3>
                <p className={styles.fText}>
                  Drag the app block into your product page in the Shopify theme editor.
                  No Liquid, no developer needed.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* ---------------- How it works ---------------- */}
        <section id="how-it-works" className={`${styles.section} ${styles.sectionAlt}`}>
          <div className={styles.shell}>
            <div className={styles.sectionHead}>
              <p className={styles.eyebrow}>How it works</p>
              <h2 className={styles.h2}>Live in three steps</h2>
              <p className={styles.sectionSub}>
                From install to your first recommended bundle without leaving Shopify.
              </p>
            </div>

            <ol className={styles.steps}>
              <li className={styles.step}>
                <div className={styles.stepBar} aria-hidden="true" />
                <span className={styles.stepNum}>Step 01</span>
                <h3 className={styles.stepTitle}>Add the block</h3>
                <p className={styles.stepText}>
                  Enable the NexBundle app block in your theme editor and choose where it
                  shows up on the product page.
                </p>
              </li>
              <li className={styles.step}>
                <div className={styles.stepBar} aria-hidden="true" />
                <span className={styles.stepNum}>Step 02</span>
                <h3 className={styles.stepTitle}>Link the products</h3>
                <p className={styles.stepText}>
                  Connect each main product to its companions, set the bundle discount and
                  decide whether the suggestion is one-way or two-way.
                </p>
              </li>
              <li className={styles.step}>
                <div className={styles.stepBar} aria-hidden="true" />
                <span className={styles.stepNum}>Step 03</span>
                <h3 className={styles.stepTitle}>Track and tune</h3>
                <p className={styles.stepText}>
                  Watch impressions, clicks and CTR in the dashboard and refine the bundles
                  that lift your average order value.
                </p>
              </li>
            </ol>

            <div className={styles.statsBand}>
              <div className={styles.stat}>
                <div className={styles.statNum}>3</div>
                <div className={styles.statLbl}>layouts ready to use</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statNum}>3</div>
                <div className={styles.statLbl}>languages in the merchant admin</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statNum}>0</div>
                <div className={styles.statLbl}>lines of code to install</div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- Pricing ---------------- */}
        <section id="pricing" className={styles.section}>
          <div className={styles.shell}>
            <div className={styles.sectionHead}>
              <p className={styles.eyebrow}>Plans</p>
              <h2 className={styles.h2}>Start with a free trial, grow when it pays off</h2>
              <p className={styles.sectionSub}>
                Every plan includes a 7-day free trial and in-app chat support.
              </p>
            </div>

            <div className={styles.plans}>
              {/* Essential */}
              <article className={styles.plan}>
                <div className={styles.planName}>Essential</div>
                <div className={styles.planPrice}>
                  $6.99<span className={styles.planPer}>/month</span>
                </div>
                <p className={styles.planDesc}>To start recommending bundles.</p>
                <ul className={styles.planList}>
                  <li>
                    <Check /> Up to 50 products with a bundle
                  </li>
                  <li>
                    <Check /> Three layouts and no-code styling
                  </li>
                  <li>
                    <Check /> Bundle discount applied at checkout
                  </li>
                  <li>
                    <Check /> Impression and click metrics
                  </li>
                </ul>
                <div className={styles.planCtaWrap}>
                  <a className={`${styles.btn} ${styles.btnGhost}`} href="#get-started">
                    Start free
                  </a>
                </div>
              </article>

              {/* Pro — destacado */}
              <article className={`${styles.plan} ${styles.planFeatured}`}>
                <div className={styles.planName}>
                  Pro <span className={styles.planBadge}>Popular</span>
                </div>
                <div className={styles.planPrice}>
                  $19.99<span className={styles.planPer}>/month</span>
                </div>
                <p className={styles.planDesc}>To scale cross-sell with data.</p>
                <ul className={styles.planList}>
                  <li>
                    <Check /> Up to 200 products with a bundle
                  </li>
                  <li>
                    <Check /> Everything in Essential
                  </li>
                  <li>
                    <Check /> One-way and two-way recommendations
                  </li>
                  <li>
                    <Check /> Full CTR reporting
                  </li>
                </ul>
                <div className={styles.planCtaWrap}>
                  <a className={`${styles.btn} ${styles.btnAccent}`} href="#get-started">
                    Try Pro
                  </a>
                </div>
              </article>

              {/* Enterprise */}
              <article className={styles.plan}>
                <div className={styles.planName}>Enterprise</div>
                <div className={styles.planPrice}>
                  $39.99<span className={styles.planPer}>/month</span>
                </div>
                <p className={styles.planDesc}>For large catalogs and teams.</p>
                <ul className={styles.planList}>
                  <li>
                    <Check /> Unlimited products with a bundle
                  </li>
                  <li>
                    <Check /> Everything in Pro
                  </li>
                  <li>
                    <Check /> Priority chat support
                  </li>
                </ul>
                <div className={styles.planCtaWrap}>
                  <a className={`${styles.btn} ${styles.btnGhost}`} href={`mailto:${SUPPORT_EMAIL}`}>
                    Talk to us
                  </a>
                </div>
              </article>
            </div>
            <p className={styles.plansNote}>
              Prices in USD, billed monthly through Shopify. The exact plan shown at
              install is the one on the Shopify App Store listing.
            </p>
          </div>
        </section>

        {/* ---------------- CTA / login por shop domain ---------------- */}
        <section id="get-started" className={styles.section}>
          <div className={styles.shell}>
            <div className={styles.cta}>
              <p className={`${styles.eyebrow} ${styles.eyebrowOnDark}`}>Get started</p>
              <h2 className={styles.h2}>Turn NexBundle on in your store</h2>
              <p className={styles.ctaSub}>
                Enter your Shopify store domain to log in and install. It takes a few
                minutes and you leave with your first bundle live.
              </p>

              {showForm ? (
                <Form className={styles.loginForm} method="post" action="/auth/login">
                  <label className={styles.loginField}>
                    <span>Store domain</span>
                    <input
                      className={styles.input}
                      type="text"
                      name="shop"
                      placeholder="my-store.myshopify.com"
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                    />
                    <span className={styles.hint}>e.g. my-store.myshopify.com</span>
                  </label>
                  <button className={styles.loginSubmit} type="submit">
                    Log in and install
                  </button>
                </Form>
              ) : (
                <div className={styles.ctaSimple}>
                  <a
                    className={`${styles.btn} ${styles.btnAccent}`}
                    href="https://apps.shopify.com"
                  >
                    Install from the Shopify App Store
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
              <a className={styles.brand} href="#top" aria-label="NexBundle, home">
                <Brand />
              </a>
              <p className={styles.footTag}>
                Buy together and cross-sell for Shopify stores. More items per order,
                without code.
              </p>
            </div>

            <div className={styles.footCols}>
              <div className={styles.footCol}>
                <h4>Product</h4>
                <a href="#features">Features</a>
                <a href="#how-it-works">How it works</a>
                <a href="#pricing">Pricing</a>
              </div>
              <div className={styles.footCol}>
                <h4>Legal</h4>
                <a href="/legal/privacy">Privacy</a>
                <a href="/legal/terms">Terms</a>
              </div>
              <div className={styles.footCol}>
                <h4>Support</h4>
                {/* TODO: confirmar e-mail/branding */}
                <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
                <span>In-app chat</span>
              </div>
            </div>
          </div>

          <div className={styles.footBottom}>
            <span>© 2026 NexBundle. All rights reserved.</span>
            <span className={styles.langBadge}>
              <span className={styles.langPill}>EN</span>
              <span className={styles.langPill}>PT</span>
              <span className={styles.langPill}>ES</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

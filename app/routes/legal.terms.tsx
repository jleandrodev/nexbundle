/**
 * Página PÚBLICA — Termos de Serviço do NexBundle.
 * Acessível em /legal/terms (sem autenticação Shopify, sem Polaris AppProvider).
 *
 * Trilíngue (en | pt-BR | es) via querystring ?lng=. O default vem do helper
 * de i18n do servidor (cookie/searchParams/header). O conteúdo legal fica inline
 * neste arquivo (grande demais para os JSON de i18n).
 *
 * URL canônica de produção: https://nexbundle.sprezzia.live/legal/terms
 *
 * TODO(owner): antes do lançamento, revise TODO o texto com um advogado e preencha
 * os placeholders: [RAZÃO SOCIAL], [CNPJ], [ENDEREÇO], [FORO] e confirme o e-mail
 * de contato (jls.mkt25@gmail.com). A data de "última atualização" é
 * editada à mão aqui em `lastUpdated` sempre que o texto mudar.
 */
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import { normalizeLocale, type SupportedLng } from "../i18n/config";
import { i18n } from "../i18n/i18next.server";

// TODO(owner): confirmar este endereço de e-mail de suporte.
const CONTACT_EMAIL = "jls.mkt25@gmail.com";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const override = url.searchParams.get("lng");
  const lng: SupportedLng = override
    ? normalizeLocale(override)
    : normalizeLocale(await i18n.getLocale(request));
  return json({ lng });
}

/** SEO: título/descrição seguem o idioma resolvido no loader. */
export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const lng = data?.lng ?? "en";
  const byLng = {
    en: {
      title: "Terms of Service | NexBundle",
      description:
        "The terms that govern the use of NexBundle, the buy-together app for Shopify stores: subscription, billing, support and liability.",
    },
    "pt-BR": {
      title: "Termos de Serviço | NexBundle",
      description:
        "Os termos que regem o uso do NexBundle, o app de compre junto para lojas Shopify: assinatura, cobrança, suporte e responsabilidade.",
    },
    es: {
      title: "Términos del Servicio | NexBundle",
      description:
        "Los términos que rigen el uso de NexBundle, la app de compra junto para tiendas Shopify: suscripción, facturación, soporte y responsabilidad.",
    },
  } as const;
  const c = byLng[lng] ?? byLng.en;
  return [
    { title: c.title },
    { name: "description", content: c.description },
    {
      tagName: "link",
      rel: "canonical",
      href: "https://nexbundle.sprezzia.live/legal/terms",
    },
  ];
};

// ---------------------------------------------------------------------------
// Conteúdo legal (inline). Revisar com advogado antes do lançamento.
// ---------------------------------------------------------------------------

type Section = { heading: string; body: string[] };
type TermsContent = {
  langLabel: string;
  title: string;
  lastUpdated: string;
  intro: string[];
  sections: Section[];
};

const CONTENT: Record<SupportedLng, TermsContent> = {
  en: {
    langLabel: "English",
    title: "Terms of Service",
    lastUpdated: "Last updated: July 26, 2026",
    intro: [
      "These Terms of Service (the “Terms”) govern your access to and use of NexBundle (the “App”), provided by [LEGAL ENTITY], CNPJ [CNPJ], located at [ADDRESS]. By installing or using the App, you (the “Merchant”) agree to these Terms.",
    ],
    sections: [
      {
        heading: "1. Acceptance of the Terms",
        body: [
          "By installing, accessing or using the App through your Shopify store, you confirm that you have read, understood and agree to be bound by these Terms and by our Privacy Policy. If you do not agree, do not install or use the App.",
        ],
      },
      {
        heading: "2. Description of the service",
        body: [
          "NexBundle is a “buy together / cross-sell” application embedded in the Shopify admin. It lets you define product relationships (a main product and companion products) and display them together on your storefront, with configurable layout and styling. It also provides aggregated impression / click metrics.",
          "The App requests only the read_products scope and uses Shopify’s standard cart endpoint (/cart/add.js) on the storefront.",
        ],
      },
      {
        heading: "3. Accounts and Merchant responsibilities",
        body: [
          "You are responsible for maintaining an active and compliant Shopify store, for the accuracy of the products and relationships you configure, and for ensuring that your use of the App complies with applicable law and with Shopify’s terms and policies.",
          "You are responsible for the content you display through the App and for any support attachments you upload.",
        ],
      },
      {
        heading: "4. Plans, billing and free trial",
        body: [
          "The App is offered under subscription plans (Essential / Pro / Enterprise), billed monthly, and may include a free trial.",
          "All charges are processed through Shopify Billing. By subscribing, you authorize Shopify to bill the applicable fees to your Shopify account according to the plan you select. Taxes, if any, may apply.",
          "Unless otherwise stated, fees are non-refundable except where required by law. Uninstalling the App stops future charges going forward.",
        ],
      },
      {
        heading: "5. Acceptable use",
        body: [
          "You agree not to misuse the App, including: attempting to gain unauthorized access, interfering with or disrupting the service, reverse-engineering the App, using it for unlawful purposes, or using it in a way that infringes the rights of third parties.",
        ],
      },
      {
        heading: "6. Intellectual property",
        body: [
          "The App, including its software, design and trademarks, is and remains the property of [LEGAL ENTITY] and its licensors. These Terms do not grant you any ownership rights in the App; you receive a limited, non-exclusive, non-transferable right to use it while your subscription is active.",
          "You retain all rights to your own store content and product data.",
        ],
      },
      {
        heading: "7. Disclaimer of warranties",
        body: [
          "The App is provided “as is” and “as available”, without warranties of any kind, whether express or implied, including but not limited to merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the App will be uninterrupted, error-free, or that it will increase your sales.",
        ],
      },
      {
        heading: "8. Limitation of liability",
        body: [
          "To the maximum extent permitted by applicable law, [LEGAL ENTITY] shall not be liable for any indirect, incidental, special, consequential or punitive damages, or for any loss of profits, revenue, data or goodwill, arising out of or in connection with your use of the App. Our aggregate liability shall not exceed the amounts you paid for the App in the twelve (12) months preceding the event giving rise to the claim.",
        ],
      },
      {
        heading: "9. Termination",
        body: [
          "You may terminate these Terms at any time by uninstalling the App from your Shopify store. Upon uninstall, Shopify sends the shop/redact webhook (approximately 48 hours later) and we delete the data associated with your store, as described in the Privacy Policy.",
          "We may suspend or terminate your access if you breach these Terms or use the App in a harmful or unlawful manner.",
        ],
      },
      {
        heading: "10. Changes to the Terms",
        body: [
          "We may modify these Terms from time to time. Material changes will be reflected by updating the “Last updated” date at the top of this page. Your continued use of the App after changes take effect constitutes acceptance of the revised Terms.",
        ],
      },
      {
        heading: "11. Governing law and jurisdiction",
        body: [
          "These Terms are governed by the laws of the Federative Republic of Brazil. Any dispute arising from these Terms shall be submitted to the courts of [JURISDICTION / VENUE], Brazil, to the exclusion of any other, however privileged.",
        ],
      },
      {
        heading: "12. Contact",
        body: ["For any question about these Terms, contact us at " + CONTACT_EMAIL + "."],
      },
    ],
  },
  "pt-BR": {
    langLabel: "Português",
    title: "Termos de Serviço",
    lastUpdated: "Última atualização: 26 de julho de 2026",
    intro: [
      "Estes Termos de Serviço (os “Termos”) regem o seu acesso e uso do NexBundle (o “App”), fornecido por [RAZÃO SOCIAL], CNPJ [CNPJ], com sede em [ENDEREÇO]. Ao instalar ou usar o App, você (o “Lojista”) concorda com estes Termos.",
    ],
    sections: [
      {
        heading: "1. Aceitação dos Termos",
        body: [
          "Ao instalar, acessar ou usar o App por meio da sua loja Shopify, você confirma que leu, entendeu e concorda em se vincular a estes Termos e à nossa Política de Privacidade. Se você não concorda, não instale nem use o App.",
        ],
      },
      {
        heading: "2. Descrição do serviço",
        body: [
          "O NexBundle é um aplicativo de “compre junto / cross-sell” embarcado no admin da Shopify. Ele permite definir relacionamentos de produtos (um produto principal e produtos companheiros) e exibi-los juntos na sua vitrine, com layout e estilo configuráveis. Também fornece métricas agregadas de impressão / clique.",
          "O App solicita apenas o escopo read_products e usa o endpoint padrão de carrinho da Shopify (/cart/add.js) na vitrine.",
        ],
      },
      {
        heading: "3. Contas e responsabilidades do Lojista",
        body: [
          "Você é responsável por manter uma loja Shopify ativa e em conformidade, pela exatidão dos produtos e relacionamentos que configura, e por garantir que o seu uso do App esteja em conformidade com a legislação aplicável e com os termos e políticas da Shopify.",
          "Você é responsável pelo conteúdo exibido por meio do App e por quaisquer anexos de suporte que enviar.",
        ],
      },
      {
        heading: "4. Planos, cobrança e teste grátis",
        body: [
          "O App é oferecido em planos de assinatura (Essencial / Pro / Enterprise), cobrados mensalmente, podendo incluir um período de teste grátis.",
          "Todas as cobranças são processadas pela Shopify Billing. Ao assinar, você autoriza a Shopify a cobrar as tarifas aplicáveis na sua conta Shopify conforme o plano escolhido. Impostos, se houver, podem ser aplicados.",
          "Salvo disposição em contrário, as tarifas não são reembolsáveis, exceto quando exigido por lei. A desinstalação do App interrompe cobranças futuras dali em diante.",
        ],
      },
      {
        heading: "5. Uso aceitável",
        body: [
          "Você concorda em não usar o App de forma indevida, incluindo: tentar obter acesso não autorizado, interferir ou interromper o serviço, fazer engenharia reversa do App, usá-lo para fins ilícitos ou de forma que viole direitos de terceiros.",
        ],
      },
      {
        heading: "6. Propriedade intelectual",
        body: [
          "O App, incluindo seu software, design e marcas, é e permanece de propriedade de [RAZÃO SOCIAL] e seus licenciadores. Estes Termos não concedem a você qualquer direito de propriedade sobre o App; você recebe um direito limitado, não exclusivo e intransferível de usá-lo enquanto sua assinatura estiver ativa.",
          "Você mantém todos os direitos sobre o conteúdo da sua loja e os dados dos seus produtos.",
        ],
      },
      {
        heading: "7. Isenção de garantias",
        body: [
          "O App é fornecido “no estado em que se encontra” e “conforme a disponibilidade”, sem garantias de qualquer natureza, expressas ou implícitas, incluindo, sem limitação, comercialização, adequação a um fim específico e não violação. Não garantimos que o App será ininterrupto, livre de erros, nem que aumentará as suas vendas.",
        ],
      },
      {
        heading: "8. Limitação de responsabilidade",
        body: [
          "Na máxima extensão permitida pela legislação aplicável, a [RAZÃO SOCIAL] não será responsável por quaisquer danos indiretos, incidentais, especiais, consequenciais ou punitivos, nem por lucros cessantes, perda de receita, dados ou reputação, decorrentes ou relacionados ao seu uso do App. Nossa responsabilidade total não excederá os valores por você pagos pelo App nos doze (12) meses anteriores ao evento que deu origem à reclamação.",
        ],
      },
      {
        heading: "9. Rescisão",
        body: [
          "Você pode rescindir estes Termos a qualquer momento desinstalando o App da sua loja Shopify. Após a desinstalação, a Shopify envia o webhook shop/redact (aproximadamente 48 horas depois) e apagamos os dados associados à sua loja, conforme descrito na Política de Privacidade.",
          "Podemos suspender ou encerrar o seu acesso caso você viole estes Termos ou use o App de forma nociva ou ilícita.",
        ],
      },
      {
        heading: "10. Alterações dos Termos",
        body: [
          "Podemos modificar estes Termos periodicamente. Alterações relevantes serão refletidas na data de “Última atualização” no topo desta página. O uso continuado do App após a entrada em vigor das alterações constitui aceitação dos Termos revisados.",
        ],
      },
      {
        heading: "11. Lei aplicável e foro",
        body: [
          "Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de [FORO], Brasil, para dirimir quaisquer controvérsias decorrentes destes Termos, com renúncia a qualquer outro, por mais privilegiado que seja.",
        ],
      },
      {
        heading: "12. Contato",
        body: ["Para qualquer dúvida sobre estes Termos, entre em contato pelo e-mail " + CONTACT_EMAIL + "."],
      },
    ],
  },
  es: {
    langLabel: "Español",
    title: "Términos de Servicio",
    lastUpdated: "Última actualización: 26 de julio de 2026",
    intro: [
      "Estos Términos de Servicio (los “Términos”) rigen su acceso y uso de NexBundle (la “App”), proporcionada por [RAZÓN SOCIAL], CNPJ [CNPJ], con domicilio en [ENDEREÇO]. Al instalar o usar la App, usted (el “Comerciante”) acepta estos Términos.",
    ],
    sections: [
      {
        heading: "1. Aceptación de los Términos",
        body: [
          "Al instalar, acceder o usar la App a través de su tienda Shopify, usted confirma que ha leído, entendido y acepta quedar vinculado por estos Términos y por nuestra Política de Privacidad. Si no está de acuerdo, no instale ni use la App.",
        ],
      },
      {
        heading: "2. Descripción del servicio",
        body: [
          "NexBundle es una aplicación de “compra junto / venta cruzada” integrada en el panel de administración de Shopify. Permite definir relaciones de productos (un producto principal y productos complementarios) y mostrarlos juntos en su tienda, con diseño y estilo configurables. También proporciona métricas agregadas de impresión / clic.",
          "La App solicita únicamente el scope read_products y usa el endpoint estándar de carrito de Shopify (/cart/add.js) en la tienda.",
        ],
      },
      {
        heading: "3. Cuentas y responsabilidades del Comerciante",
        body: [
          "Usted es responsable de mantener una tienda Shopify activa y en conformidad, de la exactitud de los productos y relaciones que configura, y de garantizar que su uso de la App cumpla con la legislación aplicable y con los términos y políticas de Shopify.",
          "Usted es responsable del contenido que muestra a través de la App y de los archivos adjuntos de soporte que envíe.",
        ],
      },
      {
        heading: "4. Planes, facturación y prueba gratuita",
        body: [
          "La App se ofrece bajo planes de suscripción (Esencial / Pro / Enterprise), facturados mensualmente, y puede incluir un período de prueba gratuito.",
          "Todos los cargos se procesan a través de Shopify Billing. Al suscribirse, usted autoriza a Shopify a cobrar las tarifas aplicables en su cuenta de Shopify según el plan que elija. Pueden aplicarse impuestos, si corresponde.",
          "Salvo que se indique lo contrario, las tarifas no son reembolsables, excepto cuando lo exija la ley. Desinstalar la App detiene los cargos futuros a partir de ese momento.",
        ],
      },
      {
        heading: "5. Uso aceptable",
        body: [
          "Usted acepta no hacer un uso indebido de la App, incluyendo: intentar obtener acceso no autorizado, interferir o interrumpir el servicio, realizar ingeniería inversa de la App, usarla con fines ilícitos o de forma que infrinja los derechos de terceros.",
        ],
      },
      {
        heading: "6. Propiedad intelectual",
        body: [
          "La App, incluido su software, diseño y marcas, es y sigue siendo propiedad de [RAZÓN SOCIAL] y sus licenciantes. Estos Términos no le otorgan ningún derecho de propiedad sobre la App; usted recibe un derecho limitado, no exclusivo e intransferible de usarla mientras su suscripción esté activa.",
          "Usted conserva todos los derechos sobre el contenido de su tienda y los datos de sus productos.",
        ],
      },
      {
        heading: "7. Exención de garantías",
        body: [
          "La App se proporciona “tal cual” y “según disponibilidad”, sin garantías de ningún tipo, ya sean expresas o implícitas, incluyendo, entre otras, comerciabilidad, idoneidad para un fin determinado y no infracción. No garantizamos que la App sea ininterrumpida, libre de errores, ni que aumente sus ventas.",
        ],
      },
      {
        heading: "8. Limitación de responsabilidad",
        body: [
          "En la máxima medida permitida por la legislación aplicable, [RAZÓN SOCIAL] no será responsable de daños indirectos, incidentales, especiales, consecuentes o punitivos, ni de pérdida de beneficios, ingresos, datos o reputación, derivados o relacionados con su uso de la App. Nuestra responsabilidad total no excederá los importes que usted haya pagado por la App en los doce (12) meses anteriores al evento que dio origen a la reclamación.",
        ],
      },
      {
        heading: "9. Rescisión",
        body: [
          "Usted puede rescindir estos Términos en cualquier momento desinstalando la App de su tienda Shopify. Tras la desinstalación, Shopify envía el webhook shop/redact (aproximadamente 48 horas después) y eliminamos los datos asociados a su tienda, según se describe en la Política de Privacidad.",
          "Podemos suspender o cancelar su acceso si usted infringe estos Términos o usa la App de forma dañina o ilícita.",
        ],
      },
      {
        heading: "10. Cambios en los Términos",
        body: [
          "Podemos modificar estos Términos periódicamente. Los cambios relevantes se reflejarán actualizando la fecha de “Última actualización” en la parte superior de esta página. El uso continuado de la App después de que los cambios entren en vigor constituye la aceptación de los Términos revisados.",
        ],
      },
      {
        heading: "11. Ley aplicable y jurisdicción",
        body: [
          "Estos Términos se rigen por las leyes de la República Federativa de Brasil. Cualquier disputa derivada de estos Términos se someterá a los tribunales de [JURISDICCIÓN / FORO], Brasil, con exclusión de cualquier otro, por privilegiado que sea.",
        ],
      },
      {
        heading: "12. Contacto",
        body: ["Para cualquier duda sobre estos Términos, contáctenos en " + CONTACT_EMAIL + "."],
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// Estilos inline simples (sem dependências). Container centralizado ~800px.
// ---------------------------------------------------------------------------

const styles = {
  page: {
    boxSizing: "border-box" as const,
    maxWidth: 800,
    margin: "0 auto",
    padding: "48px 20px 96px",
    fontFamily:
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    color: "#1f2933",
    lineHeight: 1.7,
    fontSize: 16,
  },
  langBar: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap" as const,
    marginBottom: 28,
    paddingBottom: 16,
    borderBottom: "1px solid #e4e7eb",
    fontSize: 14,
  },
  langActive: { fontWeight: 600, color: "#0b5cff", textDecoration: "none" },
  langLink: { color: "#52606d", textDecoration: "none" },
  h1: { fontSize: 30, lineHeight: 1.25, margin: "0 0 8px" },
  updated: { color: "#7b8794", fontSize: 14, margin: "0 0 24px" },
  h2: { fontSize: 20, lineHeight: 1.3, margin: "36px 0 8px" },
  p: { margin: "0 0 14px" },
};

export default function LegalTerms() {
  const { lng } = useLoaderData<typeof loader>();
  const c = CONTENT[lng];

  const langOrder: SupportedLng[] = ["pt-BR", "en", "es"];

  return (
    <main style={styles.page}>
      <nav style={styles.langBar} aria-label="Language selector">
        {langOrder.map((code, i) => {
          const active = code === lng;
          return (
            <span key={code}>
              <a
                href={`?lng=${encodeURIComponent(code)}`}
                style={active ? styles.langActive : styles.langLink}
                aria-current={active ? "true" : undefined}
              >
                {CONTENT[code].langLabel}
              </a>
              {i < langOrder.length - 1 ? (
                <span style={{ color: "#cbd2d9", margin: "0 4px" }}>|</span>
              ) : null}
            </span>
          );
        })}
      </nav>

      <h1 style={styles.h1}>{c.title}</h1>
      <p style={styles.updated}>{c.lastUpdated}</p>

      {c.intro.map((p, i) => (
        <p key={`intro-${i}`} style={styles.p}>
          {p}
        </p>
      ))}

      {c.sections.map((s, si) => (
        <section key={`sec-${si}`}>
          <h2 style={styles.h2}>{s.heading}</h2>
          {s.body.map((p, pi) => (
            <p key={`sec-${si}-p-${pi}`} style={styles.p}>
              {p}
            </p>
          ))}
        </section>
      ))}
    </main>
  );
}

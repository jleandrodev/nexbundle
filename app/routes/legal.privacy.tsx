/**
 * Página PÚBLICA — Política de Privacidade do NexBundle.
 * Acessível em /legal/privacy (sem autenticação Shopify, sem Polaris AppProvider).
 *
 * Trilíngue (en | pt-BR | es) via querystring ?lng=. O default vem do helper
 * de i18n do servidor (cookie/searchParams/header). O conteúdo legal fica inline
 * neste arquivo (grande demais para os JSON de i18n).
 *
 * URL canônica de produção: https://nexbundle.sprezzia.live/legal/privacy
 *
 * TODO(owner): antes do lançamento, revise TODO o texto com um advogado e preencha
 * os placeholders: [RAZÃO SOCIAL], [CNPJ], [ENDEREÇO] e confirme o e-mail de contato
 * (jls.mkt25@gmail.com). A data de "última atualização" é editada à mão
 * aqui em `lastUpdated` sempre que o texto mudar.
 */
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

import { normalizeLocale, type SupportedLng } from "../i18n/config";
import { i18n } from "../i18n/i18next.server";

// TODO(owner): confirmar este endereço de e-mail de suporte/privacidade.
const CONTACT_EMAIL = "jls.mkt25@gmail.com";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const override = url.searchParams.get("lng");
  // Prioridade: ?lng= (override explícito) → detecção padrão do i18n do servidor.
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
      title: "Privacy Policy | NexBundle",
      description:
        "How NexBundle collects, uses and protects data from Shopify stores that install the app, including GDPR/LGPD requests and data deletion.",
    },
    "pt-BR": {
      title: "Política de Privacidade | NexBundle",
      description:
        "Como o NexBundle coleta, usa e protege os dados das lojas Shopify que instalam o app, incluindo solicitações LGPD/GDPR e exclusão de dados.",
    },
    es: {
      title: "Política de Privacidad | NexBundle",
      description:
        "Cómo NexBundle recopila, usa y protege los datos de las tiendas Shopify que instalan la app, incluidas las solicitudes GDPR y la eliminación de datos.",
    },
  } as const;
  const c = byLng[lng] ?? byLng.en;
  return [
    { title: c.title },
    { name: "description", content: c.description },
    {
      tagName: "link",
      rel: "canonical",
      href: "https://nexbundle.sprezzia.live/legal/privacy",
    },
  ];
};

// ---------------------------------------------------------------------------
// Conteúdo legal (inline). Revisar com advogado antes do lançamento.
// ---------------------------------------------------------------------------

type Section = { heading: string; body: string[] };
type PrivacyContent = {
  langLabel: string;
  title: string;
  lastUpdated: string;
  intro: string[];
  sections: Section[];
};

const CONTENT: Record<SupportedLng, PrivacyContent> = {
  en: {
    langLabel: "English",
    title: "Privacy Policy",
    lastUpdated: "Last updated: July 26, 2026",
    intro: [
      "This Privacy Policy explains how NexBundle (the “App”, “we”, “us”), operated by [LEGAL ENTITY], CNPJ [CNPJ], located at [ADDRESS], collects, uses, stores and protects information in connection with your use of the App.",
      "NexBundle is a “buy together / cross-sell” application embedded in the Shopify admin. It lets a merchant define product relationships (a main product and companion products) that are displayed together on the storefront. By installing or using the App, you agree to this Policy.",
    ],
    sections: [
      {
        heading: "1. Who is the data controller",
        body: [
          "The App is provided by [LEGAL ENTITY], CNPJ [CNPJ], with address at [ADDRESS]. For any privacy-related request, contact us at " +
            CONTACT_EMAIL +
            ".",
        ],
      },
      {
        heading: "2. Information we store",
        body: [
          "Store / merchant data. We store your store domain (your-store.myshopify.com) and the offline access token issued by Shopify for your store (the session), which is required for the App to read your products.",
          "Product relationships (“components”). Product IDs (main and companion) and variant IDs as Shopify GIDs, the chosen layout/template, a style JSON (colors, title, button), direction, and active/inactive status.",
          "Store-level style configuration. A global styling preference for your store.",
          "Metric events. Aggregated performance data: event type (impression or click), the product IDs involved, the layout, and a timestamp. These events contain NO buyer identifiers.",
          "Admin language preference. The interface language you selected in the App admin panel.",
          "Support / chat. Messages exchanged between you and our support team, and any attachments you upload (images / PDF), stored on our server.",
        ],
      },
      {
        heading: "3. Information we do NOT collect",
        body: [
          "We do not collect any personal data about your store’s buyers or end customers. The storefront widget only uses product IDs and records impression / click events — it does not set PII cookies and does not capture buyer name, e-mail, address or payment data.",
          "Adding to cart uses Shopify’s standard cart endpoint (/cart/add.js); we do not process the checkout or payment.",
        ],
      },
      {
        heading: "4. Permissions (scopes)",
        body: [
          "The App requests only the read_products scope (read access to products). It does not request write access to your products, orders, or customers.",
        ],
      },
      {
        heading: "5. How we use the information",
        body: [
          "To operate the App: authenticate with Shopify, read your products, and render the buy-together widget on your storefront.",
          "To measure performance: aggregate impression / click metrics so you can see how relationships perform (no buyer identifiers involved).",
          "To provide support: respond to your messages and handle attachments you send us.",
          "To remember your preferences: such as the admin panel language.",
        ],
      },
      {
        heading: "6. Hosting and sub-processors",
        body: [
          "The App is hosted on our own server (VPS) with a local database (SQLite). We integrate with Shopify’s APIs. We do not use third-party analytics providers and do not sell or share your data with advertisers.",
          "Data is transmitted over encrypted connections. Webhooks received from Shopify are verified by HMAC signature, and uploaded attachments are served only through authenticated routes.",
        ],
      },
      {
        heading: "7. Data retention and deletion",
        body: [
          "Your data exists for as long as the App is installed. When you uninstall the App, Shopify sends the shop/redact webhook (approximately 48 hours after uninstall), and we delete all data associated with your store.",
          "We also respond to Shopify’s mandatory compliance webhooks: customers/data_request (we hold no customer data to return), customers/redact (we hold no customer data to erase), and shop/redact (we erase all store data).",
        ],
      },
      {
        heading: "8. Your rights (GDPR / LGPD)",
        body: [
          "Depending on your jurisdiction, you may have the right to access, correct or delete your data, among others. You can exercise deletion by uninstalling the App and/or by contacting us at " +
            CONTACT_EMAIL +
            ".",
        ],
      },
      {
        heading: "9. Internal team accounts",
        body: [
          "We maintain accounts for our own internal support team (e-mail, name, password hash). These are our staff accounts and are not merchant or buyer data.",
        ],
      },
      {
        heading: "10. Changes to this Policy",
        body: [
          "We may update this Policy from time to time. Material changes will be reflected by updating the “Last updated” date at the top of this page.",
        ],
      },
      {
        heading: "11. Contact",
        body: ["For any question about this Policy, contact us at " + CONTACT_EMAIL + "."],
      },
    ],
  },
  "pt-BR": {
    langLabel: "Português",
    title: "Política de Privacidade",
    lastUpdated: "Última atualização: 26 de julho de 2026",
    intro: [
      "Esta Política de Privacidade explica como o NexBundle (o “App”, “nós”), operado por [RAZÃO SOCIAL], CNPJ [CNPJ], com sede em [ENDEREÇO], coleta, usa, armazena e protege informações relacionadas ao uso do App.",
      "O NexBundle é um aplicativo de “compre junto / cross-sell” embarcado no admin da Shopify. Ele permite ao lojista definir relacionamentos de produtos (um produto principal e produtos companheiros) exibidos juntos na vitrine. Ao instalar ou usar o App, você concorda com esta Política.",
    ],
    sections: [
      {
        heading: "1. Quem é o controlador dos dados",
        body: [
          "O App é fornecido por [RAZÃO SOCIAL], CNPJ [CNPJ], com endereço em [ENDEREÇO]. Para qualquer solicitação relacionada à privacidade, entre em contato pelo e-mail " +
            CONTACT_EMAIL +
            ".",
        ],
      },
      {
        heading: "2. Informações que armazenamos",
        body: [
          "Dados da loja / lojista. Armazenamos o domínio da sua loja (sua-loja.myshopify.com) e o token de acesso offline emitido pela Shopify para a sua loja (a sessão), necessário para o App ler os seus produtos.",
          "Relacionamentos de produtos (“componentes”). IDs de produtos (principal e companheiros) e IDs de variantes como GIDs da Shopify, o layout/template escolhido, um JSON de estilo (cores, título, botão), direção e status ativo/inativo.",
          "Configuração global de estilo. Uma preferência de estilo por loja.",
          "Eventos de métrica. Dados agregados de desempenho: tipo do evento (impressão ou clique), os IDs de produto envolvidos, o layout e um timestamp. Esses eventos NÃO contêm identificadores de comprador.",
          "Preferência de idioma do admin. O idioma escolhido no painel administrativo do App.",
          "Suporte / chat. Mensagens trocadas entre você e nossa equipe de suporte, e quaisquer anexos enviados (imagens / PDF), guardados em nosso servidor.",
        ],
      },
      {
        heading: "3. Informações que NÃO coletamos",
        body: [
          "Não coletamos nenhum dado pessoal dos compradores ou clientes finais da sua loja. O bloco na vitrine usa apenas IDs de produto e registra eventos de impressão / clique — não define cookies de PII e não captura nome, e-mail, endereço ou dados de pagamento do comprador.",
          "A adição ao carrinho usa o endpoint padrão da Shopify (/cart/add.js); não processamos o checkout nem o pagamento.",
        ],
      },
      {
        heading: "4. Permissões (scopes)",
        body: [
          "O App solicita apenas o escopo read_products (leitura de produtos). Não solicita acesso de escrita a produtos, pedidos ou clientes.",
        ],
      },
      {
        heading: "5. Como usamos as informações",
        body: [
          "Para operar o App: autenticar com a Shopify, ler seus produtos e renderizar o bloco de compre-junto na sua vitrine.",
          "Para medir desempenho: agregar métricas de impressão / clique para que você acompanhe o desempenho dos relacionamentos (sem identificadores de comprador).",
          "Para prestar suporte: responder às suas mensagens e tratar os anexos que você envia.",
          "Para lembrar suas preferências: como o idioma do painel administrativo.",
        ],
      },
      {
        heading: "6. Hospedagem e sub-processadores",
        body: [
          "O App é hospedado em servidor próprio (VPS) com banco de dados local (SQLite). Integramos com as APIs da Shopify. Não usamos provedores de analytics de terceiros e não vendemos nem compartilhamos seus dados com anunciantes.",
          "Os dados trafegam por conexões criptografadas. Os webhooks recebidos da Shopify são verificados por assinatura HMAC, e os anexos enviados são servidos apenas por rotas autenticadas.",
        ],
      },
      {
        heading: "7. Retenção e exclusão de dados",
        body: [
          "Seus dados existem enquanto o App estiver instalado. Ao desinstalar o App, a Shopify envia o webhook shop/redact (aproximadamente 48 horas após a desinstalação), e apagamos todos os dados associados à sua loja.",
          "Também respondemos aos webhooks obrigatórios de conformidade da Shopify: customers/data_request (não temos dados de cliente para retornar), customers/redact (não temos dados de cliente para apagar) e shop/redact (apagamos todos os dados da loja).",
        ],
      },
      {
        heading: "8. Seus direitos (GDPR / LGPD)",
        body: [
          "Conforme a sua jurisdição, você pode ter o direito de acesso, correção ou exclusão dos seus dados, entre outros. Você pode exercer a exclusão desinstalando o App e/ou entrando em contato pelo e-mail " +
            CONTACT_EMAIL +
            ".",
        ],
      },
      {
        heading: "9. Contas da equipe interna",
        body: [
          "Mantemos contas para a nossa própria equipe interna de suporte (e-mail, nome, hash de senha). São contas dos nossos colaboradores e não são dados do lojista nem do comprador.",
        ],
      },
      {
        heading: "10. Alterações nesta Política",
        body: [
          "Podemos atualizar esta Política periodicamente. Alterações relevantes serão refletidas na data de “Última atualização” no topo desta página.",
        ],
      },
      {
        heading: "11. Contato",
        body: ["Para qualquer dúvida sobre esta Política, entre em contato pelo e-mail " + CONTACT_EMAIL + "."],
      },
    ],
  },
  es: {
    langLabel: "Español",
    title: "Política de Privacidad",
    lastUpdated: "Última actualización: 26 de julio de 2026",
    intro: [
      "Esta Política de Privacidad explica cómo NexBundle (la “App”, “nosotros”), operada por [RAZÓN SOCIAL], CNPJ [CNPJ], con domicilio en [ENDEREÇO], recopila, usa, almacena y protege información en relación con el uso de la App.",
      "NexBundle es una aplicación de “compra junto / venta cruzada” integrada en el panel de administración de Shopify. Permite al comerciante definir relaciones de productos (un producto principal y productos complementarios) que se muestran juntos en la tienda. Al instalar o usar la App, usted acepta esta Política.",
    ],
    sections: [
      {
        heading: "1. Quién es el responsable de los datos",
        body: [
          "La App es proporcionada por [RAZÓN SOCIAL], CNPJ [CNPJ], con domicilio en [ENDEREÇO]. Para cualquier solicitud relacionada con la privacidad, contáctenos en " +
            CONTACT_EMAIL +
            ".",
        ],
      },
      {
        heading: "2. Información que almacenamos",
        body: [
          "Datos de la tienda / comerciante. Almacenamos el dominio de su tienda (su-tienda.myshopify.com) y el token de acceso offline emitido por Shopify para su tienda (la sesión), necesario para que la App lea sus productos.",
          "Relaciones de productos (“componentes”). IDs de productos (principal y complementarios) e IDs de variantes como GIDs de Shopify, el diseño/plantilla elegido, un JSON de estilo (colores, título, botón), dirección y estado activo/inactivo.",
          "Configuración global de estilo. Una preferencia de estilo por tienda.",
          "Eventos de métrica. Datos agregados de rendimiento: tipo de evento (impresión o clic), los IDs de producto involucrados, el diseño y una marca de tiempo. Estos eventos NO contienen identificadores del comprador.",
          "Preferencia de idioma del panel. El idioma elegido en el panel de administración de la App.",
          "Soporte / chat. Mensajes intercambiados entre usted y nuestro equipo de soporte, y los archivos adjuntos que envíe (imágenes / PDF), almacenados en nuestro servidor.",
        ],
      },
      {
        heading: "3. Información que NO recopilamos",
        body: [
          "No recopilamos ningún dato personal de los compradores o clientes finales de su tienda. El bloque en la tienda solo usa IDs de producto y registra eventos de impresión / clic — no establece cookies de PII y no captura nombre, correo, dirección ni datos de pago del comprador.",
          "La adición al carrito usa el endpoint estándar de Shopify (/cart/add.js); no procesamos el checkout ni el pago.",
        ],
      },
      {
        heading: "4. Permisos (scopes)",
        body: [
          "La App solicita únicamente el scope read_products (lectura de productos). No solicita acceso de escritura a productos, pedidos o clientes.",
        ],
      },
      {
        heading: "5. Cómo usamos la información",
        body: [
          "Para operar la App: autenticar con Shopify, leer sus productos y mostrar el bloque de compra-junto en su tienda.",
          "Para medir el rendimiento: agregar métricas de impresión / clic para que pueda ver cómo rinden las relaciones (sin identificadores del comprador).",
          "Para brindar soporte: responder a sus mensajes y gestionar los archivos adjuntos que envíe.",
          "Para recordar sus preferencias: como el idioma del panel de administración.",
        ],
      },
      {
        heading: "6. Alojamiento y sub-procesadores",
        body: [
          "La App está alojada en nuestro propio servidor (VPS) con una base de datos local (SQLite). Nos integramos con las APIs de Shopify. No usamos proveedores de analítica de terceros y no vendemos ni compartimos sus datos con anunciantes.",
          "Los datos se transmiten por conexiones cifradas. Los webhooks recibidos de Shopify se verifican mediante firma HMAC, y los archivos adjuntos se sirven únicamente a través de rutas autenticadas.",
        ],
      },
      {
        heading: "7. Conservación y eliminación de datos",
        body: [
          "Sus datos existen mientras la App esté instalada. Al desinstalar la App, Shopify envía el webhook shop/redact (aproximadamente 48 horas después de la desinstalación), y eliminamos todos los datos asociados a su tienda.",
          "También respondemos a los webhooks obligatorios de cumplimiento de Shopify: customers/data_request (no tenemos datos de cliente para devolver), customers/redact (no tenemos datos de cliente para borrar) y shop/redact (borramos todos los datos de la tienda).",
        ],
      },
      {
        heading: "8. Sus derechos (GDPR / LGPD)",
        body: [
          "Según su jurisdicción, puede tener derecho de acceso, rectificación o eliminación de sus datos, entre otros. Puede ejercer la eliminación desinstalando la App y/o contactándonos en " +
            CONTACT_EMAIL +
            ".",
        ],
      },
      {
        heading: "9. Cuentas del equipo interno",
        body: [
          "Mantenemos cuentas para nuestro propio equipo interno de soporte (correo, nombre, hash de contraseña). Son cuentas de nuestro personal y no son datos del comerciante ni del comprador.",
        ],
      },
      {
        heading: "10. Cambios en esta Política",
        body: [
          "Podemos actualizar esta Política periódicamente. Los cambios relevantes se reflejarán actualizando la fecha de “Última actualización” en la parte superior de esta página.",
        ],
      },
      {
        heading: "11. Contacto",
        body: ["Para cualquier duda sobre esta Política, contáctenos en " + CONTACT_EMAIL + "."],
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
  langActive: {
    fontWeight: 600,
    color: "#0b5cff",
    textDecoration: "none",
  },
  langLink: { color: "#52606d", textDecoration: "none" },
  h1: { fontSize: 30, lineHeight: 1.25, margin: "0 0 8px" },
  updated: { color: "#7b8794", fontSize: 14, margin: "0 0 24px" },
  h2: { fontSize: 20, lineHeight: 1.3, margin: "36px 0 8px" },
  p: { margin: "0 0 14px" },
};

export default function LegalPrivacy() {
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

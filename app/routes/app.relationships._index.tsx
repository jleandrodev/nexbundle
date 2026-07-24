/**
 * Lista de componentes Buy Together, com produto, toggle ON/OFF e excluir inline.
 */
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate, useFetcher } from "@remix-run/react";
import {
  Page,
  Card,
  IndexTable,
  Text,
  Badge,
  Button,
  Thumbnail,
  InlineStack,
  BlockStack,
  EmptyState,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import {
  listRelationships,
  setRelationshipEnabled,
  deleteRelationship,
} from "../services/relationships.server";
import { enrichProducts } from "../services/products.server";
import { TEMPLATES } from "../lib/templates";

const TEMPLATE_NAME: Record<string, string> = Object.fromEntries(
  TEMPLATES.map((t) => [t.id, t.name]),
);

function shortId(gid: string) {
  const m = gid.match(/(\d+)$/);
  return m ? `#${m[1]}` : gid;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);
  const rels = await listRelationships(session.shop);
  const enriched = await enrichProducts(
    admin,
    rels.map((r) => ({ productId: r.mainProductId })),
  );
  const byId = new Map(enriched.map((e) => [e.productId, e]));
  return json({
    relationships: rels.map((r) => {
      const e = byId.get(r.mainProductId);
      return {
        id: r.id,
        name: r.name || e?.title || shortId(r.mainProductId),
        title: e?.title || shortId(r.mainProductId),
        image: e?.image || null,
        companions: r.companions.length,
        template: TEMPLATE_NAME[r.template] || r.template,
        direction: r.direction,
        enabled: r.enabled,
      };
    }),
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = form.get("intent");
  const id = String(form.get("id") || "");
  if (intent === "toggle") {
    await setRelationshipEnabled(session.shop, id, String(form.get("enabled")) === "1");
  } else if (intent === "delete") {
    await deleteRelationship(session.shop, id);
  }
  return json({ ok: true });
}

type Rel = ReturnType<typeof useLoaderData<typeof loader>>["relationships"][number];

function Row({ r, index }: { r: Rel; index: number }) {
  const navigate = useNavigate();
  const toggle = useFetcher();
  const del = useFetcher();

  const enabled = toggle.formData
    ? toggle.formData.get("enabled") === "1"
    : r.enabled;
  const deleting = del.state !== "idle";

  return (
    <IndexTable.Row
      id={r.id}
      key={r.id}
      position={index}
      onClick={() => navigate(`/app/relationships/${r.id}`)}
      tone={deleting ? "subdued" : undefined}
    >
      <IndexTable.Cell>
        <InlineStack gap="300" blockAlign="center" wrap={false}>
          <Thumbnail source={r.image || ""} alt={r.title} size="small" />
          <BlockStack gap="0">
            <Text as="span" fontWeight="semibold">
              {r.name}
            </Text>
            <Text as="span" tone="subdued" variant="bodySm">
              {r.title}
            </Text>
          </BlockStack>
        </InlineStack>
      </IndexTable.Cell>
      <IndexTable.Cell>{r.companions}</IndexTable.Cell>
      <IndexTable.Cell>{r.template}</IndexTable.Cell>
      <IndexTable.Cell>
        {r.direction === "bi" ? "Bidirecional" : "Unidirecional"}
      </IndexTable.Cell>
      <IndexTable.Cell>
        {enabled ? <Badge tone="success">Ativo</Badge> : <Badge>Inativo</Badge>}
      </IndexTable.Cell>
      <IndexTable.Cell>
        <div onClick={(e) => e.stopPropagation()}>
          <InlineStack gap="200" wrap={false}>
            <toggle.Form method="post">
              <input type="hidden" name="intent" value="toggle" />
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="enabled" value={enabled ? "0" : "1"} />
              <Button submit size="slim" variant="tertiary">
                {enabled ? "Desativar" : "Ativar"}
              </Button>
            </toggle.Form>
            <del.Form
              method="post"
              onSubmit={(e) => {
                if (!confirm("Excluir este componente?")) e.preventDefault();
              }}
            >
              <input type="hidden" name="intent" value="delete" />
              <input type="hidden" name="id" value={r.id} />
              <Button submit size="slim" variant="tertiary" tone="critical">
                Excluir
              </Button>
            </del.Form>
          </InlineStack>
        </div>
      </IndexTable.Cell>
    </IndexTable.Row>
  );
}

export default function RelationshipsList() {
  const { relationships } = useLoaderData<typeof loader>();
  const resourceName = { singular: "componente", plural: "componentes" };

  return (
    <Page
      title="Componentes"
      primaryAction={{ content: "Criar componente", url: "/app/relationships/new" }}
      backAction={{ content: "Painel", url: "/app" }}
    >
      <Card padding="0">
        {relationships.length === 0 ? (
          <EmptyState
            heading="Nenhum componente ainda"
            action={{ content: "Criar componente", url: "/app/relationships/new" }}
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>Vincule um produto principal a produtos que combinam para comprar junto.</p>
          </EmptyState>
        ) : (
          <IndexTable
            resourceName={resourceName}
            itemCount={relationships.length}
            selectable={false}
            headings={[
              { title: "Componente" },
              { title: "Companheiros" },
              { title: "Template" },
              { title: "Direção" },
              { title: "Status" },
              { title: "Ações" },
            ]}
          >
            {relationships.map((r, index) => (
              <Row key={r.id} r={r} index={index} />
            ))}
          </IndexTable>
        )}
      </Card>
    </Page>
  );
}

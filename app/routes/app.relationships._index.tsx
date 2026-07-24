/**
 * Lista de relacionamentos Buy Together.
 */
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Card,
  IndexTable,
  Text,
  Badge,
  EmptyState,
  useIndexResourceState,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { listRelationships } from "../services/relationships.server";
import { TEMPLATES } from "../lib/templates";

const TEMPLATE_NAME: Record<string, string> = Object.fromEntries(
  TEMPLATES.map((t) => [t.id, t.name]),
);

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const rels = await listRelationships(session.shop);
  return json({
    relationships: rels.map((r) => ({
      id: r.id,
      mainProductId: r.mainProductId,
      companions: r.companions.length,
      template: TEMPLATE_NAME[r.template] || r.template,
      direction: r.direction,
      enabled: r.enabled,
    })),
  });
}

function shortId(gid: string) {
  const m = gid.match(/(\d+)$/);
  return m ? `#${m[1]}` : gid;
}

export default function RelationshipsList() {
  const { relationships } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const resourceName = { singular: "relacionamento", plural: "relacionamentos" };
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(relationships as unknown as { [key: string]: unknown }[]);

  return (
    <Page
      title="Relacionamentos"
      primaryAction={{ content: "Novo relacionamento", url: "/app/relationships/new" }}
      backAction={{ content: "Dashboard", url: "/app" }}
    >
      <Card padding="0">
        {relationships.length === 0 ? (
          <EmptyState
            heading="Nenhum relacionamento ainda"
            action={{ content: "Novo relacionamento", url: "/app/relationships/new" }}
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>Vincule um produto principal a produtos que combinam para comprar junto.</p>
          </EmptyState>
        ) : (
          <IndexTable
            resourceName={resourceName}
            itemCount={relationships.length}
            selectedItemsCount={
              allResourcesSelected ? "All" : selectedResources.length
            }
            onSelectionChange={handleSelectionChange}
            selectable={false}
            headings={[
              { title: "Produto principal" },
              { title: "Companheiros" },
              { title: "Template" },
              { title: "Direção" },
              { title: "Status" },
            ]}
          >
            {relationships.map((r, index) => (
              <IndexTable.Row
                id={r.id}
                key={r.id}
                position={index}
                onClick={() => navigate(`/app/relationships/${r.id}`)}
              >
                <IndexTable.Cell>
                  <Text as="span" fontWeight="medium">
                    {shortId(r.mainProductId)}
                  </Text>
                </IndexTable.Cell>
                <IndexTable.Cell>{r.companions}</IndexTable.Cell>
                <IndexTable.Cell>{r.template}</IndexTable.Cell>
                <IndexTable.Cell>
                  {r.direction === "bi" ? "Bidirecional" : "Unidirecional"}
                </IndexTable.Cell>
                <IndexTable.Cell>
                  {r.enabled ? (
                    <Badge tone="success">Ativo</Badge>
                  ) : (
                    <Badge>Inativo</Badge>
                  )}
                </IndexTable.Cell>
              </IndexTable.Row>
            ))}
          </IndexTable>
        )}
      </Card>
    </Page>
  );
}

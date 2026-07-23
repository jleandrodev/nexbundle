/**
 * App Proxy — POST /apps/buy-together/events
 * Recebe { type, mainProductId, companionProductId?, layout } do storefront (sendBeacon).
 * Gravação de métrica NUNCA derruba a resposta (try/catch).
 */
import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { recordEvent } from "../services/metrics.server";

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.public.appProxy(request);
  if (!session) return json({ ok: false });

  try {
    const body = (await request.json()) as {
      type?: string;
      mainProductId?: string;
      companionProductId?: string | null;
      layout?: string | null;
    };
    if (body?.type === "impression" || body?.type === "click") {
      await recordEvent(session.shop, {
        type: body.type,
        mainProductId: String(body.mainProductId || ""),
        companionProductId: body.companionProductId ?? null,
        layout: body.layout ?? null,
      });
    }
  } catch (e) {
    // silencioso: métrica não pode quebrar o storefront
  }
  return json({ ok: true });
}

// sendBeacon faz POST; um GET acidental não deve dar 405 ruidoso.
export async function loader() {
  return json({ ok: true });
}

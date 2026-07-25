/**
 * Conversa da equipe com uma loja. Poll ~5s (revalidator). Responder + anexar.
 * Anexos: imagens inline via /support/files/:id (cookie de staff é enviado no <img>).
 */
import { useEffect, useRef, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useRevalidator, useSubmit } from "@remix-run/react";
import { Page, Card } from "@shopify/polaris";
import { requireStaff } from "../support-auth.server";
import {
  listMessages,
  postMessage,
  markRead,
  closeTicket,
} from "../services/support.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  await requireStaff(request);
  const shop = params.shop!;
  await markRead(shop, "staff");
  const messages = await listMessages(shop);
  return json({
    shop,
    messages: messages.map((m) => ({
      id: m.id,
      sender: m.sender,
      automated: m.automated,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      attachments: m.attachments,
    })),
  });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const staff = await requireStaff(request);
  const shop = params.shop!;
  const form = await request.formData();

  if (form.get("intent") === "close") {
    await closeTicket(shop);
    return json({ ok: true, closed: true });
  }

  const body = String(form.get("body") || "").trim();
  const attachmentIds = String(form.get("attachmentIds") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!body && attachmentIds.length === 0) {
    return json({ error: "Mensagem vazia." }, { status: 400 });
  }
  await postMessage({
    shop,
    sender: "staff",
    staffUserId: staff.id,
    body: body || "(anexo)",
    attachmentIds,
  });
  return json({ ok: true });
}

const BRAND = "#5C6AC4";

export default function SupportConversation() {
  const { shop, messages } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const submit = useSubmit();
  const [text, setText] = useState("");
  const [pending, setPending] = useState<{ id: string; name: string; mime: string }[]>([]);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => revalidator.revalidate(), 5000);
    return () => clearInterval(t);
  }, [revalidator]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("shop", shop);
      const r = await fetch("/support/upload", { method: "POST", body: fd });
      const a = await r.json();
      if (r.ok) setPending((p) => [...p, a]);
      else alert(a.error || "Falha no upload");
    }
    e.target.value = "";
  };

  const send = async () => {
    if (!text.trim() && pending.length === 0) return;
    setSending(true);
    const fd = new FormData();
    fd.append("body", text);
    fd.append("attachmentIds", pending.map((p) => p.id).join(","));
    const r = await fetch(`/support/${encodeURIComponent(shop)}`, { method: "POST", body: fd });
    setSending(false);
    if (r.ok) {
      setText("");
      setPending([]);
      revalidator.revalidate();
    }
  };

  const closeTicket = () => {
    if (
      confirm(
        "Encerrar este ticket? A conversa atual é limpa (as mensagens ficam salvas) e o lojista recebe a mensagem automática de novo no próximo contato.",
      )
    ) {
      submit({ intent: "close" }, { method: "post" });
    }
  };

  return (
    <Page
      title={shop}
      backAction={{ content: "Conversas", url: "/support" }}
      secondaryActions={
        messages.length
          ? [{ content: "Encerrar ticket", destructive: true, onAction: closeTicket }]
          : undefined
      }
    >
      <Card padding="0">
        <div ref={listRef} style={{ height: 480, overflowY: "auto", padding: 16, background: "#F7F7FB" }}>
          {messages.length === 0 ? (
            <p style={{ color: "#8A8A99", textAlign: "center", marginTop: 40 }}>Sem mensagens ainda.</p>
          ) : (
            messages.map((m) => {
              const mine = m.sender === "staff";
              return (
                <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginBottom: 10 }}>
                  <div
                    style={{
                      maxWidth: "70%",
                      background: mine ? BRAND : "#fff",
                      color: mine ? "#fff" : "#1a1a1a",
                      border: mine ? "none" : "1px solid #E5E5EF",
                      borderRadius: 12,
                      padding: "8px 12px",
                      fontSize: 14,
                      lineHeight: 1.35,
                      wordBreak: "break-word",
                    }}
                  >
                    {m.body ? <div>{m.body}</div> : null}
                    {m.attachments.map((a) =>
                      a.mime.startsWith("image/") ? (
                        <a key={a.id} href={`/support/files/${a.id}`} target="_blank" rel="noreferrer">
                          <img
                            src={`/support/files/${a.id}`}
                            alt={a.name}
                            style={{ display: "block", marginTop: 6, maxWidth: "100%", borderRadius: 8 }}
                          />
                        </a>
                      ) : (
                        <a
                          key={a.id}
                          href={`/support/files/${a.id}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ display: "block", marginTop: 6, color: mine ? "#fff" : BRAND, fontSize: 12 }}
                        >
                          📎 {a.name}
                        </a>
                      ),
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {pending.length > 0 ? (
          <div style={{ padding: "6px 12px", display: "flex", gap: 6, flexWrap: "wrap", borderTop: "1px solid #EEE" }}>
            {pending.map((p) => (
              <span key={p.id} style={{ fontSize: 12, background: "#EEF0FB", color: BRAND, borderRadius: 6, padding: "3px 8px" }}>
                📎 {p.name}
              </span>
            ))}
          </div>
        ) : null}

        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 12, borderTop: "1px solid #EEE" }}>
          <label style={{ cursor: "pointer", fontSize: 20 }} title="Anexar">
            📎
            <input type="file" multiple onChange={onFiles} style={{ display: "none" }} accept="image/*,application/pdf" />
          </label>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Escreva uma resposta..."
            style={{ flex: 1, border: "1px solid #DDD", borderRadius: 20, padding: "10px 14px", fontSize: 14, outline: "none" }}
          />
          <button
            type="button"
            onClick={send}
            disabled={sending}
            style={{ background: BRAND, color: "#fff", border: "none", borderRadius: 20, padding: "10px 18px", fontWeight: 600, cursor: "pointer", opacity: sending ? 0.6 : 1 }}
          >
            Enviar
          </button>
        </div>
      </Card>
    </Page>
  );
}

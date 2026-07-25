/**
 * Widget de chat de suporte do LOJISTA (canto inferior direito do painel embedded).
 * Fala com /chat, /chat-upload, /chat-file/:id via fetch (o App Bridge injeta o
 * session token). Polling: 5s aberto / 20s fechado (badge). Anexos são baixados
 * via fetch (com token) e abertos como blob — <img src> não carregaria o token.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

type Attachment = { id: string; name: string; mime: string; size: number };
type Message = {
  id: string;
  sender: "merchant" | "staff";
  body: string;
  createdAt: string;
  attachments: Attachment[];
};

const BRAND = "#5C6AC4";

export default function SupportChat() {
  const { t } = useTranslation("support");
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unread, setUnread] = useState(0);
  const [text, setText] = useState("");
  const [pending, setPending] = useState<Attachment[]>([]);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    try {
      const r = await fetch("/chat", { headers: { Accept: "application/json" } });
      if (!r.ok) return;
      const d = await r.json();
      setMessages(d.messages || []);
      setUnread(0);
    } catch {}
  }, []);

  const peek = useCallback(async () => {
    try {
      const r = await fetch("/chat?peek=1", { headers: { Accept: "application/json" } });
      if (!r.ok) return;
      const d = await r.json();
      setUnread(d.unread || 0);
    } catch {}
  }, []);

  useEffect(() => {
    if (open) {
      loadMessages();
      const t = setInterval(loadMessages, 5000);
      return () => clearInterval(t);
    }
    peek();
    const t = setInterval(peek, 20000);
    return () => clearInterval(t);
  }, [open, loadMessages, peek]);

  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      const fd = new FormData();
      fd.append("file", f);
      try {
        const r = await fetch("/chat-upload", { method: "POST", body: fd });
        const a = await r.json();
        if (r.ok) setPending((p) => [...p, a]);
        else alert(a.error || t("uploadFailed"));
      } catch {
        alert(t("uploadFailed"));
      }
    }
    e.target.value = "";
  };

  const send = async () => {
    if (!text.trim() && pending.length === 0) return;
    setSending(true);
    const fd = new FormData();
    fd.append("body", text);
    fd.append("attachmentIds", pending.map((p) => p.id).join(","));
    try {
      const r = await fetch("/chat", { method: "POST", body: fd });
      if (r.ok) {
        setText("");
        setPending([]);
        await loadMessages();
      }
    } finally {
      setSending(false);
    }
  };

  const openAttachment = async (id: string) => {
    try {
      const r = await fetch("/chat-file/" + id);
      if (!r.ok) return;
      const blob = await r.blob();
      window.open(URL.createObjectURL(blob), "_blank");
    } catch {}
  };

  return (
    <>
      {/* Botão flutuante */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("ariaLabel")}
        style={{
          position: "fixed",
          right: 20,
          bottom: 20,
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: "none",
          background: BRAND,
          color: "#fff",
          fontSize: 24,
          cursor: "pointer",
          boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
          zIndex: 2147483000,
        }}
      >
        {open ? "×" : "💬"}
        {!open && unread > 0 ? (
          <span
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              background: "#E03131",
              color: "#fff",
              borderRadius: 999,
              minWidth: 20,
              height: 20,
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 5px",
            }}
          >
            {unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          style={{
            position: "fixed",
            right: 20,
            bottom: 88,
            width: 360,
            maxWidth: "calc(100vw - 40px)",
            height: 520,
            maxHeight: "calc(100vh - 120px)",
            background: "#fff",
            borderRadius: 14,
            boxShadow: "0 12px 40px rgba(0,0,0,0.28)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 2147483000,
            fontFamily: "inherit",
          }}
        >
          <div style={{ background: BRAND, color: "#fff", padding: "14px 16px" }}>
            <div style={{ fontWeight: 700 }}>{t("headerTitle")}</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>{t("subtitle")}</div>
          </div>

          <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: 14, background: "#F7F7FB" }}>
            {messages.length === 0 ? (
              <p style={{ color: "#8A8A99", fontSize: 13, textAlign: "center", marginTop: 24 }}>
                {t("emptyState")}
              </p>
            ) : (
              messages.map((m) => {
                const mine = m.sender === "merchant";
                return (
                  <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginBottom: 10 }}>
                    <div
                      style={{
                        maxWidth: "78%",
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
                      {m.attachments.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => openAttachment(a.id)}
                          style={{
                            display: "block",
                            marginTop: 6,
                            background: mine ? "rgba(255,255,255,0.18)" : "#F0F0F7",
                            color: mine ? "#fff" : BRAND,
                            border: "none",
                            borderRadius: 8,
                            padding: "6px 8px",
                            fontSize: 12,
                            cursor: "pointer",
                            textAlign: "left",
                            width: "100%",
                          }}
                        >
                          📎 {a.name}
                        </button>
                      ))}
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

          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 10, borderTop: "1px solid #EEE" }}>
            <label style={{ cursor: "pointer", fontSize: 20, padding: "0 4px" }} title={t("attach")}>
              📎
              <input type="file" multiple onChange={onFiles} style={{ display: "none" }} accept="image/*,application/pdf" />
            </label>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={t("inputPlaceholder")}
              style={{ flex: 1, border: "1px solid #DDD", borderRadius: 20, padding: "8px 14px", fontSize: 14, outline: "none" }}
            />
            <button
              type="button"
              onClick={send}
              disabled={sending}
              style={{ background: BRAND, color: "#fff", border: "none", borderRadius: 20, padding: "8px 16px", fontWeight: 600, cursor: "pointer", opacity: sending ? 0.6 : 1 }}
            >
              {t("send")}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

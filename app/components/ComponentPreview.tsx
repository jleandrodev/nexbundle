/**
 * Preview React dos templates do componente (espelha o storefront).
 * Usado no editor para dar destaque ao estilo. Recebe o template, o estilo e
 * (opcional) os produtos escolhidos; usa amostras quando não há produtos.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ComponentStyle, TemplateId } from "../lib/templates";

export type PreviewProduct = {
  title: string;
  image?: string | null;
  price?: string; // já formatado (ex.: "R$ 99,90")
};

function Thumb({ src }: { src?: string | null }) {
  return (
    <div
      style={{
        width: "100%",
        aspectRatio: "1 / 1",
        borderRadius: 8,
        background: src ? `center/cover no-repeat url(${src})` : "rgba(0,0,0,0.06)",
      }}
    />
  );
}
function ThumbSm({ src }: { src?: string | null }) {
  return (
    <div
      style={{
        width: 48,
        height: 48,
        flex: "0 0 auto",
        borderRadius: 8,
        background: src ? `center/cover no-repeat url(${src})` : "rgba(0,0,0,0.06)",
      }}
    />
  );
}

function AddButton({ s, label }: { s: ComponentStyle; label?: string }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "100%",
        border: "none",
        borderRadius: 10,
        padding: "12px 16px",
        fontWeight: 600,
        fontSize: 14,
        cursor: "pointer",
        color: s.buttonTextColor,
        background: hover ? s.buttonHoverColor : s.buttonColor,
        transition: "background 0.15s ease",
      }}
    >
      {label || s.addButtonText}
    </button>
  );
}

export default function ComponentPreview({
  template,
  style: s,
  main,
  companions,
}: {
  template: TemplateId;
  style: ComponentStyle;
  main?: PreviewProduct | null;
  companions?: PreviewProduct[];
}) {
  const { t } = useTranslation("relationships");

  const SAMPLE_MAIN: PreviewProduct = {
    title: t("preview.mainSample"),
    price: "R$ 199,90",
  };
  const SAMPLE_COMPANIONS: PreviewProduct[] = [
    { title: t("preview.companionSample"), price: "R$ 89,90" },
    { title: t("preview.companionSample2"), price: "R$ 59,90" },
  ];

  const mainP = main && main.title ? main : SAMPLE_MAIN;
  const comps =
    companions && companions.length ? companions : SAMPLE_COMPANIONS;
  const comp = comps[0];

  const border = s.cardBorder ? "1px solid rgba(0,0,0,0.12)" : "none";
  const section: React.CSSProperties = {
    background: s.backgroundColor,
    color: s.textColor,
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 14,
    padding: 20,
    fontSize: 14,
  };
  const title = s.showTitle ? (
    <p
      style={{
        margin: "0 0 16px",
        color: s.titleColor,
        fontWeight: 700,
        fontSize: s.titleSize,
      }}
    >
      {s.titleText}
    </p>
  ) : null;
  const card: React.CSSProperties = {
    border,
    borderRadius: 12,
    padding: 12,
    background: s.backgroundColor,
  };
  const price: React.CSSProperties = { fontWeight: 700 };

  if (template === "compact") {
    return (
      <div style={section}>
        {title}
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ ...card, flex: "1 1 220px", display: "flex", gap: 12, alignItems: "center" }}>
            <ThumbSm src={comp.image} />
            <div>
              <div>{comp.title}</div>
              <div style={price}>{comp.price}</div>
            </div>
          </div>
          <div style={{ flex: "1 1 180px" }}>
            <AddButton s={s} />
          </div>
        </div>
      </div>
    );
  }

  if (template === "list") {
    const total = "R$ 289,80";
    return (
      <div style={section}>
        {title}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[mainP, ...comps].map((p, i) => (
            <div key={i} style={{ ...card, display: "flex", gap: 12, alignItems: "center" }}>
              <ThumbSm src={p.image} />
              <div style={{ flex: 1 }}>{p.title}</div>
              <div style={price}>{p.price}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 auto" }}>
            <div style={{ opacity: 0.75, fontSize: 13 }}>{t("preview.total")}</div>
            <div style={{ color: s.titleColor, fontWeight: 800, fontSize: 22 }}>{total}</div>
          </div>
          <div style={{ flex: "1 1 220px" }}>
            <AddButton s={s} label={t("preview.addAll")} />
          </div>
        </div>
      </div>
    );
  }

  // side-by-side (default)
  return (
    <div style={section}>
      {title}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.1fr", gap: 16 }}>
        {[mainP, comp].map((p, i) => (
          <div key={i} style={{ ...card, display: "flex", flexDirection: "column", gap: 8 }}>
            <Thumb src={p.image} />
            <div style={{ fontWeight: 500 }}>{p.title}</div>
            <div style={{ ...price, fontSize: 16 }}>{p.price}</div>
          </div>
        ))}
        <div
          style={{
            ...card,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <div style={{ opacity: 0.8, fontSize: 13 }}>{t("preview.totalTwoItems")}</div>
          <div style={{ color: s.titleColor, fontWeight: 800, fontSize: 24 }}>R$ 289,80</div>
          <AddButton s={s} />
        </div>
      </div>
    </div>
  );
}

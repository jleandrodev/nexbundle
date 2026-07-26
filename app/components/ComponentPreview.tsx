/**
 * Preview dos templates do componente no painel.
 *
 * Espelha o storefront de verdade: importa o MESMO CSS da theme app extension
 * (`?raw`) e monta a mesma árvore de classes `bt-*` que o buy-together.js gera.
 * Se o layout mudar lá, muda aqui junto — sem CSS paralelo para divergir.
 *
 * Extras que só existem no painel (o storefront não renderiza):
 *  - tile tracejado "Adicionar mais produtos" (lado a lado)
 *  - link "Ver mais opções" (lista)
 */
import { Fragment, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import storefrontCss from "../../extensions/buy-together-theme/assets/buy-together.css?raw";
import {
  computeTotals,
  type BundleDiscount,
  type ComponentStyle,
  type TemplateId,
} from "../lib/templates";

export type PreviewProduct = {
  title: string;
  image?: string | null;
  price?: number | null; // centavos
  compareAtPrice?: number | null; // centavos
  optionNames?: string[]; // ex.: ["Cor", "Tamanho"]
  optionSample?: Record<string, string>; // valor mostrado no select do preview
};

/* CSS exclusivo do painel: os affordances que não vão para a loja. */
const ADMIN_CSS = `
.bt-preview { container-type: inline-size; }
.bt-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 0 0 120px;
  aspect-ratio: 1 / 1;
  padding: 12px;
  border: 1.5px dashed var(--bt-btn);
  border-radius: var(--bt-radius);
  background: var(--bt-media-bg);
  color: var(--bt-text);
  font-size: 12px;
  text-align: center;
  cursor: pointer;
}
.bt-add:hover { background: rgba(79, 70, 229, 0.1); }
.bt-add__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: var(--bt-btn);
  color: var(--bt-btn-text);
  font-size: 20px;
  line-height: 1;
}
.bt-add-link {
  display: block;
  width: 100%;
  margin: 10px 0 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--bt-text);
  font-size: 13px;
  text-decoration: underline;
  cursor: pointer;
}
`;

const CHECK_SVG = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const CART_SVG = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
  </svg>
);
const TAG_SVG = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
    <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" />
  </svg>
);
const CHEVRON_SVG = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

function Icon({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={`bt-icon${className ? " " + className : ""}`}>{children}</span>;
}

type Line = { product: PreviewProduct; checked: boolean; qty: number };

export default function ComponentPreview({
  template,
  style: s,
  main,
  companions,
  discount,
  currency = "BRL",
  locale,
  onAddProducts,
}: {
  template: TemplateId;
  style: ComponentStyle;
  main?: PreviewProduct | null;
  companions?: PreviewProduct[];
  discount?: BundleDiscount | null;
  currency?: string;
  locale?: string;
  onAddProducts?: () => void;
}) {
  const { t, i18n } = useTranslation("relationships");

  const SAMPLE_MAIN: PreviewProduct = {
    title: t("preview.mainSample"),
    price: 19990,
    optionNames: ["Cor"],
    optionSample: { Cor: t("preview.optionSample") },
  };
  const SAMPLE_COMPANIONS: PreviewProduct[] = [
    { title: t("preview.companionSample"), price: 8990 },
    { title: t("preview.companionSample2"), price: 5990 },
  ];

  const mainP = main && main.title ? main : SAMPLE_MAIN;
  const comps = companions && companions.length ? companions : SAMPLE_COMPANIONS;

  const [lines, setLines] = useState<Line[]>(() =>
    [mainP, ...comps].map((p) => ({ product: p, checked: true, qty: 1 })),
  );

  // Produtos mudam enquanto o lojista edita: refaz as linhas mantendo o padrão (tudo marcado).
  const signature = [mainP, ...comps].map((p) => p.title).join("|");
  const [lastSignature, setLastSignature] = useState(signature);
  if (signature !== lastSignature) {
    setLastSignature(signature);
    setLines([mainP, ...comps].map((p) => ({ product: p, checked: true, qty: 1 })));
  }

  const money = useMemo(() => {
    const fmt = new Intl.NumberFormat(locale || i18n.language || "pt-BR", {
      style: "currency",
      currency: currency || "BRL",
    });
    return (cents: number) => fmt.format((cents || 0) / 100);
  }, [currency, locale, i18n.language]);

  const selected = lines.filter((l) => l.checked);
  const subtotal = selected.reduce((sum, l) => sum + (l.product.price ?? 0) * l.qty, 0);
  const compareSum = selected.reduce(
    (sum, l) =>
      sum + Math.max(l.product.compareAtPrice ?? 0, l.product.price ?? 0) * l.qty,
    0,
  );
  // O desconto do bundle só vale com 2+ itens — mesma regra do storefront e da Function.
  const totals = computeTotals(subtotal, selected.length >= 2 ? discount : null);
  const compare = Math.max(compareSum, totals.subtotal);
  const savings = Math.max(0, compare - totals.total);
  const percent = compare > 0 ? Math.round((savings / compare) * 100) : 0;

  const cssVars = {
    "--bt-bg": s.backgroundColor,
    "--bt-text": s.textColor,
    "--bt-title": s.titleColor,
    "--bt-title-size": `${s.titleSize}px`,
    "--bt-btn": s.buttonColor,
    "--bt-btn-hover": s.buttonHoverColor,
    "--bt-btn-text": s.buttonTextColor,
    "--bt-card-border": s.cardBorder ? "1px solid var(--bt-border)" : "none",
  } as React.CSSProperties;

  const toggle = (i: number) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, checked: !l.checked } : l)));
  const setQty = (i: number, delta: number) =>
    setLines((prev) =>
      prev.map((l, idx) =>
        idx === i ? { ...l, qty: Math.min(99, Math.max(1, l.qty + delta)) } : l,
      ),
    );

  function Media({ line, index }: { line: Line; index: number }) {
    return (
      <div className="bt-item__media">
        <label className="bt-check">
          <input
            type="checkbox"
            className="bt-check__input"
            checked={line.checked}
            onChange={() => toggle(index)}
            aria-label={line.product.title}
          />
          <span className="bt-check__box">
            <Icon>{CHECK_SVG}</Icon>
          </span>
        </label>
        {line.product.image ? (
          <img className="bt-item__img" src={line.product.image} alt={line.product.title} />
        ) : (
          <div className="bt-item__img" aria-hidden="true" />
        )}
      </div>
    );
  }

  function Options({ product }: { product: PreviewProduct }) {
    const names = product.optionNames || [];
    if (!names.length || !s.showVariantPicker) return null;
    return (
      <div className="bt-item__options">
        {names.map((name) => (
          <div className="bt-select" key={name}>
            <select className="bt-select__input" defaultValue="only" aria-label={name}>
              <option value="only">
                {name}: {product.optionSample?.[name] || t("preview.optionSample")}
              </option>
            </select>
            <Icon className="bt-select__caret">{CHEVRON_SVG}</Icon>
          </div>
        ))}
      </div>
    );
  }

  function Qty({ line, index }: { line: Line; index: number }) {
    if (!s.showQuantity) return null;
    return (
      <div className="bt-qty">
        <button
          type="button"
          className="bt-qty__btn"
          onClick={() => setQty(index, -1)}
          disabled={line.qty <= 1}
          aria-label="-"
        >
          −
        </button>
        <span className="bt-qty__value">{line.qty}</span>
        <button type="button" className="bt-qty__btn" onClick={() => setQty(index, 1)} aria-label="+">
          +
        </button>
      </div>
    );
  }

  function Prices({ product }: { product: PreviewProduct }) {
    const price = product.price ?? 0;
    const hasCompare = (product.compareAtPrice ?? 0) > price;
    return (
      <div className="bt-item__prices">
        <span className="bt-item__price">{money(price)}</span>
        {hasCompare ? <s className="bt-item__compare">{money(product.compareAtPrice!)}</s> : null}
      </div>
    );
  }

  function Card({ line, index }: { line: Line; index: number }) {
    return (
      <article className={`bt-item bt-item--card${line.checked ? "" : " is-unselected"}`}>
        <Media line={line} index={index} />
        <div className="bt-item__body">
          <p className="bt-item__name">{line.product.title}</p>
          <Prices product={line.product} />
          <Options product={line.product} />
          <Qty line={line} index={index} />
        </div>
      </article>
    );
  }

  function Row({ line, index }: { line: Line; index: number }) {
    return (
      <article className={`bt-item bt-item--row${line.checked ? "" : " is-unselected"}`}>
        <Media line={line} index={index} />
        <div className="bt-item__body">
          <p className="bt-item__name">{line.product.title}</p>
          <Prices product={line.product} />
          <Options product={line.product} />
        </div>
        <Qty line={line} index={index} />
      </article>
    );
  }

  function Summary({ variant }: { variant: "aside" | "footer" }) {
    return (
      <div className={`bt-summary bt-summary--${variant}`}>
        <div className="bt-summary__head">
          <span className="bt-summary__label">{t("preview.totalPrice")}</span>
          <div className="bt-summary__prices">
            {compare > totals.total ? <s className="bt-summary__compare">{money(compare)}</s> : null}
            <strong className="bt-summary__total">{money(totals.total)}</strong>
            {percent > 0 ? <span className="bt-badge">-{percent}%</span> : null}
          </div>
        </div>
        {savings > 0 ? (
          <p className="bt-summary__save">
            <Icon className="bt-summary__save-icon">{TAG_SVG}</Icon>
            <span>{t("preview.youSave", { amount: money(savings), percent })}</span>
          </p>
        ) : null}
        <div className="bt-actions">
          <button type="button" className="bt-btn bt-btn--primary" disabled={!selected.length}>
            <Icon>{CART_SVG}</Icon>
            <span>{s.addButtonText || t("preview.addAll")}</span>
          </button>
          {s.showBuyNow ? (
            <button type="button" className="bt-btn bt-btn--secondary" disabled={!selected.length}>
              <Icon>{TAG_SVG}</Icon>
              <span>{s.buyNowText || t("preview.buyNow")}</span>
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const title = s.showTitle && s.titleText ? <h3 className="bt-title">{s.titleText}</h3> : null;

  return (
    <div className="bt-preview">
      <style dangerouslySetInnerHTML={{ __html: storefrontCss + ADMIN_CSS }} />
      <div className={`bt-root bt-root--${template}`} style={cssVars}>
        {title}

        {template === "side-by-side" ? (
          <div className="bt-sbs">
            <div className="bt-sbs__items">
              {lines.map((line, i) => (
                <Fragment key={i}>
                  {i > 0 ? <span className="bt-plus">+</span> : null}
                  <Card line={line} index={i} />
                </Fragment>
              ))}
              {onAddProducts ? (
                <button type="button" className="bt-add" onClick={onAddProducts}>
                  <span className="bt-add__icon">+</span>
                  <span>{t("preview.addMore")}</span>
                </button>
              ) : null}
            </div>
            <Summary variant="aside" />
          </div>
        ) : null}

        {template === "list" ? (
          <>
            <div className="bt-list">
              {lines.map((line, i) => (
                <Fragment key={i}>
                  {i > 0 ? <span className="bt-plus">+</span> : null}
                  <Row line={line} index={i} />
                </Fragment>
              ))}
            </div>
            {onAddProducts ? (
              <button type="button" className="bt-add-link" onClick={onAddProducts}>
                {t("preview.viewMoreOptions")}
              </button>
            ) : null}
            <Summary variant="footer" />
          </>
        ) : null}

        {template === "compact" ? (
          <>
            <div className="bt-compact">
              {lines.slice(1).map((line, i) => (
                <Fragment key={i}>
                  {i > 0 ? <span className="bt-plus">+</span> : null}
                  <Row line={line} index={i + 1} />
                </Fragment>
              ))}
            </div>
            <Summary variant="footer" />
          </>
        ) : null}
      </div>
    </div>
  );
}

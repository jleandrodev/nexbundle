/* Buy Together — storefront. Template + estilo vêm do App Proxy (por relacionamento). */
(function () {
  "use strict";
  var PROXY = "/apps/buy-together";

  function formatMoney(cents, format) {
    if (typeof cents !== "number") cents = parseInt(cents, 10) || 0;
    var fmt = format || "${{amount}}";
    function d(v, def) { return v == null || v === "" ? def : v; }
    function fwd(n, p, t, dec) {
      p = d(p, 2); t = d(t, ","); dec = d(dec, ".");
      if (isNaN(n) || n == null) return "0";
      n = (n / 100.0).toFixed(p);
      var parts = n.split(".");
      var dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1" + t);
      return dollars + (parts[1] ? dec + parts[1] : "");
    }
    var m = fmt.match(/\{\{\s*(\w+)\s*\}\}/), v;
    switch (m ? m[1] : "amount") {
      case "amount_no_decimals": v = fwd(cents, 0); break;
      case "amount_with_comma_separator": v = fwd(cents, 2, ".", ","); break;
      case "amount_no_decimals_with_comma_separator": v = fwd(cents, 0, ".", ","); break;
      case "amount_with_space_separator": v = fwd(cents, 2, " ", ","); break;
      default: v = fwd(cents, 2);
    }
    return fmt.replace(/\{\{\s*\w+\s*\}\}/, v);
  }

  // Strings traduzidas injetadas pelo Liquid via data-bt-i18n-* (seguem o locale da loja).
  function i18n(root, key, fallback) {
    var v = root.getAttribute("data-bt-i18n-" + key);
    return v != null && v !== "" ? v : fallback;
  }

  function el(tag, cls, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }

  function applyStyle(root, s) {
    if (!s) return;
    function set(k, v) { if (v != null && v !== "") root.style.setProperty(k, v); }
    set("--bt-bg", s.backgroundColor);
    set("--bt-text", s.textColor);
    set("--bt-title", s.titleColor);
    set("--bt-title-size", (s.titleSize || 18) + "px");
    set("--bt-btn", s.buttonColor);
    set("--bt-btn-hover", s.buttonHoverColor);
    set("--bt-btn-text", s.buttonTextColor);
    root.style.setProperty("--bt-card-border", s.cardBorder ? "1px solid var(--bt-border)" : "none");
  }

  function sendEvent(p) {
    try {
      var body = JSON.stringify(p);
      if (navigator.sendBeacon) navigator.sendBeacon(PROXY + "/events", new Blob([body], { type: "application/json" }));
      else fetch(PROXY + "/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: body, keepalive: true }).catch(function () {});
    } catch (e) {}
  }

  function observeImpression(root, ctx) {
    var fired = false;
    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!fired && e.isIntersecting && e.intersectionRatio >= 0.5) {
          fired = true; io.disconnect();
          sendEvent({ type: "impression", mainProductId: ctx.mainProductId, companionProductId: ctx.companionProductId, layout: ctx.template });
        }
      });
    }, { threshold: [0.5] });
    io.observe(root);
  }

  function addToCart(root, ctx, companionVariantIds) {
    var mainVariantId = root.getAttribute("data-bt-variant-id");
    var items = [];
    if (mainVariantId) items.push({ id: Number(mainVariantId), quantity: 1 });
    (companionVariantIds || []).forEach(function (v) { if (v) items.push({ id: Number(v), quantity: 1 }); });
    if (items.length < 2) return;
    fetch("/cart/add.js", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: items }) })
      .then(function (r) { return r.json(); })
      .then(function () {
        sendEvent({ type: "click", mainProductId: ctx.mainProductId, companionProductId: ctx.companionProductId, layout: ctx.template });
        window.location.href = "/cart";
      })
      .catch(function () { window.location.href = "/cart"; });
  }

  function addButton(s, root, ctx, variantIds, label) {
    var b = el("button", "bt-btn", { type: "button" });
    b.textContent = label || (s && s.addButtonText) || i18n(root, "add-cart", "Adicionar ao carrinho");
    b.addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      addToCart(root, ctx, variantIds);
    });
    return b;
  }

  function title(root, s) {
    if (!s || !s.showTitle || !s.titleText) return;
    var t = el("h3", "bt-title"); t.textContent = s.titleText; root.appendChild(t);
  }

  function vcard(p, mf) {
    var c = el("div", "bt-vcard");
    var m = el("div", "bt-vcard__media");
    if (p.image) m.appendChild(el("img", "bt-vcard__img", { src: p.image, alt: p.title || "", loading: "lazy" }));
    c.appendChild(m);
    var n = el("p", "bt-vcard__name"); n.textContent = p.title || "";
    var pr = el("span", "bt-vcard__price"); pr.textContent = formatMoney(p.price, mf);
    c.appendChild(n); c.appendChild(pr); return c;
  }
  function rowcard(p, mf) {
    var c = el("div", "bt-card");
    if (p.image) c.appendChild(el("img", "bt-card__img", { src: p.image, alt: p.title || "", loading: "lazy" }));
    var info = el("div", "bt-card__info");
    var n = el("p", "bt-card__name"); n.textContent = p.title || "";
    var pr = el("span", "bt-card__price"); pr.textContent = formatMoney(p.price, mf);
    info.appendChild(n); info.appendChild(pr); c.appendChild(info); return c;
  }
  function summaryBox(label, valueText, btn) {
    var box = el("div", "bt-summary");
    var l = el("span", "bt-summary__label"); l.textContent = label;
    var v = el("div", "bt-summary__value"); v.textContent = valueText;
    box.appendChild(l); box.appendChild(v); box.appendChild(btn); return box;
  }

  function renderSideBySide(root, data, ctx) {
    var mf = root.getAttribute("data-bt-money-format"), s = data.style || {}, comp = ctx.companions[0];
    root.innerHTML = ""; title(root, s);
    var grid = el("div", "bt-grid");
    grid.appendChild(vcard(ctx.mainProduct, mf));
    grid.appendChild(vcard(comp, mf));
    grid.appendChild(summaryBox(i18n(root, "total-two", "Total dos dois itens"), formatMoney(ctx.mainPrice + comp.price, mf), addButton(s, root, ctx, [comp.variantId])));
    root.appendChild(grid);
  }
  function renderCompact(root, data, ctx) {
    var mf = root.getAttribute("data-bt-money-format"), s = data.style || {}, comp = ctx.companions[0];
    root.innerHTML = ""; title(root, s);
    var wrap = el("div", "bt-compact");
    wrap.appendChild(rowcard(comp, mf));
    wrap.appendChild(addButton(s, root, ctx, [comp.variantId]));
    root.appendChild(wrap);
  }
  function renderList(root, data, ctx) {
    var mf = root.getAttribute("data-bt-money-format"), s = data.style || {};
    root.innerHTML = ""; title(root, s);
    var list = el("div", "bt-list");
    list.appendChild(rowcard(ctx.mainProduct, mf));
    var total = ctx.mainPrice, vids = [];
    ctx.companions.forEach(function (c) { list.appendChild(rowcard(c, mf)); total += c.price; vids.push(c.variantId); });
    root.appendChild(list);
    var footer = el("div", "bt-list__footer");
    footer.appendChild(summaryBox(i18n(root, "total", "Total"), formatMoney(total, mf), addButton(s, root, ctx, vids, i18n(root, "add-all", "Adicionar todos ao carrinho"))));
    root.appendChild(footer);
  }

  function initRoot(root) {
    if (root.getAttribute("data-bt-ready") === "1") return;
    root.setAttribute("data-bt-ready", "1");
    var productId = root.getAttribute("data-bt-product-id");
    if (!productId) { root.remove(); return; }
    fetch(PROXY + "/data?product_id=" + encodeURIComponent(productId), { headers: { Accept: "application/json" } })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.enabled || !data.companions || !data.companions.length || !data.companions[0].variantId) { root.remove(); return; }
        var ctx = {
          template: data.template || "side-by-side",
          mainProductId: data.mainProductId || productId,
          companionProductId: data.companions[0].productId,
          companions: data.companions,
          mainProduct: data.mainProduct || { title: "", image: "", price: 0 },
          mainPrice: parseInt(root.getAttribute("data-bt-variant-price"), 10) || (data.mainProduct && data.mainProduct.price) || 0
        };
        applyStyle(root, data.style);
        if (ctx.template === "compact") renderCompact(root, data, ctx);
        else if (ctx.template === "list") renderList(root, data, ctx);
        else renderSideBySide(root, data, ctx);
        root.removeAttribute("hidden");
        observeImpression(root, ctx);
      })
      .catch(function () { root.remove(); });
  }

  function boot() { document.querySelectorAll(".bt-root").forEach(initRoot); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  document.addEventListener("shopify:section:load", boot);
})();

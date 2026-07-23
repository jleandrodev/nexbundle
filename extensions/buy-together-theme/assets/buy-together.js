/* Buy Together — storefront widget. Dados/config via App Proxy; add both via /cart/add.js. */
(function () {
  "use strict";
  var PROXY = "/apps/buy-together";

  function formatMoney(cents, format) {
    if (typeof cents !== "number") cents = parseInt(cents, 10) || 0;
    var fmt = format || "${{amount}}";
    function d(v, def) { return v == null || v === "" ? def : v; }
    function fwd(number, precision, thousands, decimal) {
      precision = d(precision, 2); thousands = d(thousands, ","); decimal = d(decimal, ".");
      if (isNaN(number) || number == null) return "0";
      number = (number / 100.0).toFixed(precision);
      var parts = number.split(".");
      var dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1" + thousands);
      return dollars + (parts[1] ? decimal + parts[1] : "");
    }
    var value = "";
    var match = fmt.match(/\{\{\s*(\w+)\s*\}\}/);
    switch (match ? match[1] : "amount") {
      case "amount_no_decimals": value = fwd(cents, 0); break;
      case "amount_with_comma_separator": value = fwd(cents, 2, ".", ","); break;
      case "amount_no_decimals_with_comma_separator": value = fwd(cents, 0, ".", ","); break;
      case "amount_with_space_separator": value = fwd(cents, 2, " ", ","); break;
      case "amount_no_decimals_with_space_separator": value = fwd(cents, 0, " ", ""); break;
      default: value = fwd(cents, 2);
    }
    return fmt.replace(/\{\{\s*\w+\s*\}\}/, value);
  }

  function el(tag, cls, attrs) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    return node;
  }

  function applyCssVars(root, config) {
    if (!config) return;
    var map = {
      "--bt-bg": config.backgroundColor, "--bt-text": config.textColor,
      "--bt-title": config.titleColor, "--bt-btn": config.buttonColor,
      "--bt-btn-text": config.buttonTextColor,
    };
    Object.keys(map).forEach(function (k) { if (map[k]) root.style.setProperty(k, map[k]); });
  }

  function sendEvent(payload) {
    try {
      var body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        navigator.sendBeacon(PROXY + "/events", new Blob([body], { type: "application/json" }));
      } else {
        fetch(PROXY + "/events", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: body, keepalive: true,
        }).catch(function () {});
      }
    } catch (e) {}
  }

  function observeImpression(root, ctx) {
    var fired = false;
    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!fired && entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          fired = true; io.disconnect();
          sendEvent({ type: "impression", mainProductId: ctx.mainProductId,
            companionProductId: ctx.companionProductId, layout: ctx.layout });
        }
      });
    }, { threshold: [0.5] });
    io.observe(root);
  }

  function addBoth(root, ctx) {
    var btn = root.querySelector(".bt-btn");
    var mainVariantId = root.getAttribute("data-bt-variant-id");
    if (!mainVariantId || !ctx.companionVariantId) return;
    if (btn) btn.setAttribute("disabled", "disabled");
    fetch("/cart/add.js", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [
        { id: Number(mainVariantId), quantity: 1 },
        { id: Number(ctx.companionVariantId), quantity: 1 },
      ] }),
    })
      .then(function (res) { return res.json(); })
      .then(function () {
        sendEvent({ type: "click", mainProductId: ctx.mainProductId,
          companionProductId: ctx.companionProductId, layout: ctx.layout });
        document.dispatchEvent(new CustomEvent("bt:added"));
        document.dispatchEvent(new CustomEvent("cart:refresh", { bubbles: true }));
        if (btn) btn.removeAttribute("disabled");
      })
      .catch(function () {
        if (btn) btn.removeAttribute("disabled");
        window.location.href = "/cart";
      });
  }

  function productCard(p, moneyFormat) {
    var card = el("div", "bt-card");
    if (p.image) card.appendChild(el("img", "bt-card__img", { src: p.image, alt: p.title || "", loading: "lazy" }));
    var info = el("div", "bt-card__info");
    var name = el("p", "bt-card__name"); name.textContent = p.title || "";
    var price = el("span", "bt-card__price"); price.textContent = formatMoney(p.price, moneyFormat);
    info.appendChild(name); info.appendChild(price); card.appendChild(info);
    return card;
  }

  function addButton(config, root, ctx) {
    var btn = el("button", "bt-btn", { type: "button" });
    btn.textContent = config.addButtonText || "Adicionar ambos ao carrinho";
    btn.addEventListener("click", function () { addBoth(root, ctx); });
    return btn;
  }

  function renderTitle(root, config) {
    if (!config.titleText) return;
    var title = el("h3", "bt-title"); title.textContent = config.titleText;
    root.appendChild(title);
  }

  function renderLayoutA(root, data, ctx) {
    var moneyFormat = root.getAttribute("data-bt-money-format");
    var config = data.config || {}, companion = ctx.companion;
    root.innerHTML = "";
    renderTitle(root, config);
    var grid = el("div", "bt-grid");
    grid.appendChild(productCard(ctx.mainProduct, moneyFormat));
    var plus = el("div", "bt-plus"); plus.textContent = "+"; grid.appendChild(plus);
    grid.appendChild(productCard(companion, moneyFormat));
    root.appendChild(grid);
    var total = el("div", "bt-total");
    var left = el("div");
    var label = el("span", "bt-total__label"); label.textContent = "Total dos dois itens";
    var value = el("div", "bt-total__value");
    value.textContent = formatMoney(ctx.mainPrice + companion.price, moneyFormat);
    left.appendChild(label); left.appendChild(value); total.appendChild(left);
    var btn = addButton(config, root, ctx); btn.className = "bt-btn bt-total__cta";
    total.appendChild(btn);
    root.appendChild(total);
  }

  function renderLayoutB(root, data, ctx) {
    var moneyFormat = root.getAttribute("data-bt-money-format");
    var config = data.config || {};
    root.innerHTML = "";
    renderTitle(root, config);
    var wrap = el("div", "bt-compact");
    wrap.appendChild(productCard(ctx.companion, moneyFormat));
    wrap.appendChild(addButton(config, root, ctx));
    root.appendChild(wrap);
  }

  function initRoot(root) {
    if (root.getAttribute("data-bt-ready") === "1") return;
    root.setAttribute("data-bt-ready", "1");
    var productId = root.getAttribute("data-bt-product-id");
    var layout = root.getAttribute("data-bt-layout") || "A";
    if (!productId) { root.remove(); return; }
    fetch(PROXY + "/data?product_id=" + encodeURIComponent(productId), {
      headers: { Accept: "application/json" },
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data || !data.enabled || !data.companions || !data.companions.length) {
          root.remove(); return;
        }
        var companion = data.companions[0];
        if (!companion.variantId) { root.remove(); return; }
        var ctx = {
          layout: layout,
          mainProductId: data.mainProductId || productId,
          companionProductId: companion.productId,
          companionVariantId: companion.variantId,
          companion: companion,
          mainProduct: data.mainProduct || { title: "", image: "", price: 0 },
          mainPrice: parseInt(root.getAttribute("data-bt-variant-price"), 10) ||
            (data.mainProduct && data.mainProduct.price) || 0,
          config: data.config,
        };
        applyCssVars(root, data.config);
        if (layout === "B") renderLayoutB(root, data, ctx);
        else renderLayoutA(root, data, ctx);
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

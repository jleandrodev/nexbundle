/* Buy Together — storefront.
 * Template, estilo, produtos (com variantes) e desconto vêm do App Proxy, por relacionamento.
 * Layouts: side-by-side (vitrine) | list (lista) | compact (faixa enxuta).
 * Cada item tem seleção (checkbox), seletor de variante e quantidade; o total é recalculado
 * no cliente. O desconto do bundle é só EXIBIÇÃO aqui — quem aplica de fato é a Shopify
 * Function (extensions/buy-together-discount), que lê a propriedade de linha _bt_bundle.
 */
(function () {
  "use strict";
  var PROXY = "/apps/buy-together";
  var BUNDLE_PROP = "_bt_bundle"; // property "_" = oculta no carrinho/checkout

  /* ---------------------------------------------------------------- utils */

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

  function text(tag, cls, value) {
    var n = el(tag, cls);
    n.textContent = value == null ? "" : String(value);
    return n;
  }

  // Ícones: markup estático (nenhum dado da loja entra aqui).
  var ICONS = {
    cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>',
    tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5" fill="currentColor"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  };
  function icon(name, cls) {
    var s = el("span", "bt-icon" + (cls ? " " + cls : ""));
    s.innerHTML = ICONS[name] || "";
    return s;
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

  /* ------------------------------------------------------------- variantes */

  function variantById(product, id) {
    var vs = product.variants || [];
    for (var i = 0; i < vs.length; i++) if (String(vs[i].id) === String(id)) return vs[i];
    return null;
  }

  function optionValue(variant, name) {
    var opts = (variant && variant.options) || [];
    for (var i = 0; i < opts.length; i++) if (opts[i].name === name) return opts[i].value;
    return null;
  }

  // Valores distintos de uma opção, na ordem em que aparecem nas variantes.
  function optionValues(product, name) {
    var out = [];
    (product.variants || []).forEach(function (v) {
      var val = optionValue(v, name);
      if (val != null && out.indexOf(val) === -1) out.push(val);
    });
    return out;
  }

  /**
   * Acha a variante para um conjunto de opções. Exato primeiro; se a combinação não
   * existir (produto com grade incompleta), cai para a 1ª variante disponível que
   * tenha o valor recém-alterado — como o seletor nativo do Dawn.
   */
  function matchVariant(product, selected, changedName) {
    var vs = product.variants || [];
    var i, j, ok;
    for (i = 0; i < vs.length; i++) {
      ok = true;
      for (j = 0; j < vs[i].options.length; j++) {
        if (selected[vs[i].options[j].name] !== vs[i].options[j].value) { ok = false; break; }
      }
      if (ok) return vs[i];
    }
    if (changedName) {
      var wanted = selected[changedName];
      for (i = 0; i < vs.length; i++) {
        if (optionValue(vs[i], changedName) === wanted && vs[i].available) return vs[i];
      }
      for (i = 0; i < vs.length; i++) {
        if (optionValue(vs[i], changedName) === wanted) return vs[i];
      }
    }
    return vs[0] || null;
  }

  /* ---------------------------------------------------------------- estado */

  function makeItem(product, isMain) {
    var variant = variantById(product, product.variantId) || (product.variants || [])[0] || null;
    var selected = {};
    ((variant && variant.options) || []).forEach(function (o) { selected[o.name] = o.value; });
    return {
      product: product,
      isMain: !!isMain,
      variant: variant,
      selectedOptions: selected,
      qty: 1,
      checked: !!(variant && variant.available),
      refs: {},
    };
  }

  function itemPrice(item) { return item.variant ? item.variant.price * item.qty : 0; }
  function itemCompare(item) {
    if (!item.variant) return 0;
    var c = item.variant.compareAtPrice;
    return (c && c > item.variant.price ? c : item.variant.price) * item.qty;
  }

  /** Totais: compare (riscado) x total (a pagar) x economia. Espelha lib/templates.ts. */
  function totals(state) {
    var subtotal = 0, compare = 0, count = 0;
    state.items.forEach(function (it) {
      if (!it.checked || !it.variant || !it.variant.available) return;
      subtotal += itemPrice(it);
      compare += itemCompare(it);
      count++;
    });
    var d = state.discount || { type: "none", value: 0 };
    var bundleOff = 0;
    // O desconto do bundle só vale com 2+ itens (é a mesma regra da Shopify Function).
    if (count >= 2 && d.type === "percentage") bundleOff = Math.round((subtotal * d.value) / 100);
    else if (count >= 2 && d.type === "fixed") bundleOff = Math.round(d.value * 100);
    if (bundleOff > subtotal) bundleOff = subtotal;
    var total = subtotal - bundleOff;
    var savings = compare - total;
    if (savings < 0) savings = 0;
    return {
      count: count,
      compare: compare,
      total: total,
      savings: savings,
      percent: compare > 0 ? Math.round((savings / compare) * 100) : 0,
    };
  }

  /* ------------------------------------------------------------ carrinho */

  function selectedLines(state) {
    var lines = [];
    state.items.forEach(function (it) {
      if (!it.checked || !it.variant || !it.variant.available) return;
      var line = { id: Number(it.variant.id), quantity: it.qty };
      lines.push(line);
    });
    return lines;
  }

  function addToCart(state, destination) {
    var lines = selectedLines(state);
    if (!lines.length) return;
    // 2+ itens = bundle: marca as linhas para a Shopify Function aplicar o desconto.
    if (lines.length >= 2 && state.relationshipId && state.discount && state.discount.type !== "none") {
      lines.forEach(function (l) {
        l.properties = {};
        l.properties[BUNDLE_PROP] = state.relationshipId;
      });
    }
    var go = function () { window.location.href = destination === "checkout" ? "/checkout" : "/cart"; };
    fetch("/cart/add.js", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ items: lines }),
    })
      .then(function (r) { return r.json(); })
      .then(function () {
        sendEvent({
          type: "click",
          mainProductId: state.mainProductId,
          companionProductId: state.companionProductId,
          layout: state.template,
        });
        go();
      })
      .catch(go);
  }

  /* --------------------------------------------------------------- peças */

  function checkbox(state, item) {
    var label = el("label", "bt-check");
    var input = el("input", "bt-check__input", { type: "checkbox" });
    input.checked = item.checked;
    input.disabled = !(item.variant && item.variant.available);
    input.setAttribute("aria-label", item.product.title || "");
    var box = el("span", "bt-check__box");
    box.appendChild(icon("check"));
    input.addEventListener("change", function () {
      item.checked = input.checked;
      state.update();
    });
    label.appendChild(input);
    label.appendChild(box);
    item.refs.check = input;
    return label;
  }

  function media(state, item) {
    var wrap = el("div", "bt-item__media");
    wrap.appendChild(checkbox(state, item));
    var img = el("img", "bt-item__img", {
      src: (item.variant && item.variant.image) || item.product.image || "",
      alt: item.product.title || "",
      loading: "lazy",
    });
    item.refs.img = img;
    wrap.appendChild(img);
    return wrap;
  }

  function optionSelects(state, item) {
    var names = item.product.optionNames || [];
    if (!names.length || !state.style.showVariantPicker) return null;
    var wrap = el("div", "bt-item__options");
    names.forEach(function (name) {
      var field = el("div", "bt-select");
      var sel = el("select", "bt-select__input", { "aria-label": name });
      optionValues(item.product, name).forEach(function (val) {
        var opt = el("option");
        opt.value = val;
        opt.textContent = name + ": " + val;
        if (item.selectedOptions[name] === val) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.addEventListener("change", function () {
        item.selectedOptions[name] = sel.value;
        var v = matchVariant(item.product, item.selectedOptions, name);
        if (v) {
          item.variant = v;
          // Sincroniza os outros seletores com a variante realmente encontrada.
          (v.options || []).forEach(function (o) { item.selectedOptions[o.name] = o.value; });
          if (!v.available) item.checked = false;
        }
        state.update();
      });
      field.appendChild(sel);
      field.appendChild(icon("chevron", "bt-select__caret"));
      wrap.appendChild(field);
      (item.refs.selects = item.refs.selects || []).push({ name: name, node: sel });
    });
    return wrap;
  }

  function quantity(state, item) {
    if (!state.style.showQuantity) return null;
    var wrap = el("div", "bt-qty");
    var minus = el("button", "bt-qty__btn", { type: "button", "aria-label": i18n(state.root, "decrease", "-") });
    minus.textContent = "−";
    var value = text("span", "bt-qty__value", item.qty);
    var plus = el("button", "bt-qty__btn", { type: "button", "aria-label": i18n(state.root, "increase", "+") });
    plus.textContent = "+";
    minus.addEventListener("click", function () {
      if (item.qty > 1) { item.qty--; state.update(); }
    });
    plus.addEventListener("click", function () {
      if (item.qty < 99) { item.qty++; state.update(); }
    });
    wrap.appendChild(minus); wrap.appendChild(value); wrap.appendChild(plus);
    item.refs.qty = value;
    item.refs.qtyMinus = minus;
    return wrap;
  }

  function priceNode(state, item) {
    var wrap = el("div", "bt-item__prices");
    var now = text("span", "bt-item__price", formatMoney(item.variant ? item.variant.price : 0, state.moneyFormat));
    wrap.appendChild(now);
    var was = el("s", "bt-item__compare");
    wrap.appendChild(was);
    item.refs.price = now;
    item.refs.compare = was;
    return wrap;
  }

  /** Card vertical (side-by-side). */
  function itemCard(state, item) {
    var card = el("article", "bt-item bt-item--card");
    card.appendChild(media(state, item));
    var body = el("div", "bt-item__body");
    body.appendChild(text("p", "bt-item__name", item.product.title));
    body.appendChild(priceNode(state, item));
    var opts = optionSelects(state, item);
    if (opts) body.appendChild(opts);
    var qty = quantity(state, item);
    if (qty) body.appendChild(qty);
    card.appendChild(body);
    item.refs.card = card;
    return card;
  }

  /** Linha horizontal (list / compact). */
  function itemRow(state, item) {
    var row = el("article", "bt-item bt-item--row");
    row.appendChild(media(state, item));
    var body = el("div", "bt-item__body");
    body.appendChild(text("p", "bt-item__name", item.product.title));
    body.appendChild(priceNode(state, item));
    var opts = optionSelects(state, item);
    if (opts) body.appendChild(opts);
    row.appendChild(body);
    var qty = quantity(state, item);
    if (qty) row.appendChild(qty);
    item.refs.card = row;
    return row;
  }

  function plus() {
    var s = el("span", "bt-plus", { "aria-hidden": "true" });
    s.textContent = "+";
    return s;
  }

  function ctaButtons(state) {
    var wrap = el("div", "bt-actions");
    var add = el("button", "bt-btn bt-btn--primary", { type: "button" });
    add.appendChild(icon("cart"));
    add.appendChild(text("span", null, state.style.addButtonText || i18n(state.root, "add-cart", "Adicionar ao carrinho")));
    add.addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      addToCart(state, "cart");
    });
    wrap.appendChild(add);
    state.refs.addBtn = add;

    if (state.style.showBuyNow) {
      var buy = el("button", "bt-btn bt-btn--secondary", { type: "button" });
      buy.appendChild(icon("tag"));
      buy.appendChild(text("span", null, state.style.buyNowText || i18n(state.root, "buy-now", "Comprar agora")));
      buy.addEventListener("click", function (e) {
        e.preventDefault(); e.stopPropagation();
        addToCart(state, "checkout");
      });
      wrap.appendChild(buy);
      state.refs.buyBtn = buy;
    }
    return wrap;
  }

  /** Bloco de totais: rótulo, riscado, total, badge e linha de economia. */
  function summary(state, layout) {
    var box = el("div", "bt-summary bt-summary--" + layout);
    var head = el("div", "bt-summary__head");
    head.appendChild(text("span", "bt-summary__label", i18n(state.root, "total-price", "Total")));
    var prices = el("div", "bt-summary__prices");
    var compare = el("s", "bt-summary__compare");
    var total = el("strong", "bt-summary__total");
    var badge = el("span", "bt-badge");
    prices.appendChild(compare); prices.appendChild(total); prices.appendChild(badge);
    head.appendChild(prices);
    box.appendChild(head);

    var save = el("p", "bt-summary__save");
    save.appendChild(icon("tag", "bt-summary__save-icon"));
    var saveText = text("span", null, "");
    save.appendChild(saveText);
    box.appendChild(save);

    box.appendChild(ctaButtons(state));

    state.refs.compare = compare;
    state.refs.total = total;
    state.refs.badge = badge;
    state.refs.save = save;
    state.refs.saveText = saveText;
    return box;
  }

  function title(root, s) {
    if (!s || !s.showTitle || !s.titleText) return null;
    return text("h3", "bt-title", s.titleText);
  }

  /* ------------------------------------------------------------- updates */

  function update(state) {
    var mf = state.moneyFormat;

    state.items.forEach(function (item) {
      var v = item.variant;
      var unavailable = !v || !v.available;
      if (unavailable) item.checked = false;
      if (item.refs.check) {
        item.refs.check.checked = item.checked;
        item.refs.check.disabled = unavailable;
      }
      if (item.refs.card) {
        item.refs.card.classList.toggle("is-unselected", !item.checked);
        item.refs.card.classList.toggle("is-unavailable", unavailable);
      }
      if (item.refs.price) item.refs.price.textContent = formatMoney(v ? v.price : 0, mf);
      if (item.refs.compare) {
        var hasCompare = v && v.compareAtPrice && v.compareAtPrice > v.price;
        item.refs.compare.textContent = hasCompare ? formatMoney(v.compareAtPrice, mf) : "";
        item.refs.compare.hidden = !hasCompare;
      }
      if (item.refs.img && v && v.image) item.refs.img.src = v.image;
      if (item.refs.qty) item.refs.qty.textContent = String(item.qty);
      if (item.refs.qtyMinus) item.refs.qtyMinus.disabled = item.qty <= 1;
      (item.refs.selects || []).forEach(function (s) {
        var val = item.selectedOptions[s.name];
        if (val != null && s.node.value !== val) s.node.value = val;
      });
    });

    var t = totals(state);
    if (state.refs.total) state.refs.total.textContent = formatMoney(t.total, mf);
    if (state.refs.compare) {
      var showCompare = t.compare > t.total;
      state.refs.compare.textContent = showCompare ? formatMoney(t.compare, mf) : "";
      state.refs.compare.hidden = !showCompare;
    }
    if (state.refs.badge) {
      var showBadge = t.percent > 0;
      state.refs.badge.textContent = showBadge ? "-" + t.percent + "%" : "";
      state.refs.badge.hidden = !showBadge;
    }
    if (state.refs.save) {
      var showSave = t.savings > 0;
      state.refs.save.hidden = !showSave;
      if (showSave && state.refs.saveText) {
        state.refs.saveText.textContent = i18n(state.root, "you-save", "Você economiza {{amount}} ({{percent}}%)")
          .replace("{{amount}}", formatMoney(t.savings, mf))
          .replace("{{percent}}", String(t.percent));
      }
    }
    var empty = t.count === 0;
    if (state.refs.addBtn) state.refs.addBtn.disabled = empty;
    if (state.refs.buyBtn) state.refs.buyBtn.disabled = empty;
  }

  /* ------------------------------------------------------------- layouts */

  function renderSideBySide(state) {
    var root = state.root;
    var head = title(root, state.style);
    if (head) root.appendChild(head);

    var shell = el("div", "bt-sbs");
    var items = el("div", "bt-sbs__items");
    state.items.forEach(function (item, i) {
      if (i > 0) items.appendChild(plus());
      items.appendChild(itemCard(state, item));
    });
    shell.appendChild(items);
    shell.appendChild(summary(state, "aside"));
    root.appendChild(shell);
  }

  function renderList(state) {
    var root = state.root;
    var head = title(root, state.style);
    if (head) root.appendChild(head);

    var list = el("div", "bt-list");
    state.items.forEach(function (item, i) {
      if (i > 0) list.appendChild(plus());
      list.appendChild(itemRow(state, item));
    });
    root.appendChild(list);
    root.appendChild(summary(state, "footer"));
  }

  function renderCompact(state) {
    var root = state.root;
    var head = title(root, state.style);
    if (head) root.appendChild(head);
    var wrap = el("div", "bt-compact");
    // Compacto: só os companheiros (o principal já está na página) + total enxuto.
    state.items.forEach(function (item, i) {
      if (item.isMain) return;
      if (i > 1) wrap.appendChild(plus());
      wrap.appendChild(itemRow(state, item));
    });
    root.appendChild(wrap);
    root.appendChild(summary(state, "footer"));
  }

  /* ---------------------------------------------------------------- boot */

  function initRoot(root) {
    if (root.getAttribute("data-bt-ready") === "1") return;
    root.setAttribute("data-bt-ready", "1");
    var productId = root.getAttribute("data-bt-product-id");
    if (!productId) { root.remove(); return; }

    fetch(PROXY + "/data?product_id=" + encodeURIComponent(productId), { headers: { Accept: "application/json" } })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.enabled || !data.companions || !data.companions.length) { root.remove(); return; }

        var state = {
          root: root,
          moneyFormat: root.getAttribute("data-bt-money-format"),
          template: data.template || "side-by-side",
          style: data.style || {},
          discount: data.discount || { type: "none", value: 0 },
          relationshipId: data.relationshipId || null,
          mainProductId: data.mainProductId || productId,
          companionProductId: data.companions[0].productId,
          items: [],
          refs: {},
        };
        state.update = function () { update(state); };

        // Produto principal: usa a variante selecionada na página quando existir.
        if (data.mainProduct) {
          var main = data.mainProduct;
          var pageVariant = root.getAttribute("data-bt-variant-id");
          if (pageVariant && variantById(main, pageVariant)) main.variantId = pageVariant;
          state.items.push(makeItem(main, true));
        }
        data.companions.forEach(function (c) { state.items.push(makeItem(c, false)); });
        if (state.items.length < 2) { root.remove(); return; }

        applyStyle(root, state.style);
        root.innerHTML = "";
        root.classList.add("bt-root--" + state.template);
        if (state.template === "compact") renderCompact(state);
        else if (state.template === "list") renderList(state);
        else renderSideBySide(state);

        update(state);
        root.removeAttribute("hidden");
        observeImpression(root, state);
      })
      .catch(function () { root.remove(); });
  }

  function boot() { document.querySelectorAll(".bt-root").forEach(initRoot); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  document.addEventListener("shopify:section:load", boot);
})();

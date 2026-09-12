(() => {
  const search = document.querySelector('[data-store-search]');
  const sort = document.querySelector('[data-store-sort]');
  const grid = document.getElementById('productsGrid');
  const counter = document.querySelector('[data-store-visible-count]');
  const empty = document.querySelector('[data-store-empty]');
  const catalogData = document.getElementById('storeCatalogData');
  if (!grid) return;

  const normalize = (value = '') => String(value)
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const safeColor = (value, fallback = '#ef4444') => /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value) : fallback;
  const colorRgb = (value) => {
    const color = safeColor(value).slice(1);
    return `${parseInt(color.slice(0, 2), 16)}, ${parseInt(color.slice(2, 4), 16)}, ${parseInt(color.slice(4, 6), 16)}`;
  };
  const formatCoins = (value) => {
    try { return new Intl.NumberFormat('pt-BR').format(Math.max(0, Math.floor(Number(value || 0)))); }
    catch (_) { return String(Math.max(0, Math.floor(Number(value || 0)))); }
  };

  let allProducts = [];
  try { allProducts = JSON.parse(catalogData?.textContent || '[]'); } catch (_) { allProducts = []; }

  function productVisual(product) {
    if (product.hasImageData) {
      const version = product.updatedAt ? new Date(product.updatedAt).getTime() : 1;
      return `/product-image/${encodeURIComponent(product.id)}?v=${Number.isFinite(version) ? version : 1}`;
    }
    if (product.imageUrl) return String(product.imageUrl);
    const type = encodeURIComponent(product.classname || product.items?.[0]?.classname || '');
    const name = encodeURIComponent(product.name || product.classname || 'Item');
    return `/dayz-wiki-image?type=${type}&name=${name}`;
  }

  function renderProductCard(product) {
    const items = Array.isArray(product.items) && product.items.length
      ? product.items
      : [{ classname: product.classname, quantity: product.quantity || 1, label: '' }];
    const visual = productVisual(product);
    const featuredColor = safeColor(product.highlightColor || '#ef4444');
    const promo = product.promo?.active ? product.promo : null;
    const promoColor = safeColor(promo?.color || '#ff7a18', '#ff7a18');
    const title = escapeHtml(product.name);
    const description = escapeHtml(product.description || 'Item disponível para entrega no servidor.');
    const category = escapeHtml(product.category || 'Diversos');
    const visualAttr = escapeHtml(visual);
    const itemPreview = items.slice(0, 2).map(item => (
      `<small><b>${Math.max(1, Number(item.quantity || 1))}x</b> ${escapeHtml(item.label || product.name)}</small>`
    )).join('');
    const promoBadge = promo ? `<div class="promo-fire-badge">🔥 ${escapeHtml(promo.label || 'PROMO')} -${Number(promo.percent || 0)}%</div>` : '';
    const promoTag = promo ? '<b class="promo-tag-inline">Promo</b>' : '';
    const oldPrice = promo ? `<small class="promo-old-price">de ${formatCoins(product.basePriceCoins)} Pila</small>` : '';
    const saving = promo ? `<small class="promo-save-line">economize ${formatCoins(product.savingsCoins)} Pila</small>` : '';
    const actions = window.RAIDZ_STORE_PLAYER_LOGGED
      ? `<div class="product-actions-v42">
          <form method="GET" action="/shop/confirm/${encodeURIComponent(product.id)}">
            <input type="hidden" value="1" name="quantity">
            <button class="btn v9-buy-btn" type="submit">Doar agora</button>
          </form>
          <button class="btn cart-add-btn-v42" type="button" data-add-to-cart>+ Carrinho</button>
        </div>`
      : '<a class="btn v9-buy-btn" href="/login">Abrir pelo jogo</a>';

    return `<article class="rz-product-card-v118 product-card-pro v9-product-card sz-hover-card ${product.featured ? 'is-featured' : ''} ${promo ? 'is-promo' : ''}"
      style="--featured-color:${featuredColor};--featured-rgb:${colorRgb(featuredColor)};--promo-color:${promoColor};--promo-rgb:${colorRgb(promoColor)};"
      data-store-card data-store-price="${Number(product.displayPriceCoins || 0)}" data-store-title="${escapeHtml(normalize(product.name))}"
      data-product-name="${escapeHtml(normalize(`${product.name} ${product.category} ${product.description || ''}`))}"
      data-cart-product-id="${escapeHtml(product.id)}" data-cart-name="${title}" data-cart-category="${category}"
      data-cart-server="${escapeHtml(product.serverType || 'vanilla')}" data-cart-price="${Number(product.displayPriceCoins || 0)}" data-cart-image="${visualAttr}">
        <div class="v9-product-art">
          ${promoBadge}
          <div class="v9-card-shine"></div>
          <img loading="lazy" decoding="async" src="${visualAttr}" onerror="this.onerror=null;this.src='/images/no-real-image.svg'" alt="${title}">
        </div>
        <div class="v9-product-content">
          <div class="v9-product-tags"><span>${category}</span>${items.length > 1 ? `<b>Kit ${items.length}</b>` : ''}${promoTag}</div>
          <h3>${title}</h3>
          <p>${description}</p>
          <div class="v9-product-mini-list">${itemPreview}</div>
          <div class="v9-product-bottom">
            <div class="price-stack">${oldPrice}<strong><i>Pila</i> ${formatCoins(product.displayPriceCoins)}</strong>${saving}</div>
            ${actions}
          </div>
        </div>
      </article>`;
  }

  function getCards() {
    return Array.from(grid.querySelectorAll('[data-store-card]'));
  }

  function prepareCardOrder() {
    getCards().forEach((card, index) => { card.dataset.storeOrder = String(index); });
  }

  function applyCatalogTools() {
    const cards = getCards();
    const term = normalize(search?.value || '');
    const mode = sort?.value || 'default';
    let visible = 0;

    cards.forEach((card) => {
      const haystack = normalize(card.dataset.productName || card.textContent || '');
      const show = !term || haystack.includes(term);
      card.hidden = !show;
      if (show) visible += 1;
    });

    const sorted = [...cards].sort((a, b) => {
      if (mode === 'price-asc' || mode === 'price-desc') {
        const priceA = Number(a.dataset.storePrice || 0);
        const priceB = Number(b.dataset.storePrice || 0);
        return mode === 'price-asc' ? priceA - priceB : priceB - priceA;
      }
      if (mode === 'name') {
        return String(a.dataset.storeTitle || '').localeCompare(String(b.dataset.storeTitle || ''), 'pt-BR');
      }
      return Number(a.dataset.storeOrder || 0) - Number(b.dataset.storeOrder || 0);
    });
    sorted.forEach((card) => grid.appendChild(card));

    if (counter) counter.textContent = String(visible);
    if (empty) empty.hidden = visible !== 0;
  }

  function updateCategoryChrome(category, count) {
    document.querySelectorAll('[data-store-category-link]').forEach((link) => {
      link.classList.toggle('active', normalize(link.dataset.categoryName) === normalize(category));
    });
    const current = document.querySelector('.rz-current-category-v118 strong');
    const heading = document.querySelector('.rz-catalog-title-v118 h2');
    if (current) current.textContent = category;
    if (heading) heading.textContent = category;
    if (counter) counter.textContent = String(count);

    const toolbarAction = document.querySelector('.rz-catalog-controls-v118 > a.btn');
    if (toolbarAction) {
      toolbarAction.href = window.RAIDZ_STORE_PLAYER_LOGGED ? '/wallet' : '/login';
      toolbarAction.textContent = window.RAIDZ_STORE_PLAYER_LOGGED ? 'Adicionar moedas' : 'Abrir pelo jogo';
    }
    document.querySelector('.vehicle-shop-board')?.remove();
    document.querySelector('.sleeping-rules-v115')?.remove();
  }

  function renderCategory(category, { pushHistory = true, scroll = true } = {}) {
    const selected = allProducts.filter(product => normalize(product.category) === normalize(category));
    grid.className = 'v9-product-grid product-grid-pro v10-product-grid';
    grid.innerHTML = selected.length
      ? selected.map(renderProductCard).join('')
      : `<div class="card center themed-empty v9-empty-state"><h2>Nenhum item ativo nesta categoria</h2><p>Escolha outra categoria ou aguarde a atualização da loja.</p></div>`;
    updateCategoryChrome(category, selected.length);
    prepareCardOrder();
    if (search) search.value = '';
    if (sort) sort.value = 'default';
    applyCatalogTools();

    if (pushHistory) {
      const url = new URL(window.location.href);
      url.pathname = '/shop';
      url.searchParams.set('serverType', 'vanilla');
      url.searchParams.set('category', category);
      url.hash = 'productsGrid';
      window.history.pushState({ storeCategory: category }, '', url);
    }
    if (scroll) {
      const topbar = document.querySelector('.topbar.v9-topbar');
      const offset = ((topbar && topbar.offsetHeight) || 64) + 12;
      const y = grid.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }
    window.dispatchEvent(new CustomEvent('raidz:catalog-rendered', { detail: { category } }));
  }

  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-store-category-link]');
    if (!link) return;
    // Trajes e veículos têm fluxos próprios. As demais categorias trocam no
    // navegador em milissegundos, sem nova página e sem consultar o banco.
    if (link.dataset.categoryVip === '1' || link.dataset.categoryVehicle === '1') return;
    const category = String(link.dataset.categoryName || '').trim();
    if (!category) return;
    event.preventDefault();
    renderCategory(category);
  });

  window.addEventListener('popstate', () => {
    const url = new URL(window.location.href);
    const category = url.searchParams.get('category') || 'Kits Base';
    const matchingLink = Array.from(document.querySelectorAll('[data-store-category-link]'))
      .find(link => normalize(link.dataset.categoryName) === normalize(category));
    if (matchingLink?.dataset.categoryVehicle === '1' || matchingLink?.dataset.categoryVip === '1') {
      window.location.reload();
      return;
    }
    renderCategory(category, { pushHistory: false, scroll: false });
  });

  search?.addEventListener('input', applyCatalogTools);
  sort?.addEventListener('change', applyCatalogTools);
  prepareCardOrder();
  applyCatalogTools();

  window.RAIDZStoreCatalog = { renderCategory, applyCatalogTools };
})();

(() => {
  const search = document.querySelector('[data-store-search]');
  const sort = document.querySelector('[data-store-sort]');
  const grid = document.getElementById('productsGrid');
  const counter = document.querySelector('[data-store-visible-count]');
  const empty = document.querySelector('[data-store-empty]');
  if (!grid) return;

  const cards = Array.from(grid.querySelectorAll('[data-store-card]'));
  cards.forEach((card, index) => { card.dataset.storeOrder = String(index); });

  const normalize = (value = '') => String(value)
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  function applyCatalogTools() {
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

  search?.addEventListener('input', applyCatalogTools);
  sort?.addEventListener('change', applyCatalogTools);
  applyCatalogTools();
})();

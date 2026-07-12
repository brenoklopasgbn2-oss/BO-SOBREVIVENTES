export function parseProductItemsInput(raw, fallbackClassname = '', fallbackQuantity = 1) {
  const text = String(raw || '').trim();
  const items = [];

  if (text) {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    lines.forEach((line, index) => {
      // Aceita:
      // BandageDressing|2|Bandagem
      // BandageDressing,2,Bandagem
      // BandageDressing x2
      // BandageDressing
      let classname = '';
      let quantity = 1;
      let label = '';

      if (line.includes('|') || line.includes(',')) {
        const parts = line.split(line.includes('|') ? '|' : ',').map(p => p.trim());
        classname = parts[0] || '';
        quantity = Number(parts[1] || 1);
        label = parts.slice(2).join(' ').trim();
      } else {
        const match = line.match(/^(.+?)\s+x\s*(\d+)\s*$/i);
        if (match) {
          classname = match[1].trim();
          quantity = Number(match[2]);
        } else {
          classname = line;
        }
      }

      if (!classname) return;
      if (!Number.isFinite(quantity) || quantity < 1) quantity = 1;
      quantity = Math.min(Math.floor(quantity), 999);

      items.push({
        classname,
        quantity,
        label: label || null,
        sortOrder: index
      });
    });
  }

  if (!items.length && fallbackClassname) {
    let quantity = Number(fallbackQuantity || 1);
    if (!Number.isFinite(quantity) || quantity < 1) quantity = 1;
    items.push({ classname: String(fallbackClassname).trim(), quantity: Math.floor(quantity), label: null, sortOrder: 0 });
  }

  if (!items.length) {
    throw new Error('Adicione pelo menos 1 item/classname para entrega.');
  }

  return items;
}

export function productItemsToText(product) {
  if (product?.items?.length) {
    return product.items
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(item => `${item.classname}|${item.quantity}${item.label ? `|${item.label}` : ''}`)
      .join('\n');
  }
  if (product?.classname) return `${product.classname}|${product.quantity || 1}`;
  return '';
}

export function describeProductItems(product) {
  const items = product?.items?.length ? product.items : [{ classname: product.classname, quantity: product.quantity, label: null }];
  return items.map(item => ({
    classname: item.classname,
    quantity: item.quantity,
    label: item.label || item.classname
  }));
}

(() => {
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('img:not([loading])').forEach((img) => {
      img.loading = 'lazy';
      img.decoding = 'async';
    });
  });

  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (event.defaultPrevented || !(form instanceof HTMLFormElement) || form.dataset.submitting === '1') return;
    form.dataset.submitting = '1';
    const button = form.querySelector('button[type="submit"], input[type="submit"]');
    if (!button) return;
    const original = button instanceof HTMLInputElement ? button.value : button.textContent;
    button.disabled = true;
    if (button instanceof HTMLInputElement) button.value = 'Salvando...';
    else button.textContent = 'Salvando...';
    setTimeout(() => {
      form.dataset.submitting = '0';
      button.disabled = false;
      if (button instanceof HTMLInputElement) button.value = original;
      else button.textContent = original;
    }, 15000);
  });
})();

(() => {
  const header = document.querySelector('[data-zz-header]');
  const toggle = document.querySelector('[data-zz-menu-toggle]');
  const menu = document.querySelector('[data-zz-menu]');
  if (header) {
    const syncHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 14);
    syncHeader();
    window.addEventListener('scroll', syncHeader, { passive: true });
  }
  if (toggle && menu && header) {
    toggle.addEventListener('click', () => {
      const open = header.classList.toggle('menu-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
      header.classList.remove('menu-open');
      toggle.setAttribute('aria-expanded', 'false');
    }));
  }
})();

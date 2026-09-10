(() => {
  const STORAGE_KEY = 'sz_store_sound_enabled';
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let soundEnabled = localStorage.getItem(STORAGE_KEY) !== '0';

  let audioUnlocked = false;
  let audioCtx = null;
  let lastHoverAt = 0;
  let pixProcessingTimer = null;

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    return audioCtx;
  }

  function unlockAudio() {
    audioUnlocked = true;
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    } catch (_) {}
  }

  function playTone(freq = 520, volume = 0.025, length = 0.055, type = 'sine', delay = 0, slide = 1.08) {
    if (!soundEnabled || !audioUnlocked) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const start = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), start + length);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + length + 0.03);
    } catch (_) {}
  }

  // Som novo: curto, baixo e só em botões/links importantes. Nada toca ao mover o mouse pela tela.
  function playButtonHoverSound() {
    const now = Date.now();
    if (now - lastHoverAt < 140) return;
    lastHoverAt = now;
    playTone(520, 0.018, 0.038, 'sine', 0, 1.05);
    playTone(820, 0.012, 0.032, 'triangle', 0.035, 0.96);
  }

  function playButtonClickSound() {
    playTone(420, 0.022, 0.045, 'triangle', 0, 1.12);
    playTone(660, 0.018, 0.05, 'sine', 0.045, 1.08);
  }

  function playPurchaseSound() {
    if (!soundEnabled || !audioUnlocked) return;
    const audio = document.getElementById('purchaseCoinAudio');
    if (audio) {
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 0.52;
        audio.play().catch(() => {
          playTone(520, 0.048, 0.08, 'triangle');
          playTone(740, 0.043, 0.08, 'triangle', 0.09);
          playTone(1040, 0.035, 0.11, 'sine', 0.19);
        });
        return;
      } catch (_) {}
    }
    playTone(520, 0.048, 0.08, 'triangle');
    playTone(740, 0.043, 0.08, 'triangle', 0.09);
    playTone(1040, 0.035, 0.11, 'sine', 0.19);
  }

  function makeSoundToggle() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sz-sound-toggle';
    button.textContent = soundEnabled ? '🔊 Som ON' : '🔇 Som OFF';
    button.setAttribute('aria-label', 'Ativar ou desativar sons da loja');
    button.addEventListener('click', () => {
      unlockAudio();
      soundEnabled = !soundEnabled;
      localStorage.setItem(STORAGE_KEY, soundEnabled ? '1' : '0');
      button.textContent = soundEnabled ? '🔊 Som ON' : '🔇 Som OFF';
      if (soundEnabled) playButtonClickSound();
    });
    document.body.appendChild(button);
  }

  function removePanelMusicControl() {
    const oldKeys = [
      'sz_panel_music_enabled_v66',
      'sz_panel_music_enabled_v65',
      'sz_panel_music_enabled_v64',
      'sz_panel_music_volume_v66',
      'sz_panel_music_volume_v65',
      'sz_panel_music_volume_v64',
      'sz_panel_music_index_v66',
      'sz_panel_music_last_index_v66'
    ];
    try { oldKeys.forEach((key) => localStorage.removeItem(key)); } catch (_) {}
    document.querySelectorAll('#szPanelMusicAudio, .sz-audio-panel-v64, .sz-audio-panel-v65').forEach((el) => {
      try { if (el.pause) el.pause(); } catch (_) {}
      try { el.remove(); } catch (_) {}
    });
  }

  function attach3DHoverEffects() {
    const cards = document.querySelectorAll('.product-card-pro, .vehicle-shop-card, .vehicle-card-pro, .server-card, .category-stage-pill-v29, .garage-vehicle-card-v29, .garage-detail-v29, .garage-action-option-v29, .package-card.sz-hover-card, .confirm-card.sz-hover-card, .promo-card.sz-hover-card, .coin-pack-v33, .wallet-custom-v33, .wallet-hero-v33, .starter-kit-card-v33, .category-button-v32');
    cards.forEach((card) => {
      card.addEventListener('mouseenter', () => card.classList.add('is-hovered'));
      card.addEventListener('mouseleave', () => {
        card.classList.remove('is-hovered');
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
        card.style.setProperty('--mx', '50%');
        card.style.setProperty('--my', '50%');
      });
      card.addEventListener('mousemove', (ev) => {
        if (prefersReducedMotion) return;
        const rect = card.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const x = (ev.clientX - rect.left) / rect.width;
        const y = (ev.clientY - rect.top) / rect.height;
        const rotateY = (x - 0.5) * 18;
        const rotateX = (0.5 - y) * 13;
        card.style.setProperty('--rx', `${rotateX.toFixed(2)}deg`);
        card.style.setProperty('--ry', `${rotateY.toFixed(2)}deg`);
        card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      });
    });
  }

  function attachButtonEffects() {
    const buttons = document.querySelectorAll('button, .btn, a.pill, .server-card');
    buttons.forEach((btn) => {
      btn.addEventListener('pointerenter', playButtonHoverSound, { passive: true });
      btn.addEventListener('click', () => {
        unlockAudio();
        playButtonClickSound();
      });
    });
  }

  function attachBuySound() {
    document.querySelectorAll('form[action^="/shop/buy/"]').forEach((form) => {
      form.addEventListener('submit', (ev) => {
        unlockAudio();
        if (form.dataset.submitted === '1') { ev.preventDefault(); return; }
        const confirmBox = form.querySelector('input[name="confirmPurchase"]');
        if (confirmBox && !confirmBox.checked) return;
        ev.preventDefault();
        form.dataset.submitted = '1';
        const btn = form.querySelector('button[type="submit"]');
        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Processando...';
        }
        showPurchaseBurst();
        playPurchaseSound();
        setTimeout(() => form.submit(), 60);
      });
    });
  }

  function showPurchaseBurst() {
    const burst = document.createElement('div');
    burst.className = 'purchase-burst';
    burst.innerHTML = '<div>📦</div><strong>Processando compra...</strong><span>Enviando uma única solicitação.</span>';
    document.body.appendChild(burst);
    setTimeout(() => burst.classList.add('show'), 10);
    setTimeout(() => burst.remove(), 1450);
  }

  function playPixProcessingAudio() {
    if (!soundEnabled || !audioUnlocked) return;
    const audio = document.getElementById('pixProcessingAudio');
    if (audio) {
      audio.currentTime = 0;
      audio.volume = 0.36;
      audio.play().catch(() => {
        playTone(360, 0.026, 0.07, 'triangle');
        playTone(560, 0.022, 0.07, 'sine', 0.08);
      });
      return;
    }
    playTone(360, 0.026, 0.07, 'triangle');
    playTone(560, 0.022, 0.07, 'sine', 0.08);
  }

  function startPixProcessingAudio() {
    if (pixProcessingTimer) return;
    playPixProcessingAudio();
    pixProcessingTimer = setInterval(playPixProcessingAudio, 4800);
  }

  function stopPixProcessingAudio() {
    if (pixProcessingTimer) {
      clearInterval(pixProcessingTimer);
      pixProcessingTimer = null;
    }
    const audio = document.getElementById('pixProcessingAudio');
    if (audio) {
      try { audio.pause(); audio.currentTime = 0; } catch (_) {}
    }
  }

  function playPixApprovedAudio() {
    if (!soundEnabled || !audioUnlocked) return;
    playTone(620, 0.05, 0.08, 'triangle');
    playTone(880, 0.044, 0.08, 'triangle', 0.09);
    playTone(1180, 0.035, 0.11, 'sine', 0.20);
  }

  function showPixApprovedUI() {
    stopPixProcessingAudio();
    const banner = document.getElementById('pixApprovedBanner');
    const help = document.getElementById('pixHelpText');
    const card = document.querySelector('.payment-card, .pix-card-v42');
    const spinner = document.getElementById('pixSpinner');
    const processingText = document.getElementById('pixProcessingText');
    if (banner) banner.hidden = false;
    if (help) help.textContent = 'Pix aprovado! Suas moedas já estão disponíveis. Você será levado para a loja.';
    if (card) { card.classList.add('is-approved'); card.classList.remove('is-processing'); }
    if (spinner) spinner.hidden = true;
    if (processingText) processingText.textContent = 'Pix aprovado! Preparando retorno para a loja...';
    showPurchaseBurst();

    const returnUrl = card?.dataset.returnUrl || '/shop?serverType=vanilla&success=' + encodeURIComponent('Pix aprovado! Moedas creditadas com sucesso.');
    const countEl = document.getElementById('pixRedirectCountdown');
    if (card && card.dataset.redirectStarted !== '1') {
      card.dataset.redirectStarted = '1';
      let left = 4;
      if (countEl) countEl.textContent = String(left);
      const timer = setInterval(() => {
        left -= 1;
        if (countEl) countEl.textContent = String(Math.max(0, left));
        if (left <= 0) {
          clearInterval(timer);
          window.location.href = returnUrl;
        }
      }, 1000);
    }
  }


  function formatPtBrNumber(value) {
    try { return new Intl.NumberFormat('pt-BR').format(Math.max(0, Math.floor(value || 0))); }
    catch (_) { return String(Math.max(0, Math.floor(value || 0))); }
  }

  function animateCounter(el, toValue, duration = 900, fromValue = 0) {
    if (!el) return;
    const start = performance.now();
    const from = Number.isFinite(fromValue) ? fromValue : 0;
    const to = Number.isFinite(toValue) ? toValue : 0;

    function frame(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + (to - from) * eased);
      el.textContent = formatPtBrNumber(current);
      if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function attachHeroAnimations() {
    const wallet = document.querySelector('[data-wallet-hud]');
    if (wallet) {
      const balance = wallet.querySelector('.wallet-balance-animated');
      const targetValue = Number(balance?.dataset.value || 0);
      let hoverCount = 0;
      let animating = false;

      const engage = () => {
        wallet.classList.add('is-engaged');
        if (!balance || animating || prefersReducedMotion) return;
        animating = true;
        const fromValue = hoverCount === 0 ? 0 : Math.max(0, Math.floor(targetValue * 0.92));
        animateCounter(balance, targetValue, hoverCount === 0 ? 1050 : 620, fromValue);
        hoverCount += 1;
        setTimeout(() => { animating = false; }, hoverCount === 1 ? 1080 : 700);
      };

      const disengage = () => wallet.classList.remove('is-engaged');

      wallet.addEventListener('pointerenter', engage);
      wallet.addEventListener('pointerleave', disengage);
      wallet.addEventListener('pointermove', (ev) => {
        if (prefersReducedMotion) return;
        const rect = wallet.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const x = ((ev.clientX - rect.left) / rect.width) * 100;
        const y = ((ev.clientY - rect.top) / rect.height) * 100;
        wallet.style.setProperty('--mx', `${x.toFixed(1)}%`);
        wallet.style.setProperty('--my', `${y.toFixed(1)}%`);
      });

      if (balance && !prefersReducedMotion) {
        animateCounter(balance, targetValue, 950, 0);
      }
    }
  }


  function spawnProductEntryOverlay(card, productName) {
    const overlay = document.createElement('div');
    overlay.className = 'shop-entry-overlay';
    const accent = card ? getComputedStyle(card).getPropertyValue('--featured-color').trim() || '#ef3434' : '#ef3434';
    overlay.style.setProperty('--entry-accent', accent);
    const sparks = Array.from({ length: 28 }, (_, i) => `<i style="--i:${i};--ang:${(i * 360 / 28).toFixed(2)}deg;--dist:${120 + (i % 7) * 22}px;--delay:${(i % 9) * 18}ms"></i>`).join('');
    overlay.innerHTML = `
      <div class="shop-entry-core"></div>
      <div class="shop-entry-rings">
        <span></span><span></span><span></span><span></span>
      </div>
      <div class="shop-entry-sparks">${sparks}</div>
      <div class="shop-entry-copy">
        <strong>${productName || 'Abrindo item'}</strong>
        <small>Abrindo confirmação...</small>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
    setTimeout(() => overlay.classList.add('explode'), 240);
    setTimeout(() => overlay.remove(), 1200);
  }

  function playPortalWhoosh() {
    if (!soundEnabled || !audioUnlocked) return;
    playTone(180, 0.042, 0.08, 'triangle');
    playTone(360, 0.055, 0.075, 'sawtooth', 0.04);
    playTone(760, 0.060, 0.065, 'sine', 0.12);
    playTone(1160, 0.038, 0.08, 'triangle', 0.19);
  }

  function attachProductEntranceEffects() {
    document.querySelectorAll('form[action^="/shop/confirm/"]').forEach((form) => {
      form.addEventListener('submit', (ev) => {
        if (form.dataset.entering === '1') { ev.preventDefault(); return; }
        ev.preventDefault();
        form.dataset.entering = '1';
        unlockAudio();
        playButtonClickSound();
        playPortalWhoosh();
        const card = form.closest('.v9-product-card');
        const btn = form.querySelector('button[type="submit"]');
        const productName = card?.querySelector('h3')?.textContent?.trim() || 'Abrindo item';
        if (card) {
          card.classList.add('is-entering');
          setTimeout(() => card.classList.add('is-entering-phase-2'), 210);
        }
        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Abrindo item...';
        }
        if (!prefersReducedMotion) {
          setTimeout(() => spawnProductEntryOverlay(card, productName), 120);
        }
        setTimeout(() => form.submit(), 80);
      });
    });
  }

  function attachHeroSceneMotion() {
    const hero = document.querySelector('.v9-hero-zone');
    const copy = document.querySelector('.v10-hero-copy');
    if (!hero || !copy || prefersReducedMotion) return;

    hero.addEventListener('mousemove', (ev) => {
      const rect = hero.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = ((ev.clientX - rect.left) / rect.width - 0.5) * 12;
      const y = ((ev.clientY - rect.top) / rect.height - 0.5) * 10;
      copy.style.setProperty('--hero-x', `${x.toFixed(2)}px`);
      copy.style.setProperty('--hero-y', `${y.toFixed(2)}px`);
    });

    hero.addEventListener('mouseleave', () => {
      copy.style.setProperty('--hero-x', '0px');
      copy.style.setProperty('--hero-y', '0px');
    });
  }


  function attachConfirmPortalEntrance() {
    const confirmPage = document.querySelector('.confirm-page');
    if (!confirmPage) return;
    // Nunca deixa a página de confirmação invisível caso o navegador reduza
    // animações, o JS seja interrompido ou o modo leve esteja ativo.
    confirmPage.classList.add('confirm-page-ready');
    if (prefersReducedMotion) return;
    const title = confirmPage.querySelector('h1')?.textContent?.trim() || 'Confirmar compra';
    const overlay = document.createElement('div');
    overlay.className = 'confirm-portal-intro';
    overlay.innerHTML = `
      <div class="confirm-portal-core"></div>
      <div class="confirm-portal-lines"><span></span><span></span><span></span></div>
      <strong>${title}</strong>
      <small>Entrada segura da loja</small>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
    setTimeout(() => confirmPage.classList.add('confirm-page-ready'), 120);
    setTimeout(() => overlay.classList.add('close'), 680);
    setTimeout(() => overlay.remove(), 1050);
  }

  function attachPixStatusPolling() {
    const card = document.querySelector('.payment-card[data-payment-id], .pix-card-v42[data-payment-id]');
    if (!card) return;
    const paymentId = card.dataset.paymentId;
    const initialStatus = String(card.dataset.paymentStatus || '').toUpperCase();
    const statusText = document.getElementById('pixStatusText');
    let alreadyApproved = initialStatus === 'APPROVED';

    if (alreadyApproved) {
      showPixApprovedUI();
      return;
    }

    document.addEventListener('pointerdown', startPixProcessingAudio, { once: true });
    document.addEventListener('keydown', startPixProcessingAudio, { once: true });
    if (audioUnlocked) startPixProcessingAudio();

    async function checkStatus() {
      try {
        const res = await fetch(`/payment/${paymentId}/status`, { headers: { 'Accept': 'application/json' } });
        const data = await res.json();
        if (!data.ok) return;
        const status = String(data.status || '').toUpperCase();
        if (statusText) {
          statusText.textContent = status;
          statusText.className = 'status ' + status.toLowerCase();
        }
        const processingText = document.getElementById('pixProcessingText');
        if (processingText && status !== 'APPROVED') processingText.textContent = 'Processando Pix...';
        if (status === 'APPROVED' && !alreadyApproved) {
          alreadyApproved = true;
          showPixApprovedUI();
          playPixApprovedAudio();
          clearInterval(timer);
        }
      } catch (_) {}
    }

    const timer = setInterval(checkStatus, 3500);
    setTimeout(checkStatus, 1200);
  }


  function playCoinCheckoutSound() {
    if (!soundEnabled || !audioUnlocked) return;
    playTone(520, 0.04, 0.075, 'triangle', 0, 1.14);
    playTone(760, 0.036, 0.07, 'sine', 0.075, 1.08);
    playTone(1120, 0.026, 0.095, 'triangle', 0.16, 0.94);
  }

  function playStarterKitSound() {
    if (!soundEnabled || !audioUnlocked) return;
    playTone(440, 0.038, 0.07, 'triangle', 0, 1.12);
    playTone(660, 0.043, 0.08, 'sine', 0.08, 1.10);
    playTone(880, 0.038, 0.08, 'triangle', 0.17, 1.06);
    playTone(1320, 0.026, 0.12, 'sine', 0.28, 0.96);
  }

  function showV33Burst(kind = 'coin') {
    const overlay = document.createElement('div');
    const isKit = kind === 'kit';
    overlay.className = isKit ? 'starter-claim-burst-v33' : 'coin-checkout-burst-v33';
    overlay.innerHTML = `
      <div class="burst-box">
        <div class="burst-icon">${isKit ? '🎁' : 'RZ'}</div>
        <strong>${isKit ? 'Kit inicial resgatado!' : 'Gerando Pix seguro...'}</strong>
        <span>${isKit ? 'Criando entrega para o DayZ.' : 'Aguarde, abrindo pagamento.'}</span>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
    setTimeout(() => overlay.remove(), isKit ? 1450 : 1250);
  }

  function attachCoinCheckoutEffects() {
    document.querySelectorAll('form[data-coin-checkout], form[action^="/checkout/"]').forEach((form) => {
      form.addEventListener('submit', (ev) => {
        if (form.dataset.submitted === '1') { ev.preventDefault(); return; }
        unlockAudio();
        ev.preventDefault();
        form.dataset.submitted = '1';
        const btn = form.querySelector('button[type="submit"]');
        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Gerando Pix...';
        }
        playCoinCheckoutSound();
        showV33Burst('coin');
        setTimeout(() => form.submit(), 80);
      });
    });
  }

  function attachStarterKitClaimEffects() {
    document.querySelectorAll('form[data-starter-kit-claim]').forEach((form) => {
      form.addEventListener('submit', (ev) => {
        if (form.dataset.submitted === '1') { ev.preventDefault(); return; }
        unlockAudio();
        ev.preventDefault();
        form.dataset.submitted = '1';
        const card = form.closest('.starter-kit-card-v33');
        const btn = form.querySelector('button[type="submit"]');
        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Resgatando...';
        }
        if (card) card.classList.add('is-claiming');
        playStarterKitSound();
        showV33Burst('kit');
        setTimeout(() => form.submit(), 80);
      });
    });
  }

  window.addEventListener('pointerdown', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => document.body.classList.add('sz-page-ready'), 60);
    makeSoundToggle();
    removePanelMusicControl();
    // V104: modo leve. Mantém o layout, mas não registra efeitos 3D/movimento
    // em cada card nem overlays cinematográficos que travavam a navegação.
    document.body.classList.add('sz-lite-mode');
    attachButtonEffects();
    attachBuySound();
    attachCoinCheckoutEffects();
    attachStarterKitClaimEffects();
    attachPixStatusPolling();

    if (!document.getElementById('purchaseCoinAudio')) {
      const audio = document.createElement('audio');
      audio.id = 'purchaseCoinAudio';
      audio.preload = 'none';
      audio.src = '/audio/purchase-coin.mp3';
      audio.style.display = 'none';
      document.body.appendChild(audio);
    }
  });
})();

// V9: busca local dos cards da loja sem recarregar a página.
(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const search = document.getElementById('v9ProductSearch');
    const cards = [...document.querySelectorAll('.v9-product-card')];
    if (!search || !cards.length) return;
    search.addEventListener('input', () => {
      const term = search.value.trim().toLowerCase();
      cards.forEach(card => {
        const haystack = (card.dataset.productName || card.textContent || '').toLowerCase();
        card.style.display = !term || haystack.includes(term) ? '' : 'none';
      });
    });
  });
})();

// V42: carrinho local da loja. Não grava saldo no navegador; o servidor recalcula tudo na finalização.
(() => {
  const KEY = 'sz_store_cart_v42';
  function money(n) { try { return new Intl.NumberFormat('pt-BR').format(Math.max(0, Math.floor(Number(n || 0)))); } catch (_) { return String(n || 0); } }
  function read() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (_) { return []; } }
  function write(items) { localStorage.setItem(KEY, JSON.stringify(items)); window.dispatchEvent(new CustomEvent('sz-cart-updated')); }
  function productFromCard(card) {
    return {
      productId: card?.dataset.cartProductId,
      name: card?.dataset.cartName,
      category: card?.dataset.cartCategory,
      serverType: card?.dataset.cartServer || 'vanilla',
      priceCoins: Number(card?.dataset.cartPrice || 0),
      imageUrl: card?.dataset.cartImage || '/images/no-real-image.svg',
      quantity: 1
    };
  }
  function addItem(product) {
    if (!product.productId) return;
    const items = read();
    const existing = items.find(i => i.productId === product.productId);
    if (existing) existing.quantity = Math.min(10, Number(existing.quantity || 1) + 1);
    else items.push(product);
    write(items);
    const burst = document.createElement('div');
    burst.className = 'cart-added-burst-v42';
    burst.innerHTML = '<strong>🧺 Adicionado ao carrinho</strong><span>' + (product.name || 'Produto') + '</span>';
    document.body.appendChild(burst);
    requestAnimationFrame(() => burst.classList.add('show'));
    setTimeout(() => burst.remove(), 1300);
  }
  function render() {
    const box = document.getElementById('floatingCartV42');
    if (!box) return;
    const items = read().filter(i => i && i.productId);
    const count = items.reduce((sum, i) => sum + Number(i.quantity || 1), 0);
    const total = items.reduce((sum, i) => sum + Number(i.priceCoins || 0) * Number(i.quantity || 1), 0);
    box.hidden = count <= 0;
    const countEl = box.querySelector('[data-cart-count]');
    const totalEl = box.querySelector('[data-cart-total]');
    const list = box.querySelector('[data-cart-items]');
    if (countEl) countEl.textContent = String(count);
    if (totalEl) totalEl.textContent = money(total);
    if (list) {
      list.innerHTML = items.slice(0, 6).map(item => `
        <div class="floating-cart-item-v42">
          <img src="${item.imageUrl || '/images/no-real-image.svg'}" alt="">
          <div><strong>${item.name || 'Produto'}</strong><small>${Number(item.quantity || 1)}x • RZ ${money(Number(item.priceCoins || 0) * Number(item.quantity || 1))}</small></div>
        </div>
      `).join('') + (items.length > 6 ? `<small class="muted">+${items.length - 6} itens no carrinho</small>` : '');
    }
  }
  document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('clearCart') === '1') {
      write([]);
      params.delete('clearCart');
      const cleanQuery = params.toString();
      const cleanUrl = window.location.pathname + (cleanQuery ? `?${cleanQuery}` : '') + window.location.hash;
      window.history.replaceState({}, '', cleanUrl);
    }
    document.querySelectorAll('[data-add-to-cart]').forEach(btn => {
      btn.addEventListener('click', () => addItem(productFromCard(btn.closest('[data-cart-product-id]'))));
    });
    document.querySelectorAll('[data-cart-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const panel = document.querySelector('[data-cart-panel]');
        if (panel) panel.hidden = !panel.hidden;
      });
    });
    document.querySelectorAll('[data-cart-clear]').forEach(btn => {
      btn.addEventListener('click', () => { write([]); render(); });
    });
    render();
  });
  window.addEventListener('sz-cart-updated', render);
})();

// V42: contador do carrinho no topo.
(() => {
  const KEY = 'sz_store_cart_v42';
  function count() { try { return (JSON.parse(localStorage.getItem(KEY) || '[]') || []).reduce((s,i)=>s+Number(i.quantity||1),0); } catch (_) { return 0; } }
  function render() { document.querySelectorAll('[data-nav-cart-count]').forEach(el => { el.textContent = String(count()); }); }
  document.addEventListener('DOMContentLoaded', render);
  window.addEventListener('sz-cart-updated', render);
  window.addEventListener('storage', render);
})();

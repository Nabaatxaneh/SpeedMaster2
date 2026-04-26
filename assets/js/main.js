// ── ROOT PATH ──────────────────────────────────────────────────────────────
// Detect depth: index.html is root (root=''), sub-pages use root='../'
(function () {
  'use strict';

  var path = window.location.pathname;
  var root = '';
  if (
    path.indexOf('/collections/') !== -1 ||
    path.indexOf('/products/')    !== -1 ||
    path.indexOf('/pages/')       !== -1 ||
    path.indexOf('/account/')     !== -1 ||
    path.indexOf('/checkout/')    !== -1
  ) {
    root = '../';
  }

  // ── HEADER HTML ───────────────────────────────────────────────────────────
  var headerHTML = `
<div class="announcement-bar" id="announcement-bar">
  <span id="announce-text">🚚 Free delivery on orders over £200 &nbsp;·&nbsp; Up to 3-year warranty on all models &nbsp;·&nbsp; <a href="${root}pages/finance.html">0% finance available — apply online</a></span>
</div>
<header class="site-header" id="site-header">
  <div class="container">
    <div class="site-header__inner">
      <a href="${root}index.html" class="site-header__logo" aria-label="SpeedMaster home">
        <img src="${root}brand_assets/logo.png" alt="SpeedMaster" width="96" height="44">
      </a>
      <button class="hamburger" id="hamburger" aria-label="Toggle navigation" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
      <nav aria-label="Primary navigation">
        <ul class="site-nav" id="site-nav">
          <li><a class="site-nav__link" href="${root}collections/e-scooters.html">E-Scooters</a></li>
          <li><a class="site-nav__link" href="${root}collections/e-bikes.html">E-Bikes</a></li>
          <li><a class="site-nav__link" href="${root}collections/parts-accessories.html">Parts &amp; Accessories</a></li>
          <li><a class="site-nav__link" href="${root}pages/repairs.html">Repairs</a></li>
          <li><a class="site-nav__link" href="${root}pages/stores.html">Stores</a></li>
        </ul>
      </nav>
      <div class="site-header__actions">
        <button class="icon-btn" aria-label="Search">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>
        <a class="icon-btn" id="account-btn" href="${root}account/dashboard.html" aria-label="My account" style="text-decoration:none;">
          <svg id="account-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          <span id="account-initials-badge" class="account-initials" style="display:none;"></span>
        </a>
        <button class="icon-btn" id="cart-btn" aria-label="Cart — 0 items">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <span class="cart-pill">0</span>
        </button>
      </div>
    </div>
  </div>
</header>`;

  // ── FOOTER HTML ───────────────────────────────────────────────────────────
  var footerHTML = `
<footer class="site-footer" aria-label="Site footer">
  <div class="container">
    <div class="footer__grid">

      <!-- Quick Links -->
      <div>
        <h3 class="footer-col__heading">Quick Links</h3>
        <ul class="footer-col__links">
          <li><a href="${root}collections/e-scooters.html">E-Scooters</a></li>
          <li><a href="${root}collections/e-bikes.html">E-Bikes</a></li>
          <li><a href="${root}collections/parts-accessories.html">Parts &amp; Accessories</a></li>
          <li><a href="${root}pages/repairs.html">Book a Repair</a></li>
          <li><a href="${root}pages/finance.html">Finance Options</a></li>
          <li><a href="#">Gift Cards</a></li>
          <li><a href="${root}pages/about.html">About Us</a></li>
          <li><a href="${root}pages/contact.html">Contact</a></li>
        </ul>
      </div>

      <!-- England -->
      <div>
        <h3 class="footer-col__heading">SpeedMaster in England</h3>
        <div class="footer-address">
          <strong>Birmingham</strong><br>
          42 Corporation Street<br>
          Birmingham, B4 6SX<br>
          Tel: <a href="tel:01212345678">0121 234 5678</a>
        </div>
        <div class="footer-address">
          <strong>Manchester</strong><br>
          18 Deansgate<br>
          Manchester, M3 2QS<br>
          Tel: <a href="tel:01613456789">0161 345 6789</a>
        </div>
      </div>

      <!-- Scotland -->
      <div>
        <h3 class="footer-col__heading">SpeedMaster in Scotland</h3>
        <div class="footer-address">
          <strong>Glasgow</strong><br>
          25 Buchanan Street<br>
          Glasgow, G1 3HL<br>
          Tel: <a href="tel:01414567890">0141 456 7890</a>
        </div>
        <div class="footer-address">
          <strong>Edinburgh</strong><br>
          14 Princes Street<br>
          Edinburgh, EH2 2BY<br>
          Tel: <a href="tel:01315678901">0131 567 8901</a>
        </div>
      </div>

      <!-- Social + Newsletter -->
      <div>
        <h3 class="footer-col__heading">Follow Us</h3>
        <div class="social-row">
          <a href="#" class="social-btn" aria-label="Facebook">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
          </a>
          <a href="#" class="social-btn" aria-label="Instagram">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
          </a>
          <a href="#" class="social-btn" aria-label="TikTok">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34v-7.1a8.16 8.16 0 0 0 4.77 1.52V6.26a4.85 4.85 0 0 1-1-.57z"/></svg>
          </a>
          <a href="#" class="social-btn" aria-label="YouTube">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon fill="#0E0E0E" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>
          </a>
          <a href="#" class="social-btn" aria-label="X / Twitter">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
        </div>
        <h3 class="footer-col__heading">Newsletter</h3>
        <div class="newsletter-form">
          <p>Exclusive deals, new arrivals, and ride tips — straight to your inbox.</p>
          <div class="newsletter-row">
            <label for="footer-email" class="sr-only">Email address</label>
            <input id="footer-email" class="newsletter-input" type="email" placeholder="Your email address" autocomplete="email">
            <button class="btn btn--primary btn--sm">GO</button>
          </div>
        </div>
      </div>

    </div>

    <!-- Footer bottom -->
    <div class="footer-bottom">
      <p class="footer-copy">© 2026 SpeedMaster Ltd. All rights reserved. Registered in England &amp; Wales. VAT No. GB 123 456 789.</p>
      <ul class="footer-legal">
        <li><a href="${root}pages/privacy.html">Privacy Policy</a></li>
        <li><a href="${root}pages/terms.html">Terms of Service</a></li>
        <li><a href="${root}pages/cookies.html">Cookie Policy</a></li>
        <li><a href="${root}pages/accessibility.html">Accessibility</a></li>
      </ul>
      <div class="payment-row">
        <span class="pay-chip">VISA</span>
        <span class="pay-chip">MC</span>
        <span class="pay-chip">AMEX</span>
        <span class="pay-chip">PAYPAL</span>
        <span class="pay-chip">KLARNA</span>
        <span class="pay-chip">APPLE PAY</span>
      </div>
    </div>

  </div>
</footer>`;

  // ── CART DRAWER HTML ──────────────────────────────────────────────────────
  var cartHTML = `
<div class="cart-overlay" id="cart-overlay"></div>
<div class="cart-drawer" id="cart-drawer" role="dialog" aria-modal="true" aria-label="Shopping cart">
  <div class="cart-drawer__header">
    <span>Your Cart (<span id="cart-header-count">0</span>)</span>
    <button class="cart-drawer__close" id="cart-close" aria-label="Close cart">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  </div>
  <div class="cart-drawer__body" id="cart-drawer-body">
  </div>
  <div class="cart-drawer__footer" id="cart-footer" style="display:none">
    <div class="cart-drawer__subtotal">
      <span class="cart-drawer__subtotal-label">Subtotal</span>
      <span class="cart-drawer__subtotal-val" id="cart-total">£0.00</span>
    </div>
    <a href="${root}checkout/index.html" class="btn btn--primary" style="width:100%;margin-bottom:0.5rem;text-align:center;">CHECKOUT</a>
    <a href="${root}collections/all-products.html" class="btn btn--ghost btn--sm" style="width:100%;text-align:center;">Continue Shopping</a>
  </div>
</div>
<div class="sm-toast" id="sm-toast"></div>`;

  // ── INJECT HTML ────────────────────────────────────────────────────────────
  var headerEl = document.getElementById('sm-header');
  var footerEl = document.getElementById('sm-footer');
  if (headerEl) headerEl.outerHTML = headerHTML;
  if (footerEl) {
    footerEl.outerHTML = footerHTML;
    document.body.insertAdjacentHTML('beforeend', cartHTML);
  }

  // ── CART DRAWER RENDER ────────────────────────────────────────────────────
  function renderCartDrawer() {
    var body   = document.getElementById('cart-drawer-body');
    var footer = document.getElementById('cart-footer');
    var pill   = document.querySelector('.cart-pill');
    var headerCount = document.getElementById('cart-header-count');
    var totalEl = document.getElementById('cart-total');
    if (!body) return;

    var cart  = (typeof SM !== 'undefined') ? SM.getCart() : [];
    var count = (typeof SM !== 'undefined') ? SM.cartCount() : 0;
    var total = (typeof SM !== 'undefined') ? SM.cartTotal() : 0;

    if (pill) pill.textContent = count;
    if (headerCount) headerCount.textContent = count;
    if (totalEl && typeof SM !== 'undefined') totalEl.textContent = SM.fmt(total);

    if (cart.length === 0) {
      body.innerHTML = `
        <div class="cart-drawer__empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto 1rem;opacity:0.3">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <p>Your cart is empty.</p>
          <a href="${root}collections/all-products.html" class="btn btn--primary btn--sm">Continue Shopping</a>
        </div>`;
      if (footer) footer.style.display = 'none';
    } else {
      var html = '';
      cart.forEach(function (item) {
        var thumbHtml = item.thumb
          ? '<img src="' + item.thumb + '" alt="' + item.name + '">'
          : '<div style="width:100%;height:100%;background:var(--color-bg-muted);display:flex;align-items:center;justify-content:center;font-size:0.625rem;color:var(--color-text-muted);">IMG</div>';
        html += `
          <div class="cart-item" data-id="${item.id}" data-color="${item.color || ''}">
            <div class="cart-item__thumb">${thumbHtml}</div>
            <div class="cart-item__info">
              <div class="cart-item__name">${item.name}</div>
              ${item.color ? '<div class="cart-item__meta">' + item.color + '</div>' : ''}
              <div class="cart-item__price">${typeof SM !== 'undefined' ? SM.fmt(item.price * item.qty) : '£' + (item.price * item.qty).toFixed(2)}</div>
              <div class="cart-item__controls">
                <button class="cart-item__qty-btn" data-action="minus" aria-label="Decrease quantity">−</button>
                <span class="cart-item__qty-val">${item.qty}</span>
                <button class="cart-item__qty-btn" data-action="plus" aria-label="Increase quantity">+</button>
              </div>
            </div>
            <button class="cart-item__remove" aria-label="Remove item">×</button>
          </div>`;
      });
      body.innerHTML = html;
      if (footer) footer.style.display = 'block';

      // Wire qty buttons
      body.querySelectorAll('.cart-item').forEach(function (row) {
        var id    = row.dataset.id;
        var color = row.dataset.color;
        var qtyEl = row.querySelector('.cart-item__qty-val');
        row.querySelector('[data-action="minus"]').addEventListener('click', function () {
          var qty = parseInt(qtyEl.textContent) - 1;
          if (typeof SM !== 'undefined') SM.updateQty(id, color, qty);
        });
        row.querySelector('[data-action="plus"]').addEventListener('click', function () {
          var qty = parseInt(qtyEl.textContent) + 1;
          if (typeof SM !== 'undefined') SM.updateQty(id, color, qty);
        });
        row.querySelector('.cart-item__remove').addEventListener('click', function () {
          if (typeof SM !== 'undefined') SM.removeFromCart(id, color);
        });
      });
    }
  }

  // ── ANNOUNCEMENT BAR ROTATION ─────────────────────────────────────────────
  var messages = [
    '🚚 Free delivery on orders over £200 &nbsp;·&nbsp; Up to 3-year warranty on all models &nbsp;·&nbsp; <a href="' + root + 'pages/finance.html">0% finance available — apply online</a>',
    '⚡ New 2026 models now in stock — E-Bikes from £899 &nbsp;·&nbsp; E-Scooters from £599',
    '🛠 Official UK repair centre — <a href="' + root + 'pages/repairs.html">Book a service today</a> &nbsp;·&nbsp; 90-day repair guarantee'
  ];
  var msgIndex = 0;
  var announceEl = document.getElementById('announce-text');
  if (announceEl) {
    setInterval(function () {
      msgIndex = (msgIndex + 1) % messages.length;
      announceEl.style.opacity = '0';
      setTimeout(function () {
        announceEl.innerHTML = messages[msgIndex];
        announceEl.style.opacity = '1';
      }, 300);
    }, 4000);
    if (announceEl.style) {
      announceEl.style.transition = 'opacity 0.3s ease';
    }
  }

  // ── MOBILE HAMBURGER ──────────────────────────────────────────────────────
  var hamburger = document.getElementById('hamburger');
  var siteNav   = document.getElementById('site-nav');
  if (hamburger && siteNav) {
    hamburger.addEventListener('click', function () {
      var isOpen = siteNav.classList.toggle('is-open');
      hamburger.classList.toggle('is-open', isOpen);
      hamburger.setAttribute('aria-expanded', String(isOpen));
    });
    document.addEventListener('click', function (e) {
      if (!hamburger.contains(e.target) && !siteNav.contains(e.target)) {
        siteNav.classList.remove('is-open');
        hamburger.classList.remove('is-open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ── CART DRAWER OPEN/CLOSE ────────────────────────────────────────────────
  function openCart() {
    var overlay = document.getElementById('cart-overlay');
    var drawer  = document.getElementById('cart-drawer');
    if (overlay && drawer) {
      overlay.classList.add('is-open');
      drawer.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }
  }
  function closeCart() {
    var overlay = document.getElementById('cart-overlay');
    var drawer  = document.getElementById('cart-drawer');
    if (overlay && drawer) {
      overlay.classList.remove('is-open');
      drawer.classList.remove('is-open');
      document.body.style.overflow = '';
    }
  }
  var cartBtn     = document.getElementById('cart-btn');
  var cartClose   = document.getElementById('cart-close');
  var cartOverlay = document.getElementById('cart-overlay');
  if (cartBtn)     cartBtn.addEventListener('click', openCart);
  if (cartClose)   cartClose.addEventListener('click', closeCart);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeCart();
  });

  // ── INITIAL RENDER + REACTIVE UPDATE ─────────────────────────────────────
  renderCartDrawer();
  document.addEventListener('sm:cart:updated', renderCartDrawer);

  // ── ACCOUNT STATE INDICATOR ───────────────────────────────────────────────
  function updateAccountIndicator() {
    var svg    = document.getElementById('account-icon-svg');
    var badge  = document.getElementById('account-initials-badge');
    if (!svg || !badge) return;
    var user = (typeof SM !== 'undefined') ? SM.currentUser() : null;
    if (user) {
      var initials = ((user.firstName || '').charAt(0) + (user.lastName || '').charAt(0)).toUpperCase() || user.email.charAt(0).toUpperCase();
      badge.textContent = initials;
      badge.style.display = 'flex';
      svg.style.display   = 'none';
    } else {
      badge.style.display = 'none';
      svg.style.display   = 'block';
    }
  }
  updateAccountIndicator();
  document.addEventListener('sm:auth:changed', updateAccountIndicator);

  // ── ADD TO CART WIRING ────────────────────────────────────────────────────
  document.querySelectorAll('[data-add-to-cart]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (typeof SM === 'undefined') return;
      var item = {
        id:       btn.dataset.productId    || 'unknown',
        name:     btn.dataset.productName  || 'Product',
        price:    parseFloat(btn.dataset.productPrice) || 0,
        qty:      1,
        thumb:    btn.dataset.productThumb || '',
        category: btn.dataset.productCat   || '',
        color:    btn.dataset.productColor || ''
      };
      SM.addToCart(item);
      openCart();
      var orig = btn.textContent;
      btn.textContent = '✓ Added!';
      btn.disabled = true;
      setTimeout(function () { btn.textContent = orig; btn.disabled = false; }, 1500);
    });
  });

  // ── FILTER TABS ───────────────────────────────────────────────────────────
  document.querySelectorAll('.filter-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      var group = tab.closest('[role="tablist"]') || tab.parentElement;
      group.querySelectorAll('.filter-tab').forEach(function (t) {
        t.classList.remove('filter-tab--active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('filter-tab--active');
      tab.setAttribute('aria-selected', 'true');
    });
  });

  // ── PDP TAB SWITCHING ─────────────────────────────────────────────────────
  document.querySelectorAll('.pdp__tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var tabs   = document.querySelectorAll('.pdp__tab-btn');
      var panels = document.querySelectorAll('.pdp__tab-panel');
      var target = btn.dataset.tab;
      tabs.forEach(function (t) { t.classList.remove('pdp__tab-btn--active'); });
      panels.forEach(function (p) { p.classList.remove('pdp__tab-panel--active'); });
      btn.classList.add('pdp__tab-btn--active');
      var panel = document.getElementById('tab-' + target);
      if (panel) panel.classList.add('pdp__tab-panel--active');
    });
  });

  // ── PDP THUMBNAIL SWITCHING ──────────────────────────────────────────────
  document.querySelectorAll('.pdp__thumb').forEach(function (thumb) {
    thumb.addEventListener('click', function () {
      document.querySelectorAll('.pdp__thumb').forEach(function (t) { t.classList.remove('is-active'); });
      thumb.classList.add('is-active');
      var mainImg = document.getElementById('pdp-main-img');
      var src = thumb.dataset.src;
      if (mainImg && src) mainImg.src = src;
    });
  });

  // ── ACCORDION ─────────────────────────────────────────────────────────────
  document.querySelectorAll('.accordion-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var body   = btn.nextElementSibling;
      var isOpen = btn.classList.toggle('is-open');
      if (body) body.classList.toggle('is-open', isOpen);
      btn.setAttribute('aria-expanded', String(isOpen));
    });
  });

  // ── QTY SELECTOR ─────────────────────────────────────────────────────────
  document.querySelectorAll('.qty-selector').forEach(function (sel) {
    var input    = sel.querySelector('.qty-input');
    var btnMinus = sel.querySelector('[data-action="minus"]');
    var btnPlus  = sel.querySelector('[data-action="plus"]');
    if (btnMinus && input) {
      btnMinus.addEventListener('click', function () {
        var val = parseInt(input.value, 10) || 1;
        if (val > 1) input.value = val - 1;
      });
    }
    if (btnPlus && input) {
      btnPlus.addEventListener('click', function () {
        var val = parseInt(input.value, 10) || 1;
        input.value = val + 1;
      });
    }
  });

})();

/* -------------------------------------------------------------
 * VELIN PREMIUM E-COMMERCE CORE SCRIPT
 * Author: Senior Frontend Architect & UI Designer
 * ------------------------------------------------------------- */

// GLOBAL APPLICATION STATE
const state = {
  settings: null,
  categories: [],
  collections: [],
  products: [],
  cart: [],
  wishlist: [],
  activeColor: null,
  activeSize: null,
  currentProductQty: 1,
  filters: {
    category: [],
    size: [],
    color: [],
    priceMin: null,
    priceMax: null,
    onSale: false,
    inStock: false
  },
  sortBy: 'featured'
};

// INITIALIZATION
document.addEventListener('DOMContentLoaded', async () => {
  // Load Local Storage Cart & Wishlist
  loadLocalStorage();

  // Fetch JSON catalogs
  const loaded = await fetchAllData();
  if (!loaded) {
    showFatalError();
    return;
  }

  // Setup Global Navigation UI & Dropdowns
  setupGlobalUI();

  // Router init
  window.addEventListener('hashchange', handleRoute);
  // Initial route trigger
  handleRoute();

  // Watch scroll for sticky headers
  window.addEventListener('scroll', handleHeaderScroll);

  // Handle responsive hero media swaps on window resize
  window.addEventListener('resize', handleHeroResize);
});

/* -------------------------------------------------------------
 * DATA FETCHING & STORAGE
 * ------------------------------------------------------------- */
async function fetchAllData() {
  try {
    const [settingsRes, categoriesRes, collectionsRes, productsRes] = await Promise.all([
      fetch('data/settings.json'),
      fetch('data/categories.json'),
      fetch('data/collections.json'),
      fetch('data/products.json')
    ]);

    if (!settingsRes.ok || !categoriesRes.ok || !collectionsRes.ok || !productsRes.ok) {
      throw new Error('One or more configuration files failed to load.');
    }

    state.settings = await settingsRes.json();
    state.categories = await categoriesRes.json();
    state.collections = await collectionsRes.json();
    state.products = await productsRes.json();

    return true;
  } catch (error) {
    console.error('VELIN Initialization Error:', error);
    return false;
  }
}

function loadLocalStorage() {
  state.cart = JSON.parse(localStorage.getItem('velin_cart')) || [];
  state.wishlist = JSON.parse(localStorage.getItem('velin_wishlist')) || [];
  updateHeaderBadges();
}

function saveCartToStorage() {
  localStorage.setItem('velin_cart', JSON.stringify(state.cart));
  updateHeaderBadges();
  renderCartDrawer();
}

function saveWishlistToStorage() {
  localStorage.setItem('velin_wishlist', JSON.stringify(state.wishlist));
  updateHeaderBadges();
}

/* -------------------------------------------------------------
 * ROUTER (HASH-BASED SPA)
 * ------------------------------------------------------------- */
function handleRoute() {
  const hash = window.location.hash || '#/';
  closeDrawers();
  
  // Reset scroll position to top on page transition
  window.scrollTo({ top: 0, behavior: 'instant' });

  // Update active tab state in mobile bottom nav
  updateMobileBottomNavActiveTab(hash);

  // Home Route
  if (hash === '#/' || hash === '#') {
    renderHomeView();
    return;
  }

  // Category Route: #/category/:slug
  if (hash.startsWith('#/category/')) {
    const slug = hash.replace('#/category/', '');
    renderCatalogView('category', slug);
    return;
  }

  // Collection Route: #/collections or #/collections/:slug or #/collection/:slug
  if (hash.startsWith('#/collections') || hash.startsWith('#/collection/')) {
    let slug = hash.replace('#/collections/', '').replace('#/collections', '').replace('#/collection/', '');
    if (slug === '' || slug === '#/collections') {
      renderAllCollectionsView();
    } else {
      renderCatalogView('collection', slug);
    }
    return;
  }

  // Product Route: #/product/:slug
  if (hash.startsWith('#/product/')) {
    const slug = hash.replace('#/product/', '');
    renderProductView(slug);
    return;
  }

  // Wishlist Route
  if (hash === '#/wishlist') {
    renderWishlistView();
    return;
  }

  // About / Brand Editorial Route
  if (hash === '#/about') {
    renderAboutView();
    return;
  }

  // Fallback -> renderHome
  renderHomeView();
}

/* -------------------------------------------------------------
 * GLOBAL LAYOUT & NAV UI SETUP
 * ------------------------------------------------------------- */
function setupGlobalUI() {
  const s = state.settings;
  const brand = s.branding;

  // Set brand title default
  document.title = `${brand.name} | ${brand.tagline}`;

  // Build Desktop Dropdown Navigation for CLOTHING
  const clothingDropdown = document.getElementById('clothing-dropdown');
  let clothingHTML = '';
  // Default All Clothing link
  clothingHTML += `<a href="#/category/clothing" class="dropdown-link">ALL CLOTHING</a>`;
  state.categories.forEach(cat => {
    clothingHTML += `<a href="#/category/${cat.slug}" class="dropdown-link">${cat.name}</a>`;
  });
  clothingDropdown.innerHTML = clothingHTML;

  // Build Desktop Dropdown Navigation for COLLECTIONS
  const collectionsDropdown = document.getElementById('collections-dropdown');
  let collectionsHTML = '';
  collectionsHTML += `<a href="#/collections" class="dropdown-link">ALL COLLECTIONS</a>`;
  state.collections.forEach(col => {
    collectionsHTML += `<a href="#/collections/${col.slug}" class="dropdown-link">${col.name}</a>`;
  });
  collectionsDropdown.innerHTML = collectionsHTML;

  // Build Mobile Menu Accordion Dropdowns
  const mobileClothingSubmenu = document.getElementById('mobile-clothing-submenu');
  let mobClothingHTML = `<li><a href="#/category/clothing" class="mobile-submenu-link">ALL CLOTHING</a></li>`;
  state.categories.forEach(cat => {
    mobClothingHTML += `<li><a href="#/category/${cat.slug}" class="mobile-submenu-link">${cat.name}</a></li>`;
  });
  mobileClothingSubmenu.innerHTML = mobClothingHTML;

  const mobileCollectionsSubmenu = document.getElementById('mobile-collections-submenu');
  let mobCollectionsHTML = `<li><a href="#/collections" class="mobile-submenu-link">ALL COLLECTIONS</a></li>`;
  state.collections.forEach(col => {
    mobCollectionsHTML += `<li><a href="#/collections/${col.slug}" class="mobile-submenu-link">${col.name}</a></li>`;
  });
  mobileCollectionsSubmenu.innerHTML = mobCollectionsHTML;

  // Configure Announcement Bar
  const announcementBar = document.getElementById('announcement-bar');
  if (s.featureFlags.announcementBar && s.announcementBar.enabled) {
    announcementBar.classList.remove('hidden');
    const annText = document.getElementById('announcement-text');
    let messages = s.announcementBar.messages || [];
    if (messages.length > 0) {
      annText.innerHTML = messages.join(' &nbsp; | &nbsp; ');
    }
  } else {
    announcementBar.classList.add('hidden');
  }

  // Dismiss Announcement
  document.getElementById('close-announcement').addEventListener('click', () => {
    announcementBar.classList.add('hidden');
  });

  // Inject Logo Monogram Standalone SVG
  const monogramBox = document.getElementById('logo-monogram');
  monogramBox.innerHTML = brand.logoSymbol;

  // Set Mobile Drawer & Footer contact details from settings.json
  const contact = s.contact;
  document.getElementById('mobile-whatsapp-btn').href = `https://wa.me/${contact.whatsapp}`;
  document.getElementById('mobile-address').textContent = contact.address;

  document.getElementById('footer-contact-whatsapp').textContent = contact.phone;
  document.getElementById('footer-contact-whatsapp').href = `https://wa.me/${contact.whatsapp}`;
  document.getElementById('footer-contact-email').textContent = contact.email;
  document.getElementById('footer-contact-email').href = `mailto:${contact.email}`;
  document.getElementById('footer-contact-address').textContent = contact.address;

  // Configure Feature Flags
  if (s.featureFlags.mobileBottomNav) {
    document.getElementById('mobile-bottom-nav').classList.add('enabled');
  } else {
    document.getElementById('mobile-bottom-nav').classList.remove('enabled');
  }

  // Dynamic social links in footer
  document.getElementById('footer-social-instagram').href = contact.socials.instagram;
  document.getElementById('footer-social-facebook').href = contact.socials.facebook;
  document.getElementById('footer-social-tiktok').href = contact.socials.tiktok;
  document.getElementById('footer-social-whatsapp').href = contact.socials.whatsapp;

  // Attach Header drawer toggle events
  setupGlobalDrawerEvents();

  // Size Guide events
  setupSizeGuideEvents();

  // Initial Cart render inside drawer
  renderCartDrawer();
}

function handleHeaderScroll() {
  const header = document.getElementById('main-header');
  if (window.scrollY > 50) {
    header.style.backgroundColor = 'var(--color-bg)';
    header.style.boxShadow = '0 4px 20px rgba(30, 27, 24, 0.02)';
  } else {
    header.style.backgroundColor = 'var(--color-bg)';
    header.style.boxShadow = 'none';
  }
}

function updateHeaderBadges() {
  const cartCountVal = state.cart.reduce((total, item) => total + item.quantity, 0);
  const wishlistCountVal = state.wishlist.length;

  const cartBadge = document.getElementById('cart-count');
  const mobCartBadge = document.getElementById('mobile-cart-count');
  const wishlistBadge = document.getElementById('wishlist-count');

  if (cartCountVal > 0) {
    cartBadge.textContent = cartCountVal;
    cartBadge.classList.remove('hidden');
    if (mobCartBadge) {
      mobCartBadge.textContent = cartCountVal;
      mobCartBadge.classList.remove('hidden');
    }
  } else {
    cartBadge.classList.add('hidden');
    if (mobCartBadge) mobCartBadge.classList.add('hidden');
  }

  if (wishlistCountVal > 0) {
    wishlistBadge.textContent = wishlistCountVal;
    wishlistBadge.classList.remove('hidden');
  } else {
    wishlistBadge.classList.add('hidden');
  }
}

function updateMobileBottomNavActiveTab(hash) {
  const tabs = document.querySelectorAll('.bottom-nav-tab');
  tabs.forEach(tab => tab.classList.remove('active'));

  if (hash === '#/' || hash === '#') {
    document.querySelector('.bottom-nav-tab[data-tab="home"]')?.classList.add('active');
  } else if (hash.includes('/category/')) {
    document.querySelector('.bottom-nav-tab[data-tab="shop"]')?.classList.add('active');
  } else if (hash.includes('/collection') || hash === '#/collections') {
    document.querySelector('.bottom-nav-tab[data-tab="categories"]')?.classList.add('active');
  } else if (hash === '#/wishlist') {
    document.querySelector('.bottom-nav-tab[data-tab="wishlist"]')?.classList.add('active');
  }
}

/* -------------------------------------------------------------
 * DRAWER & MODAL UI CONTROLLERS
 * ------------------------------------------------------------- */
function setupGlobalDrawerEvents() {
  // Mobile Hamburger menu drawer toggles
  const hamburger = document.getElementById('mobile-menu-toggle');
  const menuDrawer = document.getElementById('mobile-menu-drawer');
  const menuClose = document.getElementById('mobile-menu-close');
  const menuOverlay = document.getElementById('mobile-menu-overlay');

  hamburger.addEventListener('click', () => {
    menuDrawer.classList.remove('hidden');
    hamburger.setAttribute('aria-expanded', 'true');
    menuDrawer.setAttribute('aria-hidden', 'false');
  });

  const closeMenuFn = () => {
    menuDrawer.classList.add('hidden');
    hamburger.setAttribute('aria-expanded', 'false');
    menuDrawer.setAttribute('aria-hidden', 'true');
  };
  menuClose.addEventListener('click', closeMenuFn);
  menuOverlay.addEventListener('click', closeMenuFn);

  // Mobile menu accordions
  const accordions = document.querySelectorAll('.mobile-accordion-header');
  accordions.forEach(header => {
    header.addEventListener('click', () => {
      const targetId = header.dataset.target;
      const targetSubmenu = document.getElementById(targetId);
      const arrow = header.querySelector('.accordion-arrow');

      if (targetSubmenu.classList.contains('hidden')) {
        targetSubmenu.classList.remove('hidden');
        arrow.style.transform = 'rotate(180deg)';
      } else {
        targetSubmenu.classList.add('hidden');
        arrow.style.transform = 'none';
      }
    });
  });

  // Cart Drawer toggles
  const cartTrigger = document.getElementById('cart-trigger');
  const mobCartBtn = document.getElementById('mobile-cart-btn');
  const cartDrawer = document.getElementById('cart-drawer');
  const cartClose = document.getElementById('cart-close');
  const cartOverlay = document.getElementById('cart-overlay');

  const openCartFn = () => {
    cartDrawer.classList.remove('hidden');
    cartDrawer.setAttribute('aria-hidden', 'false');
    renderCartDrawer();
  };
  const closeCartFn = () => {
    cartDrawer.classList.add('hidden');
    cartDrawer.setAttribute('aria-hidden', 'true');
  };

  cartTrigger.addEventListener('click', openCartFn);
  if (mobCartBtn) mobCartBtn.addEventListener('click', openCartFn);
  cartClose.addEventListener('click', closeCartFn);
  cartOverlay.addEventListener('click', closeCartFn);
  document.getElementById('cart-continue-shopping').addEventListener('click', closeCartFn);

  // Search Overlay toggles
  const searchTrigger = document.getElementById('search-trigger');
  const searchOverlay = document.getElementById('search-overlay');
  const searchClose = document.getElementById('search-close');
  const searchCloseBg = document.getElementById('search-overlay-close-bg');
  const searchInput = document.getElementById('search-input');

  const openSearchFn = () => {
    searchOverlay.classList.remove('hidden');
    searchInput.focus();
  };
  const closeSearchFn = () => {
    searchOverlay.classList.add('hidden');
    searchInput.value = '';
    renderSearchResults('');
  };

  searchTrigger.addEventListener('click', openSearchFn);
  searchClose.addEventListener('click', closeSearchFn);
  searchCloseBg.addEventListener('click', closeSearchFn);

  // Search input typing
  searchInput.addEventListener('input', (e) => {
    renderSearchResults(e.target.value.trim());
  });

  // Search suggestion tag click
  const suggestionTags = document.querySelectorAll('.suggestion-tag');
  suggestionTags.forEach(tag => {
    tag.addEventListener('click', () => {
      const q = tag.dataset.query;
      searchInput.value = q;
      renderSearchResults(q);
    });
  });

  // Escape key close drawers & search
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDrawers();
      closeSearchFn();
      closeSizeGuide();
    }
  });
}

function closeDrawers() {
  document.getElementById('mobile-menu-drawer').classList.add('hidden');
  document.getElementById('cart-drawer').classList.add('hidden');
  document.getElementById('search-overlay').classList.add('hidden');
}

function setupSizeGuideEvents() {
  const modal = document.getElementById('size-guide-modal');
  const closeBtn = document.getElementById('size-guide-close');
  const backdrop = document.getElementById('size-guide-backdrop');

  const openSizeFn = () => {
    modal.classList.remove('hidden');
  };
  const closeSizeFn = () => {
    modal.classList.add('hidden');
  };

  closeBtn.addEventListener('click', closeSizeFn);
  backdrop.addEventListener('click', closeSizeFn);

  // Bind any element with class size-guide-trigger
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('size-guide-trigger')) {
      e.preventDefault();
      openSizeFn();
    }
  });
}

function closeSizeGuide() {
  document.getElementById('size-guide-modal').classList.add('hidden');
}

/* -------------------------------------------------------------
 * SEO & STRUCTURED DATA HELPERS
 * ------------------------------------------------------------- */
function updateSEOMetadata(seoData, defaultTitle) {
  const brandName = state.settings.branding.name;
  const title = seoData.title || `${defaultTitle} | ${brandName}`;
  const description = seoData.description || state.settings.branding.description;
  const canonical = `https://velin.com/#${seoData.canonicalPath || ''}`;
  const ogImg = seoData.ogImage ? `https://velin.com/${seoData.ogImage}` : 'https://velin.com/images/hero.jpg';

  // Head updates
  document.title = title;
  document.querySelector('meta[name="description"]').setAttribute('content', description);
  document.querySelector('link[rel="canonical"]').setAttribute('href', canonical);

  // Open Graph
  document.querySelector('meta[property="og:title"]').setAttribute('content', title);
  document.querySelector('meta[property="og:description"]').setAttribute('content', description);
  document.querySelector('meta[property="og:image"]').setAttribute('content', ogImg);
  document.querySelector('meta[property="og:url"]').setAttribute('content', canonical);
}

function injectStructuredData(schemaObj) {
  // Clear previous dynamic schemas
  const oldScripts = document.querySelectorAll('script[type="application/ld+json"].dynamic-schema');
  oldScripts.forEach(s => s.remove());

  // Inject new schema
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.className = 'dynamic-schema';
  script.text = JSON.stringify(schemaObj);
  document.head.appendChild(script);
}

function injectOrganizationSchema() {
  const s = state.settings;
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": s.branding.name,
    "url": "https://velin.com/",
    "logo": "https://velin.com/images/branding/logo.png",
    "description": s.branding.description,
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": s.contact.phone,
      "contactType": "customer service",
      "areaServed": "PK",
      "availableLanguage": "English"
    },
    "sameAs": [
      s.contact.socials.instagram,
      s.contact.socials.facebook,
      s.contact.socials.tiktok
    ]
  };
  injectStructuredData(schema);
}

function injectProductSchema(product) {
  const s = state.settings;
  const offerPrice = product.price;
  
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "image": product.images.map(img => `https://velin.com/${img}`),
    "description": product.description,
    "sku": product.id,
    "brand": {
      "@type": "Brand",
      "name": s.branding.name
    },
    "offers": {
      "@type": "Offer",
      "url": `https://velin.com/#/product/${product.slug}`,
      "priceCurrency": product.currency || s.store.currencyCode,
      "price": offerPrice,
      "itemCondition": "https://schema.org/NewCondition",
      "availability": product.stockStatus === 'out-of-stock' ? "https://schema.org/OutOfStock" : "https://schema.org/InStock"
    }
  };
  injectStructuredData(schema);
}

/* -------------------------------------------------------------
 * SEARCH LOGIC & OVERLAY RENDERING
 * ------------------------------------------------------------- */
function renderSearchResults(query) {
  const container = document.getElementById('search-results-container');
  
  if (!query) {
    // Show initial suggestion state
    container.innerHTML = `
      <div class="search-initial-state">
        <p class="text-xs uppercase tracking-widest text-muted mb-4">Suggested Searches</p>
        <div class="flex flex-wrap gap-2" id="search-suggestions">
          <button class="suggestion-tag" data-query="Tee">Oversized Tee</button>
          <button class="suggestion-tag" data-query="Linen">Linen</button>
          <button class="suggestion-tag" data-query="Shirt">Shirt</button>
          <button class="suggestion-tag" data-query="Hoodie">Hoodie</button>
          <button class="suggestion-tag" data-query="Accessories">Accessories</button>
        </div>
      </div>
    `;
    
    // Bind new buttons
    container.querySelectorAll('.suggestion-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        document.getElementById('search-input').value = tag.dataset.query;
        renderSearchResults(tag.dataset.query);
      });
    });
    return;
  }

  const q = query.toLowerCase();
  
  // Client-side search across fields
  const results = state.products.filter(p => 
    p.name.toLowerCase().includes(q) ||
    p.description.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q) ||
    p.tags.some(tag => tag.toLowerCase().includes(q))
  );

  if (results.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h4 class="empty-state-title">NO RESULTS FOUND</h4>
        <p class="empty-state-desc">We couldn't find anything matching "${query}". Try another search term or browse our categories.</p>
        <a href="#/category/clothing" class="btn btn-primary text-xs" onclick="closeDrawers();">BROWSE CLOTHING</a>
      </div>
    `;
    return;
  }

  // Draw Grid of matching products
  let gridHTML = `
    <p class="text-xs uppercase tracking-widest text-muted mb-4">${results.length} results matching "${query}"</p>
    <div class="search-results-grid">
  `;
  results.forEach(product => {
    gridHTML += generateProductCardHTML(product);
  });
  gridHTML += `</div>`;
  container.innerHTML = gridHTML;
}

/* -------------------------------------------------------------
 * REUSABLE COMPONENT GENERATORS
 * ------------------------------------------------------------- */
function generateProductCardHTML(product) {
  const isWishlisted = state.wishlist.includes(product.id);
  const primaryImg = product.images[0] || 'images/placeholder.jpg';
  // Hover image swap to 2nd image if exists, else first
  const hoverImg = product.images[1] || primaryImg;

  // Pricing with compareAt strikeout
  let priceHTML = `<span class="price-current">Rs. ${product.price.toLocaleString()}</span>`;
  if (product.compareAtPrice > product.price) {
    priceHTML = `
      <span class="price-current">Rs. ${product.price.toLocaleString()}</span>
      <span class="price-compare">Rs. ${product.compareAtPrice.toLocaleString()}</span>
    `;
  }

  // Swatches
  let swatchesHTML = '';
  if (product.colors && product.colors.length > 1) {
    swatchesHTML += `<div class="product-card-swatches">`;
    product.colors.forEach((col, idx) => {
      const activeClass = idx === 0 ? 'active' : '';
      swatchesHTML += `
        <span class="swatch-dot ${activeClass}" 
              style="background-color: ${col.hex};" 
              title="${col.name}" 
              data-product-id="${product.id}" 
              data-color-name="${col.name}"
              data-img-index="${product.images.indexOf(col.images[0])}">
        </span>
      `;
    });
    swatchesHTML += `</div>`;
  }

  // Badges (computed)
  let badgeHTML = '';
  if (product.newArrival) {
    badgeHTML += `<span class="product-badge">NEW</span>`;
  }
  if (product.compareAtPrice > product.price) {
    badgeHTML += `<span class="product-badge sale-badge">SALE</span>`;
  }
  product.badges.forEach(b => {
    if (b !== 'NEW' && b !== 'SALE') {
      badgeHTML += `<span class="product-badge">${b}</span>`;
    }
  });

  return `
    <article class="product-card" data-id="${product.id}">
      <div class="product-card-photo-panel">
        <a href="#/product/${product.slug}">
          <img class="product-card-img" src="${primaryImg}" alt="${product.name}" loading="lazy">
          <img class="product-card-img product-card-img-hover" src="${hoverImg}" alt="${product.name} alternate hover image" loading="lazy">
        </a>
        <div class="product-badge-list">
          ${badgeHTML}
        </div>
        <button class="wishlist-toggle-btn ${isWishlisted ? 'active' : ''}" 
                aria-label="Add ${product.name} to wishlist" 
                data-id="${product.id}">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>
        <button class="product-card-quick-add uppercase tracking-widest text-xs" data-id="${product.id}">
          QUICK ADD
        </button>
      </div>
      <div class="product-card-info">
        <a href="#/product/${product.slug}">
          <h3 class="product-card-name font-sans text-sm">${product.name}</h3>
        </a>
        <div class="product-card-price-row font-sans">
          ${priceHTML}
        </div>
        ${swatchesHTML}
      </div>
    </article>
  `;
}

// Bind clicks on generated product cards (wishlist hearts, swatches, quick add)
function bindProductCardListeners(container) {
  // Wishlist Heart triggers
  container.querySelectorAll('.wishlist-toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const id = btn.dataset.id;
      toggleWishlist(id, btn);
    });
  });

  // Swatch Image Swapping on Hover/Click
  container.querySelectorAll('.swatch-dot').forEach(dot => {
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      const pId = dot.dataset.productId;
      const colName = dot.dataset.colorName;
      const imgIdx = parseInt(dot.dataset.imgIndex);
      
      const product = state.products.find(p => p.id === pId);
      if (!product) return;

      // Find color-specific images
      const colorObj = product.colors.find(c => c.name === colName);
      if (colorObj && colorObj.images && colorObj.images.length > 0) {
        const card = dot.closest('.product-card');
        const cardImg = card.querySelector('.product-card-img');
        cardImg.src = colorObj.images[0];
        
        const cardHoverImg = card.querySelector('.product-card-img-hover');
        if (cardHoverImg) {
          cardHoverImg.src = colorObj.images[1] || colorObj.images[0];
        }
      }

      // Mark dot active
      dot.parentNode.querySelectorAll('.swatch-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
    });
  });

  // Quick Add Trigger
  container.querySelectorAll('.product-card-quick-add').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const pId = btn.dataset.id;
      const product = state.products.find(p => p.id === pId);
      if (product) {
        // Quick add first available size and color
        const firstSize = product.sizes[0] || 'One Size';
        const firstColor = product.colors[0]?.name || 'Standard';
        addToCart(product.id, firstSize, firstColor, 1);
        
        // Launch cart drawer
        document.getElementById('cart-drawer').classList.remove('hidden');
        renderCartDrawer();
      }
    });
  });
}

function toggleWishlist(productId, btnElement) {
  const index = state.wishlist.indexOf(productId);
  if (index > -1) {
    state.wishlist.splice(index, 1);
    if (btnElement) btnElement.classList.remove('active');
  } else {
    state.wishlist.push(productId);
    if (btnElement) btnElement.classList.add('active');
  }
  saveWishlistToStorage();
}

/* -------------------------------------------------------------
 * VIEW RENDERING LOGIC
 * ------------------------------------------------------------- */

// fatal loading error page
function showFatalError() {
  document.getElementById('app-root').innerHTML = `
    <div class="container text-center py-20">
      <h1 class="font-serif text-3xl mb-4">COULD NOT LOAD STORE</h1>
      <p class="text-muted mb-6">We are currently experiencing technical difficulties loading our dynamic catalog. Please try reloading the page.</p>
      <button class="btn btn-primary" onclick="window.location.reload();">RELOAD STORE</button>
    </div>
  `;
}

/* -------------------------------------------------------------
 * 1. HOME VIEW RENDERER
 * ------------------------------------------------------------- */
function renderHomeView() {
  const s = state.settings;
  const brand = s.branding;
  const hero = s.hero;

  // Set SEO Homepage
  updateSEOMetadata({}, brand.name);
  injectOrganizationSchema();

  // Create core home sections HTML
  let html = '';

  // 1. HERO SECTION
  if (s.featureFlags.hero) {
    state.isMobileViewport = window.innerWidth < 768;
    const mediaHTML = getResponsiveHeroMediaHTML(hero, state.isMobileViewport);

    html += `
      <section class="hero-section" id="hero-block">
        <div class="hero-text-panel">
          <h1 class="hero-headline">${hero.headline.replace('\n', '<br>')}</h1>
          <p class="hero-subline">${hero.supportingCopy}</p>
          <div class="hero-ctas">
            <a href="${hero.primaryCTA.link}" class="btn btn-primary">${hero.primaryCTA.text}</a>
            <a href="${hero.secondaryCTA.link}" class="btn btn-outline">${hero.secondaryCTA.text}</a>
          </div>
        </div>
        <div class="hero-media-panel" id="hero-media-panel-container">
          ${mediaHTML}
          <div class="hero-overlay" style="background-color: ${hero.overlayColor}; opacity: ${hero.overlayOpacity};"></div>
        </div>
      </section>
    `;
  }

  // 2. BENEFITS STRIP
  if (s.featureFlags.benefits) {
    html += `
      <section class="benefits-strip">
        <div class="container">
          <div class="benefits-grid">
            <div class="benefit-col">
              <span class="benefit-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </span>
              <div>
                <h4 class="benefit-title">PREMIUM QUALITY</h4>
                <p class="benefit-desc">Carefully selected fine materials.</p>
              </div>
            </div>
            <div class="benefit-col">
              <span class="benefit-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </span>
              <div>
                <h4 class="benefit-title">TIMELESS DESIGN</h4>
                <p class="benefit-desc">Made beyond seasonal trends.</p>
              </div>
            </div>
            <div class="benefit-col">
              <span class="benefit-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a5 5 0 0 0-5 5v3H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-2V7a5 5 0 0 0-5-5zM9 7a3 3 0 0 1 6 0v3H9V7z"/></svg>
              </span>
              <div>
                <h4 class="benefit-title">EVERYDAY COMFORT</h4>
                <p class="benefit-desc">Designed for real life and movement.</p>
              </div>
            </div>
            <div class="benefit-col">
              <span class="benefit-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </span>
              <div>
                <h4 class="benefit-title">MADE TO LAST</h4>
                <p class="benefit-desc">Uncompromising quality you can rely on.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  // 3. SHOP BY CATEGORY
  if (s.featureFlags.categories) {
    let catGridHTML = '';
    state.categories.slice(0, 6).forEach(cat => {
      catGridHTML += `
        <a href="#/category/${cat.slug}" class="category-card">
          <img class="category-image" src="${cat.image}" alt="${cat.name} Category" loading="lazy">
          <div class="category-gradient"></div>
          <span class="category-name-tag uppercase tracking-widest">${cat.name}</span>
        </a>
      `;
    });

    html += `
      <section class="section-spacer">
        <div class="container">
          <div class="section-header">
            <h2 class="section-title uppercase tracking-wider">SHOP BY CATEGORY</h2>
            <a href="#/category/clothing" class="section-control-link">VIEW ALL</a>
          </div>
          <div class="category-scroll-container">
            <div class="category-grid">
              ${catGridHTML}
            </div>
          </div>
        </div>
      </section>
    `;
  }

  // 4. NEW ARRIVALS
  if (s.featureFlags.newArrivals) {
    const newArrivalProducts = state.products.filter(p => p.newArrival === true).slice(0, 5);
    let cardsHTML = '';
    newArrivalProducts.forEach(prod => {
      cardsHTML += generateProductCardHTML(prod);
    });

    html += `
      <section class="section-spacer" style="border-top: 1px solid var(--color-border);">
        <div class="container" id="home-new-arrivals">
          <div class="section-header">
            <h2 class="section-title uppercase tracking-wider">NEW ARRIVALS</h2>
            <a href="#/category/new-arrivals" class="section-control-link">VIEW ALL</a>
          </div>
          <div class="product-grid">
            ${cardsHTML}
          </div>
        </div>
      </section>
    `;
  }

  // 5. PROMOTIONAL FEATURED BANNER
  if (s.featureFlags.promoBanner) {
    html += `
      <section class="promo-banner">
        <div class="promo-photo-panel">
          <img class="promo-image" src="images/collections/new-season.jpg" alt="VELIN Seasonal Essentials Promo Photo" loading="lazy">
        </div>
        <div class="promo-text-panel">
          <span class="promo-eyebrow">NEW SEASON</span>
          <h2 class="promo-headline">Discover the latest essentials from VELIN.</h2>
          <p class="promo-text">Expertly curated daily layers, designed to move with quiet confidence and tailored to maintain standard and shape across any climate.</p>
          <a href="#/category/clothing" class="btn btn-primary" style="align-self: flex-start;">SHOP NEW ARRIVALS</a>
        </div>
      </section>
    `;
  }

  // 6. BRAND STORY EDITORIAL
  if (s.featureFlags.brandStory) {
    html += `
      <section class="brand-story-section">
        <div class="brand-story-container">
          <div class="brand-story-photo">
            <img class="brand-story-image" src="images/collections/essentials.jpg" alt="About VELIN clothing" loading="lazy">
          </div>
          <div class="brand-story-text">
            <h2 class="brand-story-heading">Designed for Everyday.</h2>
            <p class="brand-story-paragraph">VELIN is built around a simple idea: everyday clothing should feel exceptional. We strip away the noise of fast-fashion trends, focusing entirely on meticulous cuts, robust tailoring, and beautifully sourced fabrics.</p>
            <p class="brand-story-paragraph">Each piece is manufactured in Pakistan with complete precision—elevating daily wear through high-performance heavyweight organic cottons, pure flax linens, and structures constructed to last. Quiet confidence, refined tailoring, and approached with everyday modern life in mind.</p>
            <a href="#/about" class="btn btn-outline mt-4" style="align-self: flex-start;">OUR STORY</a>
          </div>
        </div>
      </section>
    `;
  }

  // 7. NEWSLETTER SIGNUP
  if (s.featureFlags.newsletter) {
    html += `
      <section class="newsletter-section">
        <div class="newsletter-container">
          <div class="newsletter-text">
            <h2 class="newsletter-heading">Stay in the VELIN Circle.</h2>
            <p class="newsletter-desc">New collections, essential pieces and occasional offers.</p>
          </div>
          <div class="newsletter-form-col">
            <form id="home-newsletter-form" class="newsletter-form">
              <input type="email" class="newsletter-input" placeholder="ENTER YOUR EMAIL ADDRESS" required>
              <button type="submit" class="btn btn-primary">SUBSCRIBE</button>
            </form>
            <div id="newsletter-status" class="newsletter-success hidden"></div>
          </div>
        </div>
      </section>
    `;
  }

  // Render on Root
  const root = document.getElementById('app-root');
  root.innerHTML = html;

  // Bind dynamic event listeners
  bindProductCardListeners(root);

  // Newsletter Form handler
  if (s.featureFlags.newsletter) {
    const newsForm = document.getElementById('home-newsletter-form');
    newsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = newsForm.querySelector('input');
      const status = document.getElementById('newsletter-status');
      
      status.textContent = `THANK YOU FOR JOINING US. A WELCOME NOTE HAS BEEN SENT TO ${input.value.toUpperCase()}.`;
      status.classList.remove('hidden');
      input.value = '';
      setTimeout(() => {
        status.classList.add('hidden');
      }, 5000);
    });
  }
}

function getResponsiveHeroMediaHTML(hero, isMobile) {
  if (isMobile) {
    if (hero.mobileMediaType === 'video') {
      return `
        <video class="hero-media" autoplay muted loop playsinline poster="${hero.desktopPoster || 'images/hero.jpg'}">
          <source src="${hero.mobileMedia}" type="video/mp4">
          <img src="${hero.desktopPoster || 'images/hero.jpg'}" alt="VELIN mobile lifestyle video fallback">
        </video>
      `;
    } else {
      return `<img class="hero-media" src="${hero.mobileMedia}" alt="VELIN mobile premium lifestyle clothing">`;
    }
  } else {
    if (hero.desktopMediaType === 'video') {
      return `
        <video class="hero-media" autoplay muted loop playsinline poster="${hero.desktopPoster || 'images/hero.jpg'}">
          <source src="${hero.desktopMedia}" type="video/mp4">
          <img src="${hero.desktopPoster || 'images/hero.jpg'}" alt="VELIN desktop lifestyle video fallback">
        </video>
      `;
    } else {
      return `<img class="hero-media" src="${hero.desktopMedia}" alt="VELIN premium lifestyle clothing">`;
    }
  }
}

function handleHeroResize() {
  if (!state.settings || !state.settings.featureFlags.hero) return;
  const hash = window.location.hash || '#/';
  if (hash !== '#/' && hash !== '#') return; // only execute on homepage

  const isMobileNow = window.innerWidth < 768;
  if (isMobileNow !== state.isMobileViewport) {
    state.isMobileViewport = isMobileNow;
    
    // Select the media panel and update its media element dynamically
    const mediaContainer = document.getElementById('hero-media-panel-container');
    if (mediaContainer) {
      const hero = state.settings.hero;
      const mediaHTML = getResponsiveHeroMediaHTML(hero, isMobileNow);
      
      // Update container innerHTML while preserving the overlay element
      mediaContainer.innerHTML = `
        ${mediaHTML}
        <div class="hero-overlay" style="background-color: ${hero.overlayColor}; opacity: ${hero.overlayOpacity};"></div>
      `;
    }
  }
}

/* -------------------------------------------------------------
 * 2. CATEGORY & COLLECTION LISTING VIEW RENDERER
 * ------------------------------------------------------------- */
function renderCatalogView(type, slug) {
  let title = '';
  let desc = '';
  let seoObj = {};
  let targetProducts = [];

  // Reset Filters on Catalog navigation
  resetFilterState();

  if (type === 'category') {
    if (slug === 'clothing') {
      title = 'CLOTHING';
      desc = 'Premium everyday garments designed with timeless cuts and meticulous attention to materials.';
      targetProducts = state.products; // all products
      seoObj = {
        title: 'Premium Everyday Clothing Catalog | VELIN',
        description: 'Browse the entire collection of premium essentials from VELIN. Structured hoodies, linen shirts, oversized tees, and accessories.',
        canonicalPath: '/category/clothing'
      };
    } else if (slug === 'new-arrivals') {
      title = 'NEW ARRIVALS';
      desc = 'Discover the newest additions to the VELIN modern uniform catalog.';
      targetProducts = state.products.filter(p => p.newArrival === true);
      seoObj = {
        title: 'New Arrivals: Fresh Elevated Essentials | VELIN',
        description: 'Explore our latest releases. Heavyweight fleece, crisp organic cottons, and minimal accessories designed for today.',
        canonicalPath: '/category/new-arrivals'
      };
    } else if (slug === 'sale') {
      title = 'SALE';
      desc = 'Premium garments and collections offered at exclusive prices. Understated luxury, designed for real life.';
      targetProducts = state.products.filter(p => p.sale === true);
      seoObj = {
        title: 'Exclusive Pricing: Sale Collection | VELIN',
        description: 'Elevate your daily wear with special pricing on selected organic shirts, premium knitwear, and classic accessories.',
        canonicalPath: '/category/sale'
      };
    } else {
      const cat = state.categories.find(c => c.slug === slug);
      if (!cat) {
        show404Error();
        return;
      }
      title = cat.name;
      desc = cat.description;
      targetProducts = state.products.filter(p => p.category === cat.slug);
      seoObj = cat.seo;
    }
  } else if (type === 'collection') {
    const col = state.collections.find(c => c.slug === slug);
    if (!col) {
      show404Error();
      return;
    }
    title = col.name;
    desc = col.description;
    targetProducts = state.products.filter(p => col.products.includes(p.id));
    seoObj = col.seo;
  }

  // Update SEO Page metadata
  updateSEOMetadata(seoObj, title);

  // Construct Layout HTML
  let layoutHTML = `
    <div class="container catalog-layout">
      
      <!-- Catalog Header -->
      <header class="catalog-header">
        <h1 class="catalog-title">${title}</h1>
        <p class="catalog-desc">${desc}</p>
      </header>

      <div class="catalog-body">
        
        <!-- Filter Sidebar / Drawer desktop -->
        <aside class="filter-sidebar">
          ${generateFilterSidebarHTML()}
        </aside>

        <!-- Product content panel -->
        <div class="catalog-content">
          
          <!-- Toolbar -->
          <div class="catalog-toolbar">
            <button id="mobile-filter-btn" class="mobile-filter-trigger">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <line x1="4" y1="21" x2="4" y2="14"></line>
                <line x1="4" y1="10" x2="4" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12" y2="3"></line>
                <line x1="20" y1="21" x2="20" y2="16"></line>
                <line x1="20" y1="12" x2="20" y2="3"></line>
                <line x1="1" y1="14" x2="7" y2="14"></line>
                <line x1="9" y1="8" x2="15" y2="8"></line>
                <line x1="17" y1="16" x2="23" y2="16"></line>
              </svg>
              FILTER & SORT
            </button>
            
            <p class="text-xs text-muted tracking-wide" id="catalog-count-label">${targetProducts.length} PRODUCTS</p>
            
            <div class="flex items-center gap-2">
              <span class="text-xs text-muted uppercase tracking-wider desktop-only">SORT BY</span>
              <select id="catalog-sort" class="sort-select">
                <option value="featured" ${state.sortBy === 'featured' ? 'selected' : ''}>FEATURED</option>
                <option value="newest" ${state.sortBy === 'newest' ? 'selected' : ''}>NEWEST</option>
                <option value="price-low" ${state.sortBy === 'price-low' ? 'selected' : ''}>PRICE: LOW → HIGH</option>
                <option value="price-high" ${state.sortBy === 'price-high' ? 'selected' : ''}>PRICE: HIGH → LOW</option>
              </select>
            </div>
          </div>

          <!-- Active Cards Dynamic Grid -->
          <div id="catalog-products-grid" class="product-grid">
            <!-- Filtered products go here -->
          </div>

          <!-- Filter empty state -->
          <div id="catalog-empty-state" class="empty-state hidden">
            <h4 class="empty-state-title">NO MATCHING PRODUCTS</h4>
            <p class="empty-state-desc">Try resetting your filters to see our full premium range of garments.</p>
            <button id="clear-all-filters-btn" class="btn btn-primary text-xs">CLEAR ALL FILTERS</button>
          </div>

        </div>

      </div>
    </div>

    <!-- Mobile Filter Drawer overlay -->
    <div id="mobile-filter-drawer" class="drawer drawer-right hidden" aria-hidden="true">
      <div class="drawer-overlay" id="mobile-filter-overlay"></div>
      <div class="drawer-content">
        <div class="drawer-header">
          <span class="drawer-title uppercase tracking-widest">FILTERS</span>
          <button id="mobile-filter-close" class="close-drawer-btn">×</button>
        </div>
        <div class="drawer-body">
          ${generateFilterSidebarHTML('mobile')}
        </div>
        <div class="drawer-footer flex gap-4">
          <button id="mobile-filter-clear" class="btn btn-outline flex-1">CLEAR</button>
          <button id="mobile-filter-apply" class="btn btn-primary flex-1">APPLY</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('app-root').innerHTML = layoutHTML;

  // Render original products
  renderCatalogProducts(targetProducts);

  // Set listeners for Filters & Sorting
  setupCatalogListeners(targetProducts);
}

function generateFilterSidebarHTML(suffix = 'desktop') {
  // Aggregate unique colors and sizes from catalog
  const sizesSet = new Set();
  const colorsMap = new Map(); // hex -> name mapping
  state.products.forEach(p => {
    p.sizes.forEach(s => sizesSet.add(s));
    p.colors.forEach(c => colorsMap.set(c.hex, c.name));
  });

  const uniqueSizes = Array.from(sizesSet);
  
  let sidebarHTML = '';

  // 1. FILTER BY SIZE
  sidebarHTML += `
    <div class="filter-group">
      <h3 class="filter-title">SIZE</h3>
      <div class="size-filter-grid">
  `;
  uniqueSizes.forEach(sz => {
    const isSelected = state.filters.size.includes(sz) ? 'active' : '';
    sidebarHTML += `
      <button class="size-filter-btn ${isSelected}" data-size="${sz}" data-suffix="${suffix}">${sz}</button>
    `;
  });
  sidebarHTML += `
      </div>
    </div>
  `;

  // 2. FILTER BY COLOR
  sidebarHTML += `
    <div class="filter-group">
      <h3 class="filter-title">COLOR</h3>
      <div class="color-filter-flex">
  `;
  colorsMap.forEach((name, hex) => {
    const isSelected = state.filters.color.includes(name) ? 'active' : '';
    sidebarHTML += `
      <span class="color-filter-dot ${isSelected}" 
            style="background-color: ${hex};" 
            title="${name}" 
            data-color="${name}" 
            data-suffix="${suffix}">
      </span>
    `;
  });
  sidebarHTML += `
      </div>
    </div>
  `;

  // 3. FILTER BY PRICE
  sidebarHTML += `
    <div class="filter-group">
      <h3 class="filter-title">PRICE RANGE</h3>
      <div class="price-range-inputs">
        <input type="number" class="price-input" id="price-min-${suffix}" placeholder="MIN" value="${state.filters.priceMin || ''}">
        <span class="text-muted text-xs">—</span>
        <input type="number" class="price-input" id="price-max-${suffix}" placeholder="MAX" value="${state.filters.priceMax || ''}">
      </div>
    </div>
  `;

  // 4. FEATURE FLAGS / STATES
  sidebarHTML += `
    <div class="filter-group">
      <h3 class="filter-title">AVAILABILITY</h3>
      <div class="filter-list">
        <label class="filter-item-label">
          <input type="checkbox" class="filter-checkbox inline-checkbox" id="avail-stock-${suffix}" ${state.filters.inStock ? 'checked' : ''}>
          IN STOCK ONLY
        </label>
        <label class="filter-item-label">
          <input type="checkbox" class="filter-checkbox inline-checkbox" id="avail-sale-${suffix}" ${state.filters.onSale ? 'checked' : ''}>
          ON SALE
        </label>
      </div>
    </div>
  `;

  return sidebarHTML;
}

function resetFilterState() {
  state.filters = {
    category: [],
    size: [],
    color: [],
    priceMin: null,
    priceMax: null,
    onSale: false,
    inStock: false
  };
  state.sortBy = 'featured';
}

function renderCatalogProducts(originalProducts) {
  const grid = document.getElementById('catalog-products-grid');
  const emptyState = document.getElementById('catalog-empty-state');
  const countLabel = document.getElementById('catalog-count-label');

  // Apply filters
  let filtered = [...originalProducts];

  if (state.filters.size.length > 0) {
    filtered = filtered.filter(p => p.sizes.some(sz => state.filters.size.includes(sz)));
  }
  if (state.filters.color.length > 0) {
    filtered = filtered.filter(p => p.colors.some(c => state.filters.color.includes(c.name)));
  }
  if (state.filters.priceMin !== null && state.filters.priceMin !== '') {
    filtered = filtered.filter(p => p.price >= parseFloat(state.filters.priceMin));
  }
  if (state.filters.priceMax !== null && state.filters.priceMax !== '') {
    filtered = filtered.filter(p => p.price <= parseFloat(state.filters.priceMax));
  }
  if (state.filters.inStock) {
    filtered = filtered.filter(p => p.stockStatus !== 'out-of-stock');
  }
  if (state.filters.onSale) {
    filtered = filtered.filter(p => p.sale || p.compareAtPrice > p.price);
  }

  // Apply Sorting
  if (state.sortBy === 'newest') {
    filtered.sort((a, b) => (b.newArrival ? 1 : 0) - (a.newArrival ? 1 : 0));
  } else if (state.sortBy === 'price-low') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (state.sortBy === 'price-high') {
    filtered.sort((a, b) => b.price - a.price);
  } else {
    // featured: custom priority or by featured true
    filtered.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  }

  // Count text
  countLabel.textContent = `${filtered.length} PRODUCTS`;

  // Render cards
  if (filtered.length === 0) {
    grid.innerHTML = '';
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    let cardsHTML = '';
    filtered.forEach(p => {
      cardsHTML += generateProductCardHTML(p);
    });
    grid.innerHTML = cardsHTML;
    bindProductCardListeners(grid);
  }
}

function setupCatalogListeners(originalProducts) {
  // Desktop Sidebar listeners
  const setupFilterListenersForSuffix = (suffix) => {
    // Sizes
    document.querySelectorAll(`.size-filter-btn[data-suffix="${suffix}"]`).forEach(btn => {
      btn.addEventListener('click', () => {
        const size = btn.dataset.size;
        const index = state.filters.size.indexOf(size);
        if (index > -1) {
          state.filters.size.splice(index, 1);
          btn.classList.remove('active');
        } else {
          state.filters.size.push(size);
          btn.classList.add('active');
        }
        if (suffix === 'desktop') renderCatalogProducts(originalProducts);
      });
    });

    // Colors
    document.querySelectorAll(`.color-filter-dot[data-suffix="${suffix}"]`).forEach(dot => {
      dot.addEventListener('click', () => {
        const colorName = dot.dataset.color;
        const index = state.filters.color.indexOf(colorName);
        if (index > -1) {
          state.filters.color.splice(index, 1);
          dot.classList.remove('active');
        } else {
          state.filters.color.push(colorName);
          dot.classList.add('active');
        }
        if (suffix === 'desktop') renderCatalogProducts(originalProducts);
      });
    });

    // Min / Max Prices (input event)
    const minInput = document.getElementById(`price-min-${suffix}`);
    const maxInput = document.getElementById(`price-max-${suffix}`);
    
    const onPriceChange = () => {
      state.filters.priceMin = minInput.value;
      state.filters.priceMax = maxInput.value;
      if (suffix === 'desktop') renderCatalogProducts(originalProducts);
    };
    minInput.addEventListener('input', onPriceChange);
    maxInput.addEventListener('input', onPriceChange);

    // Stock & Sale
    const stockCheck = document.getElementById(`avail-stock-${suffix}`);
    const saleCheck = document.getElementById(`avail-sale-${suffix}`);

    stockCheck.addEventListener('change', () => {
      state.filters.inStock = stockCheck.checked;
      if (suffix === 'desktop') renderCatalogProducts(originalProducts);
    });

    saleCheck.addEventListener('change', () => {
      state.filters.onSale = saleCheck.checked;
      if (suffix === 'desktop') renderCatalogProducts(originalProducts);
    });
  };

  // Run listeners configuration for desktop sidebar
  setupFilterListenersForSuffix('desktop');
  
  // Sorting dropdown action
  document.getElementById('catalog-sort').addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    renderCatalogProducts(originalProducts);
  });

  // Mobile Filter Drawer Toggles
  const mobFilterTrigger = document.getElementById('mobile-filter-btn');
  const mobFilterDrawer = document.getElementById('mobile-filter-drawer');
  const mobFilterClose = document.getElementById('mobile-filter-close');
  const mobFilterOverlay = document.getElementById('mobile-filter-overlay');

  mobFilterTrigger.addEventListener('click', () => {
    mobFilterDrawer.classList.remove('hidden');
    setupFilterListenersForSuffix('mobile');
  });

  const closeMobFilters = () => {
    mobFilterDrawer.classList.add('hidden');
  };
  mobFilterClose.addEventListener('click', closeMobFilters);
  mobFilterOverlay.addEventListener('click', closeMobFilters);

  // Apply button mobile
  document.getElementById('mobile-filter-apply').addEventListener('click', () => {
    renderCatalogProducts(originalProducts);
    closeMobFilters();
  });

  // Clear button mobile
  document.getElementById('mobile-filter-clear').addEventListener('click', () => {
    resetFilterState();
    // Reset all DOM input controls
    document.getElementById('mobile-filter-drawer').querySelector('.drawer-body').innerHTML = generateFilterSidebarHTML('mobile');
    setupFilterListenersForSuffix('mobile');
  });

  // Clear All Filters on Empty State click
  document.getElementById('clear-all-filters-btn').addEventListener('click', () => {
    resetFilterState();
    // Redraw sidebar and products
    document.querySelector('.filter-sidebar').innerHTML = generateFilterSidebarHTML('desktop');
    setupFilterListenersForSuffix('desktop');
    renderCatalogProducts(originalProducts);
  });
}

function renderAllCollectionsView() {
  const root = document.getElementById('app-root');
  
  // Page SEO updates
  updateSEOMetadata({
    title: 'The Collections Catalog | VELIN',
    description: 'Explore our tailored wardrobe edits. Essentials, New Season and Everyday Edit collections crafted with quiet confidence.',
    canonicalPath: '/collections'
  }, 'Collections');

  let gridHTML = '';
  state.collections.forEach(col => {
    gridHTML += `
      <a href="#/collections/${col.slug}" class="category-card" style="aspect-ratio: 16/9; flex: auto;">
        <img class="category-image" src="${col.image}" alt="${col.name} Collection" loading="lazy">
        <div class="category-gradient"></div>
        <span class="category-name-tag uppercase tracking-widest">${col.name}</span>
      </a>
    `;
  });

  root.innerHTML = `
    <div class="container catalog-layout">
      <header class="catalog-header">
        <h1 class="catalog-title">THE COLLECTIONS</h1>
        <p class="catalog-desc">Curated edits designed to layer effortlessly and retain absolute elegance for daily life.</p>
      </header>
      <div class="category-grid" style="grid-template-columns: repeat(3, 1fr);">
        ${gridHTML}
      </div>
    </div>
  `;
}

/* -------------------------------------------------------------
 * 3. PRODUCT DETAIL VIEW RENDERER
 * ------------------------------------------------------------- */
function renderProductView(slug) {
  const product = state.products.find(p => p.slug === slug);
  if (!product) {
    show404Error();
    return;
  }

  // Update SEO and inject Product JSON-LD schema
  updateSEOMetadata(product.seo, product.name);
  injectProductSchema(product);

  // Set internal state values for purchase selector
  state.activeColor = product.colors[0]?.name || 'Standard';
  state.activeSize = null; // No initial size selection to force interaction, or first if Accessories
  if (product.sizes.length === 1 && product.sizes[0] === 'One Size') {
    state.activeSize = 'One Size';
  }
  state.currentProductQty = 1;

  // Build Pricing layout
  let priceHTML = `<span class="price-current">Rs. ${product.price.toLocaleString()}</span>`;
  if (product.compareAtPrice > product.price) {
    priceHTML = `
      <span class="price-current">Rs. ${product.price.toLocaleString()}</span>
      <span class="price-compare" style="margin-left: 12px; font-size: 15px;">Rs. ${product.compareAtPrice.toLocaleString()}</span>
    `;
  }

  // Color Swatches
  let colorSelectorHTML = '';
  if (product.colors && product.colors.length > 0) {
    colorSelectorHTML += `
      <div class="product-selector-group">
        <div class="selector-header">
          <span class="selector-label">COLOR: <span id="selected-color-label" class="text-muted font-normal uppercase" style="font-weight:400;">${state.activeColor}</span></span>
        </div>
        <div class="color-circle-selector">
    `;
    product.colors.forEach((col, idx) => {
      const activeClass = idx === 0 ? 'active' : '';
      colorSelectorHTML += `
        <button class="color-circle-btn ${activeClass}" 
                style="background-color: ${col.hex};" 
                title="${col.name}" 
                data-color-name="${col.name}">
        </button>
      `;
    });
    colorSelectorHTML += `
        </div>
      </div>
    `;
  }

  // Size buttons
  let sizeSelectorHTML = '';
  if (product.sizes && product.sizes.length > 0 && product.sizes[0] !== 'One Size') {
    sizeSelectorHTML += `
      <div class="product-selector-group">
        <div class="selector-header">
          <span class="selector-label">SIZE: <span id="selected-size-label" class="text-muted font-normal" style="font-weight:400;">SELECT SIZE</span></span>
          <button class="size-guide-btn size-guide-trigger" aria-haspopup="dialog">SIZE GUIDE</button>
        </div>
        <div class="size-btn-grid">
    `;
    product.sizes.forEach(sz => {
      // Simulate that some sizes are out of stock for demo purposes (e.g. XXL out of stock in Tee, or XL low)
      const isOutOfStock = (product.slug === 'essential-oversized-tee' && sz === 'XXL') || (product.slug === 'tailored-linen-trousers' && sz === '36');
      const disabledAttr = isOutOfStock ? 'disabled aria-disabled="true"' : '';
      sizeSelectorHTML += `
        <button class="size-btn" data-size="${sz}" ${disabledAttr}>${sz}</button>
      `;
    });
    sizeSelectorHTML += `
        </div>
      </div>
    `;
  }

  // Live stock state
  let stockIndicatorHTML = '';
  if (product.stockStatus === 'out-of-stock') {
    stockIndicatorHTML = `
      <div class="stock-status-indicator out-of-stock">
        <span class="stock-status-dot"></span>
        OUT OF STOCK
      </div>
    `;
  } else if (product.stockStatus === 'low-stock' || product.badges.includes('FEW LEFT') || product.badges.includes('LIMITED')) {
    stockIndicatorHTML = `
      <div class="stock-status-indicator low-stock">
        <span class="stock-status-dot"></span>
        ONLY A FEW LEFT
      </div>
    `;
  } else {
    stockIndicatorHTML = `
      <div class="stock-status-indicator in-stock animate-pulse">
        <span class="stock-status-dot"></span>
        IN STOCK, READY TO SHIP
      </div>
    `;
  }

  // Construct Related Products
  const relatedProducts = state.products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4);
  let relatedHTML = '';
  if (relatedProducts.length > 0) {
    relatedHTML += `
      <section class="section-spacer" style="border-top: 1px solid var(--color-border); margin-top: 60px;">
        <div class="container">
          <div class="section-header">
            <h2 class="section-title uppercase tracking-wider">RELATED ESSENTIALS</h2>
          </div>
          <div class="product-grid" style="grid-template-columns: repeat(4, 1fr);">
    `;
    relatedProducts.forEach(rel => {
      relatedHTML += generateProductCardHTML(rel);
    });
    relatedHTML += `
          </div>
        </div>
      </section>
    `;
  }

  // Full Page Detail Layout
  let pageHTML = `
    <div class="container product-detail-layout">
      <div class="product-detail-container">
        
        <!-- Gallery Columns -->
        <div class="product-gallery" id="product-detail-gallery">
          ${generateGalleryHTML(product, state.activeColor)}
        </div>

        <!-- Purchase selection column -->
        <div class="product-info-panel">
          
          <h1 class="product-detail-name">${product.name}</h1>
          
          <div class="product-detail-price font-sans">
            ${priceHTML}
          </div>

          <p class="product-detail-desc">${product.description}</p>

          <!-- Color selector -->
          ${colorSelectorHTML}

          <!-- Size selector -->
          ${sizeSelectorHTML}

          <!-- Quantity, Stock Row -->
          <div class="quantity-stock-row">
            <div class="quantity-selector">
              <button class="quantity-btn" id="qty-minus" aria-label="Decrease quantity">−</button>
              <input type="text" class="quantity-input" id="qty-val" value="1" readonly>
              <button class="quantity-btn" id="qty-plus" aria-label="Increase quantity">+</button>
            </div>
            ${stockIndicatorHTML}
          </div>

          <!-- Purchase Buttons (Add to cart, WhatsApp Order) -->
          <div class="detail-purchase-ctas">
            <button class="btn btn-primary add-to-bag-btn text-sm tracking-widest" id="add-to-bag-cta" ${product.stockStatus === 'out-of-stock' ? 'disabled' : ''}>
              ${product.stockStatus === 'out-of-stock' ? 'SOLD OUT' : 'ADD TO BAG'}
            </button>
            <button class="btn whatsapp-order-btn text-sm tracking-widest flex items-center justify-center gap-2" id="whatsapp-order-cta">
              <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.703 1.458h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413"/></svg>
              ORDER VIA WHATSAPP
            </button>
          </div>

          <!-- Description Accordion / Information drawers -->
          <div class="detail-accordion">
            <div class="accordion-tab active">
              <div class="accordion-tab-header">
                <span>DETAILS & SPECIFICATIONS</span>
                <svg class="accordion-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
              <div class="accordion-tab-content" style="display: block;">
                <ul class="list-disc pl-5 flex flex-col gap-2">
                  ${product.details.map(d => `<li style="list-style: square; margin-left: 12px; margin-bottom:4px;">${d}</li>`).join('')}
                </ul>
              </div>
            </div>
            <div class="accordion-tab">
              <div class="accordion-tab-header">
                <span>FABRIC & COMPOSITION</span>
                <svg class="accordion-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
              <div class="accordion-tab-content hidden">
                <p class="mb-2"><strong>Composition:</strong> ${product.material}</p>
                <p><strong>Drape & Cut:</strong> ${product.fit}</p>
              </div>
            </div>
            <div class="accordion-tab">
              <div class="accordion-tab-header">
                <span>CARE INSTRUCTIONS</span>
                <svg class="accordion-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
              <div class="accordion-tab-content hidden">
                <p>${product.care}</p>
              </div>
            </div>
            <div class="accordion-tab">
              <div class="accordion-tab-header">
                <span>SHIPPING & RETURNS</span>
                <svg class="accordion-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
              <div class="accordion-tab-content hidden">
                <p class="mb-2">${state.settings.store.shippingPolicy}</p>
                <p>${state.settings.store.returnPolicy}</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>

    <!-- Related items -->
    ${relatedHTML}
  `;

  document.getElementById('app-root').innerHTML = pageHTML;

  // Bind dynamic actions
  bindProductGalleryListeners(product);
  bindProductPageGlobalListeners(product);
}

function updateProductDetailPagePrice(product) {
  const priceContainer = document.querySelector('.product-detail-price');
  if (!priceContainer) return;

  let basePrice = product.price;
  let compareAt = product.compareAtPrice;

  // Calculate total price based on reactive quantity state
  const totalPrice = basePrice * state.currentProductQty;
  let priceHTML = `<span class="price-current">Rs. ${totalPrice.toLocaleString()}</span>`;

  if (compareAt > basePrice) {
    const totalCompare = compareAt * state.currentProductQty;
    priceHTML = `
      <span class="price-current">Rs. ${totalPrice.toLocaleString()}</span>
      <span class="price-compare" style="margin-left: 12px; font-size: 15px;">Rs. ${totalCompare.toLocaleString()}</span>
    `;
  }

  priceContainer.innerHTML = priceHTML;
}

function generateGalleryHTML(product, selectedColor) {
  // Try to find images specific to selected color, else use general product.images
  const colorData = product.colors.find(c => c.name === selectedColor);
  const galleryImages = (colorData && colorData.images && colorData.images.length > 0) 
    ? colorData.images 
    : product.images;

  let thumbsHTML = '<div class="gallery-thumbs">';
  galleryImages.forEach((img, idx) => {
    thumbsHTML += `
      <div class="gallery-thumb-wrapper ${idx === 0 ? 'active' : ''}" data-index="${idx}">
        <img class="gallery-thumb" src="${img}" alt="${product.name} Thumbnail ${idx + 1}" loading="lazy">
      </div>
    `;
  });
  thumbsHTML += '</div>';

  const mainHTML = `
    <div class="gallery-main">
      <img class="gallery-main-img" id="gallery-main-img" src="${galleryImages[0]}" alt="${product.name} Front Focus View">
    </div>
  `;

  return thumbsHTML + mainHTML;
}

function bindProductGalleryListeners(product) {
  // Thumbnail click image swap
  const thumbs = document.querySelectorAll('.gallery-thumb-wrapper');
  const mainImg = document.getElementById('gallery-main-img');

  thumbs.forEach(t => {
    t.addEventListener('click', () => {
      thumbs.forEach(wrapper => wrapper.classList.remove('active'));
      t.classList.add('active');
      const idx = parseInt(t.dataset.index);
      
      // Get images array based on current color
      const colorData = product.colors.find(c => c.name === state.activeColor);
      const activeImages = (colorData && colorData.images && colorData.images.length > 0) 
        ? colorData.images 
        : product.images;

      if (mainImg && activeImages[idx]) {
        mainImg.src = activeImages[idx];
      }
    });
  });
}

function bindProductPageGlobalListeners(product) {
  // Color Swatch buttons selection
  const colorBtns = document.querySelectorAll('.color-circle-btn');
  const colorLabel = document.getElementById('selected-color-label');

  colorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      colorBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const newColorName = btn.dataset.colorName;
      state.activeColor = newColorName;
      if (colorLabel) colorLabel.textContent = newColorName;

      // Update gallery for color
      const gallery = document.getElementById('product-detail-gallery');
      if (gallery) {
        gallery.innerHTML = generateGalleryHTML(product, newColorName);
      }
      
      // Re-bind fresh thumbnails
      bindProductGalleryListeners(product);
    });
  });

  // Size buttons selection
  const sizeBtns = document.querySelectorAll('.size-btn');
  const sizeLabel = document.getElementById('selected-size-label');

  sizeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      sizeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const sizeVal = btn.dataset.size;
      state.activeSize = sizeVal;
      if (sizeLabel) sizeLabel.textContent = sizeVal;

      // Recalculate price in case size-based modifiers are loaded
      updateProductDetailPagePrice(product);
    });
  });

  // Quantity controllers
  const qtyMinus = document.getElementById('qty-minus');
  const qtyPlus = document.getElementById('qty-plus');
  const qtyVal = document.getElementById('qty-val');

  qtyMinus.addEventListener('click', () => {
    if (state.currentProductQty > 1) {
      state.currentProductQty--;
      qtyVal.value = state.currentProductQty;
      updateProductDetailPagePrice(product);
    }
  });

  qtyPlus.addEventListener('click', () => {
    state.currentProductQty++;
    qtyVal.value = state.currentProductQty;
    updateProductDetailPagePrice(product);
  });

  // Accordion tabs logic
  const tabs = document.querySelectorAll('.accordion-tab');
  tabs.forEach(tab => {
    const header = tab.querySelector('.accordion-tab-header');
    header.addEventListener('click', () => {
      const content = tab.querySelector('.accordion-tab-content');
      if (tab.classList.contains('active')) {
        tab.classList.remove('active');
        content.classList.add('hidden');
        content.style.display = 'none';
      } else {
        tab.classList.add('active');
        content.classList.remove('hidden');
        content.style.display = 'block';
      }
    });
  });

  // ADD TO BAG CTA
  const addToBagCta = document.getElementById('add-to-bag-cta');
  if (addToBagCta) {
    addToBagCta.addEventListener('click', () => {
      // Validate that size is chosen
      if (product.sizes.length > 0 && product.sizes[0] !== 'One Size' && !state.activeSize) {
        // Size guide flash
        const label = document.getElementById('selected-size-label');
        label.innerHTML = `<span style="color:var(--color-error); font-weight:600;">PLEASE SELECT A SIZE</span>`;
        return;
      }

      addToCart(product.id, state.activeSize || 'One Size', state.activeColor, state.currentProductQty);
      
      // Open cart drawer and highlight the item
      document.getElementById('cart-drawer').classList.remove('hidden');
      renderCartDrawer();
    });
  }

  // WHATSAPP ORDER Action (Direct Buy Quick action)
  const whatsappOrderCta = document.getElementById('whatsapp-order-cta');
  if (whatsappOrderCta) {
    whatsappOrderCta.addEventListener('click', () => {
      if (product.sizes.length > 0 && product.sizes[0] !== 'One Size' && !state.activeSize) {
        const label = document.getElementById('selected-size-label');
        label.innerHTML = `<span style="color:var(--color-error); font-weight:600;">PLEASE SELECT A SIZE</span>`;
        return;
      }

      // Generate pre-filled single product quick order link
      const contactNo = state.settings.contact.whatsapp;
      const currencyCode = product.currency || state.settings.store.currencyCode;
      const totalAmount = product.price * state.currentProductQty;

      let msg = `Hello VELIN, I'd like to place an order.\n\n`;
      msg += `Product: ${product.name}\n`;
      msg += `Color: ${state.activeColor}\n`;
      msg += `Size: ${state.activeSize || 'One Size'}\n`;
      msg += `Qty: ${state.currentProductQty}\n\n`;
      msg += `Total: ${currencyCode} ${totalAmount.toLocaleString()}\n\n`;
      msg += `Please confirm availability and delivery details. Thank you.`;

      const encodedMsg = encodeURIComponent(msg);
      window.open(`https://wa.me/${contactNo}?text=${encodedMsg}`, '_blank');
    });
  }

  // Also bind related products card listeners
  const root = document.getElementById('app-root');
  bindProductCardListeners(root);
}

/* -------------------------------------------------------------
 * 4. WISHLIST VIEW RENDERER
 * ------------------------------------------------------------- */
function renderWishlistView() {
  const root = document.getElementById('app-root');
  
  // Set SEO
  updateSEOMetadata({
    title: 'Your Premium Wishlist | VELIN',
    description: 'Keep track of your favorite elevated essentials and timless apparel on VELIN.',
    canonicalPath: '/wishlist'
  }, 'Wishlist');

  if (state.wishlist.length === 0) {
    root.innerHTML = `
      <div class="container py-20 text-center">
        <h1 class="font-serif text-3xl mb-4">YOUR WISHLIST</h1>
        <div class="empty-state">
          <h4 class="empty-state-title">YOUR WISHLIST IS EMPTY</h4>
          <p class="empty-state-desc">Understated designs wait to be discovered. Browse our collections and save pieces here.</p>
          <a href="#/category/clothing" class="btn btn-primary text-xs">EXPLORE ALL GARMENTS</a>
        </div>
      </div>
    `;
    return;
  }

  const wishProducts = state.products.filter(p => state.wishlist.includes(p.id));
  let gridHTML = '';
  wishProducts.forEach(prod => {
    gridHTML += generateProductCardHTML(prod);
  });

  root.innerHTML = `
    <div class="container py-12">
      <header class="catalog-header">
        <h1 class="catalog-title">YOUR WISHLIST</h1>
        <p class="catalog-desc">Review your curated garments and easily transition them to your everyday wardrobe.</p>
      </header>
      <div class="product-grid">
        ${gridHTML}
      </div>
    </div>
  `;

  bindProductCardListeners(root);
}

/* -------------------------------------------------------------
 * 5. ABOUT VIEW RENDERER
 * ------------------------------------------------------------- */
function renderAboutView() {
  const root = document.getElementById('app-root');
  
  updateSEOMetadata({
    title: 'The VELIN Philosophy: Quiet Elegance | VELIN',
    description: 'Learn about the philosophy and craftsmanship behind the fashion brand VELIN. Elevated garments crafted in Pakistan.',
    canonicalPath: '/about'
  }, 'Our Philosophy');

  root.innerHTML = `
    <div class="container py-12">
      <div class="about-hero">
        <h1 class="uppercase tracking-widest">Quiet Confidence.<br>Everyday Elevated.</h1>
        <p class="mt-4">VELIN is an architectural study in timeless garments. We manufacture slow clothing engineered to transition elegantly through daily modern life. Our focus is centered entirely on exquisite fabrics, tailored fits, and robust structures.</p>
      </div>

      <div class="about-grid">
        <div class="about-img-box">
          <img src="images/hero.jpg" alt="VELIN tailoring and production process">
        </div>
        <div class="about-text-box">
          <h3>Uncompromising Construction</h3>
          <p class="mb-4">Each of our garments is constructed in Lahore, Pakistan, utilizing carefully sourced high-caliber textiles. From 260 GSM heavyweight organic cotton jersey that forms our structured tees, to Belgian flax woven meticulously into lightweight shirts, we construct pieces to retain their elegant drape wash after wash.</p>
          <p>We work in collaboration with skilled generational artisans, providing safe, ethical environments to craft premium garments that Pakistan and the international community can cherish.</p>
        </div>
      </div>

      <div class="about-grid" style="direction: rtl;">
        <div class="about-img-box">
          <img src="images/collections/everyday-edit.jpg" alt="VELIN sustainability focus">
        </div>
        <div class="about-text-box" style="direction: ltr;">
          <h3>A Sustainable Foundation</h3>
          <p class="mb-4">Sustainability is not a marketing buzzword; it is our foundation. By making garments with superior craftsmanship and styling that extends far past seasonal trends, we encourage circular wardrobes and conscious consumption.</p>
          <p>We source eco-certified raw flax and organic cottons. Buttons are tailored from natural organic shells or biologically harvested horns. Packaging utilizes biodegradable materials—reflecting our profound responsibility to our environment.</p>
        </div>
      </div>
    </div>
  `;
}

function show404Error() {
  document.getElementById('app-root').innerHTML = `
    <div class="container py-20 text-center">
      <h1 class="font-serif text-3xl mb-4 uppercase">404 — PAGE NOT FOUND</h1>
      <p class="text-muted mb-6">The link you followed may be broken or the product/collection is no longer active.</p>
      <a href="#/" class="btn btn-primary">GO TO HOMEPAGE</a>
    </div>
  `;
}

/* -------------------------------------------------------------
 * SHOPPING BAG / CART CONTROLLERS & WHATSAPP CHECKOUT
 * ------------------------------------------------------------- */
function addToCart(productId, size, color, qty) {
  // Check if item exists
  const existingItem = state.cart.find(item => 
    item.productId === productId && 
    item.size === size && 
    item.color === color
  );

  if (existingItem) {
    existingItem.quantity += qty;
  } else {
    state.cart.push({
      productId,
      size,
      color,
      quantity: qty
    });
  }

  saveCartToStorage();
}

function renderCartDrawer() {
  const container = document.getElementById('cart-drawer-body');
  const subtotalLabel = document.getElementById('cart-subtotal');
  const checkoutBtn = document.getElementById('cart-whatsapp-checkout');
  const continueShoppingBtn = document.getElementById('cart-continue-shopping');
  const countItemsLabel = document.querySelectorAll('.cart-items-count');

  const s = state.settings;
  const currencyCode = s.store.currencyCode;
  const currencySymbol = s.store.currencySymbol;

  // Set count indicators
  const totalCountVal = state.cart.reduce((total, item) => total + item.quantity, 0);
  countItemsLabel.forEach(lbl => lbl.textContent = totalCountVal);

  if (state.cart.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h4 class="empty-state-title">YOUR BAG IS EMPTY.</h4>
        <p class="empty-state-desc">Save curated pieces to your bag. Your wardrobe uniform awaits discovery.</p>
        <a href="#/category/clothing" class="btn btn-primary text-xs" onclick="closeDrawers();">SHOP THE COLLECTION</a>
      </div>
    `;
    
    // Hide footer totals inside drawer
    document.getElementById('cart-drawer-footer').classList.add('hidden');
    document.getElementById('free-shipping-bar').classList.add('hidden');
    return;
  }

  // Draw Line Items
  document.getElementById('cart-drawer-footer').classList.remove('hidden');
  document.getElementById('free-shipping-bar').classList.remove('hidden');

  let itemsHTML = '<div class="cart-items-container">';
  let subtotalAmount = 0;

  state.cart.forEach((item, index) => {
    const product = state.products.find(p => p.id === item.productId);
    if (!product) return;

    const colorObj = product.colors.find(c => c.name === item.color);
    const lineImg = (colorObj && colorObj.images && colorObj.images.length > 0) ? colorObj.images[0] : product.images[0];
    const lineTotal = product.price * item.quantity;
    subtotalAmount += lineTotal;

    itemsHTML += `
      <div class="cart-item" data-index="${index}">
        <div class="cart-item-img-col">
          <img class="cart-item-img" src="${lineImg}" alt="${product.name}">
        </div>
        <div class="cart-item-info-col">
          <h4 class="cart-item-name">${product.name}</h4>
          <p class="cart-item-meta font-sans uppercase">${item.color} / ${item.size}</p>
          <div class="cart-item-controls">
            <div class="cart-quantity-selector">
              <button class="cart-quantity-btn decrement-cart-qty" data-index="${index}">−</button>
              <input type="text" class="cart-quantity-input" value="${item.quantity}" readonly>
              <button class="cart-quantity-btn increment-cart-qty" data-index="${index}">+</button>
            </div>
            <button class="cart-item-remove-btn remove-cart-item" data-index="${index}">Remove</button>
          </div>
        </div>
        <div class="cart-item-price-col font-sans">
          Rs. ${lineTotal.toLocaleString()}
        </div>
      </div>
    `;
  });
  itemsHTML += '</div>';
  container.innerHTML = itemsHTML;

  // Set Subtotal Label
  subtotalLabel.textContent = `Rs. ${subtotalAmount.toLocaleString()}`;

  // Update Free Shipping Progress Bar
  const threshold = s.store.freeDeliveryThreshold;
  const progressFill = (subtotalAmount / threshold) * 100;
  const progressPercent = progressFill > 100 ? 100 : progressFill;
  
  const bar = document.getElementById('free-shipping-bar');
  if (subtotalAmount >= threshold) {
    bar.innerHTML = `
      <p class="text-sm font-semibold text-primary">YOU HAVE UNLOCKED FREE DELIVERY across Pakistan!</p>
      <div class="shipping-progress-bg"><div class="shipping-progress-fill" style="width: 100%;"></div></div>
    `;
  } else {
    const diff = threshold - subtotalAmount;
    bar.innerHTML = `
      <p>ADD <strong>Rs. ${diff.toLocaleString()}</strong> MORE TO SECURE FREE DELIVERY across Pakistan</p>
      <div class="shipping-progress-bg"><div class="shipping-progress-fill" style="width: ${progressPercent}%;"></div></div>
    `;
  }

  // Bind cart action events (plus, minus, delete)
  bindCartActions();

  // WhatsApp checkout submission generator
  checkoutBtn.onclick = (e) => {
    e.preventDefault();
    const contactNo = s.contact.whatsapp;
    
    let msg = `Hello VELIN, I'd like to place an order.\n\n`;
    
    state.cart.forEach(item => {
      const product = state.products.find(p => p.id === item.productId);
      if (!product) return;
      msg += `• ${product.name} — ${item.color} — ${item.size} — Qty ${item.quantity}\n`;
    });

    msg += `\nSubtotal: Rs. ${subtotalAmount.toLocaleString()}\n`;
    
    if (subtotalAmount >= threshold) {
      msg += `Delivery: FREE\n`;
      msg += `Total: Rs. ${subtotalAmount.toLocaleString()}\n\n`;
    } else {
      msg += `Delivery: Standard charges apply\n`;
      msg += `Total: Rs. ${(subtotalAmount + 250).toLocaleString()} (est. with Rs.250 shipping)\n\n`;
    }

    msg += `Please share standard checkout forms. Thank you.`;

    const encodedMsg = encodeURIComponent(msg);
    window.open(`https://wa.me/${contactNo}?text=${encodedMsg}`, '_blank');
  };
}

function bindCartActions() {
  // Increment quantity inside cart
  document.querySelectorAll('.increment-cart-qty').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      state.cart[idx].quantity++;
      saveCartToStorage();
    });
  });

  // Decrement quantity inside cart
  document.querySelectorAll('.decrement-cart-qty').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      if (state.cart[idx].quantity > 1) {
        state.cart[idx].quantity--;
        saveCartToStorage();
      }
    });
  });

  // Remove item completely
  document.querySelectorAll('.remove-cart-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      state.cart.splice(idx, 1);
      saveCartToStorage();
    });
  });
}

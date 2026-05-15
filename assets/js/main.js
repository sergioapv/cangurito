// ===== PRODUCT DATA =====
// To add more products, add entries to this array.
const PRODUCTS = [
  {
    id: 1,
    name: "Kit Conjunto de Bebé",
    description: "Conjunto completo com manta 100% algodão, chocalho artesanal em crochet com argola de madeira, babete em tecido duplo e meias com pompom. Ideal para oferecer!",
    price: 44.90,
    includes: ["Manta 100% Algodão", "Chocalho em Crochet c/ Argola de Madeira", "Babete Tecido Duplo", "Meias com Pompom"],
    colors: [
      { name: "Bege",   hex: "#c9a87b", image: "assets/images/kit-conjunto-bege.jpeg" },
      { name: "Rosa",   hex: "#e8a0a0", image: "assets/images/kit-conjunto-rosa.jpeg" },
      { name: "Azul",   hex: "#8ab4cc", image: "assets/images/kit-conjunto-azul.jpeg" },
      { name: "Branco", hex: "#f0ece8", image: "assets/images/kit-conjunto-branco.jpeg" },
      { name: "Cinza",  hex: "#b0b8bc", image: "assets/images/kit-conjunto-cinza.jpeg" },
    ],
    mainImage: "assets/images/kit-conjunto-todos.jpeg",
  },
  {
    id: 2,
    name: "Kit Presente para Bebé",
    description: "Kit completo e delicado com almofada estrela, corrente de chupeta, chupeta, mordedor e musselina. Perfeito para oferecer — feito com amor!",
    price: 39.90,
    includes: ["Almofada Estrela", "Corrente de Chupeta", "Chupeta", "Mordedor", "Muselina"],
    colors: [
      { name: "Azul",  hex: "#8ab4cc", image: "assets/images/kit-chupeta-azul.jpeg" },
      { name: "Rosa",  hex: "#e8a0a0", image: "assets/images/kit-chupeta-rosa.jpeg" },
      { name: "Verde", hex: "#8bb89a", image: "assets/images/kit-chupeta-verde.jpeg" },
    ],
    mainImage: "assets/images/kit-chupeta-azul.jpeg",
  },
];

// MB WAY contact — change this to the store's actual number
const PIX_KEY = "+351 912 345 678";

function generateOrderRef() {
  const date = new Date();
  const datePart = date.getFullYear().toString() +
    String(date.getMonth() + 1).padStart(2, "0") +
    String(date.getDate()).padStart(2, "0");
  const random = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `CNG-${datePart}-${random}`;
}

// ===== STATE =====
let cart = [];

// ===== HELPERS =====
function fmt(value) {
  return value.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
}

function cartTotal() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function cartCount() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

// ===== RENDER PRODUCTS =====
function renderProducts() {
  const grid = document.getElementById("productsGrid");
  grid.innerHTML = "";

  PRODUCTS.forEach(product => {
    const selectedColor = product.colors[0];
    const cardId = `product-${product.id}`;

    const swatches = product.colors.map((c, i) => `
      <button
        class="color-swatch${i === 0 ? " active" : ""}"
        style="background:${c.hex}"
        title="${c.name}"
        data-product="${product.id}"
        data-color-index="${i}"
        onclick="selectColor(${product.id}, ${i})"
        aria-label="Cor ${c.name}"
      ></button>
    `).join("");

    const includes = product.includes.map(item => `<li>${item}</li>`).join("");

    const images = product.colors.map((c, i) => `
      <img
        src="${c.image}"
        alt="${product.name} ${c.name}"
        class="${i === 0 ? "active" : ""}"
        id="${cardId}-img-${i}"
        loading="lazy"
      />
    `).join("");

    const card = document.createElement("div");
    card.className = "product-card";
    card.id = cardId;
    card.innerHTML = `
      <div class="product-card__gallery">
        ${images}
      </div>
      <div class="product-card__body">
        <h3 class="product-card__name">${product.name}</h3>
        <p class="product-card__desc">${product.description}</p>
        <ul class="product-card__includes">${includes}</ul>
        <div class="product-card__colors">
          <p class="product-card__colors-label">
            Cor:
            <span class="product-card__color-selected" id="${cardId}-color-name">${selectedColor.name}</span>
          </p>
          <div class="color-swatches">${swatches}</div>
        </div>
        <div class="product-card__footer">
          <div class="product-card__price">
            ${fmt(product.price)}
            <small>portes a calcular no checkout</small>
          </div>
          <button class="btn btn--primary" onclick="addToCart(${product.id})">
            Adicionar ao Carrinho
          </button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

// ===== COLOR SELECTION =====
function selectColor(productId, colorIndex) {
  const product = PRODUCTS.find(p => p.id === productId);
  const cardId = `product-${productId}`;

  // Update active image
  product.colors.forEach((_, i) => {
    const img = document.getElementById(`${cardId}-img-${i}`);
    if (img) img.className = i === colorIndex ? "active" : "";
  });

  // Update active swatch
  document.querySelectorAll(`[data-product="${productId}"]`).forEach(btn => {
    btn.classList.toggle("active", parseInt(btn.dataset.colorIndex) === colorIndex);
  });

  // Update color label
  const label = document.getElementById(`${cardId}-color-name`);
  if (label) label.textContent = product.colors[colorIndex].name;

  // Store selection
  product._selectedColorIndex = colorIndex;
}

// ===== CART OPERATIONS =====
function addToCart(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  const colorIndex = product._selectedColorIndex ?? 0;
  const color = product.colors[colorIndex];

  const key = `${product.id}-${colorIndex}`;
  const existing = cart.find(item => item.key === key);

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      key,
      productId: product.id,
      name: product.name,
      color: color.name,
      image: color.image,
      price: product.price,
      qty: 1,
    });
  }

  renderCart();
  openCart();
}

function updateQty(key, delta) {
  const item = cart.find(i => i.key === key);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(i => i.key !== key);
  renderCart();
}

function removeItem(key) {
  cart = cart.filter(i => i.key !== key);
  renderCart();
}

// ===== RENDER CART =====
function renderCart() {
  const body = document.getElementById("cartBody");
  const footer = document.getElementById("cartFooter");
  const countEl = document.getElementById("cartCount");
  const totalEl = document.getElementById("cartTotal");

  countEl.textContent = cartCount();

  if (cart.length === 0) {
    body.innerHTML = `<p class="cart-empty">O seu carrinho está vazio.</p>`;
    footer.style.display = "none";
    return;
  }

  footer.style.display = "block";
  totalEl.textContent = fmt(cartTotal());

  body.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img class="cart-item__img" src="${item.image}" alt="${item.name}" />
      <div class="cart-item__info">
        <p class="cart-item__name">${item.name}</p>
        <p class="cart-item__variant">Cor: ${item.color}</p>
        <div class="cart-item__controls">
          <button class="qty-btn" onclick="updateQty('${item.key}', -1)">−</button>
          <span class="qty-display">${item.qty}</span>
          <button class="qty-btn" onclick="updateQty('${item.key}', 1)">+</button>
        </div>
      </div>
      <span class="cart-item__price">${fmt(item.price * item.qty)}</span>
      <button class="cart-item__remove" onclick="removeItem('${item.key}')" title="Remover">×</button>
    </div>
  `).join("");
}

// ===== CART SIDEBAR =====
function openCart() {
  document.getElementById("cartSidebar").classList.add("open");
  document.getElementById("cartOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeCart() {
  document.getElementById("cartSidebar").classList.remove("open");
  document.getElementById("cartOverlay").classList.remove("open");
  document.body.style.overflow = "";
}

// ===== CHECKOUT MODAL =====
function openCheckout() {
  closeCart();

  // Build summary
  const summary = document.getElementById("orderSummary");
  const items = cart.map(item =>
    `<div class="modal__summary-item">
      <span>${item.name} <em style="color:var(--text-lt)">(${item.color}) ×${item.qty}</em></span>
      <span>${fmt(item.price * item.qty)}</span>
    </div>`
  ).join("");
  summary.innerHTML = items + `
    <div class="modal__summary-total">
      <span>Total</span>
      <span>${fmt(cartTotal())}</span>
    </div>
  `;

  document.getElementById("checkoutOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeCheckout() {
  document.getElementById("checkoutOverlay").classList.remove("open");
  document.body.style.overflow = "";
}

// ===== CONFIRM ORDER =====
function showConfirmation(name, email) {
  const ref = generateOrderRef();
  document.getElementById("confirmName").textContent = name;
  document.getElementById("confirmEmail").textContent = email;
  document.getElementById("confirmTotal").textContent = fmt(cartTotal());
  document.getElementById("pixKey").textContent = PIX_KEY;
  document.getElementById("orderRef").textContent = ref;
  document.getElementById("orderRefInline").textContent = ref;

  // Order items list
  const orderEl = document.getElementById("confirmOrder");
  orderEl.innerHTML = `
    <p style="margin-bottom:8px"><strong>Resumo da encomenda:</strong></p>
    ${cart.map(item =>
      `<p>• ${item.name} <em>(${item.color})</em> ×${item.qty} — ${fmt(item.price * item.qty)}</p>`
    ).join("")}
    <p style="margin-top:8px"><strong>Total: ${fmt(cartTotal())}</strong></p>
  `;

  closeCheckout();
  document.getElementById("confirmOverlay").classList.add("open");
  document.body.style.overflow = "hidden";

  // Clear cart after showing confirmation
  cart = [];
  renderCart();
}

function closeConfirm() {
  document.getElementById("confirmOverlay").classList.remove("open");
  document.body.style.overflow = "";
}

// ===== COPY PIX KEY =====
function copyPix() {
  const key = document.getElementById("pixKey").textContent;
  navigator.clipboard.writeText(key).then(() => {
    const btn = document.getElementById("copyPixBtn");
    btn.textContent = "Copiado!";
    setTimeout(() => { btn.textContent = "Copiar Contacto"; }, 2000);
  });
}

function copyRef() {
  const ref = document.getElementById("orderRef").textContent;
  navigator.clipboard.writeText(ref).then(() => {
    const btn = document.getElementById("copyRefBtn");
    btn.textContent = "Copiado!";
    setTimeout(() => { btn.textContent = "Copiar Referência"; }, 2000);
  });
}

// ===== FORM VALIDATION =====
function validateForm(form) {
  let valid = true;
  form.querySelectorAll("[required]").forEach(field => {
    field.classList.remove("error");
    if (!field.value.trim()) {
      field.classList.add("error");
      valid = false;
    }
  });

  const emailField = form.querySelector("[type=email]");
  if (emailField && emailField.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailField.value)) {
    emailField.classList.add("error");
    valid = false;
  }

  return valid;
}

// ===== CÓDIGO POSTAL MASK (PT: 0000-000) =====
function cepMask(e) {
  let v = e.target.value.replace(/\D/g, "").slice(0, 7);
  if (v.length > 4) v = v.slice(0, 4) + "-" + v.slice(4);
  e.target.value = v;
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  renderProducts();
  renderCart();

  document.getElementById("cartBtn").addEventListener("click", openCart);
  document.getElementById("cartClose").addEventListener("click", closeCart);
  document.getElementById("cartOverlay").addEventListener("click", closeCart);
  document.getElementById("checkoutBtn").addEventListener("click", openCheckout);
  document.getElementById("checkoutClose").addEventListener("click", closeCheckout);
  document.getElementById("custCep").addEventListener("input", cepMask);

  document.getElementById("checkoutOverlay").addEventListener("click", e => {
    if (e.target === document.getElementById("checkoutOverlay")) closeCheckout();
  });

  document.getElementById("confirmOverlay").addEventListener("click", e => {
    if (e.target === document.getElementById("confirmOverlay")) closeConfirm();
  });

  document.getElementById("checkoutForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validateForm(e.target)) return;

    const submitBtn = e.target.querySelector("[type=submit]");
    submitBtn.textContent = "A processar…";
    submitBtn.disabled = true;

    const orderRef = generateOrderRef();
    const customer = {
      name:    document.getElementById("custName").value.trim(),
      email:   document.getElementById("custEmail").value.trim(),
      phone:   document.getElementById("custPhone").value.trim(),
      address: `${document.getElementById("custCep").value.trim()} ${document.getElementById("custAddress").value.trim()}`,
    };

    try {
      const res = await fetch("/.netlify/functions/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart, customer, orderRef }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Erro desconhecido");
      }
    } catch (err) {
      alert("Erro ao processar o pedido. Por favor tente novamente.");
      submitBtn.textContent = "Confirmar Pedido";
      submitBtn.disabled = false;
    }
  });
});

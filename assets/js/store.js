/* ── SpeedMaster Store — localStorage data layer ─────────────────────────── */
window.SM = (function () {
  'use strict';

  var CART_KEY    = 'sm_cart';
  var USERS_KEY   = 'sm_users';
  var SESSION_KEY = 'sm_session';
  var ORDERS_KEY  = 'sm_orders';

  // ── HELPERS ───────────────────────────────────────────────────
  function get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || null; } catch (e) { return null; }
  }
  function set(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
  function fire(name, detail) { document.dispatchEvent(new CustomEvent(name, { detail: detail || {} })); }

  // ── CART ──────────────────────────────────────────────────────
  function getCart() { return get(CART_KEY) || []; }
  function saveCart(cart) { set(CART_KEY, cart); fire('sm:cart:updated', { cart: cart }); }

  function addToCart(item) {
    var cart = getCart();
    var key = item.id + '|' + (item.color || '');
    var existing = cart.find(function (i) { return (i.id + '|' + (i.color || '')) === key; });
    if (existing) { existing.qty += (item.qty || 1); }
    else { cart.push({ id: item.id, name: item.name, price: item.price, qty: item.qty || 1, thumb: item.thumb || '', category: item.category || '', color: item.color || '' }); }
    saveCart(cart);
    return { cart: cart };
  }

  function updateQty(id, color, qty) {
    var cart = getCart();
    var key = id + '|' + (color || '');
    var idx = cart.findIndex(function (i) { return (i.id + '|' + (i.color || '')) === key; });
    if (idx === -1) return;
    if (qty <= 0) { cart.splice(idx, 1); }
    else { cart[idx].qty = qty; }
    saveCart(cart);
  }

  function removeFromCart(id, color) { updateQty(id, color, 0); }
  function clearCart() { saveCart([]); }
  function cartTotal() { return getCart().reduce(function (s, i) { return s + i.price * i.qty; }, 0); }
  function cartCount() { return getCart().reduce(function (s, i) { return s + i.qty; }, 0); }

  // ── USERS ─────────────────────────────────────────────────────
  function getUsers() { return get(USERS_KEY) || []; }
  function saveUsers(u) { set(USERS_KEY, u); }

  function findByEmail(email) {
    return getUsers().find(function (u) { return u.email.toLowerCase() === email.toLowerCase(); }) || null;
  }

  function register(data) {
    if (findByEmail(data.email)) return { error: 'An account with this email already exists.' };
    if (!data.password || data.password.length < 6) return { error: 'Password must be at least 6 characters.' };
    var user = {
      id: 'usr_' + Date.now(),
      email: data.email,
      password: data.password,
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      phone: data.phone || '',
      createdAt: new Date().toISOString(),
      addresses: [],
      orderIds: []
    };
    var users = getUsers();
    users.push(user);
    saveUsers(users);
    _setSession(user);
    fire('sm:auth:changed', { user: user });
    return { user: user };
  }

  function login(email, password) {
    var user = findByEmail(email);
    if (!user) return { error: 'No account found with this email.' };
    if (user.password !== password) return { error: 'Incorrect password.' };
    _setSession(user);
    fire('sm:auth:changed', { user: user });
    return { user: user };
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    fire('sm:auth:changed', { user: null });
  }

  function _setSession(user) {
    set(SESSION_KEY, { userId: user.id, email: user.email });
  }

  function getSession() { return get(SESSION_KEY); }

  function currentUser() {
    var s = getSession();
    if (!s) return null;
    return getUsers().find(function (u) { return u.id === s.userId; }) || null;
  }

  function updateUser(userId, patches) {
    var users = getUsers();
    var idx = users.findIndex(function (u) { return u.id === userId; });
    if (idx === -1) return { error: 'User not found.' };
    Object.keys(patches).forEach(function (k) { users[idx][k] = patches[k]; });
    saveUsers(users);
    return { user: users[idx] };
  }

  function addAddress(userId, addr) {
    var users = getUsers();
    var idx = users.findIndex(function (u) { return u.id === userId; });
    if (idx === -1) return { error: 'User not found.' };
    addr.id = 'addr_' + Date.now();
    var addresses = users[idx].addresses || [];
    if (addr.isDefault) addresses.forEach(function (a) { a.isDefault = false; });
    addresses.push(addr);
    users[idx].addresses = addresses;
    saveUsers(users);
    return { address: addr };
  }

  function removeAddress(userId, addrId) {
    var users = getUsers();
    var idx = users.findIndex(function (u) { return u.id === userId; });
    if (idx === -1) return;
    users[idx].addresses = (users[idx].addresses || []).filter(function (a) { return a.id !== addrId; });
    saveUsers(users);
  }

  // ── ORDERS ────────────────────────────────────────────────────
  function getOrders() { return get(ORDERS_KEY) || []; }

  function createOrder(data) {
    var orders = getOrders();
    var order = Object.assign({}, data, {
      id: 'ORD-' + (100000 + orders.length + Math.floor(Math.random() * 900)).toString(),
      status: 'confirmed',
      createdAt: new Date().toISOString()
    });
    orders.unshift(order);
    set(ORDERS_KEY, orders);

    var user = currentUser();
    if (user) {
      var ids = user.orderIds || [];
      ids.unshift(order.id);
      updateUser(user.id, { orderIds: ids });
    }
    return { order: order };
  }

  function getOrderById(id) {
    return getOrders().find(function (o) { return o.id === id; }) || null;
  }

  function userOrders(userId) {
    return getOrders().filter(function (o) { return o.userId === userId; });
  }

  // ── FORMATTING ────────────────────────────────────────────────
  function fmt(p) { return '£' + p.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  return {
    getCart: getCart, addToCart: addToCart, updateQty: updateQty,
    removeFromCart: removeFromCart, clearCart: clearCart,
    cartTotal: cartTotal, cartCount: cartCount,
    register: register, login: login, logout: logout,
    getSession: getSession, currentUser: currentUser,
    findByEmail: findByEmail, updateUser: updateUser,
    addAddress: addAddress, removeAddress: removeAddress,
    createOrder: createOrder, getOrderById: getOrderById, userOrders: userOrders,
    fmt: fmt
  };
})();

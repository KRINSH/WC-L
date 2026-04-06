/**
 * WC-L — клиент API и навигация по разделам (прототип без фреймворка).
 *
 * Live Server (порт 5500/5501): запросы идут на тот же host, порт 8000 (uvicorn).
 * Свой API: перед app.js задайте window.WC_L_API_BASE = "http://127.0.0.1:9000/api/v1";
 */
(function () {
  const API = (function resolveApiBase() {
    if (typeof window.WC_L_API_BASE === "string" && window.WC_L_API_BASE.trim()) {
      return window.WC_L_API_BASE.replace(/\/$/, "");
    }
    const port = location.port;
    if (port === "5500" || port === "5501") {
      return `${location.protocol}//${location.hostname}:8000/api/v1`;
    }
    return "/api/v1";
  })();
  const TOKEN_KEY = "wc_l_access_token";

  function apiOrigin() {
    if (API.startsWith("http://") || API.startsWith("https://")) {
      return new URL(API).origin;
    }
    return "";
  }

  (function patchFooterLinks() {
    const origin = apiOrigin();
    const docs = document.getElementById("wc-l-link-docs");
    const health = document.getElementById("wc-l-link-health");
    const hint = document.getElementById("wc-l-live-hint");
    if (docs) docs.href = origin ? `${origin}/docs` : "/docs";
    if (health) health.href = origin ? `${origin}/api/v1/health` : "/api/v1/health";
    if (hint && origin) hint.style.display = "block";
  })();

  function healthUrl() {
    if (API.startsWith("http://") || API.startsWith("https://")) {
      return new URL(API).origin + "/api/v1/health";
    }
    return "/api/v1/health";
  }

  async function checkApiStatus() {
    if (document.visibilityState !== "visible") return;
    const dot = document.getElementById("wc-l-api-status");
    const txt = document.getElementById("wc-l-api-status-text");
    if (!dot || !txt) return;
    dot.className = "api-status api-status-unknown";
    txt.textContent = "Проверка API…";
    try {
      const res = await fetch(healthUrl(), { method: "GET" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.status !== "ok") throw new Error("bad");
      dot.className = "api-status api-status-ok";
      txt.textContent = "API в сети";
    } catch {
      dot.className = "api-status api-status-fail";
      txt.textContent = "API недоступно (запустите uvicorn :8000)";
    }
  }

  const views = {
    home: document.getElementById("view-home"),
    about: document.getElementById("view-about"),
    rules: document.getElementById("view-rules"),
    news: document.getElementById("view-news"),
    connect: document.getElementById("view-connect"),
    login: document.getElementById("view-login"),
    register: document.getElementById("view-register"),
    profile: document.getElementById("view-profile"),
    admin: document.getElementById("view-admin"),
  };

  const navButtons = document.querySelectorAll("[data-nav]");
  const btnLogout = document.getElementById("btn-logout");
  const guestBlock = document.getElementById("nav-guest");
  const userBlock = document.getElementById("nav-user");
  const adminNavBtn = document.getElementById("nav-admin");
  const userLabel = document.getElementById("nav-user-label");

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    invalidateAuthMeCache();
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
    updateAuthNav();
  }

  function authHeaders() {
    const t = getToken();
    return t ? { Authorization: "Bearer " + t } : {};
  }

  async function apiFetch(path, options = {}) {
    const headers = { ...authHeaders(), ...(options.headers || {}) };
    if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(options.body);
    }
    const res = await fetch(API + path, { ...options, headers });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!res.ok) {
      const detail =
        data && typeof data === "object" && data.detail !== undefined
          ? typeof data.detail === "string"
            ? data.detail
            : JSON.stringify(data.detail)
          : res.statusText;
      throw new Error(detail || "Ошибка запроса");
    }
    return data;
  }

  /** Кэш GET /auth/me: меньше дублей при открытии профиля после шапки; параллельные вызовы — один fetch. */
  let _authMeCache = null;
  let _authMeCacheAt = 0;
  let _authMePending = null;
  const AUTH_ME_TTL_MS = 12000;

  function invalidateAuthMeCache() {
    _authMeCache = null;
    _authMeCacheAt = 0;
    _authMePending = null;
  }

  async function fetchAuthMeCached() {
    const token = getToken();
    if (!token) return null;
    const now = Date.now();
    if (_authMeCache && now - _authMeCacheAt < AUTH_ME_TTL_MS) return _authMeCache;
    if (_authMePending) return _authMePending;
    _authMePending = apiFetch("/auth/me")
      .then((me) => {
        _authMeCache = me;
        _authMeCacheAt = Date.now();
        _authMePending = null;
        return me;
      })
      .catch((err) => {
        _authMePending = null;
        invalidateAuthMeCache();
        throw err;
      });
    return _authMePending;
  }

  function showView(name) {
    document.body.setAttribute("data-view", name);
    Object.keys(views).forEach((key) => {
      const el = views[key];
      if (!el) return;
      el.classList.toggle("is-visible", key === name);
    });
    navButtons.forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-nav") === name);
    });
    if (name === "profile") loadProfile();
    if (name === "admin") loadAdminUsers();
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }

  function updateAuthNav() {
    const token = getToken();
    if (guestBlock) guestBlock.classList.toggle("hidden", !!token);
    if (userBlock) userBlock.classList.toggle("hidden", !token);
    if (!token) {
      if (adminNavBtn) adminNavBtn.classList.add("hidden");
      return;
    }
    fetchAuthMeCached()
      .then((me) => {
        if (!me) return;
        if (userLabel) userLabel.textContent = me.username;
        if (adminNavBtn) adminNavBtn.classList.toggle("hidden", !me.is_admin);
      })
      .catch(() => {
        setToken(null);
      });
  }

  document.body.addEventListener("click", (e) => {
    const navEl = e.target.closest("[data-nav]");
    if (!navEl || navEl.closest("a[href]")) return;
    const name = navEl.getAttribute("data-nav");
    if (!name) return;
    e.preventDefault();
    showView(name);
  });

  document.querySelectorAll("[data-go-home]").forEach((el) => {
    el.addEventListener("click", () => showView("home"));
  });

  function logout() {
    setToken(null);
    showView("home");
  }

  if (btnLogout) btnLogout.addEventListener("click", logout);
  document.getElementById("btn-logout-2")?.addEventListener("click", logout);

  /* ——— Формы ——— */
  const loginForm = document.getElementById("form-login");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = document.getElementById("login-message");
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      msg.textContent = "";
      msg.className = "flash";
      const fd = new FormData(loginForm);
      const login = fd.get("login");
      const password = fd.get("password");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.label = submitBtn.textContent;
        submitBtn.textContent = "Входим…";
      }
      try {
        const res = await fetch(API + "/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ login, password }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof data.detail === "string" ? data.detail : data.detail?.[0]?.msg || "Неверный логин или пароль"
          );
        }
        setToken(data.access_token);
        msg.classList.add("flash-success");
        msg.textContent = "Добро пожаловать в цитадель!";
        showView("profile");
        checkApiStatus();
      } catch (err) {
        msg.classList.add("flash-error");
        msg.textContent = err.message;
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitBtn.dataset.label || "Войти";
        }
      }
    });
  }

  const registerForm = document.getElementById("form-register");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = document.getElementById("register-message");
      const submitBtn = registerForm.querySelector('button[type="submit"]');
      msg.textContent = "";
      msg.className = "flash";
      const fd = new FormData(registerForm);
      const payload = {
        username: fd.get("username"),
        email: fd.get("email"),
        password: fd.get("password"),
      };
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.label = submitBtn.textContent;
        submitBtn.textContent = "Создаём…";
      }
      try {
        await apiFetch("/auth/register", { method: "POST", body: payload });
        msg.classList.add("flash-success");
        msg.textContent = "Учётная запись создана. Войдите.";
        registerForm.reset();
        setTimeout(() => showView("login"), 800);
        checkApiStatus();
      } catch (err) {
        msg.classList.add("flash-error");
        msg.textContent = err.message;
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitBtn.dataset.label || "Зарегистрироваться";
        }
      }
    });
  }

  /** Головы mc-heads.net; в меню только превью, подписи — в title (подсказка при наведении). */
  const MC_HEAD_MAIN = 128;
  const MC_HEAD_MENU = 32;
  const MC_AVATAR_VARIANTS = Object.freeze([
    { id: "by_nick", headName: null, label: "По нику сайта" },
    { id: "steve", headName: "Steve", label: "Стив" },
    { id: "notch", headName: "Notch", label: "Notch" },
    { id: "jeb", headName: "jeb_", label: "Jeb" },
    { id: "question", headName: "MHF_Question", label: "Секрет" },
    { id: "chicken", headName: "MHF_Chicken", label: "Курица" },
    { id: "pig", headName: "MHF_Pig", label: "Свинья" },
    { id: "alex", headName: "Alex", label: "Алекс" },
  ]);
  const DEFAULT_MC_AVATAR_VARIANT = "by_nick";
  const MC_AVATAR_STORAGE_KEY = "wc_l_mc_avatar_variant_by_user";

  let _mcAvatarMapCache = null;
  window.addEventListener("storage", (e) => {
    if (e.key === MC_AVATAR_STORAGE_KEY) _mcAvatarMapCache = null;
  });
  function readMcAvatarMap() {
    if (_mcAvatarMapCache) return _mcAvatarMapCache;
    try {
      const raw = localStorage.getItem(MC_AVATAR_STORAGE_KEY);
      _mcAvatarMapCache = raw ? JSON.parse(raw) : {};
      if (!_mcAvatarMapCache || typeof _mcAvatarMapCache !== "object") _mcAvatarMapCache = {};
    } catch {
      _mcAvatarMapCache = {};
    }
    return _mcAvatarMapCache;
  }

  function writeMcAvatarMap(map) {
    _mcAvatarMapCache = map;
    localStorage.setItem(MC_AVATAR_STORAGE_KEY, JSON.stringify(map));
  }

  function getMcVariantDef(variantId) {
    for (let i = 0; i < MC_AVATAR_VARIANTS.length; i += 1) {
      if (MC_AVATAR_VARIANTS[i].id === variantId) return MC_AVATAR_VARIANTS[i];
    }
    return MC_AVATAR_VARIANTS[0];
  }

  function getStoredMcVariant(userId) {
    const v = readMcAvatarMap()[String(userId)];
    if (v) {
      for (let i = 0; i < MC_AVATAR_VARIANTS.length; i += 1) {
        if (MC_AVATAR_VARIANTS[i].id === v) return v;
      }
    }
    return DEFAULT_MC_AVATAR_VARIANT;
  }

  function setStoredMcVariant(userId, variantId) {
    let ok = false;
    for (let i = 0; i < MC_AVATAR_VARIANTS.length; i += 1) {
      if (MC_AVATAR_VARIANTS[i].id === variantId) {
        ok = true;
        break;
      }
    }
    if (!ok) return;
    const map = { ...readMcAvatarMap() };
    map[String(userId)] = variantId;
    writeMcAvatarMap(map);
  }

  function minecraftValidUsername(username) {
    return /^[a-zA-Z0-9_]{3,16}$/.test(String(username).trim());
  }

  /** Имя скина для fallback (minotar и т.д.): по варианту или по нику сайта. */
  function effectiveMcSkinName(username, variantId) {
    const v = getMcVariantDef(variantId);
    if (v.headName != null) return v.headName;
    const u = String(username).trim();
    if (minecraftValidUsername(u)) return u;
    return "Steve";
  }

  /**
   * «По нику» и «Стив» не должны совпадать: при невалидном нике — bust Steve (не Alex, чтобы не ловить битую картинку
   * и подмену на Steve во 2-й клетке); при нике Steve — helm вместо avatar, как у отдельной кнопки «Стив».
   */
  function buildMcAvatarUrl(username, variantId, size) {
    const v = getMcVariantDef(variantId);
    if (v.headName != null) {
      return `https://mc-heads.net/avatar/${encodeURIComponent(v.headName)}/${size}`;
    }
    const u = String(username).trim();
    if (minecraftValidUsername(u)) {
      if (u.toLowerCase() === "steve") {
        return `https://mc-heads.net/helm/${encodeURIComponent(u)}/${size}`;
      }
      return `https://mc-heads.net/avatar/${encodeURIComponent(u)}/${size}`;
    }
    return `https://mc-heads.net/bust/Steve/${size}`;
  }

  function dedupeAvatarUrls(urls) {
    const seen = new Set();
    const out = [];
    for (let i = 0; i < urls.length; i += 1) {
      const u = urls[i];
      if (seen.has(u)) continue;
      seen.add(u);
      out.push(u);
    }
    return out;
  }

  /** Если mc-heads недоступен — minotar, потом запасной Steve; иначе остаются инициалы (например «AD» у admin). */
  function avatarUrlChain(username, variantId, size) {
    const primary = buildMcAvatarUrl(username, variantId, size);
    const skin = effectiveMcSkinName(username, variantId);
    return dedupeAvatarUrls([
      primary,
      `https://minotar.net/avatar/${encodeURIComponent(skin)}/${size}`,
      `https://minotar.net/helm/${encodeURIComponent(skin)}/${size}`,
      `https://mc-heads.net/avatar/Steve/${size}`,
    ]);
  }

  function renderMcAvatarMenuHtml(username, currentVariantId) {
    const tiles = MC_AVATAR_VARIANTS.map((v) => {
      const sel = v.id === currentVariantId ? " is-selected" : "";
      const src = buildMcAvatarUrl(username, v.id, MC_HEAD_MENU);
      const title = escapeHtml(v.label);
      return `<button type="button" class="profile-avatar-tile${sel}" role="menuitem" data-mc-variant="${v.id}" title="${title}" aria-label="${title}">
        <img src="${src}" alt="" width="${MC_HEAD_MENU}" height="${MC_HEAD_MENU}" loading="lazy" decoding="async" referrerpolicy="no-referrer" />
      </button>`;
    }).join("");
    return `<div class="profile-avatar-menu hidden" id="profile-avatar-menu" role="menu" aria-label="Выбор головы Minecraft" aria-hidden="true">
      <div class="profile-avatar-menu-grid" role="group">${tiles}</div>
    </div>`;
  }

  function bindProfileAvatarImage(box, username, variantId) {
    const frame = box.querySelector(".profile-avatar-frame");
    const img = box.querySelector(".profile-avatar-img");
    if (!img || !frame) return;
    const chain = avatarUrlChain(username, variantId, MC_HEAD_MAIN);
    let attempt = 0;
    img.onload = function () {
      img.classList.remove("is-hidden");
      frame.classList.remove("show-fallback");
    };
    img.onerror = function () {
      attempt += 1;
      if (attempt < chain.length) {
        img.src = chain[attempt];
        return;
      }
      img.classList.add("is-hidden");
      frame.classList.add("show-fallback");
    };
  }

  function bindMcAvatarMenuTiles(root) {
    const menu = root.querySelector("#profile-avatar-menu");
    const un = root.dataset.profileUsername;
    if (!menu || un === undefined) return;
    menu.querySelectorAll(".profile-avatar-tile img").forEach((imgEl) => {
      const tile = imgEl.closest("[data-mc-variant]");
      const variantId = tile?.getAttribute("data-mc-variant");
      if (!variantId) return;
      const chain = avatarUrlChain(un, variantId, MC_HEAD_MENU);
      let attempt = 0;
      imgEl.onerror = function () {
        attempt += 1;
        if (attempt < chain.length) {
          imgEl.src = chain[attempt];
          return;
        }
        imgEl.style.opacity = "0.35";
      };
      imgEl.onload = function () {
        imgEl.style.opacity = "";
      };
    });
  }

  function setMainProfileAvatar(box, username, variantId) {
    const img = box.querySelector(".profile-avatar-img");
    const frame = box.querySelector(".profile-avatar-frame");
    if (!img || !frame) return;
    frame.classList.remove("show-fallback");
    img.classList.remove("is-hidden");
    const chain = avatarUrlChain(username, variantId, MC_HEAD_MAIN);
    img.src = chain[0];
    bindProfileAvatarImage(box, username, variantId);
  }

  function closeMcAvatarMenu() {
    const menu = document.getElementById("profile-avatar-menu");
    const editBtn = document.getElementById("profile-avatar-edit-btn");
    if (menu) {
      menu.classList.add("hidden");
      menu.setAttribute("aria-hidden", "true");
    }
    if (editBtn) editBtn.setAttribute("aria-expanded", "false");
  }

  document.body.addEventListener("click", (e) => {
    const editBtn = e.target.closest("#profile-avatar-edit-btn");
    if (editBtn && document.getElementById("profile-content")?.contains(editBtn)) {
      e.stopPropagation();
      const menu = document.getElementById("profile-avatar-menu");
      if (!menu) return;
      const open = menu.classList.contains("hidden");
      if (open) {
        menu.classList.remove("hidden");
        menu.setAttribute("aria-hidden", "false");
        editBtn.setAttribute("aria-expanded", "true");
      } else {
        closeMcAvatarMenu();
      }
      return;
    }

    const item = e.target.closest("[data-mc-variant]");
    const root = document.getElementById("profile-content");
    if (item && root?.contains(item)) {
      e.stopPropagation();
      const userId = root.dataset.profileUserId;
      const username = root.dataset.profileUsername;
      if (userId === undefined || username === undefined) return;
      const variantId = item.getAttribute("data-mc-variant");
      if (!variantId || !MC_AVATAR_VARIANTS.some((v) => v.id === variantId)) return;
      setStoredMcVariant(Number(userId), variantId);
      setMainProfileAvatar(root, username, variantId);
      root.querySelectorAll("[data-mc-variant]").forEach((el) => {
        el.classList.toggle("is-selected", el.getAttribute("data-mc-variant") === variantId);
      });
      closeMcAvatarMenu();
    }
  });

  document.addEventListener("click", (e) => {
    const menu = document.getElementById("profile-avatar-menu");
    if (!menu || menu.classList.contains("hidden")) return;
    if (e.target.closest(".profile-avatar-shell")) return;
    closeMcAvatarMenu();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMcAvatarMenu();
  });

  function profileInitials(username) {
    const t = String(username || "").trim();
    if (!t) return "?";
    const segs = t.split(/[\s_]+/).filter(Boolean);
    if (segs.length >= 2) return (segs[0][0] + segs[1][0]).toUpperCase();
    return t.slice(0, 2).toUpperCase();
  }

  function profileHue(username) {
    let h = 2166136261;
    const s = String(username || "");
    for (let i = 0; i < s.length; i += 1) {
      h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    }
    return Math.abs(h) % 360;
  }

  async function loadProfile() {
    const box = document.getElementById("profile-content");
    const msg = document.getElementById("profile-message");
    if (!box) return;
    box.innerHTML = "";
    delete box.dataset.profileUserId;
    delete box.dataset.profileUsername;
    msg.textContent = "";
    msg.className = "flash";
    if (!getToken()) {
      showView("login");
      return;
    }
    try {
      const me = await fetchAuthMeCached();
      if (!me) {
        showView("login");
        return;
      }
      const variantId = getStoredMcVariant(me.id);
      const hue = profileHue(me.username);
      const initials = escapeHtml(profileInitials(me.username));
      const avatarUrl = avatarUrlChain(me.username, variantId, MC_HEAD_MAIN)[0];

      const guardianBadge = me.is_admin
        ? '<span class="profile-badge profile-badge-guardian">Хранитель</span>'
        : '<span class="profile-badge">Игрок</span>';
      const banBadge = me.is_banned
        ? '<span class="profile-badge profile-badge-exile">Изгнан</span>'
        : '<span class="profile-badge profile-badge-warden">В цитадели</span>';

      const adminBlock = me.is_admin
        ? '<div class="profile-card-actions"><button type="button" class="btn btn-primary" data-nav="admin">Зал хранителей</button></div>'
        : "";

      box.innerHTML = `
        <div class="profile-card">
          <div class="profile-card-hero">
            <div class="profile-avatar-shell">
              <div class="profile-avatar-row">
                <div class="profile-avatar-display">
                  <div class="profile-avatar-frame" style="--avatar-hue: ${hue}">
                    <div class="profile-avatar-inner">
                      <img class="profile-avatar-img" src="${avatarUrl}" alt="" width="${MC_HEAD_MAIN}" height="${MC_HEAD_MAIN}" loading="eager" decoding="async" fetchpriority="high" referrerpolicy="no-referrer" />
                      <div class="profile-avatar-fallback" aria-hidden="true">${initials}</div>
                    </div>
                  </div>
                </div>
                <div class="profile-avatar-controls">
                  <button type="button" class="profile-avatar-edit-btn" id="profile-avatar-edit-btn" aria-expanded="false" aria-controls="profile-avatar-menu" aria-haspopup="true" title="Выбрать голову Minecraft">✎</button>
                  ${renderMcAvatarMenuHtml(me.username, variantId)}
                </div>
              </div>
              <p class="profile-avatar-hint">Нажми <strong>карандаш</strong> — список голов</p>
            </div>
            <div class="profile-hero-text">
              <h3 class="profile-hero-name">${escapeHtml(me.username)}</h3>
              <p class="profile-hero-id">Учётная запись № ${me.id}</p>
              <div class="profile-hero-badges">${guardianBadge}${banBadge}</div>
            </div>
          </div>
          <div class="profile-card-body">
            <div class="profile-detail-row">
              <span class="profile-detail-label">Свиток (email)</span>
              <span class="profile-detail-value">${escapeHtml(me.email)}</span>
            </div>
            <div class="profile-detail-row">
              <span class="profile-detail-label">Имя героя</span>
              <span class="profile-detail-value">${escapeHtml(me.username)}</span>
            </div>
          </div>
          ${adminBlock}
        </div>
      `;

      box.dataset.profileUserId = String(me.id);
      box.dataset.profileUsername = me.username;
      bindProfileAvatarImage(box, me.username, variantId);
      bindMcAvatarMenuTiles(box);
    } catch (err) {
      msg.classList.add("flash-error");
      msg.textContent = err.message;
    }
  }

  function adminUsersQuery() {
    const r = document.querySelector('input[name="admin-filter"]:checked');
    if (!r) return "";
    if (r.value === "admins") return "?is_admin=true";
    if (r.value === "players") return "?is_admin=false";
    return "";
  }

  async function loadAdminUsers() {
    const tbody = document.querySelector("#admin-users tbody");
    const msg = document.getElementById("admin-message");
    if (!tbody) return;
    tbody.innerHTML = "";
    if (msg) {
      msg.textContent = "";
      msg.className = "flash";
    }
    if (!getToken()) {
      showView("login");
      return;
    }
    try {
      const me = await fetchAuthMeCached();
      if (!me) {
        showView("login");
        return;
      }
      const myId = me.id;
      const users = await apiFetch("/admin/users" + adminUsersQuery());
      users.forEach((u) => {
        const tr = document.createElement("tr");
        const isSelf = u.id === myId;
        let actionsHtml;
        if (isSelf) {
          actionsHtml = '<span style="color:var(--text-muted);font-size:0.9rem">Это вы</span>';
        } else {
          const banBtn = u.is_banned
            ? `<button type="button" class="btn btn-small" data-act="ban" data-id="${u.id}" data-to="false">Снять бан</button>`
            : `<button type="button" class="btn btn-small btn-danger" data-act="ban" data-id="${u.id}" data-to="true">Бан</button>`;
          const admBtn = u.is_admin
            ? `<button type="button" class="btn btn-small" data-act="admin" data-id="${u.id}" data-to="false">Снять админа</button>`
            : `<button type="button" class="btn btn-small btn-primary" data-act="admin" data-id="${u.id}" data-to="true">Сделать админом</button>`;
          actionsHtml = `<div class="admin-actions-inner">${banBtn}${admBtn}</div>`;
        }
        tr.innerHTML = `
          <td>${u.id}</td>
          <td>${escapeHtml(u.username)}</td>
          <td>${escapeHtml(u.email)}</td>
          <td><span class="badge ${u.is_admin ? "badge-yes" : "badge-no"}">${u.is_admin ? "Да" : "Нет"}</span></td>
          <td><span class="badge ${u.is_banned ? "badge-yes" : "badge-no"}">${u.is_banned ? "Да" : "Нет"}</span></td>
          <td class="admin-actions">${actionsHtml}</td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      if (msg) {
        msg.classList.add("flash-error");
        msg.textContent = err.message;
      }
    }
  }

  document.querySelectorAll('input[name="admin-filter"]').forEach((inp) => {
    inp.addEventListener("change", () => {
      if (views.admin && views.admin.classList.contains("is-visible")) loadAdminUsers();
    });
  });

  document.getElementById("btn-admin-refresh")?.addEventListener("click", () => loadAdminUsers());

  document.querySelector("#admin-users tbody")?.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const act = btn.getAttribute("data-act");
    const id = Number(btn.getAttribute("data-id"), 10);
    const toTrue = btn.getAttribute("data-to") === "true";
    const msg = document.getElementById("admin-message");
    btn.disabled = true;
    try {
      if (act === "ban") {
        await apiFetch(`/admin/users/${id}/ban`, { method: "PATCH", body: { is_banned: toTrue } });
      } else if (act === "admin") {
        await apiFetch(`/admin/users/${id}/admin`, { method: "PATCH", body: { is_admin: toTrue } });
      }
      if (msg) {
        msg.className = "flash flash-success";
        msg.textContent = "Сохранено.";
      }
      await loadAdminUsers();
      updateAuthNav();
    } catch (err) {
      if (msg) {
        msg.className = "flash flash-error";
        msg.textContent = err.message;
      }
    } finally {
      btn.disabled = false;
    }
  });

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  document.getElementById("btn-copy-ip")?.addEventListener("click", () => {
    const ip = document.getElementById("server-ip")?.textContent?.trim() || "";
    navigator.clipboard.writeText(ip).then(
      () => {
        const el = document.getElementById("copy-ip-feedback");
        if (el) {
          el.textContent = "Скопировано в свиток!";
          setTimeout(() => {
            el.textContent = "";
          }, 2000);
        }
      },
      () => {}
    );
  });

  /** Фоновые монеты: координаты страницы (скролл), столкновения, звёзды-GIF при ударе. */
  (function initGoldOrbs() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const layer = document.createElement("div");
    layer.className = "fx-orbs-layer";
    layer.setAttribute("aria-hidden", "true");
    document.body.prepend(layer);

    const count = 13;
    const particles = [];
    let mx = 0;
    let my = 0;
    let w0 = window.innerWidth;
    let h0 = document.documentElement.scrollHeight;

    function syncLayerHeight() {
      h0 = document.documentElement.scrollHeight;
      w0 = window.innerWidth;
    }

    /** Нижний край шапки (лого, навигация) в координатах документа — монеты не выше этого уровня */
    function headerBottomDocY() {
      const el = document.querySelector(".site-header");
      if (!el) return 0;
      return el.getBoundingClientRect().bottom + window.scrollY;
    }

    document.addEventListener(
      "pointermove",
      (e) => {
        mx = e.clientX + window.scrollX;
        my = e.clientY + window.scrollY;
      },
      { passive: true }
    );

    const ORB_MAX_SPEED = 2.8;
    const WALL_BOUNCE = 0.88;
    const COIN_RESTITUTION = 0.82;
    const STAR_GIF_NAMES = [
      "звизда 1.gif",
      "звезда 2_export_Анимация.gif",
      "звезда 3.gif",
      "звезда 4.gif",
    ];
    function starGifUrl(index) {
      return "static/img/" + encodeURIComponent(STAR_GIF_NAMES[index]);
    }
    let sparksThisFrame = 0;
    const SPARK_CAP_PER_FRAME = 24;
    const pairSparkNext = Object.create(null);

    const STAR_STAGGER_MS = 55;
    const ORB_SIZE_PX = 40;

    /** На удар — ровно 4 звезды с небольшой задержкой между появлениями */
    function spawnSparks(px, py) {
      for (let s = 0; s < 4; s += 1) {
        window.setTimeout(() => {
          if (sparksThisFrame >= SPARK_CAP_PER_FRAME) return;
          sparksThisFrame += 1;
          const idx = Math.floor(Math.random() * 4);
          const wrap = document.createElement("span");
          wrap.className = "fx-spark";
          wrap.style.left = `${px + (Math.random() - 0.5) * 24}px`;
          wrap.style.top = `${py + (Math.random() - 0.5) * 24}px`;
          const ang = Math.random() * Math.PI * 2;
          const dist = 88 + Math.random() * 92;
          wrap.style.setProperty("--spark-tx", `${Math.cos(ang) * dist}px`);
          wrap.style.setProperty("--spark-ty", `${Math.sin(ang) * dist}px`);
          const img = document.createElement("img");
          img.src = starGifUrl(idx);
          img.alt = "";
          img.draggable = false;
          wrap.appendChild(img);
          layer.appendChild(wrap);
          window.setTimeout(() => {
            if (wrap.parentNode) wrap.remove();
          }, 780);
        }, s * STAR_STAGGER_MS);
      }
    }

    syncLayerHeight();
    mx = w0 * 0.5;
    my = h0 * 0.5;

    const r0 = ORB_SIZE_PX * 0.5;
    const pad0 = r0 + 10;
    const yMin0 = headerBottomDocY() + pad0;
    const ySpan0 = Math.max(40, h0 - yMin0 - pad0);
    for (let i = 0; i < count; i += 1) {
      const el = document.createElement("div");
      el.className = "fx-orb";
      el.style.setProperty("--orb-size", `${ORB_SIZE_PX}px`);
      layer.appendChild(el);
      particles.push({
        el,
        r: r0,
        x: pad0 + Math.random() * Math.max(40, w0 - 2 * pad0),
        y: yMin0 + Math.random() * ySpan0,
        vx: 0,
        vy: 0,
      });
    }

    window.addEventListener(
      "resize",
      () => {
        syncLayerHeight();
        const hbR = headerBottomDocY();
        for (let i = 0; i < particles.length; i += 1) {
          const p = particles[i];
          const pad = p.r + 10;
          const yTop = hbR + pad;
          p.x = Math.min(w0 - pad, Math.max(pad, p.x));
          p.y = Math.min(h0 - pad, Math.max(yTop, p.y));
        }
      },
      { passive: true }
    );

    window.addEventListener("scroll", syncLayerHeight, { passive: true });

    let rafId = 0;
    let tickFrame = 0;
    function tick() {
      tickFrame += 1;
      syncLayerHeight();
      sparksThisFrame = 0;
      const infl = Math.min(w0, h0) * 0.22;
      const hb = headerBottomDocY();

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        const pad = p.r + 10;
        const yTop = hb + pad;
        const dx = p.x - mx;
        const dy = p.y - my;
        const d = Math.hypot(dx, dy);
        if (d < infl && d > 1) {
          const f = ((infl - d) / infl) ** 1.35;
          const inv = 1 / d;
          const kick = 2.4 * f;
          p.vx += dx * inv * kick;
          p.vy += dy * inv * kick;
        }
        p.vx *= 0.987;
        p.vy *= 0.987;
        const sp = Math.hypot(p.vx, p.vy);
        if (sp > ORB_MAX_SPEED) {
          p.vx = (p.vx / sp) * ORB_MAX_SPEED;
          p.vy = (p.vy / sp) * ORB_MAX_SPEED;
        }
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < pad) {
          p.x = pad;
          p.vx = Math.abs(p.vx) * WALL_BOUNCE;
        } else if (p.x > w0 - pad) {
          p.x = w0 - pad;
          p.vx = -Math.abs(p.vx) * WALL_BOUNCE;
        }
        if (p.y < yTop) {
          p.y = yTop;
          p.vy = Math.abs(p.vy) * WALL_BOUNCE;
        } else if (p.y > h0 - pad) {
          p.y = h0 - pad;
          p.vy = -Math.abs(p.vy) * WALL_BOUNCE;
        }
      }

      /* Сетка: при ~1000 монетах полный O(n²) неприемлем */
      const COLL_CELL = 64;
      for (let pass = 0; pass < 2; pass += 1) {
        const grid = new Map();
        for (let i = 0; i < particles.length; i += 1) {
          const p = particles[i];
          const key = `${Math.floor(p.x / COLL_CELL)},${Math.floor(p.y / COLL_CELL)}`;
          let bucket = grid.get(key);
          if (!bucket) {
            bucket = [];
            grid.set(key, bucket);
          }
          bucket.push(i);
        }
        for (let i = 0; i < particles.length; i += 1) {
          const p = particles[i];
          const cx = Math.floor(p.x / COLL_CELL);
          const cy = Math.floor(p.y / COLL_CELL);
          for (let dcx = -1; dcx <= 1; dcx += 1) {
            for (let dcy = -1; dcy <= 1; dcy += 1) {
              const bucket = grid.get(`${cx + dcx},${cy + dcy}`);
              if (!bucket) continue;
              for (let b = 0; b < bucket.length; b += 1) {
                const j = bucket[b];
                if (j <= i) continue;
                const q = particles[j];
                let dx = q.x - p.x;
                let dy = q.y - p.y;
                let dist = Math.hypot(dx, dy);
                const minDist = p.r + q.r + 4;
                if (dist < minDist && dist > 0.0001) {
                  const nx = dx / dist;
                  const ny = dy / dist;
                  const overlap = minDist - dist;
                  const sx = nx * overlap * 0.5;
                  const sy = ny * overlap * 0.5;
                  const rvx = q.vx - p.vx;
                  const rvy = q.vy - p.vy;
                  const vnBefore = rvx * nx + rvy * ny;
                  p.x -= sx;
                  p.y -= sy;
                  q.x += sx;
                  q.y += sy;
                  if (vnBefore < 0) {
                    const impulse = (-(1 + COIN_RESTITUTION) * vnBefore) / 2;
                    p.vx -= impulse * nx;
                    p.vy -= impulse * ny;
                    q.vx += impulse * nx;
                    q.vy += impulse * ny;
                  }
                  const pairKey = `${i},${j}`;
                  if (tickFrame >= (pairSparkNext[pairKey] || 0) && vnBefore < -0.12) {
                    pairSparkNext[pairKey] = tickFrame + 18;
                    spawnSparks((p.x + q.x) * 0.5, (p.y + q.y) * 0.5);
                  }
                }
              }
            }
          }
        }
      }

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        const pad = p.r + 10;
        const yTop = hb + pad;
        if (p.y < yTop) p.y = yTop;
      }

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        p.el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) translate(-50%, -50%)`;
      }
      rafId = requestAnimationFrame(tick);
    }
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        cancelAnimationFrame(rafId);
      } else {
        rafId = requestAnimationFrame(tick);
      }
    });
    rafId = requestAnimationFrame(tick);
  })();

  updateAuthNav();
  showView("home");
  checkApiStatus();
  setInterval(checkApiStatus, 45000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkApiStatus();
  });
})();

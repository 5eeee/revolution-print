const appModule = (() => {
  const pages = {
    dashboard: dashboardPage,
    clients: clientsPage,
    orders: ordersPage,
    orderDetail: orderDetailPage,
    documents: documentsPage,
    documentCreate: documentCreatePage,
    production: productionPage,
    chat: chatPage,
    admin: adminPage,
    profile: profilePage,
  };

  const navItems = [
    { id: 'dashboard', icon: 'home', title: 'Главная', subtitle: 'Обзор и статистика' },
    { id: 'clients', icon: 'users', title: 'Клиенты', subtitle: 'Управление базой' },
    { id: 'orders', icon: 'clipboard', title: 'Заказы', subtitle: 'Жизненный цикл заказа' },
    { id: 'documents', icon: 'fileText', title: 'Документы', subtitle: 'КП, сметы, акты' },
    { id: 'production', icon: 'factory', title: 'Производство', subtitle: 'Подрядчики' },
    { id: 'chat', icon: 'chat', title: 'Чат', subtitle: 'Коммуникации' },
    { id: 'profile', icon: 'settings', title: 'Профиль', subtitle: 'Настройки' },
  ];

  // Дополнительные заголовки для страниц без навигации
  const pageTitles = {
    orderDetail: 'Детали заказа',
    documentCreate: 'Создание документа',
    admin: 'Администрирование',
  };

  let currentPage = 'dashboard';
  let currentParams = {};

  function checkAuthentication() {
    if (!authModule.isAuthenticated()) {
      showLoginModal();
      return false;
    }
    return true;
  }

  function showLoginModal() {
    const backdrop = document.getElementById('modalBackdrop');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const app = document.getElementById('app');

    app.style.display = 'none';

    title.textContent = 'Вход в систему';
    body.innerHTML = `
      <div class="field">
        <label>Email</label>
        <input id="loginEmail" placeholder="user@example.com" />
      </div>
      <div class="field" style="margin-top: 10px;">
        <label>Пароль</label>
        <input id="loginPassword" type="password" placeholder="••••••••" />
      </div>
      <div class="row" style="margin-top: 12px; gap: 10px;">
        <button class="btn primary" id="btnLogin">Вход</button>
      </div>
    `;

    backdrop.style.display = 'flex';
    backdrop.style.zIndex = '999';

    document.getElementById('btnLogin').addEventListener('click', async () => {
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;

      if (!email || !password) {
        showToast('Заполните все поля');
        return;
      }

      try {
        await authModule.login(email, password);
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
        backdrop.style.display = 'none';
        app.style.display = 'grid';
        initializeApp();
      } catch (error) {
        showToast('Ошибка входа: ' + error.message);
      }
    });


  }

  function renderNav() {
    const nav = document.getElementById('nav');
    const user = authModule.getUser();

    let navToShow = [...navItems];
    if (user.role === 'admin') {
      navToShow.push({ id: 'admin', icon: 'key', title: 'Администрирование', subtitle: 'Управление пользователями' });
    }

    nav.innerHTML = navToShow.map(item => `
      <button class="nav-btn ${currentPage === item.id ? 'active' : ''}" data-page="${item.id}">
        <span class="left">
          <span class="dot">${icon(item.icon, 16)}</span>
          <div>
            <div style="font-size: 13px;">${item.title}</div>
            <div style="font-size: 11px; color: var(--muted);">${item.subtitle}</div>
          </div>
        </span>
      </button>
    `).join('');

    nav.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        goToPage(btn.dataset.page);
      });
    });
  }

  function renderTopbar() {
    const user = authModule.getUser();
    document.getElementById('whoName').textContent = user.fullName;
    document.getElementById('whoRole').textContent = user.role;

    // Sidebar avatar
    const avatarEl = document.getElementById('sidebarAvatar');
    if (avatarEl) {
      if (user.avatar) {
        avatarEl.style.backgroundImage = `url(${api.baseUrl.replace('/api', '')}${user.avatar})`;
        avatarEl.style.backgroundSize = 'cover';
        avatarEl.style.backgroundPosition = 'center';
        avatarEl.textContent = '';
      } else {
        avatarEl.style.backgroundImage = '';
        avatarEl.textContent = (user.fullName || '?')[0].toUpperCase();
      }
    }

    // Sidebar status dot
    const statusDot = document.getElementById('sidebarStatusDot');
    if (statusDot) {
      const colors = { online: '#22c55e', away: '#eab308', offline: '#9ca3af' };
      statusDot.style.background = colors[user.status] || colors.offline;
    }

    const navItem = navItems.find(i => i.id === currentPage);
    document.getElementById('topTitle').textContent = navItem?.title || pageTitles[currentPage] || 'Страница';
  }

  function updatePresence() {
    const now = new Date();
    const time = now.getHours().toString().padStart(2, '0') + ':' +
      now.getMinutes().toString().padStart(2, '0');
    const el = document.getElementById('presencePill');
    if (el) el.textContent = `● ${time}`;

    // Heartbeat: keep status online
    const user = authModule.getUser();
    if (user.status !== 'away') {
      api.putRequest('/auth/status', { status: 'online' }).catch(() => {});
    }
  }

  async function goToPage(pageId, params = {}) {
    if (!pages[pageId]) {
      console.error(`Страница ${pageId} не найдена`);
      return;
    }

    // Cleanup previous page
    if (pages[currentPage] && typeof pages[currentPage].destroy === 'function') {
      pages[currentPage].destroy();
    }

    currentPage = pageId;
    currentParams = params;
    renderNav();
    renderTopbar();

    const content = document.getElementById('content');
    try {
      if (pageId === 'orderDetail') {
        await pages[pageId].render(content, params.orderId);
      } else if (pageId === 'documentCreate') {
        await pages[pageId].render(content, params);
      } else {
        await pages[pageId].render(content);
      }
    } catch (error) {
      console.error('Ошибка при рендере страницы:', error);
      content.innerHTML = `<div class="card"><p>Ошибка при загрузке страницы: ${error.message}</p></div>`;
    }
  }

  let initialized = false;

  function initializeApp() {
    renderNav();
    renderTopbar();

    if (!initialized) {
      initialized = true;
    document.getElementById('btnNotif').addEventListener('click', () => {
      const backdrop = document.getElementById('modalBackdrop');
      const title = document.getElementById('modalTitle');
      const body = document.getElementById('modalBody');

      title.textContent = 'Уведомления';
      body.innerHTML = '<div class="empty">Нет уведомлений</div>';
      backdrop.style.display = 'flex';
    });

    document.getElementById('btnProfile').addEventListener('click', () => {
      goToPage('profile');
    });

    document.getElementById('btnLogout').addEventListener('click', () => {
      if (confirm('Вы уверены?')) {
        authModule.logout();
        window.location.reload();
      }
    });

    document.getElementById('modalClose').addEventListener('click', () => {
      document.getElementById('modalBackdrop').style.display = 'none';
    });

    document.getElementById('modalBackdrop').addEventListener('click', (e) => {
      if (e.target.id === 'modalBackdrop') {
        document.getElementById('modalBackdrop').style.display = 'none';
      }
    });

    setInterval(updatePresence, 10000);
    updatePresence();
    }

    goToPage('dashboard');
  }

  return {
    init: () => {
      if (checkAuthentication()) {
        initializeApp();
      }
    },
    goToPage,
  };
})();

// Делаем доступным глобально
window.appModule = appModule;

// Инициализация при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
  // Применяем сохранённую тему
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);

  appModule.init();
});

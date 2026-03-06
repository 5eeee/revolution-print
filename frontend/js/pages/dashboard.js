const dashboardPage = (() => {
  async function render(container) {
    const user = authModule.getUser();
    let clients = [], orders = [], productions = [], documents = [];

    try {
      const [cR, oR, pR, dR] = await Promise.all([
        api.getRequest('/clients'),
        api.getRequest('/orders'),
        api.getRequest('/production'),
        api.getRequest('/documents'),
      ]);
      if (cR.success) clients = cR.data;
      if (oR.success) orders = oR.data;
      if (pR.success) productions = pR.data;
      if (dR.success) documents = dR.data;
    } catch (e) { console.error('Ошибка загрузки:', e); }

    const roleLabels = { admin: 'Администратор', manager: 'Менеджер', production: 'Производство', owner: 'Руководитель' };
    const statusLabels = { 'Обработка': 'Обработка', 'В работе': 'В работе', 'Готов': 'Готов', 'Отменен': 'Отменён', 'В ожидании': 'В ожидании' };
    const statusColors = { 'Обработка': '#3b82f6', 'В работе': '#eab308', 'Готов': '#22c55e', 'Отменен': '#ef4444', 'В ожидании': '#8b5cf6' };

    const activeOrders = orders.filter(o => o.status !== 'Готов' && o.status !== 'Отменен');
    const recentOrders = orders.slice(0, 5);

    // Считаем по статусам
    const statusCounts = {};
    orders.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });

    const now = new Date();
    const urgentOrders = orders.filter(o => {
      if (!o.deadline || o.status === 'Готов' || o.status === 'Отменен') return false;
      const diff = (new Date(o.deadline) - now) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 3;
    });

    container.innerHTML = `
      <div class="grid">
        <!-- Приветствие -->
        <div class="card" style="grid-column: span 12; padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h2 style="margin: 0;">Привет, ${escapeHtml(user.fullName || user.email)}!</h2>
              <p class="subtle" style="margin: 4px 0 0;">Revolution Print Platform · ${new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
            <span class="status"><i></i>${roleLabels[user.role] || user.role}</span>
          </div>
        </div>

        <!-- Счётчики -->
        <div class="card dash-counter" style="grid-column: span 3; padding: 16px; cursor: pointer;" data-page="clients">
          <div class="subtle">Клиенты</div>
          <div style="font-size: 32px; font-weight: bold;">${clients.length}</div>
          <div class="subtle" style="font-size: 11px;">всего в базе</div>
        </div>
        <div class="card dash-counter" style="grid-column: span 3; padding: 16px; cursor: pointer;" data-page="orders">
          <div class="subtle">Заказы</div>
          <div style="font-size: 32px; font-weight: bold; color: var(--copper);">${activeOrders.length}</div>
          <div class="subtle" style="font-size: 11px;">активных из ${orders.length}</div>
        </div>
        <div class="card dash-counter" style="grid-column: span 3; padding: 16px; cursor: pointer;" data-page="production">
          <div class="subtle">Подрядчики</div>
          <div style="font-size: 32px; font-weight: bold;">${productions.length}</div>
          <div class="subtle" style="font-size: 11px;">компаний</div>
        </div>
        <div class="card dash-counter" style="grid-column: span 3; padding: 16px; cursor: pointer;" data-page="documents">
          <div class="subtle">Документы</div>
          <div style="font-size: 32px; font-weight: bold;">${documents.length}</div>
          <div class="subtle" style="font-size: 11px;">создано</div>
        </div>

        <!-- Статусы заказов -->
        <div class="card" style="grid-column: span 7; padding: 16px;">
          <h3 style="margin: 0 0 12px;">Заказы по статусам</h3>
          ${Object.keys(statusLabels).map(st => {
            const cnt = statusCounts[st] || 0;
            const pct = orders.length ? Math.round(cnt / orders.length * 100) : 0;
            return `
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <div style="width: 10px; height: 10px; border-radius: 50%; background: ${statusColors[st]};"></div>
                <span style="flex: 1; font-size: 13px;">${statusLabels[st]}</span>
                <div style="flex: 2; height: 6px; background: var(--line); border-radius: 3px;">
                  <div style="width: ${pct}%; height: 100%; background: ${statusColors[st]}; border-radius: 3px;"></div>
                </div>
                <span style="font-size: 13px; font-weight: 600; min-width: 20px; text-align: right;">${cnt}</span>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Быстрые действия -->
        <div class="card" style="grid-column: span 5; padding: 16px;">
          <h3 style="margin: 0 0 12px;">Быстрые действия</h3>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <button class="btn primary" data-page="orders" style="width: 100%; justify-content: center;">${icon('clipboard', 14)} Новый заказ</button>
            <button class="btn ghost" data-page="clients" style="width: 100%; justify-content: center;">${icon('users', 14)} Клиенты</button>
            <button class="btn ghost" data-page="documents" style="width: 100%; justify-content: center;">${icon('fileText', 14)} Документы</button>
            <button class="btn ghost" data-page="chat" style="width: 100%; justify-content: center;">${icon('chat', 14)} Чат</button>
            <button class="btn ghost" data-page="profile" style="width: 100%; justify-content: center;">${icon('settings', 14)} Настройки</button>
            ${user.role === 'admin' ? '<button class="btn ghost" data-page="admin" style="width: 100%; justify-content: center;">' + icon('key', 14) + ' Администрирование</button>' : ''}
          </div>
        </div>

        ${urgentOrders.length ? `
          <!-- Срочные заказы -->
          <div class="card" style="grid-column: span 12; padding: 16px; border-left: 3px solid #ef4444;">
            <h3 style="margin: 0 0 10px; color: #ef4444;">${icon('alertTriangle', 16, '#ef4444')} Приближается дедлайн (${urgentOrders.length})</h3>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              ${urgentOrders.map(o => {
                const days = Math.ceil((new Date(o.deadline) - now) / (1000 * 60 * 60 * 24));
                return `
                  <div class="dash-urgent" data-order-id="${o.id}" style="padding: 10px; border: 1px solid var(--line); border-radius: 8px; cursor: pointer; min-width: 180px;">
                    <b>${escapeHtml(o.title)}</b>
                    <div class="subtle" style="font-size: 11px;">
                      ${days === 0 ? icon('dotRed', 10) + ' Сегодня!' : days === 1 ? icon('dotOrange', 10) + ' Завтра' : icon('dotYellow', 10) + ' ' + days + ' дн.'}
                      · ${new Date(o.deadline).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Последние заказы -->
        <div class="card" style="grid-column: span 12; padding: 16px;">
          <h3 style="margin: 0 0 10px;">Последние заказы</h3>
          ${recentOrders.length ? `
            <table class="table" style="font-size: 13px;">
              <thead>
                <tr>
                  <th>Заказ</th>
                  <th>Статус</th>
                  <th>Дедлайн</th>
                  <th>Создан</th>
                </tr>
              </thead>
              <tbody>
                ${recentOrders.map(o => `
                  <tr class="dash-order-row" data-order-id="${o.id}" style="cursor: pointer;">
                    <td><b>${escapeHtml(o.title)}</b></td>
                    <td>
                      <span style="display: inline-flex; align-items: center; gap: 4px;">
                        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${statusColors[o.status] || '#999'};"></span>
                        ${statusLabels[o.status] || o.status}
                      </span>
                    </td>
                    <td class="subtle">${o.deadline ? new Date(o.deadline).toLocaleDateString('ru-RU') : '—'}</td>
                    <td class="subtle">${o.createdAt ? new Date(o.createdAt).toLocaleDateString('ru-RU') : '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<div class="subtle" style="text-align: center; padding: 20px;">Заказов ещё нет. Создайте первый!</div>'}
        </div>
      </div>
    `;

    // Навигация
    container.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => window.appModule.goToPage(btn.dataset.page));
    });
    container.querySelectorAll('.dash-order-row, .dash-urgent').forEach(el => {
      el.addEventListener('click', () => {
        const id = parseInt(el.dataset.orderId);
        if (id) window.appModule.goToPage('orderDetail', { orderId: id });
      });
    });
    container.querySelectorAll('.dash-counter').forEach(el => {
      el.addEventListener('click', () => window.appModule.goToPage(el.dataset.page));
    });
  }

  return { render };
})();

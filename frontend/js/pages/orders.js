const ordersPage = (() => {
  let orders = [];
  let clients = [];
  let filterStatus = 'all';
  let searchQuery = '';

  const statusList = ['Обработка', 'В работе', 'Готов', 'Отменен', 'В ожидании'];
  const statusColors = { 'Обработка': '#3b82f6', 'В работе': '#eab308', 'Готов': '#22c55e', 'Отменен': '#ef4444', 'В ожидании': '#8b5cf6' };

  async function loadData() {
    try {
      const [oR, cR] = await Promise.all([
        api.getRequest('/orders'),
        api.getRequest('/clients'),
      ]);
      if (oR.success) orders = oR.data;
      if (cR.success) clients = cR.data;
    } catch (e) { console.error('Ошибка:', e); }
  }

  async function render(container) {
    await loadData();
    renderContent(container);
  }

  function renderContent(container) {
    // Статистика
    const statusCounts = {};
    statusList.forEach(s => { statusCounts[s] = 0; });
    orders.forEach(o => { if (statusCounts[o.status] !== undefined) statusCounts[o.status]++; });

    // Фильтрация
    let filtered = orders;
    if (filterStatus !== 'all') filtered = filtered.filter(o => o.status === filterStatus);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(o =>
        o.title?.toLowerCase().includes(q) ||
        (o.Client?.name || '').toLowerCase().includes(q)
      );
    }

    container.innerHTML = `
      <div class="grid">
        <!-- Статистика -->
        ${statusList.map(s => `
          <div class="card order-stat-card" data-status="${s}" 
            style="grid-column: span 2; padding: 12px; cursor: pointer; text-align: center;
            ${filterStatus === s ? 'border: 2px solid ' + statusColors[s] + ';' : ''}">
            <div style="font-size: 24px; font-weight: bold; color: ${statusColors[s]};">${statusCounts[s]}</div>
            <div class="subtle" style="font-size: 11px;">${s}</div>
          </div>
        `).join('')}
        <div class="card order-stat-card" data-status="all"
          style="grid-column: span 2; padding: 12px; cursor: pointer; text-align: center;
          ${filterStatus === 'all' ? 'border: 2px solid var(--copper);' : ''}">
          <div style="font-size: 24px; font-weight: bold;">${orders.length}</div>
          <div class="subtle" style="font-size: 11px;">Все</div>
        </div>

        <!-- Заголовок + поиск -->
        <div class="card" style="grid-column: span 12; padding: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <div>
              <h2 style="margin: 0;">Заказы</h2>
              <span class="subtle">${filtered.length} из ${orders.length}</span>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <input id="orderSearch" placeholder="Поиск по названию или клиенту..." value="${escapeHtml(searchQuery)}"
                style="padding: 8px 14px; border: 1px solid var(--line); border-radius: 8px; width: 260px; font-size: 13px;" />
              <button class="btn primary" id="btnNewOrder" style="white-space: nowrap;">+ Новый заказ</button>
            </div>
          </div>

          ${filtered.length ? `
            <table class="table" style="font-size: 13px;">
              <thead>
                <tr>
                  <th style="width: 40px;">#</th>
                  <th>Название</th>
                  <th>Клиент</th>
                  <th>Статус</th>
                  <th>Ответственный</th>
                  <th>Оплата</th>
                  <th>Дедлайн</th>
                  <th style="width: 120px;"></th>
                </tr>
              </thead>
              <tbody>
                ${filtered.map(o => {
                  const payLabels = { postpaid: 'Постоплата', '50%': '50% предоплата', paid: 'Оплачено' };
                  const payColors = { postpaid: '#ef4444', '50%': '#eab308', paid: '#22c55e' };
                  const deadlineWarning = getDeadlineWarning(o);
                  const currentUser = authModule.getUser();
                  const isMine = o.assignedTo === currentUser.id;
                  const isTaken = !!o.assignedTo;
                  const isActive = o.status !== 'Готов' && o.status !== 'Отменен';
                  return `
                    <tr class="order-row" data-id="${o.id}" style="cursor: pointer;">
                      <td class="subtle">${o.id}</td>
                      <td><b>${escapeHtml(o.title)}</b></td>
                      <td>${escapeHtml(o.Client?.name || '—')}</td>
                      <td>
                        <span style="display: inline-flex; align-items: center; gap: 4px;">
                          <span style="width: 8px; height: 8px; border-radius: 50%; background: ${statusColors[o.status] || '#999'};"></span>
                          ${escapeHtml(o.status)}
                        </span>
                      </td>
                      <td>
                        ${isTaken ? `
                          <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; padding: 2px 8px; border-radius: 4px; background: ${isMine ? 'rgba(34,197,94,0.1)' : 'rgba(139,92,246,0.1)'}; color: ${isMine ? '#16a34a' : '#7c3aed'};">
                            ${icon('user', 10)} ${escapeHtml(o.assignedName)}
                          </span>
                        ` : '<span class="subtle" style="font-size: 11px;">—</span>'}
                      </td>
                      <td>
                        <span style="font-size: 11px; padding: 2px 8px; border-radius: 4px; background: ${payColors[o.paymentStatus] || '#eee'}22; color: ${payColors[o.paymentStatus] || '#999'};">
                          ${payLabels[o.paymentStatus] || '—'}
                        </span>
                      </td>
                      <td>
                        ${o.deadline ? `
                          <span style="font-size: 12px; ${deadlineWarning ? 'color: #ef4444; font-weight: 600;' : ''}">${deadlineWarning || ''}${new Date(o.deadline).toLocaleDateString('ru-RU')}</span>
                        ` : '<span class="subtle">—</span>'}
                      </td>
                      <td style="text-align: right; white-space: nowrap;">
                        ${isActive ? (isMine
                          ? `<button class="btn ghost btn-release-order" data-id="${o.id}" style="font-size: 11px; padding: 4px 8px; color: #7c3aed;" title="Отпустить">${icon('close', 10)} Снять</button>`
                          : (!isTaken
                            ? `<button class="btn ghost btn-take-order" data-id="${o.id}" style="font-size: 11px; padding: 4px 8px; color: #16a34a;" title="Взять заказ">${icon('check', 10)} Взять</button>`
                            : '')
                        ) : ''}
                        <button class="btn ghost btn-del-order" data-id="${o.id}" style="font-size: 11px; padding: 4px 8px; color: #c33;" title="Удалить">${icon('trash', 12)}</button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          ` : `<div class="subtle" style="text-align: center; padding: 30px;">
            ${searchQuery || filterStatus !== 'all' ? 'Ничего не найдено. Попробуйте другой фильтр.' : 'Заказов пока нет. Создайте первый!'}
          </div>`}
        </div>
      </div>
    `;

    bindEvents(container);
  }

  function getDeadlineWarning(order) {
    if (!order.deadline || order.status === 'Готов' || order.status === 'Отменен') return '';
    const days = Math.ceil((new Date(order.deadline) - new Date()) / (1000 * 60 * 60 * 24));
    if (days < 0) return `${icon('dotRed', 8)} `;
    if (days <= 1) return `${icon('dotOrange', 8)} `;
    if (days <= 3) return `${icon('dotYellow', 8)} `;
    return '';
  }

  function bindEvents(container) {
    // Клик по заказу → orderDetail
    container.querySelectorAll('.order-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.btn-del-order') || e.target.closest('.btn-take-order') || e.target.closest('.btn-release-order')) return;
        window.appModule.goToPage('orderDetail', { orderId: parseInt(row.dataset.id) });
      });
    });

    // Взять заказ
    container.querySelectorAll('.btn-take-order').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          await api.postRequest(`/orders/${btn.dataset.id}/take`);
          showToast('Вы взяли заказ');
          const res = await api.getRequest('/orders');
          if (res.success) orders = res.data;
          renderContent(container);
        } catch (err) { showToast(err.message || 'Ошибка'); }
      });
    });

    // Снять с себя
    container.querySelectorAll('.btn-release-order').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          await api.postRequest(`/orders/${btn.dataset.id}/release`);
          showToast('Заказ освобождён');
          const res = await api.getRequest('/orders');
          if (res.success) orders = res.data;
          renderContent(container);
        } catch (err) { showToast(err.message || 'Ошибка'); }
      });
    });

    // Удаление
    container.querySelectorAll('.btn-del-order').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('Удалить заказ?')) return;
        try {
          await api.deleteRequest(`/orders/${btn.dataset.id}`);
          showToast('Заказ удалён');
          orders = orders.filter(o => o.id != btn.dataset.id);
          renderContent(container);
        } catch (e) { showToast('Ошибка: ' + e.message); }
      });
    });

    // Поиск
    container.querySelector('#orderSearch')?.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderContent(container);
    });

    // Фильтр по статусу
    container.querySelectorAll('.order-stat-card').forEach(card => {
      card.addEventListener('click', () => {
        filterStatus = card.dataset.status;
        renderContent(container);
      });
    });

    // Новый заказ
    container.querySelector('#btnNewOrder')?.addEventListener('click', () => showNewOrderModal(container));
  }

  function showNewOrderModal(container) {
    const backdrop = document.getElementById('modalBackdrop');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');

    title.textContent = 'Новый заказ';
    body.innerHTML = `
      <div class="field">
        <label>Название заказа *</label>
        <input id="orderTitle" placeholder="Например: DTF переносы партия #1" />
      </div>
      <div class="field" style="margin-top: 10px;">
        <label>Клиент *</label>
        <select id="orderClient" style="width: 100%;">
          <option disabled selected value="">Выберите клиента...</option>
          ${clients.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
        </select>
        ${!clients.length ? '<div class="subtle" style="font-size: 11px; margin-top: 4px;">Сначала добавьте клиента в разделе «Клиенты»</div>' : ''}
      </div>
      <div style="display: flex; gap: 10px; margin-top: 10px;">
        <div class="field" style="flex: 1;">
          <label>Статус</label>
          <select id="orderStatus" style="width: 100%;">
            ${statusList.map(s => `<option ${s === 'Обработка' ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="field" style="flex: 1;">
          <label>Дедлайн</label>
          <input id="orderDeadline" type="date" />
        </div>
      </div>
      <div class="field" style="margin-top: 10px;">
        <label>Заметки</label>
        <textarea id="orderNotes" placeholder="Доп. информация..." style="min-height: 60px;"></textarea>
      </div>
      <div class="row" style="margin-top: 12px; gap: 10px;">
        <button class="btn primary" id="createOrder">Создать</button>
        <button class="btn ghost" id="cancelOrder">Отмена</button>
      </div>
    `;

    backdrop.style.display = 'flex';

    document.getElementById('createOrder').addEventListener('click', async () => {
      const titleVal = document.getElementById('orderTitle').value.trim();
      const clientId = document.getElementById('orderClient').value;
      const status = document.getElementById('orderStatus').value;
      const deadline = document.getElementById('orderDeadline').value;
      const notes = document.getElementById('orderNotes').value;

      if (!titleVal || !clientId) { showToast('Заполните название и клиента'); return; }

      try {
        const res = await api.postRequest('/orders', {
          clientId: parseInt(clientId), title: titleVal, status, deadline: deadline || null, notes,
        });
        showToast('Заказ создан');
        backdrop.style.display = 'none';
        if (res.success && res.data?.id) {
          window.appModule.goToPage('orderDetail', { orderId: res.data.id });
        } else {
          await loadData();
          renderContent(container);
        }
      } catch (e) { showToast('Ошибка: ' + e.message); }
    });

    document.getElementById('cancelOrder').addEventListener('click', () => {
      backdrop.style.display = 'none';
    });
  }

  return { render };
})();

const clientsPage = (() => {
  let clients = [];
  let orders = [];
  let filterStatus = 'all';
  let searchQuery = '';
  let dateFrom = '';
  let dateTo = '';

  const statusList = ['Новый', 'В работе', 'В ожидании', 'Отказ', 'Закрыт'];
  const statusColors = { 'Новый': '#3b82f6', 'В работе': '#22c55e', 'В ожидании': '#eab308', 'Отказ': '#ef4444', 'Закрыт': '#6b7280' };

  async function loadData() {
    try {
      const [cR, oR] = await Promise.all([
        api.getRequest('/clients'),
        api.getRequest('/orders'),
      ]);
      if (cR.success) clients = cR.data;
      if (oR.success) orders = oR.data;
    } catch (e) { console.error('Ошибка:', e); }
  }

  function getClientOrders(clientId) {
    return orders.filter(o => o.clientId == clientId);
  }

  async function render(container) {
    await loadData();
    renderContent(container);
  }

  function renderContent(container) {
    const statusCounts = {};
    statusList.forEach(s => { statusCounts[s] = 0; });
    clients.forEach(c => { if (statusCounts[c.status] !== undefined) statusCounts[c.status]++; });

    let filtered = clients;
    if (filterStatus !== 'all') filtered = filtered.filter(c => c.status === filterStatus);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        (c.owner || '').toLowerCase().includes(q) ||
        (c.comment || '').toLowerCase().includes(q)
      );
    }
    if (dateFrom) {
      const from = new Date(dateFrom); from.setHours(0,0,0,0);
      filtered = filtered.filter(c => new Date(c.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo); to.setHours(23,59,59,999);
      filtered = filtered.filter(c => new Date(c.createdAt) <= to);
    }

    container.innerHTML = `
      <div class="grid">
        <!-- Статистика -->
        ${statusList.map(s => `
          <div class="card cli-stat" data-status="${s}"
            style="grid-column: span 2; padding: 12px; cursor: pointer; text-align: center;
            ${filterStatus === s ? 'border: 2px solid ' + statusColors[s] + ';' : ''}">
            <div style="font-size: 22px; font-weight: bold; color: ${statusColors[s]};">${statusCounts[s]}</div>
            <div class="subtle" style="font-size: 11px;">${s}</div>
          </div>
        `).join('')}
        <div class="card cli-stat" data-status="all"
          style="grid-column: span 2; padding: 12px; cursor: pointer; text-align: center;
          ${filterStatus === 'all' ? 'border: 2px solid var(--copper);' : ''}">
          <div style="font-size: 22px; font-weight: bold;">${clients.length}</div>
          <div class="subtle" style="font-size: 11px;">Все</div>
        </div>

        <!-- Таблица -->
        <div class="card" style="grid-column: span 12; padding: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <div>
              <h2 style="margin: 0;">Клиенты</h2>
              <span class="subtle">${filtered.length} из ${clients.length}</span>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <input id="clientSearch" placeholder="Поиск..." value="${escapeHtml(searchQuery)}"
                style="padding: 8px 14px; border: 1px solid var(--line); border-radius: 8px; width: 220px; font-size: 13px;" />
              <input type="date" id="clientDateFrom" value="${dateFrom}" title="Дата от"
                style="padding: 8px 10px; border: 1px solid var(--line); border-radius: 8px; font-size: 12px; color: var(--muted);" />
              <input type="date" id="clientDateTo" value="${dateTo}" title="Дата до"
                style="padding: 8px 10px; border: 1px solid var(--line); border-radius: 8px; font-size: 12px; color: var(--muted);" />
              <button class="btn primary" id="btnNewClient" style="white-space: nowrap;">+ Новый клиент</button>
            </div>
          </div>

          ${filtered.length ? `
            <table class="table" style="font-size: 13px;">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Статус</th>
                  <th>Ответственный</th>
                  <th>Заказы</th>
                  <th>Комментарий</th>
                  <th>Создан</th>
                  <th style="width: 100px;"></th>
                </tr>
              </thead>
              <tbody>
                ${filtered.map(c => {
                  const cOrders = getClientOrders(c.id);
                  const activeOrders = cOrders.filter(o => o.status !== 'Готов' && o.status !== 'Отменен');
                  return `
                    <tr>
                      <td><b>${escapeHtml(c.name)}</b></td>
                      <td>
                        <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px;
                          padding: 2px 10px; border-radius: 12px; background: ${statusColors[c.status] || '#999'}15; color: ${statusColors[c.status] || '#999'};">
                          <span style="width: 6px; height: 6px; border-radius: 50%; background: ${statusColors[c.status] || '#999'};"></span>
                          ${escapeHtml(c.status)}
                        </span>
                      </td>
                      <td class="subtle">${escapeHtml(c.owner || '—')}</td>
                      <td>
                        ${cOrders.length ? `
                          <span style="font-size: 12px; cursor: pointer;" class="cli-orders-link" data-client="${c.id}" title="Показать заказы">
                            ${icon('clipboard', 12)} ${cOrders.length} ${activeOrders.length ? `(${activeOrders.length} акт.)` : ''}
                          </span>
                        ` : '<span class="subtle">—</span>'}
                      </td>
                      <td style="max-width: 200px; font-size: 12px;" class="subtle">${escapeHtml(limitText(c.comment || '', 60))}</td>
                      <td class="subtle" style="font-size: 11px;">${formatDateTime(c.createdAt)}</td>
                      <td style="text-align: right; white-space: nowrap;">
                        ${!c.owner ? `<button class="btn ghost btn-take" data-id="${c.id}" style="font-size: 11px; padding: 4px 8px;">Взять</button>` : ''}
                        <button class="btn ghost btn-edit-cli" data-id="${c.id}" style="font-size: 11px; padding: 4px 8px;">${icon('edit', 12)}</button>
                        <button class="btn ghost btn-del-cli" data-id="${c.id}" style="font-size: 11px; padding: 4px 8px; color: #c33;">${icon('trash', 12)}</button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          ` : `<div class="subtle" style="text-align: center; padding: 30px;">
            ${searchQuery || filterStatus !== 'all' ? 'Ничего не найдено' : 'Клиентов пока нет. Добавьте первого!'}
          </div>`}
        </div>
      </div>
    `;

    bindEvents(container);
  }

  function bindEvents(container) {
    // Фильтры
    container.querySelectorAll('.cli-stat').forEach(card => {
      card.addEventListener('click', () => { filterStatus = card.dataset.status; renderContent(container); });
    });

    // Поиск
    container.querySelector('#clientSearch')?.addEventListener('input', e => {
      searchQuery = e.target.value; renderContent(container);
    });

    // Фильтр по дате
    container.querySelector('#clientDateFrom')?.addEventListener('change', e => {
      dateFrom = e.target.value; renderContent(container);
    });
    container.querySelector('#clientDateTo')?.addEventListener('change', e => {
      dateTo = e.target.value; renderContent(container);
    });

    // Новый клиент
    container.querySelector('#btnNewClient')?.addEventListener('click', () => showClientModal(container));

    // Взять клиента
    container.querySelectorAll('.btn-take').forEach(btn => {
      btn.addEventListener('click', async () => {
        const user = authModule.getUser();
        try {
          await api.postRequest(`/clients/${btn.dataset.id}/take`, { owner: user.fullName });
          showToast('Клиент взят');
          await loadData(); renderContent(container);
        } catch (e) { showToast('Ошибка: ' + e.message); }
      });
    });

    // Редактирование
    container.querySelectorAll('.btn-edit-cli').forEach(btn => {
      btn.addEventListener('click', () => {
        const client = clients.find(c => c.id == btn.dataset.id);
        if (client) showClientModal(container, client);
      });
    });

    // Удаление
    container.querySelectorAll('.btn-del-cli').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Удалить клиента?')) return;
        try {
          await api.deleteRequest(`/clients/${btn.dataset.id}`);
          showToast('Клиент удалён');
          clients = clients.filter(c => c.id != btn.dataset.id);
          renderContent(container);
        } catch (e) { showToast('Ошибка: ' + e.message); }
      });
    });

    // Ссылка на заказы клиента
    container.querySelectorAll('.cli-orders-link').forEach(link => {
      link.addEventListener('click', () => {
        const clientId = link.dataset.client;
        const cOrders = getClientOrders(clientId);
        const client = clients.find(c => c.id == clientId);
        showClientOrdersModal(client, cOrders);
      });
    });
  }

  // Модалка заказов клиента
  function showClientOrdersModal(client, cOrders) {
    const backdrop = document.getElementById('modalBackdrop');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');

    title.textContent = `Заказы: ${client?.name || ''}`;
    body.innerHTML = `
      <table class="table" style="font-size: 13px;">
        <thead><tr><th>#</th><th>Название</th><th>Статус</th><th>Дата</th></tr></thead>
        <tbody>
          ${cOrders.map(o => `
            <tr class="modal-order-row" data-id="${o.id}" style="cursor: pointer;">
              <td class="subtle">${o.id}</td>
              <td><b>${escapeHtml(o.title)}</b></td>
              <td>${escapeHtml(o.status)}</td>
              <td class="subtle">${o.createdAt ? new Date(o.createdAt).toLocaleDateString('ru-RU') : '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    backdrop.style.display = 'flex';

    body.querySelectorAll('.modal-order-row').forEach(row => {
      row.addEventListener('click', () => {
        backdrop.style.display = 'none';
        window.appModule.goToPage('orderDetail', { orderId: parseInt(row.dataset.id) });
      });
    });
  }

  // Модалка добавления/редактирования клиента
  function showClientModal(container, existing) {
    const backdrop = document.getElementById('modalBackdrop');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const isEdit = !!existing;

    title.textContent = isEdit ? 'Редактировать клиента' : 'Новый клиент';
    body.innerHTML = `
      <div class="field">
        <label>Название клиента *</label>
        <input id="cliName" value="${escapeHtml(existing?.name || '')}" placeholder="ООО Ромашка" />
      </div>
      <div style="display: flex; gap: 10px; margin-top: 10px;">
        <div class="field" style="flex: 1;">
          <label>Статус</label>
          <select id="cliStatus">
            ${statusList.map(s => `<option ${(existing?.status || 'Новый') === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="field" style="flex: 1;">
          <label>Ответственный</label>
          <input id="cliOwner" value="${escapeHtml(existing?.owner || '')}" placeholder="ФИО менеджера" />
        </div>
      </div>
      <div class="field" style="margin-top: 10px;">
        <label>Комментарий</label>
        <textarea id="cliComment" placeholder="Результат звонка, заметки..." style="min-height: 80px;">${escapeHtml(existing?.comment || '')}</textarea>
      </div>
      <div class="row" style="margin-top: 12px; gap: 10px;">
        <button class="btn primary" id="saveCli">${isEdit ? 'Сохранить' : 'Создать'}</button>
        <button class="btn ghost" id="cancelCli">Отмена</button>
      </div>
    `;

    backdrop.style.display = 'flex';

    document.getElementById('saveCli').addEventListener('click', async () => {
      const name = document.getElementById('cliName').value.trim();
      if (!name) { showToast('Введите название'); return; }

      const data = {
        name,
        status: document.getElementById('cliStatus').value,
        owner: document.getElementById('cliOwner').value,
        comment: document.getElementById('cliComment').value,
      };

      try {
        if (isEdit) {
          await api.putRequest(`/clients/${existing.id}`, data);
          showToast('Клиент обновлён');
        } else {
          await api.postRequest('/clients', data);
          showToast('Клиент создан');
        }
        backdrop.style.display = 'none';
        await loadData();
        renderContent(container);
      } catch (e) { showToast('Ошибка: ' + e.message); }
    });

    document.getElementById('cancelCli').addEventListener('click', () => { backdrop.style.display = 'none'; });
  }

  return { render };
})();

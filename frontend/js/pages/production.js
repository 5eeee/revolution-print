const productionPage = (() => {
  let companies = [];
  let selectedId = null;
  let companyOrders = [];

  async function loadCompanies() {
    try {
      const response = await api.getRequest('/production');
      if (response.success) companies = response.data;
    } catch (error) {
      console.error('Ошибка загрузки компаний:', error);
    }
  }

  async function loadCompanyOrders(compId) {
    try {
      const response = await api.getRequest(`/production/${compId}/orders`);
      if (response.success) companyOrders = response.data;
    } catch { companyOrders = []; }
  }

  async function render(container) {
    await loadCompanies();
    if (selectedId) await loadCompanyOrders(selectedId);

    const selected = companies.find(c => c.id == selectedId);
    const totalRevenue = companyOrders.reduce((s, o) => s + (parseFloat(o.amount) || 0), 0);

    container.innerHTML = `
      <div class="grid">
        <!-- Статистика -->
        <div class="card" style="grid-column: span 4; padding: 16px; text-align: center;">
          <div class="subtle">Подрядчиков</div>
          <div style="font-size: 28px; font-weight: bold;">${companies.length}</div>
        </div>
        <div class="card" style="grid-column: span 4; padding: 16px; text-align: center;">
          <div class="subtle">С заказами</div>
          <div style="font-size: 28px; font-weight: bold; color: var(--copper);">${companies.filter(c => c.info).length}</div>
        </div>
        <div class="card" style="grid-column: span 4; padding: 16px; text-align: center;">
          <div class="subtle">Выбрано</div>
          <div style="font-size: 28px; font-weight: bold;">${selected ? escapeHtml(selected.name) : '—'}</div>
        </div>

        <!-- Список компаний -->
        <div style="grid-column: span 5; display: flex; flex-direction: column; gap: 10px;">
          <div class="card" style="padding: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <h3>Подрядчики</h3>
              <button class="btn primary" id="btnNewProd" style="font-size: 12px;">+ Добавить</button>
            </div>

            ${companies.length ? `
              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${companies.map(c => `
                  <div class="prod-card ${selectedId == c.id ? 'prod-card-active' : ''}" data-id="${c.id}"
                    style="padding: 12px; border: 1px solid ${selectedId == c.id ? 'var(--copper)' : 'var(--line)'}; 
                    border-radius: 10px; cursor: pointer; transition: var(--ease);
                    ${selectedId == c.id ? 'background: rgba(134, 75, 18, 0.06);' : ''}">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <b>${escapeHtml(c.name)}</b>
                      <span class="subtle" style="font-size: 11px;">${escapeHtml(c.cooperation || '')}</span>
                    </div>
                    ${c.contactPerson || c.phone ? `
                      <div style="font-size: 12px; color: var(--muted); margin-top: 4px;">
                        ${c.contactPerson ? icon('user', 12) + ' ' + escapeHtml(c.contactPerson) : ''}
                        ${c.phone ? ' · ' + icon('phone', 12) + ' ' + escapeHtml(c.phone) : ''}
                      </div>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            ` : '<div class="subtle" style="text-align: center; padding: 20px;">Добавьте первого подрядчика</div>'}
          </div>
        </div>

        <!-- Детали компании -->
        <div style="grid-column: span 7; display: flex; flex-direction: column; gap: 10px;">
          ${selected ? renderCompanyDetail(selected, totalRevenue) : `
            <div class="card" style="padding: 40px; text-align: center;">
              <div class="subtle">← Выберите компанию из списка</div>
            </div>
          `}
        </div>
      </div>
    `;

    bindEvents(container);
  }

  function renderCompanyDetail(comp, totalRevenue) {
    return `
      <!-- Информация о компании -->
      <div class="card" style="padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h2>${escapeHtml(comp.name)}</h2>
          <div style="display: flex; gap: 6px;">
            <button class="btn ghost" id="btnEditProd" style="font-size: 12px;">${icon('edit', 12)} Редактировать</button>
            <button class="btn ghost" id="btnDeleteProd" style="font-size: 12px; color: #c33;">${icon('trash', 12)} Удалить</button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div style="padding: 10px; border: 1px solid var(--line); border-radius: 8px;">
            <div class="subtle" style="font-size: 11px;">Контактное лицо</div>
            <div style="font-size: 13px; font-weight: 500;">${escapeHtml(comp.contactPerson || '—')}</div>
          </div>
          <div style="padding: 10px; border: 1px solid var(--line); border-radius: 8px;">
            <div class="subtle" style="font-size: 11px;">Телефон</div>
            <div style="font-size: 13px; font-weight: 500;">${escapeHtml(comp.phone || '—')}</div>
          </div>
          <div style="padding: 10px; border: 1px solid var(--line); border-radius: 8px;">
            <div class="subtle" style="font-size: 11px;">Email</div>
            <div style="font-size: 13px; font-weight: 500;">${escapeHtml(comp.email || '—')}</div>
          </div>
          <div style="padding: 10px; border: 1px solid var(--line); border-radius: 8px;">
            <div class="subtle" style="font-size: 11px;">Формат сотрудничества</div>
            <div style="font-size: 13px; font-weight: 500;">${escapeHtml(comp.cooperation || '—')}</div>
          </div>
        </div>

        ${comp.info ? `
          <div style="margin-top: 10px; padding: 10px; border: 1px solid var(--line); border-radius: 8px;">
            <div class="subtle" style="font-size: 11px; margin-bottom: 4px;">Описание / заметки</div>
            <div style="font-size: 13px; white-space: pre-wrap;">${escapeHtml(comp.info)}</div>
          </div>
        ` : ''}
      </div>

      <!-- Заказы компании -->
      <div class="card" style="padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h3>Заказы (${companyOrders.length})</h3>
          <div style="padding: 6px 12px; background: rgba(134, 75, 18, 0.08); border-radius: 8px;">
            Итого: <b>${formatCurrency(totalRevenue)}</b>
          </div>
        </div>
        ${companyOrders.length ? `
          <table class="table" style="font-size: 12px;">
            <thead>
              <tr>
                <th>Заказ</th>
                <th>Клиент</th>
                <th>Статус</th>
                <th>Сумма</th>
                <th>Срок</th>
              </tr>
            </thead>
            <tbody>
              ${companyOrders.map(o => `
                <tr class="prod-order-row" data-order-id="${o.order?.id}" style="cursor: pointer;">
                  <td><b>${escapeHtml(o.order?.title || '—')}</b></td>
                  <td class="subtle">${escapeHtml(o.order?.client || '—')}</td>
                  <td><span class="status"><i></i>${escapeHtml(o.order?.status || '—')}</span></td>
                  <td style="text-align: right;">${formatCurrency(o.amount)}</td>
                  <td class="subtle">${o.order?.deadline ? new Date(o.order.deadline).toLocaleDateString('ru-RU') : '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<div class="subtle" style="text-align: center; padding: 16px;">К этому подрядчику пока не привязаны заказы</div>'}
      </div>
    `;
  }

  function bindEvents(container) {
    // Выбор компании
    container.querySelectorAll('.prod-card').forEach(card => {
      card.addEventListener('click', () => {
        selectedId = parseInt(card.dataset.id);
        render(container);
      });
    });

    // Добавление
    container.querySelector('#btnNewProd')?.addEventListener('click', () => showProdModal(container));

    // Редактирование
    container.querySelector('#btnEditProd')?.addEventListener('click', () => {
      const comp = companies.find(c => c.id == selectedId);
      if (comp) showProdModal(container, comp);
    });

    // Удаление
    container.querySelector('#btnDeleteProd')?.addEventListener('click', async () => {
      if (!confirm('Удалить компанию? Связанные разбивки по заказам тоже будут удалены.')) return;
      try {
        await api.deleteRequest(`/production/${selectedId}`);
        selectedId = null;
        showToast('Компания удалена');
        render(container);
      } catch (e) { showToast('Ошибка: ' + e.message); }
    });

    // Клик по заказу
    container.querySelectorAll('.prod-order-row').forEach(row => {
      row.addEventListener('click', () => {
        const orderId = row.dataset.orderId;
        if (orderId) window.appModule.goToPage('orderDetail', { orderId: parseInt(orderId) });
      });
    });
  }

  // ===== Модалка добавления/редактирования =====
  function showProdModal(container, existing) {
    const backdrop = document.getElementById('modalBackdrop');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');

    const isEdit = !!existing;
    title.textContent = isEdit ? 'Редактировать подрядчика' : 'Новый подрядчик';

    body.innerHTML = `
      <div class="field">
        <label>Название компании *</label>
        <input id="prodName" value="${escapeHtml(existing?.name || '')}" placeholder="ООО Печать+" />
      </div>
      <div style="display: flex; gap: 10px; margin-top: 8px;">
        <div class="field" style="flex: 1;">
          <label>Контактное лицо</label>
          <input id="prodContact" value="${escapeHtml(existing?.contactPerson || '')}" placeholder="Иван Иванов" />
        </div>
        <div class="field" style="flex: 1;">
          <label>Телефон</label>
          <input id="prodPhone" value="${escapeHtml(existing?.phone || '')}" placeholder="+7 (999) 000-00-00" />
        </div>
      </div>
      <div class="field" style="margin-top: 8px;">
        <label>Email</label>
        <input id="prodEmail" value="${escapeHtml(existing?.email || '')}" placeholder="info@print.ru" />
      </div>
      <div class="field" style="margin-top: 8px;">
        <label>Формат сотрудничества</label>
        <input id="prodCoop" value="${escapeHtml(existing?.cooperation || '')}" placeholder="По договору, разовые заказы..." />
      </div>
      <div class="field" style="margin-top: 8px;">
        <label>Описание / заметки</label>
        <textarea id="prodInfo" style="min-height: 80px;">${escapeHtml(existing?.info || '')}</textarea>
      </div>
      <div class="row" style="margin-top: 12px; gap: 10px;">
        <button class="btn primary" id="saveProd">${isEdit ? 'Сохранить' : 'Добавить'}</button>
        <button class="btn ghost" id="cancelProd">Отмена</button>
      </div>
    `;

    backdrop.style.display = 'flex';

    document.getElementById('saveProd').addEventListener('click', async () => {
      const name = document.getElementById('prodName').value.trim();
      if (!name) { showToast('Введите название'); return; }

      const data = {
        name,
        contactPerson: document.getElementById('prodContact').value,
        phone: document.getElementById('prodPhone').value,
        email: document.getElementById('prodEmail').value,
        cooperation: document.getElementById('prodCoop').value,
        info: document.getElementById('prodInfo').value,
      };

      try {
        if (isEdit) {
          await api.putRequest(`/production/${existing.id}`, data);
          showToast('Подрядчик обновлён');
        } else {
          const res = await api.postRequest('/production', data);
          if (res.success) selectedId = res.data.id;
          showToast('Подрядчик добавлен');
        }
        backdrop.style.display = 'none';
        render(container);
      } catch (e) { showToast('Ошибка: ' + e.message); }
    });

    document.getElementById('cancelProd').addEventListener('click', () => {
      backdrop.style.display = 'none';
    });
  }

  return { render };
})();

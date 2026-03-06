const adminPage = (() => {
  let users = [];
  let settings = {};
  let activeTab = 'users';

  const roleLabels = { admin: 'Администратор', manager: 'Менеджер', production: 'Производство', owner: 'Руководитель' };
  const roleColors = { admin: '#ef4444', manager: '#3b82f6', production: '#eab308', owner: '#8b5cf6' };

  async function loadUsers() {
    try {
      const response = await api.getRequest('/admin/users');
      if (response.success) users = response.data;
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
    }
  }

  async function loadSettings() {
    try {
      const response = await api.getRequest('/admin/settings');
      if (response.success) settings = response.data;
    } catch { /* ignore */ }
  }

  async function render(container) {
    const user = authModule.getUser();

    if (user.role !== 'admin') {
      container.innerHTML = '<div class="card" style="padding: 40px; text-align: center;"><h2>' + icon('ban', 20, '#ef4444') + ' Доступ запрещён</h2><p class="subtle">Эта страница доступна только администраторам</p></div>';
      return;
    }

    await Promise.all([loadUsers(), loadSettings()]);

    container.innerHTML = `
      <div class="grid" style="margin-bottom: 0;">
        <div class="card" style="grid-column: span 12; padding: 14px 20px;">
          <div style="display: flex; gap: 10px;">
            <button class="btn ${activeTab === 'users' ? 'primary' : 'ghost'}" id="tabUsers">${icon('user', 14)} Пользователи</button>
            <button class="btn ${activeTab === 'settings' ? 'primary' : 'ghost'}" id="tabSettings">${icon('cog', 14)} Настройки компании</button>
          </div>
        </div>
      </div>
      ${activeTab === 'users' ? renderUsersTab(user) : renderSettingsTab()}
    `;

    container.querySelector('#tabUsers')?.addEventListener('click', () => { activeTab = 'users'; render(container); });
    container.querySelector('#tabSettings')?.addEventListener('click', () => { activeTab = 'settings'; render(container); });

    if (activeTab === 'users') bindUsersEvents(container, user);
    else bindSettingsEvents(container);
  }

  function renderUsersTab(user) {
    const roleCounts = {};
    users.forEach(u => { roleCounts[u.role] = (roleCounts[u.role] || 0) + 1; });

    return `
      <div class="grid">
        <div class="card" style="grid-column: span 3; padding: 14px; text-align: center;">
          <div style="font-size: 28px; font-weight: bold;">${users.length}</div>
          <div class="subtle">Всего пользователей</div>
        </div>
        ${Object.entries(roleLabels).map(([key, label]) => `
          <div class="card" style="grid-column: span 3; padding: 14px; text-align: center;">
            <div style="font-size: 28px; font-weight: bold; color: ${roleColors[key] || '#999'};">${roleCounts[key] || 0}</div>
            <div class="subtle">${label}</div>
          </div>
        `).join('')}

        <div class="card" style="grid-column: span 12; padding: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h2 style="margin: 0;">Управление пользователями</h2>
            <button class="btn primary" id="btnAddUser">+ Добавить пользователя</button>
          </div>

          ${users.length ? `
            <table class="table" style="font-size: 13px;">
              <thead>
                <tr>
                  <th style="width: 40px;">ID</th>
                  <th>ФИО</th>
                  <th>Email</th>
                  <th>Роль</th>
                  <th>Статус</th>
                  <th>Создан</th>
                  <th style="width: 180px;"></th>
                </tr>
              </thead>
              <tbody>
                ${users.map(u => `
                  <tr${u.active === false ? ' style="opacity: 0.5;"' : ''}>
                    <td class="subtle">${u.id}</td>
                    <td><b>${escapeHtml(u.fullName || '—')}</b></td>
                    <td>${escapeHtml(u.email)}</td>
                    <td>
                      <select class="admin-role-select" data-id="${u.id}" ${u.id === user.id ? 'disabled' : ''}
                        style="padding: 4px 8px; border-radius: 6px; border: 1px solid var(--line); font-size: 12px;
                        background: ${roleColors[u.role] || '#999'}15; color: ${roleColors[u.role] || '#999'};">
                        ${Object.entries(roleLabels).map(([key, label]) =>
                          `<option value="${key}" ${u.role === key ? 'selected' : ''}>${label}</option>`
                        ).join('')}
                      </select>
                    </td>
                    <td>
                      <span style="font-size: 11px; padding: 2px 8px; border-radius: 6px; background: ${u.active === false ? '#fee2e2' : '#dcfce7'}; color: ${u.active === false ? '#c33' : '#16a34a'};">
                        ${u.active === false ? 'Заблокирован' : 'Активен'}
                      </span>
                    </td>
                    <td class="subtle" style="font-size: 11px;">${u.createdAt ? new Date(u.createdAt).toLocaleDateString('ru-RU') : '—'}</td>
                    <td style="text-align: right; white-space: nowrap;">
                      <button class="btn ghost btn-toggle-user" data-id="${u.id}" data-active="${u.active !== false}" ${u.id === user.id ? 'disabled' : ''}
                        style="font-size: 11px; padding: 4px 10px; ${u.id === user.id ? 'opacity: 0.3;' : ''}">
                        ${u.active === false ? icon('check', 12) + ' Разблок.' : icon('ban', 12) + ' Блок.'}
                      </button>
                      <button class="btn ghost btn-delete-user" data-id="${u.id}" ${u.id === user.id ? 'disabled' : ''} 
                        style="font-size: 11px; padding: 4px 10px; ${u.id === user.id ? 'opacity: 0.3;' : 'color: #c33;'}">
                        ${icon('trash', 12)}
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<div class="subtle" style="text-align: center; padding: 20px;">Пользователей нет</div>'}
        </div>
      </div>
    `;
  }

  function renderSettingsTab() {
    const s = settings;
    const inp = 'padding: 8px; border-radius: 8px; border: 1px solid var(--line); width: 100%;';
    return `
      <div class="grid">
        <div class="card" style="grid-column: span 6; padding: 16px;">
          <h3 style="margin-bottom: 12px;">Основные данные</h3>
          <div class="field"><label>Название компании</label>
            <input id="sCompanyName" value="${escapeHtml(s.companyName || '')}" style="${inp}" /></div>
          <div class="field" style="margin-top: 8px;"><label>ИНН</label>
            <input id="sInn" value="${escapeHtml(s.inn || '')}" style="${inp}" /></div>
          <div class="field" style="margin-top: 8px;"><label>КПП</label>
            <input id="sKpp" value="${escapeHtml(s.kpp || '')}" style="${inp}" /></div>
          <div class="field" style="margin-top: 8px;"><label>Юридический адрес</label>
            <input id="sAddress" value="${escapeHtml(s.address || '')}" style="${inp}" /></div>
          <div class="field" style="margin-top: 8px;"><label>Телефон</label>
            <input id="sPhone" value="${escapeHtml(s.phone || '')}" style="${inp}" /></div>
          <div class="field" style="margin-top: 8px;"><label>Email</label>
            <input id="sEmail" value="${escapeHtml(s.email || '')}" style="${inp}" /></div>
          <div class="field" style="margin-top: 8px;"><label>Сайт</label>
            <input id="sWebsite" value="${escapeHtml(s.website || '')}" style="${inp}" /></div>
        </div>
        <div class="card" style="grid-column: span 6; padding: 16px;">
          <h3 style="margin-bottom: 12px;">Банковские реквизиты</h3>
          <div class="field"><label>Банк</label>
            <input id="sBankName" value="${escapeHtml(s.bankName || '')}" placeholder='ООО "Банк Точка"' style="${inp}" /></div>
          <div class="field" style="margin-top: 8px;"><label>БИК</label>
            <input id="sBik" value="${escapeHtml(s.bik || '')}" style="${inp}" /></div>
          <div class="field" style="margin-top: 8px;"><label>Кор. Счёт</label>
            <input id="sCorrAccount" value="${escapeHtml(s.corrAccount || '')}" style="${inp}" /></div>
          <div class="field" style="margin-top: 8px;"><label>Расч. Счёт</label>
            <input id="sAccountNumber" value="${escapeHtml(s.accountNumber || '')}" style="${inp}" /></div>
          <h3 style="margin: 16px 0 12px;">Подписант</h3>
          <div class="field"><label>ФИО подписанта</label>
            <input id="sSignerName" value="${escapeHtml(s.signerName || '')}" style="${inp}" /></div>
          <div class="field" style="margin-top: 8px;"><label>Должность</label>
            <input id="sSignerTitle" value="${escapeHtml(s.signerTitle || '')}" placeholder="Генеральный директор" style="${inp}" /></div>
          <div class="field" style="margin-top: 8px;"><label>Правовая форма</label>
            <input id="sLegalForm" value="${escapeHtml(s.legalForm || '')}" placeholder="ИП" style="${inp}" /></div>
        </div>
        <div style="grid-column: span 12;">
          <button class="btn primary" id="btnSaveSettings" style="padding: 10px 30px;">${icon('save', 14)} Сохранить настройки</button>
        </div>
      </div>
    `;
  }

  function bindUsersEvents(container, user) {
    container.querySelectorAll('.admin-role-select').forEach(select => {
      select.addEventListener('change', async () => {
        try {
          await api.putRequest(`/admin/users/${select.dataset.id}`, { role: select.value });
          showToast('Роль обновлена');
          await loadUsers();
          render(container);
        } catch (e) { showToast('Ошибка: ' + e.message); }
      });
    });

    container.querySelectorAll('.btn-toggle-user').forEach(btn => {
      btn.addEventListener('click', async () => {
        const isActive = btn.dataset.active === 'true';
        const action = isActive ? 'заблокировать' : 'разблокировать';
        if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} пользователя?`)) return;
        try {
          await api.putRequest(`/admin/users/${btn.dataset.id}`, { active: !isActive });
          showToast(isActive ? 'Пользователь заблокирован' : 'Пользователь разблокирован');
          await loadUsers();
          render(container);
        } catch (e) { showToast('Ошибка: ' + e.message); }
      });
    });

    container.querySelectorAll('.btn-delete-user').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Удалить пользователя? Это действие необратимо.')) return;
        try {
          await api.deleteRequest(`/admin/users/${btn.dataset.id}`);
          showToast('Пользователь удалён');
          users = users.filter(u => u.id != btn.dataset.id);
          render(container);
        } catch (e) { showToast('Ошибка: ' + e.message); }
      });
    });

    container.querySelector('#btnAddUser')?.addEventListener('click', () => showAddUserModal(container));
  }

  function bindSettingsEvents(container) {
    container.querySelector('#btnSaveSettings')?.addEventListener('click', async () => {
      const data = {
        companyName: container.querySelector('#sCompanyName')?.value || '',
        inn: container.querySelector('#sInn')?.value || '',
        kpp: container.querySelector('#sKpp')?.value || '',
        address: container.querySelector('#sAddress')?.value || '',
        phone: container.querySelector('#sPhone')?.value || '',
        email: container.querySelector('#sEmail')?.value || '',
        website: container.querySelector('#sWebsite')?.value || '',
        bankName: container.querySelector('#sBankName')?.value || '',
        bik: container.querySelector('#sBik')?.value || '',
        corrAccount: container.querySelector('#sCorrAccount')?.value || '',
        accountNumber: container.querySelector('#sAccountNumber')?.value || '',
        signerName: container.querySelector('#sSignerName')?.value || '',
        signerTitle: container.querySelector('#sSignerTitle')?.value || '',
        legalForm: container.querySelector('#sLegalForm')?.value || '',
      };
      try {
        await api.putRequest('/admin/settings', data);
        showToast('Настройки сохранены');
        settings = { ...settings, ...data };
      } catch (e) { showToast('Ошибка: ' + e.message); }
    });
  }

  function showAddUserModal(container) {
    const backdrop = document.getElementById('modalBackdrop');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');

    title.textContent = 'Новый пользователь';
    body.innerHTML = `
      <div class="field">
        <label>ФИО *</label>
        <input id="userName" placeholder="Иван Иванов" />
      </div>
      <div class="field" style="margin-top: 10px;">
        <label>Email *</label>
        <input id="userEmail" type="email" placeholder="ivan@company.ru" />
      </div>
      <div style="display: flex; gap: 10px; margin-top: 10px;">
        <div class="field" style="flex: 1;">
          <label>Роль</label>
          <select id="userRole">
            ${Object.entries(roleLabels).map(([key, label]) =>
              `<option value="${key}" ${key === 'manager' ? 'selected' : ''}>${label}</option>`
            ).join('')}
          </select>
        </div>
        <div class="field" style="flex: 1;">
          <label>Пароль *</label>
          <input id="userPassword" type="password" placeholder="Мин. 6 символов" />
        </div>
      </div>
      <div class="row" style="margin-top: 12px; gap: 10px;">
        <button class="btn primary" id="createUser">Добавить</button>
        <button class="btn ghost" id="cancelUser">Отмена</button>
      </div>
    `;

    backdrop.style.display = 'flex';

    document.getElementById('createUser').addEventListener('click', async () => {
      const fullName = document.getElementById('userName').value.trim();
      const email = document.getElementById('userEmail').value.trim();
      const role = document.getElementById('userRole').value;
      const password = document.getElementById('userPassword').value;

      if (!fullName || !email || !password) { showToast('Заполните все обязательные поля'); return; }
      if (password.length < 6) { showToast('Пароль минимум 6 символов'); return; }

      try {
        await api.postRequest('/admin/users', { fullName, email, role, password });
        showToast('Пользователь добавлен');
        backdrop.style.display = 'none';
        await loadUsers();
        render(container);
      } catch (e) { showToast('Ошибка: ' + e.message); }
    });

    document.getElementById('cancelUser').addEventListener('click', () => { backdrop.style.display = 'none'; });
  }

  return { render };
})();

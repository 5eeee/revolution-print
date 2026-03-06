const profilePage = (() => {
  let companySettings = {};

  async function loadSettings() {
    try {
      const res = await api.getRequest('/admin/settings');
      if (res.success) companySettings = res.data;
    } catch { companySettings = {}; }
  }

  async function render(container) {
    const user = authModule.getUser();
    await loadSettings();

    const statusLabels = { online: 'Онлайн', away: 'Отошёл', offline: 'Оффлайн' };
    const statusColors = { online: '#22c55e', away: '#eab308', offline: '#9ca3af' };
    const currentStatus = user.status || 'offline';
    const avatarUrl = user.avatar ? api.baseUrl.replace('/api', '') + user.avatar : '';

    const html = `
      <div class="grid">
        <div class="card" style="grid-column: span 6;">
          <h2>Личный кабинет</h2>

          <!-- Аватар -->
          <div style="display: flex; align-items: center; gap: 20px; margin-top: 20px;">
            <div class="profile-avatar-wrapper" id="avatarWrapper" style="position: relative; cursor: pointer;" title="Нажмите чтобы сменить аватар">
              ${avatarUrl
                ? `<img id="profileAvatarImg" src="${escapeHtml(avatarUrl)}" class="profile-avatar-img" />`
                : `<div id="profileAvatarImg" class="profile-avatar-placeholder">${(user.fullName || '?')[0].toUpperCase()}</div>`
              }
              <div class="profile-avatar-overlay">${icon('edit', 16, '#fff')}</div>
            </div>
            <div>
              <div style="font-weight: 600; font-size: 18px;">${escapeHtml(user.fullName)}</div>
              <div class="subtle" style="font-size: 13px;">${escapeHtml(user.email)}</div>
              <div style="margin-top: 6px;">
                <select id="profileStatus" style="padding: 4px 10px; border-radius: 14px; border: 2px solid ${statusColors[currentStatus]}; font-size: 12px; font-weight: 600; color: ${statusColors[currentStatus]}; background: ${statusColors[currentStatus]}15; cursor: pointer;">
                  ${Object.entries(statusLabels).map(([k, v]) => `<option value="${k}" ${k === currentStatus ? 'selected' : ''}>${v}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>
          <input type="file" id="avatarInput" accept="image/*" style="display: none;" />

          <div class="field" style="margin-top: 20px;">
            <label>ФИО</label>
            <input id="profileName" value="${escapeHtml(user.fullName)}" />
          </div>

          <div class="field" style="margin-top: 10px;">
            <label>Email</label>
            <input id="profileEmail" value="${escapeHtml(user.email)}" disabled />
          </div>

          <div class="field" style="margin-top: 10px;">
            <label>Роль</label>
            <input value="${escapeHtml(user.role)}" disabled />
          </div>

          <div class="row" style="margin-top: 20px; gap: 10px;">
            <button class="btn primary" id="btnSaveProfile">Сохранить</button>
            <button class="btn ghost" id="btnChangePassword">Изменить пароль</button>
          </div>
        </div>

        <div class="card" style="grid-column: span 6;">
          <h2>Настройки компании</h2>
          <p class="subtle" style="margin-bottom: 12px;">Эти данные подставляются в документы (КП, сметы, акты)</p>

          <div class="field">
            <label>Название компании</label>
            <input id="settCompany" value="${escapeHtml(companySettings.companyName || '')}" placeholder="Revolution Print" />
          </div>
          <div style="display: flex; gap: 10px; margin-top: 8px;">
            <div class="field" style="flex: 1;">
              <label>ИНН</label>
              <input id="settInn" value="${escapeHtml(companySettings.inn || '')}" placeholder="1234567890" />
            </div>
            <div class="field" style="flex: 1;">
              <label>КПП</label>
              <input id="settKpp" value="${escapeHtml(companySettings.kpp || '')}" placeholder="123456789" />
            </div>
          </div>
          <div class="field" style="margin-top: 8px;">
            <label>Адрес</label>
            <input id="settAddr" value="${escapeHtml(companySettings.address || '')}" placeholder="г. Москва, ул. ..." />
          </div>
          <div style="display: flex; gap: 10px; margin-top: 8px;">
            <div class="field" style="flex: 1;">
              <label>Телефон</label>
              <input id="settPhone" value="${escapeHtml(companySettings.phone || '')}" placeholder="+7 (999) 000-00-00" />
            </div>
            <div class="field" style="flex: 1;">
              <label>Email</label>
              <input id="settEmail" value="${escapeHtml(companySettings.email || '')}" placeholder="info@company.ru" />
            </div>
          </div>
          <div class="field" style="margin-top: 8px;">
            <label>Сайт</label>
            <input id="settWebsite" value="${escapeHtml(companySettings.website || '')}" placeholder="https://..." />
          </div>
          <div class="field" style="margin-top: 8px;">
            <label>Банковские реквизиты</label>
            <textarea id="settBank" style="min-height: 80px;">${escapeHtml(companySettings.bankDetails || '')}</textarea>
          </div>
          <button class="btn primary" id="btnSaveSettings" style="margin-top: 12px;">${icon('save', 14)} Сохранить реквизиты</button>
        </div>
      </div>
    `;

    container.innerHTML = html;

    document.getElementById('btnSaveProfile').addEventListener('click', async () => {
      const fullName = document.getElementById('profileName').value.trim();
      if (!fullName) { showToast('Введите ФИО'); return; }
      try {
        const res = await api.putRequest('/auth/profile', { fullName });
        if (res.success) {
          user.fullName = fullName;
          authModule.setUser(user);
          showToast('Профиль обновлён');
        }
      } catch (error) { showToast('Ошибка: ' + error.message); }
    });

    // Avatar upload
    document.getElementById('avatarWrapper').addEventListener('click', () => {
      document.getElementById('avatarInput').click();
    });

    document.getElementById('avatarInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) { showToast('Выберите изображение'); return; }
      if (file.size > 5 * 1024 * 1024) { showToast('Максимум 5 МБ'); return; }

      const formData = new FormData();
      formData.append('avatar', file);

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(api.baseUrl + '/auth/avatar', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
        const res = await response.json();
        if (!response.ok) throw new Error(res.error || 'Ошибка');
        user.avatar = res.data.avatar;
        authModule.setUser(user);
        showToast('Аватар обновлён');
        render(container);
      } catch (err) { showToast('Ошибка: ' + err.message); }
    });

    // Status change
    document.getElementById('profileStatus').addEventListener('change', async (e) => {
      const newStatus = e.target.value;
      try {
        await api.putRequest('/auth/status', { status: newStatus });
        user.status = newStatus;
        authModule.setUser(user);
        const colors = { online: '#22c55e', away: '#eab308', offline: '#9ca3af' };
        e.target.style.borderColor = colors[newStatus];
        e.target.style.color = colors[newStatus];
        e.target.style.background = colors[newStatus] + '15';
        showToast('Статус обновлён');
      } catch (err) { showToast('Ошибка: ' + err.message); }
    });

    document.getElementById('btnSaveSettings').addEventListener('click', async () => {
      try {
        await api.putRequest('/admin/settings', {
          companyName: document.getElementById('settCompany').value,
          inn: document.getElementById('settInn').value,
          kpp: document.getElementById('settKpp').value,
          address: document.getElementById('settAddr').value,
          phone: document.getElementById('settPhone').value,
          email: document.getElementById('settEmail').value,
          website: document.getElementById('settWebsite').value,
          bankDetails: document.getElementById('settBank').value,
        });
        showToast('Реквизиты сохранены!');
      } catch (e) {
        showToast('Ошибка: ' + e.message);
      }
    });

    document.getElementById('btnChangePassword').addEventListener('click', () => {
      const backdrop = document.getElementById('modalBackdrop');
      const title = document.getElementById('modalTitle');
      const body = document.getElementById('modalBody');

      title.textContent = 'Изменить пароль';
      body.innerHTML = `
        <div class="field">
          <label>Текущий пароль</label>
          <input id="oldPass" type="password" />
        </div>
        <div class="field" style="margin-top: 10px;">
          <label>Новый пароль</label>
          <input id="newPass" type="password" />
        </div>
        <div class="field" style="margin-top: 10px;">
          <label>Подтверждение</label>
          <input id="confirmPass" type="password" />
        </div>
        <div class="row" style="margin-top: 12px; gap: 10px;">
          <button class="btn primary" id="saveNewPass">Изменить</button>
          <button class="btn ghost" id="cancelPass">Отмена</button>
        </div>
      `;

      backdrop.style.display = 'flex';

      document.getElementById('saveNewPass').addEventListener('click', async () => {
        const oldPass = document.getElementById('oldPass').value;
        const newPass = document.getElementById('newPass').value;
        const confirmVal = document.getElementById('confirmPass').value;
        if (!oldPass) { showToast('Введите текущий пароль'); return; }
        if (newPass !== confirmVal) { showToast('Пароли не совпадают'); return; }
        if (newPass.length < 6) { showToast('Пароль должен быть не менее 6 символов'); return; }
        try {
          const res = await api.postRequest('/auth/change-password', { oldPassword: oldPass, newPassword: newPass });
          if (res.success) {
            showToast('Пароль успешно изменён');
          }
        } catch (e) {
          showToast('Ошибка: ' + e.message);
        }
        backdrop.style.display = 'none';
      });

      document.getElementById('cancelPass').addEventListener('click', () => {
        backdrop.style.display = 'none';
      });
    });
  }

  return { render };
})();

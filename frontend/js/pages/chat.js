const chatPage = (() => {
  let messages = [];
  let orders = [];
  let onlineUsers = [];
  let refreshTimer = null;

  async function loadMessages() {
    try {
      const response = await api.getRequest('/messages?limit=100');
      if (response.success) messages = response.data;
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
    }
  }

  async function loadOrders() {
    try {
      const response = await api.getRequest('/orders');
      if (response.success) orders = response.data;
    } catch { orders = []; }
  }

  async function loadOnlineUsers() {
    try {
      const response = await api.getRequest('/auth/users/online');
      if (response.success) onlineUsers = response.data;
    } catch { onlineUsers = []; }
  }

  function getUserAvatar(u, size = 28) {
    const baseUrl = api.baseUrl.replace('/api', '');
    if (u.avatar) {
      return `<img src="${baseUrl}${escapeHtml(u.avatar)}" class="chat-avatar" style="width:${size}px;height:${size}px;" />`;
    }
    return `<div class="chat-avatar-placeholder" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.43)}px;">${(u.fullName || u.name || '?')[0].toUpperCase()}</div>`;
  }

  function getStatusDot(status) {
    const colors = { online: '#22c55e', away: '#eab308', offline: '#9ca3af' };
    return `<span class="status-dot" style="background:${colors[status] || colors.offline};"></span>`;
  }

  async function render(container) {
    await Promise.all([loadMessages(), loadOrders(), loadOnlineUsers()]);
    const user = authModule.getUser();

    container.innerHTML = `
      <div style="display: flex; gap: 12px; height: calc(100vh - 120px);">
        <!-- Основной чат -->
        <div class="card" style="flex: 1; display: flex; flex-direction: column; padding: 0; overflow: hidden;">
          <div style="padding: 14px 18px; border-bottom: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h3 style="margin: 0;">${icon('chat', 16)} Общий чат</h3>
              <span class="subtle" style="font-size: 11px;">${messages.length} сообщений</span>
            </div>
            <button class="btn ghost" id="btnRefreshChat" style="font-size: 12px;">${icon('refresh', 12)} Обновить</button>
          </div>

          <div id="chatList" style="flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 8px;">
            ${renderMessagesList(user)}
          </div>

          <!-- Форма отправки -->
          <div style="padding: 14px; border-top: 1px solid var(--line);">
            <div style="display: flex; gap: 12px; margin-bottom: 10px;">
              <div style="flex: 1;">
                <label style="font-size: 11px; color: var(--muted); font-weight: 600;">Сообщение</label>
                <input id="chatText" placeholder="Напиши сообщение..."
                  style="width: 100%; padding: 10px 14px; border: 1px solid var(--line); border-radius: 14px; font-size: 13px; margin-top: 4px;" />
              </div>
              <div style="min-width: 180px;">
                <label style="font-size: 11px; color: var(--muted); font-weight: 600;">Привязка</label>
                <select id="chatOrderBind" style="width: 100%; padding: 10px; border: 1px solid var(--line); border-radius: 14px; font-size: 13px; margin-top: 4px;">
                  <option value="">Без привязки</option>
                  ${orders.map(o => `<option value="${o.id}">${escapeHtml(o.title)} #${o.id}</option>`).join('')}
                </select>
              </div>
            </div>
            <div id="chatFilePreview" style="display: none; flex-wrap: wrap; gap: 6px; margin-bottom: 8px;"></div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <input type="file" id="chatFiles" multiple style="display: none;" />
              <button class="btn ghost" id="btnAttachFile" style="border-radius: 14px; padding: 10px 16px; font-size: 12px; flex-shrink: 0;">${icon('paperclip', 14)} Прикрепить</button>
              <button class="btn primary" id="btnSendMsg" style="border-radius: 14px; padding: 12px 24px; flex-shrink: 0;">Отправить</button>
            </div>
          </div>
        </div>

        <!-- Панель -->
        <div style="width: 220px; display: flex; flex-direction: column; gap: 10px; flex-shrink: 0;">
          <div class="card" style="padding: 14px;">
            <h4 style="margin: 0 0 10px;">Участники</h4>
            <div id="chatUsersList" style="font-size: 13px;">
              ${renderUsersList(user)}
            </div>
          </div>

          <div class="card" style="padding: 14px;">
            <h4 style="margin: 0 0 8px;">Навигация</h4>
            <button class="btn ghost" data-page="dashboard" style="width: 100%; margin-bottom: 6px; font-size: 12px;">${icon('home', 12)} Главная</button>
            <button class="btn ghost" data-page="orders" style="width: 100%; margin-bottom: 6px; font-size: 12px;">${icon('clipboard', 12)} Заказы</button>
            <button class="btn ghost" data-page="clients" style="width: 100%; font-size: 12px;">${icon('users', 12)} Клиенты</button>
          </div>
        </div>
      </div>
    `;

    // Список выбранных файлов (DataTransfer позволяет удалять по одному)
    let pendingFiles = new DataTransfer();

    function updateFilePreview() {
      const preview = document.getElementById('chatFilePreview');
      if (!preview) return;
      const files = pendingFiles.files;
      if (files.length === 0) { preview.style.display = 'none'; preview.innerHTML = ''; return; }
      preview.style.display = 'flex';
      preview.innerHTML = Array.from(files).map((f, i) => {
        const name = f.name.length > 28 ? f.name.slice(0, 20) + '…' + f.name.slice(-7) : f.name;
        return `<div style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; background: rgba(134,75,18,0.08); border: 1px solid rgba(134,75,18,0.15); border-radius: 10px; font-size: 12px; max-width: 220px;">
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(f.name)}">${icon('paperclip', 11)} ${escapeHtml(name)}</span>
          <span class="chat-remove-file" data-idx="${i}" style="cursor: pointer; color: #c41e3a; flex-shrink: 0; display: flex; align-items: center;" title="Удалить">${icon('close', 13, '#c41e3a')}</span>
        </div>`;
      }).join('');
      // Привязать удаление
      preview.querySelectorAll('.chat-remove-file').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.idx);
          const dt = new DataTransfer();
          Array.from(pendingFiles.files).forEach((f, i) => { if (i !== idx) dt.items.add(f); });
          pendingFiles = dt;
          document.getElementById('chatFiles').files = pendingFiles.files;
          updateFilePreview();
        });
      });
    }

    // Кнопка "Прикрепить" открывает скрытый input
    document.getElementById('btnAttachFile').addEventListener('click', () => {
      document.getElementById('chatFiles').click();
    });

    // При выборе файлов — добавляем к списку
    document.getElementById('chatFiles').addEventListener('change', (e) => {
      Array.from(e.target.files).forEach(f => pendingFiles.items.add(f));
      e.target.value = '';
      updateFilePreview();
    });

    // Блокировка двойной отправки
    let sending = false;

    // Отправка
    const sendMsg = async () => {
      if (sending) return;

      const input = document.getElementById('chatText');
      const text = input.value.trim();
      const orderBind = document.getElementById('chatOrderBind').value;
      const selectedFiles = pendingFiles.files;

      if (!text && selectedFiles.length === 0) return;

      sending = true;
      const btn = document.getElementById('btnSendMsg');
      if (btn) { btn.disabled = true; btn.textContent = 'Отправка...'; }

      try {
        // Сначала загрузить файлы если есть
        let uploadedFiles = [];
        if (selectedFiles && selectedFiles.length > 0) {
          for (let i = 0; i < selectedFiles.length; i++) {
            const formData = new FormData();
            formData.append('file', selectedFiles[i]);
            formData.append('type', 'chat');
            if (orderBind) formData.append('orderId', orderBind);
            try {
              const uploadRes = await api.uploadFile(formData);
              if (uploadRes.success) {
                uploadedFiles.push({
                  name: selectedFiles[i].name,
                  url: uploadRes.data.url,
                  size: selectedFiles[i].size,
                });
              }
            } catch (uploadErr) {
              showToast('Ошибка загрузки файла: ' + selectedFiles[i].name);
              console.error('Upload error:', uploadErr);
            }
          }
        }

        await api.postRequest('/messages', {
          text: text || (uploadedFiles.length ? 'Файлы' : ''),
          orderId: orderBind ? parseInt(orderBind) : null,
          files: uploadedFiles,
        });

        input.value = '';
        pendingFiles = new DataTransfer();
        document.getElementById('chatFiles').files = pendingFiles.files;
        document.getElementById('chatOrderBind').value = '';
        updateFilePreview();
        await loadMessages();
        renderMessages(container, user);
      } catch (e) { showToast('Ошибка: ' + e.message); }
      finally {
        sending = false;
        if (btn) { btn.disabled = false; btn.textContent = 'Отправить'; }
      }
    };

    document.getElementById('btnSendMsg').addEventListener('click', sendMsg);
    document.getElementById('chatText').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
    });

    document.getElementById('btnRefreshChat').addEventListener('click', async () => {
      await loadMessages();
      renderMessages(container, user);
      showToast('Обновлено');
    });

    container.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => window.appModule.goToPage(btn.dataset.page));
    });

    // Привязать клики по заказам
    container.querySelectorAll('.chat-order-link').forEach(link => {
      link.addEventListener('click', () => {
        window.appModule.goToPage('orderDetail', { orderId: parseInt(link.dataset.orderId) });
      });
    });

    // Автоскролл
    scrollChat();

    // Автообновление каждые 10 сек
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(async () => {
      const prevCount = messages.length;
      await Promise.all([loadMessages(), loadOnlineUsers()]);
      if (messages.length !== prevCount) renderMessages(container, user);
      // Update users list
      const usersEl = document.getElementById('chatUsersList');
      if (usersEl) usersEl.innerHTML = renderUsersList(user);
    }, 10000);
  }

  function renderUsersList(currentUser) {
    const statusLabels = { online: 'Онлайн', away: 'Отошёл', offline: 'Оффлайн' };
    // Sorted: current user first, then by status (online > away > offline)
    const priority = { online: 0, away: 1, offline: 2 };
    const sorted = [...onlineUsers].sort((a, b) => {
      if (a.id === currentUser.id) return -1;
      if (b.id === currentUser.id) return 1;
      return (priority[a.status] || 2) - (priority[b.status] || 2);
    });

    return sorted.map(u => {
      const isMe = u.id === currentUser.id;
      return `
        <div style="display: flex; align-items: center; gap: 8px; padding: 6px 0; ${isMe ? 'border-bottom: 1px solid var(--line);' : ''}">
          <div style="position: relative; flex-shrink: 0;">
            ${getUserAvatar(u, 28)}
            ${getStatusDot(isMe ? (currentUser.status || 'online') : u.status)}
          </div>
          <div style="min-width: 0;">
            <div style="font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(u.fullName)}</div>
            <div class="subtle" style="font-size: 10px;">${isMe ? 'Вы' : (statusLabels[u.status] || 'Оффлайн')}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderMessagesList(user) {
    if (!messages.length) {
      return `
        <div style="flex: 1; display: flex; align-items: center; justify-content: center;">
          <div class="subtle" style="text-align: center;">
            <div style="margin-bottom: 8px;">${icon('chat', 40, 'var(--muted)')}</div>
            Напишите первое сообщение
          </div>
        </div>
      `;
    }
    return messages.map(m => {
      const isOwn = m.userId === user.id;
      const filesList = Array.isArray(m.files) ? m.files : (typeof m.files === 'string' ? (() => { try { return JSON.parse(m.files); } catch { return []; } })() : []);
      const filesHtml = filesList.length ? `
        <div style="margin-top: 6px; display: flex; flex-direction: column; gap: 4px;">
          ${filesList.map(f => `
            <a href="${api.baseUrl.replace('/api', '')}${f.url}" target="_blank" download
              style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; 
              background: rgba(0,0,0,0.04); border-radius: 8px; font-size: 12px; color: var(--copper); text-decoration: none; max-width: 280px;">
              ${icon('paperclip', 12)} <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(f.name)}">${escapeHtml(truncFileName(f.name))}</span>${f.size ? ' <span style="flex-shrink:0;">(' + formatFileSize(f.size) + ')</span>' : ''}
            </a>
          `).join('')}
        </div>
      ` : '';
      const orderTag = m.orderId ? `<div style="font-size: 10px; margin-bottom: 4px; color: var(--copper); cursor: pointer;" class="chat-order-link" data-order-id="${m.orderId}">${icon('clipboard', 10)} Заказ #${m.orderId}</div>` : '';
      const msgUser = m.User || {};
      const avatarHtml = !isOwn ? `<div style="flex-shrink: 0; align-self: flex-end;">${getUserAvatar(msgUser, 30)}</div>` : '';
      return `
        <div style="display: flex; gap: 8px; align-items: flex-start; max-width: 75%; ${isOwn ? 'align-self: flex-end; flex-direction: row-reverse;' : ''}">
          ${avatarHtml}
          <div style="display: flex; flex-direction: column; align-items: ${isOwn ? 'flex-end' : 'flex-start'};">
            <div style="padding: 10px 14px; border-radius: ${isOwn ? '14px 14px 4px 14px' : '14px 14px 14px 4px'};
              background: ${isOwn ? 'rgba(134, 75, 18, 0.1)' : 'var(--panel)'}; 
              border: 1px solid ${isOwn ? 'rgba(134, 75, 18, 0.2)' : 'var(--line)'};">
              ${!isOwn ? `<div style="font-size: 11px; font-weight: 600; color: var(--copper); margin-bottom: 4px;">${escapeHtml(msgUser.fullName || 'Пользователь')}</div>` : ''}
              ${orderTag}
              <div style="font-size: 13px; white-space: pre-wrap;">${escapeHtml(m.text)}</div>
              ${filesHtml}
            </div>
            <span class="subtle" style="font-size: 10px; margin-top: 2px; padding: 0 6px;">${formatMsgTime(m.createdAt)}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderMessages(container, user) {
    const chat = document.getElementById('chatList');
    if (!chat) return;
    chat.innerHTML = renderMessagesList(user);
    // Привязать клики по заказам
    chat.querySelectorAll('.chat-order-link').forEach(link => {
      link.addEventListener('click', () => {
        window.appModule.goToPage('orderDetail', { orderId: parseInt(link.dataset.orderId) });
      });
    });
    scrollChat();
  }

  function scrollChat() {
    setTimeout(() => {
      const chat = document.getElementById('chatList');
      if (chat) chat.scrollTop = chat.scrollHeight;
    }, 50);
  }

  function formatMsgTime(dt) {
    if (!dt) return '';
    const d = new Date(dt);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    return isToday ? time : d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) + ' ' + time;
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' Б';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
    return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
  }

  function truncFileName(name) {
    if (name.length <= 30) return name;
    const ext = name.lastIndexOf('.') !== -1 ? name.slice(name.lastIndexOf('.')) : '';
    const base = name.slice(0, name.length - ext.length);
    return base.slice(0, 20) + '…' + ext;
  }

  function getUniqueUsers(msgs, myId) {
    const map = {};
    msgs.forEach(m => {
      if (m.userId !== myId && m.User?.fullName) {
        map[m.userId] = { name: m.User.fullName };
      }
    });
    return Object.values(map);
  }

  return {
    render,
    destroy() { if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; } },
  };
})();



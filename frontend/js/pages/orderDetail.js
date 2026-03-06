const orderDetailPage = (() => {
  let order = null;
  let calculators = [];
  let activeCalcType = 'sublimation';
  let breakdown = [];
  let designs = [];
  let estimates = [];
  let messages = [];
  let productions = [];
  let activeTab = 'chat'; // Правая панель: chat | designs | estimates | breakdown | notes | deadline | techTasks

  const CALC_TYPES = [
    { id: 'sublimation', name: 'Сублимация', icon: 'flame' },
    { id: 'badges', name: 'Значки', icon: 'circle' },
    { id: 'patches', name: 'Нашивки', icon: 'tag' },
    { id: 'stationery', name: 'Канцелярия', icon: 'penTool' },
    { id: 'silkscreen', name: 'Шелкография', icon: 'palette' },
  ];

  // ===== Загрузка данных =====
  async function loadOrder(orderId) {
    const res = await api.getRequest(`/orders/${orderId}`);
    if (res.success) order = res.data;
  }

  async function loadCalculators(orderId) {
    try {
      const res = await api.getRequest(`/orders/${orderId}/calculators`);
      if (res.success) calculators = res.data;
    } catch { calculators = []; }
  }

  async function loadBreakdown(orderId) {
    try {
      const res = await api.getRequest(`/orders/${orderId}/breakdown`);
      if (res.success) breakdown = res.data;
    } catch { breakdown = []; }
  }

  async function loadDesigns(orderId) {
    try {
      const res = await api.getRequest(`/orders/${orderId}/designs`);
      if (res.success) designs = res.data;
    } catch { designs = []; }
  }

  async function loadEstimates(orderId) {
    try {
      const res = await api.getRequest(`/orders/${orderId}/estimates`);
      if (res.success) estimates = res.data;
    } catch { estimates = []; }
  }

  async function loadMessages(orderId) {
    try {
      const res = await api.getRequest(`/orders/${orderId}/messages`);
      if (res.success) messages = res.data;
    } catch { messages = []; }
  }

  async function loadProductions() {
    try {
      const res = await api.getRequest('/production');
      if (res.success) productions = res.data;
    } catch { productions = []; }
  }

  // ===== Вычисление себестоимости =====
  function getTotalCost() {
    return breakdown.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);
  }

  // ===== Главный рендер =====
  async function render(container, orderId) {
    if (!orderId) {
      container.innerHTML = '<div class="card"><p>ID заказа не указан</p></div>';
      return;
    }

    container.innerHTML = '<div class="card"><p>Загрузка...</p></div>';

    try {
      await Promise.all([
        loadOrder(orderId),
        loadCalculators(orderId),
        loadBreakdown(orderId),
        loadDesigns(orderId),
        loadEstimates(orderId),
        loadMessages(orderId),
        loadProductions(),
      ]);
    } catch (error) {
      container.innerHTML = `<div class="card"><p>Ошибка: ${error.message}</p></div>`;
      return;
    }

    if (!order) {
      container.innerHTML = '<div class="card"><p>Заказ не найден</p></div>';
      return;
    }

    const totalCost = getTotalCost();
    const margin = order.marginPercent || 20;
    const clientPrice = totalCost * (1 + margin / 100);

    container.innerHTML = `
      <!-- Шапка заказа -->
      <div class="grid" style="margin-bottom: 0;">
        <div class="card" style="grid-column: span 12; padding: 16px 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div>
              <div style="display: flex; align-items: center; gap: 12px;">
                <button class="btn ghost" id="backToOrders" style="padding: 6px 10px;">← Назад</button>
                <h2 style="margin: 0;">${escapeHtml(order.title)}</h2>
                <span class="subtle">#${order.id}</span>
              </div>
              <div style="margin-top: 4px; font-size: 12px; color: var(--muted);">
                Клиент: <b>${order.Client ? escapeHtml(order.Client.name) : '—'}</b>
                &nbsp;|&nbsp; Создан: ${new Date(order.createdAt).toLocaleDateString('ru-RU')}
              </div>
            </div>
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              ${(() => {
                const currentUser = authModule.getUser();
                const isMine = order.assignedTo === currentUser.id;
                const isTaken = !!order.assignedTo;
                const isActive = order.status !== 'Готов' && order.status !== 'Отменен';
                if (isTaken) {
                  return `<span style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; padding: 4px 10px; border-radius: 6px; background: ${isMine ? 'rgba(34,197,94,0.1)' : 'rgba(139,92,246,0.1)'}; color: ${isMine ? '#16a34a' : '#7c3aed'};">
                    ${icon('user', 12)} ${escapeHtml(order.assignedName)}
                  </span>` + (isMine && isActive ? `<button class="btn ghost" id="btnReleaseOrder" style="font-size: 11px; padding: 4px 8px; color: #7c3aed;">${icon('close', 10)} Снять</button>` : '');
                } else if (isActive) {
                  return `<button class="btn ghost" id="btnTakeOrder" style="font-size: 11px; padding: 4px 10px; color: #16a34a; border: 1px solid rgba(34,197,94,0.3);">${icon('check', 12)} Взять заказ</button>`;
                }
                return '';
              })()}
              <select id="orderStatus" style="padding: 6px 10px; border-radius: 8px; border: 1px solid var(--line);">
                ${['Обработка','В работе','Готов','Отменен','В ожидании'].map(s =>
                  `<option ${order.status === s ? 'selected' : ''}>${s}</option>`
                ).join('')}
              </select>
              <select id="paymentStatus" style="padding: 6px 10px; border-radius: 8px; border: 1px solid var(--line);">
                <option value="postpaid" ${order.paymentStatus === 'postpaid' ? 'selected' : ''}>Постоплата</option>
                <option value="50%" ${order.paymentStatus === '50%' ? 'selected' : ''}>50% предоплата</option>
                <option value="paid" ${order.paymentStatus === 'paid' ? 'selected' : ''}>Оплачено 100%</option>
              </select>
              <button class="btn ghost" id="btnMargin" title="Маржа">${icon('barChart', 14)} Маржа: ${margin}%</button>
              <button class="btn primary" id="btnSaveOrder">${icon('save', 14)} Сохранить</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Основной контент -->
      <div class="grid">
        <!-- ЛЕВАЯ КОЛОНКА: калькуляторы -->
        <div style="grid-column: span 8; display: flex; flex-direction: column; gap: 14px;">

          <!-- Вкладки калькуляторов -->
          <div class="card" style="padding: 12px 16px;">
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              ${CALC_TYPES.map(c => `
                <button class="btn ${activeCalcType === c.id ? 'primary' : 'ghost'} calc-tab" 
                  data-type="${c.id}" style="padding: 6px 12px; font-size: 12px;">
                  ${icon(c.icon, 14)} ${c.name}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Область калькулятора -->
          <div class="card" id="calcArea">
            ${renderCalculator()}
          </div>
        </div>

        <!-- ПРАВАЯ КОЛОНКА: панели -->
        <div style="grid-column: span 4; display: flex; flex-direction: column; gap: 14px;">
          
          <!-- Вкладки правой панели -->
          <div class="card" style="padding: 10px 14px;">
            <div style="display: flex; gap: 4px; flex-wrap: wrap;">
              ${[
                { id: 'chat', label: icon('chat', 12) + ' Чат' },
                { id: 'designs', label: icon('paperclip', 12) + ' Макеты' },
                { id: 'estimates', label: icon('dollarSign', 12) + ' Сметы' },
                { id: 'breakdown', label: icon('factory', 12) + ' Производства' },
                { id: 'notes', label: icon('notes', 12) + ' Заметки' },
                { id: 'deadline', label: icon('calendar', 12) + ' Срок' },
                { id: 'techTasks', label: icon('clipboard', 12) + ' ТЗ' },
              ].map(t => `
                <button class="btn ${activeTab === t.id ? 'primary' : 'ghost'} panel-tab" 
                  data-tab="${t.id}" style="padding: 4px 8px; font-size: 11px;">
                  ${t.label}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Содержимое правой панели -->
          <div class="card" id="rightPanel" style="flex: 1; min-height: 400px; max-height: 60vh; overflow-y: auto;">
            ${renderRightPanel()}
          </div>
        </div>
      </div>

      <!-- Нижний блок -->
      <div class="grid" style="margin-top: 0;">
        <div class="card" style="grid-column: span 12; padding: 16px 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap;">
              <div>
                <span class="subtle">Себестоимость:</span>
                <b id="bottomCost" style="font-size: 16px; margin-left: 6px;">${formatCurrency(totalCost)}</b>
              </div>
              <div>
                <span class="subtle">Цена клиенту (маржа ${margin}%):</span>
                <b id="bottomClientPrice" style="font-size: 16px; margin-left: 6px; color: var(--copper);">${formatCurrency(clientPrice)}</b>
              </div>
              <div>
                <span class="subtle">Срок сдачи:</span>
                <b style="margin-left: 6px;">${order.deadline ? new Date(order.deadline).toLocaleDateString('ru-RU') : 'Не указан'}</b>
              </div>
            </div>
            <button class="btn primary" id="btnDownloadKP">${icon('fileDown', 14)} Скачать КП</button>
          </div>
        </div>
      </div>
    `;

    bindEvents(container, orderId);
  }

  // ===== Рендер калькулятора =====
  function renderCalculator() {
    const calc = calculators.find(c => c.type === activeCalcType);
    const p = calc ? calc.params : {};

    const calcConfig = {
      sublimation: { title: 'Сублимация', fields: [
        { key: 'product', label: 'Изделие', type: 'select', options: ['Футболки', 'Кейсы', 'Панно', 'Полотенца', 'Пледы'] },
        { key: 'material', label: 'Материал (полиэстер/смесь, плотность)', type: 'text', placeholder: '100% полиэстер, 180 г/м²' },
        { key: 'printFormat', label: 'Формат печати', type: 'select', options: ['Полноцвет, 1 сторона', 'Полноцвет, 2 стороны'] },
        { key: 'size', label: 'Размер / развёртка (см)', type: 'text', placeholder: '30×40 см' },
        { key: 'resolution', label: 'Разрешение изображений', type: 'text', placeholder: '300 dpi' },
        { key: 'quantity', label: 'Количество, шт', type: 'number', placeholder: '100' },
        { key: 'pricePerUnit', label: 'Цена за шт, ₽', type: 'number', placeholder: '250' },
        { key: 'fileFormat', label: 'Файлы (формат, профиль)', type: 'text', placeholder: 'TIFF, RGB, 300 dpi' },
        { key: 'packaging', label: 'Упаковка и маркировка', type: 'text', placeholder: 'Индивидуальная' },
        { key: 'delivery', label: 'Сроки и условия доставки', type: 'text', placeholder: '5 рабочих дней' },
        { key: 'additional', label: 'Дополнительно', type: 'text', placeholder: 'Припуски, выкройки, тестовый отпечаток' },
      ]},
      badges: { title: 'Значки', fields: [
        { key: 'diameter', label: 'Диаметр значка', type: 'select', options: ['37 мм', '56 мм'] },
        { key: 'mount', label: 'Крепление', type: 'select', options: ['Булавка', 'Цанга'] },
        { key: 'quantity', label: 'Количество, шт', type: 'number', placeholder: '100' },
        { key: 'pricePerUnit', label: 'Цена за шт, ₽', type: 'number', placeholder: '30' },
        { key: 'fileFormat', label: 'Макет (формат файла)', type: 'text', placeholder: 'PDF / PNG / CDR' },
        { key: 'additional', label: 'Дополнительно', type: 'text', placeholder: 'Замечания...' },
      ]},
      patches: { title: 'Нашивки', fields: [
        { key: 'patchType', label: 'Тип нашивки', type: 'select', options: ['Вышивка', 'Тканевая', 'Жаккард'] },
        { key: 'size', label: 'Размер (мм)', type: 'text', placeholder: '80×60 мм' },
        { key: 'quantity', label: 'Количество, шт', type: 'number', placeholder: '100' },
        { key: 'pricePerUnit', label: 'Цена за шт, ₽', type: 'number', placeholder: '50' },
        { key: 'colors', label: 'Цвета (Pantone / кол-во)', type: 'text', placeholder: 'Pantone 186C, 3 цвета' },
        { key: 'edge', label: 'Кромка', type: 'select', options: ['Оверлок', 'Мережка', 'Пайка'] },
        { key: 'mount', label: 'Крепление', type: 'select', options: ['Пришивная', 'Термо', 'Клей', 'Липучка'] },
        { key: 'delivery', label: 'Сроки и доставка', type: 'text', placeholder: '7 рабочих дней' },
        { key: 'fileFormat', label: 'Файлы (вектор .ai/.eps)', type: 'text', placeholder: '.ai, .eps' },
      ]},
      stationery: { title: 'Канцелярия', fields: [
        { key: 'product', label: 'Товар (модель/артикул)', type: 'text', placeholder: 'Ручка Parker, блокнот A5...' },
        { key: 'materialColor', label: 'Материал и цвет корпуса', type: 'text', placeholder: 'Пластик, чёрный' },
        { key: 'printMethod', label: 'Метод нанесения', type: 'select', options: ['Тампопечать', 'Шелкография', 'Лазер', 'УФ-печать', 'Тиснение'] },
        { key: 'printColor', label: 'Цвет печати (Pantone)', type: 'text', placeholder: 'Pantone 186C' },
        { key: 'logoSize', label: 'Размер логотипа и расположение (мм)', type: 'text', placeholder: '30×15 мм, на клипе' },
        { key: 'quantity', label: 'Количество, шт', type: 'number', placeholder: '500' },
        { key: 'pricePerUnit', label: 'Цена за шт, ₽', type: 'number', placeholder: '80' },
        { key: 'packaging', label: 'Упаковка', type: 'text', placeholder: 'Индивидуальная / наборы / коробки' },
        { key: 'delivery', label: 'Желаемая дата поставки', type: 'text', placeholder: '15.04.2026' },
        { key: 'fileFormat', label: 'Файлы (вектор, Pantone)', type: 'text', placeholder: '.ai / .eps / .svg' },
      ]},
      silkscreen: { title: 'Шелкография', fields: [
        { key: 'product', label: 'Наименование изделия', type: 'text', placeholder: 'Футболка, худи...' },
        { key: 'material', label: 'Материал', type: 'select', options: ['Хлопок с эластаном', 'Хлопок', 'Лён', 'Сатин'] },
        { key: 'density', label: 'Плотность', type: 'text', placeholder: 'Майка от 160г, худи 240г' },
        { key: 'baseColor', label: 'Цвет изделия (основной)', type: 'text', placeholder: 'Белый' },
        { key: 'quantity', label: 'Количество, шт', type: 'number', placeholder: '100' },
        { key: 'pricePerUnit', label: 'Цена за шт, ₽', type: 'number', placeholder: '350' },
        { key: 'printSize', label: 'Размер макета, расположение, зоны', type: 'text', placeholder: 'A4, перед, 1 зона' },
        { key: 'printColors', label: 'Кол-во цветов (перед/спина/рукава)', type: 'text', placeholder: '3 цвета перед, 1 спина' },
        { key: 'inkType', label: 'Тип краски', type: 'select', options: ['Пластизоль', 'Водная', 'Флок', 'Металлик', 'Пенообразная'] },
        { key: 'needsBase', label: 'Подложка/фон (для тёмных)', type: 'select', options: ['Да', 'Нет'] },
        { key: 'durability', label: 'Стойкость (стирки, истирание)', type: 'text', placeholder: '60 стирок' },
        { key: 'prewash', label: 'Предварительная стирка/подготовка', type: 'select', options: ['Да', 'Нет'] },
        { key: 'fileFormat', label: 'Файлы (CMYK/Pantone/вектор)', type: 'text', placeholder: '.ai, Pantone' },
      ]},
    };

    const cfg = calcConfig[activeCalcType] || calcConfig.sublimation;

    // Вычислить итог если есть quantity и pricePerUnit
    const qty = parseFloat(p.quantity) || 0;
    const price = parseFloat(p.pricePerUnit || p.pricePerSqm) || 0;
    const calcTotal = qty * price;

    return `
      <div class="card-header" style="margin-bottom: 14px;">
        <h2>${cfg.title}</h2>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        ${cfg.fields.map(f => `
          <div class="field">
            <label>${f.label}</label>
            ${f.type === 'select' 
              ? `<select class="calc-field" data-key="${f.key}" style="padding: 8px; border-radius: 8px; border: 1px solid var(--line);">
                   ${f.options.map(o => `<option ${p[f.key] === o ? 'selected' : ''}>${o}</option>`).join('')}
                 </select>`
              : `<input class="calc-field" data-key="${f.key}" type="${f.type}" 
                   value="${p[f.key] || ''}" placeholder="${f.placeholder || ''}" 
                   style="padding: 8px; border-radius: 8px; border: 1px solid var(--line); width: 100%;" />`
            }
          </div>
        `).join('')}
      </div>
      ${calcTotal > 0 ? `
        <div style="margin-top: 14px; padding: 10px 14px; background: rgba(134, 75, 18, 0.08); border-radius: 10px;">
          <span class="subtle">Итого по калькулятору:</span>
          <b style="font-size: 16px; margin-left: 8px;">${formatCurrency(calcTotal)}</b>
          <span class="subtle" style="margin-left: 8px;">(${qty} × ${formatCurrency(price)})</span>
        </div>
      ` : ''}
      <div style="margin-top: 14px;">
        <button class="btn primary" id="btnSaveCalc">${icon('save', 14)} Сохранить калькулятор</button>
      </div>
    `;
  }

  // ===== Рендер правой панели =====
  function renderRightPanel() {
    switch (activeTab) {
      case 'chat': return renderChat();
      case 'designs': return renderDesigns();
      case 'estimates': return renderEstimates();
      case 'breakdown': return renderBreakdown();
      case 'notes': return renderNotes();
      case 'deadline': return renderDeadline();
      case 'techTasks': return renderTechTasks();
      default: return renderChat();
    }
  }

  // ----- Чат -----
  function renderChat() {
    return `
      <h3 style="margin-bottom: 10px;">${icon('chat', 16)} Чат по заказу</h3>
      <div id="chatMessages" style="display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto; padding: 8px; border: 1px solid var(--line); border-radius: 10px; margin-bottom: 10px;">
        ${messages.length ? messages.map(m => `
          <div class="chat-message">
            <div style="display: flex; justify-content: space-between;">
              <b style="font-size: 12px;">${escapeHtml(m.User?.fullName || 'Пользователь')}</b>
              <span class="subtle" style="font-size: 11px;">${new Date(m.createdAt).toLocaleString('ru-RU')}</span>
            </div>
            <div style="margin-top: 4px; font-size: 13px;">${escapeHtml(m.text)}</div>
          </div>
        `).join('') : '<div class="subtle" style="text-align: center; padding: 20px;">Сообщений нет</div>'}
      </div>
      <div style="display: flex; gap: 8px;">
        <input id="chatInput" placeholder="Сообщение..." style="flex: 1; padding: 8px; border-radius: 8px; border: 1px solid var(--line);" />
        <button class="btn primary" id="btnSendMsg" style="padding: 8px 14px;">${icon('send', 14)}</button>
      </div>
    `;
  }

  // ----- Макеты -----
  function renderDesigns() {
    return `
      <h3 style="margin-bottom: 10px;">${icon('paperclip', 16)} Макеты</h3>
      <div style="margin-bottom: 10px;">
        <input type="file" id="designFileInput" style="font-size: 12px;" />
        <button class="btn ghost" id="btnUploadDesign" style="margin-top: 6px;">${icon('upload', 12)} Загрузить</button>
      </div>
      ${designs.length ? `
        <div style="display: flex; flex-direction: column; gap: 6px;">
          ${designs.map(d => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border: 1px solid var(--line); border-radius: 8px;">
              <div style="font-size: 12px;">
                <a href="${api.baseUrl.replace('/api', '')}/uploads/${d.fileName}" target="_blank">${escapeHtml(d.fileName)}</a>
              </div>
              <button class="btn ghost btn-del-design" data-id="${d.id}" style="padding: 4px 8px; font-size: 11px;">${icon('close', 12)}</button>
            </div>
          `).join('')}
        </div>
      ` : '<div class="subtle">Макетов нет</div>'}
    `;
  }

  // ----- Сметы -----
  function renderEstimates() {
    const total = estimates.reduce((s, e) => s + (parseFloat(e.extractedAmount) || 0), 0);
    return `
      <h3 style="margin-bottom: 10px;">${icon('dollarSign', 16)} Сметы трат</h3>
      <div style="margin-bottom: 10px;">
        <input type="file" id="estimateFileInput" style="font-size: 12px;" />
        <button class="btn ghost" id="btnUploadEstimate" style="margin-top: 6px;">${icon('upload', 12)} Загрузить</button>
      </div>
      ${estimates.length ? `
        <div style="display: flex; flex-direction: column; gap: 6px;">
          ${estimates.map(e => `
            <div style="padding: 8px; border: 1px solid var(--line); border-radius: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 12px;">${escapeHtml(e.fileName)}</span>
                <button class="btn ghost btn-del-estimate" data-id="${e.id}" style="padding: 4px 8px; font-size: 11px;">${icon('close', 12)}</button>
              </div>
              <div style="margin-top: 6px; display: flex; gap: 6px; align-items: center;">
                <label style="font-size: 11px;">Сумма:</label>
                <input type="number" class="estimate-amount" data-id="${e.id}" 
                  value="${e.extractedAmount || ''}" placeholder="0"
                  style="width: 100px; padding: 4px 6px; border-radius: 6px; border: 1px solid var(--line); font-size: 12px;" />
                <span style="font-size: 11px;">₽</span>
              </div>
            </div>
          `).join('')}
          <div style="margin-top: 6px; padding: 8px; background: rgba(134, 75, 18, 0.08); border-radius: 8px;">
            <span class="subtle">Итого по сметам:</span> <b>${formatCurrency(total)}</b>
          </div>
        </div>
      ` : '<div class="subtle">Смет нет</div>'}
    `;
  }

  // ----- Разбивка по производствам -----
  function renderBreakdown() {
    const total = getTotalCost();
    return `
      <h3 style="margin-bottom: 10px;">${icon('factory', 16)} Разбивка по производствам</h3>
      ${breakdown.length ? `
        <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px;">
          ${breakdown.map(b => `
            <div style="padding: 8px; border: 1px solid var(--line); border-radius: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <b style="font-size: 12px;">${escapeHtml(b.ProductionCompany?.name || 'Неизвестно')}</b>
                <button class="btn ghost btn-del-breakdown" data-id="${b.id}" style="padding: 4px 8px; font-size: 11px;">${icon('close', 12)}</button>
              </div>
              <div style="margin-top: 6px; display: flex; gap: 6px; align-items: center;">
                <label style="font-size: 11px;">Сумма:</label>
                <input type="number" class="breakdown-amount" data-id="${b.id}" 
                  value="${b.amount || ''}" placeholder="0" 
                  style="width: 100px; padding: 4px 6px; border-radius: 6px; border: 1px solid var(--line); font-size: 12px;" />
                <span style="font-size: 11px;">₽</span>
              </div>
            </div>
          `).join('')}
        </div>
        <div id="breakdownTotal" style="padding: 8px; background: rgba(134, 75, 18, 0.08); border-radius: 8px; margin-bottom: 10px;">
          <span class="subtle">Общая себестоимость:</span> <b>${formatCurrency(total)}</b>
        </div>
      ` : '<div class="subtle" style="margin-bottom: 10px;">Производств не добавлено</div>'}
      <div style="display: flex; gap: 6px; align-items: center;">
        <select id="addBreakdownProd" style="flex: 1; padding: 6px; border-radius: 8px; border: 1px solid var(--line); font-size: 12px;">
          <option value="">Выберите производство...</option>
          ${productions.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}
        </select>
        <button class="btn ghost" id="btnAddBreakdown" style="white-space: nowrap; font-size: 12px;">+ Добавить</button>
      </div>
    `;
  }

  // ----- Заметки -----
  function renderNotes() {
    return `
      <h3 style="margin-bottom: 10px;">${icon('notes', 16)} Заметки</h3>
      <textarea id="orderNotes" style="width: 100%; min-height: 280px; padding: 10px; border-radius: 10px; border: 1px solid var(--line); font-size: 13px; resize: vertical;">${escapeHtml(order.notes || '')}</textarea>
      <button class="btn primary" id="btnSaveNotes" style="margin-top: 8px;">${icon('save', 14)} Сохранить</button>
    `;
  }

  // ----- Срок исполнения -----
  function renderDeadline() {
    return `
      <h3 style="margin-bottom: 10px;">${icon('calendar', 16)} Срок исполнения</h3>
      <div class="field">
        <label>Дата сдачи</label>
        <input type="date" id="orderDeadline" value="${order.deadline ? order.deadline.substring(0, 10) : ''}" 
          style="padding: 10px; border-radius: 8px; border: 1px solid var(--line); width: 100%;" />
      </div>
      ${order.deadline ? `
        <div style="margin-top: 12px; padding: 10px; background: rgba(134, 75, 18, 0.08); border-radius: 8px;">
          <span class="subtle">До сдачи:</span>
          <b>${getDaysUntil(order.deadline)}</b>
        </div>
      ` : ''}
      <button class="btn primary" id="btnSaveDeadline" style="margin-top: 8px;">${icon('save', 14)} Сохранить</button>
    `;
  }

  function getDaysUntil(dateStr) {
    const target = new Date(dateStr);
    const now = new Date();
    const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    if (diff < 0) return `Просрочено на ${Math.abs(diff)} дн.`;
    if (diff === 0) return 'Сегодня!';
    return `${diff} дн.`;
  }

  // ----- ТЗ по производствам -----
  function renderTechTasks() {
    return `
      <h3 style="margin-bottom: 10px;">${icon('clipboard', 16)} ТЗ по производствам</h3>
      ${breakdown.length ? `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${breakdown.map(b => `
            <div style="padding: 8px; border: 1px solid var(--line); border-radius: 8px;">
              <label style="font-size: 12px; font-weight: bold;">${escapeHtml(b.ProductionCompany?.name || 'Без названия')}</label>
              <textarea class="tech-task-field" data-id="${b.id}" 
                style="width: 100%; min-height: 80px; margin-top: 6px; padding: 8px; border-radius: 8px; border: 1px solid var(--line); font-size: 12px; resize: vertical;"
              >${escapeHtml(b.techTask || '')}</textarea>
            </div>
          `).join('')}
        </div>
        <button class="btn primary" id="btnSaveTechTasks" style="margin-top: 8px;">${icon('save', 14)} Сохранить ТЗ</button>
      ` : '<div class="subtle">Сначала добавьте производства в разбивке</div>'}
    `;
  }

  // ===== Привязка событий =====
  function bindEvents(container, orderId) {
    // Назад
    container.querySelector('#backToOrders').addEventListener('click', () => {
      window.appModule.goToPage('orders');
    });

    // Взять заказ
    container.querySelector('#btnTakeOrder')?.addEventListener('click', async () => {
      try {
        await api.postRequest(`/orders/${orderId}/take`);
        showToast('Вы взяли заказ');
        render(container, orderId);
      } catch (err) { showToast(err.message || 'Ошибка'); }
    });

    // Снять с себя
    container.querySelector('#btnReleaseOrder')?.addEventListener('click', async () => {
      try {
        await api.postRequest(`/orders/${orderId}/release`);
        showToast('Заказ освобождён');
        render(container, orderId);
      } catch (err) { showToast(err.message || 'Ошибка'); }
    });

    // Сохранить основные данные
    container.querySelector('#btnSaveOrder').addEventListener('click', async () => {
      try {
        await api.putRequest(`/orders/${orderId}`, {
          status: container.querySelector('#orderStatus').value,
          paymentStatus: container.querySelector('#paymentStatus').value,
        });
        showToast('Заказ сохранён');
      } catch { showToast('Ошибка сохранения'); }
    });

    // Маржа
    container.querySelector('#btnMargin').addEventListener('click', () => {
      showMarginModal(orderId, container);
    });

    // Вкладки калькуляторов — автосохранение при переключении
    container.querySelectorAll('.calc-tab').forEach(btn => {
      btn.addEventListener('click', async () => {
        activeCalcType = btn.dataset.type;
        render(container, orderId);
      });
    });

    // Сохранить калькулятор
    container.querySelector('#btnSaveCalc')?.addEventListener('click', async () => {
      const params = {};
      container.querySelectorAll('.calc-field').forEach(el => {
        params[el.dataset.key] = el.value;
      });
      try {
        await api.postRequest(`/orders/${orderId}/calculators`, { type: activeCalcType, params });
        await loadCalculators(orderId);
        showToast('Калькулятор сохранён');
      } catch { showToast('Ошибка сохранения калькулятора'); }
    });

    // Вкладки правой панели
    container.querySelectorAll('.panel-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        container.querySelector('#rightPanel').innerHTML = renderRightPanel();
        // Перепривязать кнопки
        container.querySelectorAll('.panel-tab').forEach(b => b.classList.remove('primary'));
        container.querySelectorAll('.panel-tab').forEach(b => b.classList.add('ghost'));
        btn.classList.remove('ghost');
        btn.classList.add('primary');
        bindRightPanelEvents(container, orderId);
      });
    });

    // Скачать КП — автоматически создаёт документ и сохраняет
    container.querySelector('#btnDownloadKP').addEventListener('click', async () => {
      try {
        const res = await api.getRequest(`/documents/generate/${order.id}`);
        if (!res.success) { showToast('Ошибка получения данных заказа'); return; }
        const d = res.data;
        const docNumber = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}${String(new Date().getDate()).padStart(2,'0')}-${Math.floor(Math.random()*900+100)}`;
        const co = d.company || {};
        const items = (d.items || []).map(i => ({ ...i, discount: 0 }));
        const total = items.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);

        const content = JSON.stringify({
          docType: 'КП', docNumber,
          clientName: d.client?.name || '',
          clientInn: '', clientKpp: '', clientAddr: '', clientContact: '',
          company: co, items, basis: d.order.title,
          ndsMode: 'none',
          paymentTerms: d.order.paymentStatus === 'paid' ? '100% предоплата' :
            d.order.paymentStatus === '50%' ? '50% предоплата' : 'Постоплата',
          deliveryTerms: d.order.deadline ? 'до ' + new Date(d.order.deadline).toLocaleDateString('ru-RU') : '3 рабочих дня',
          orderId: order.id, orderTitle: d.order.title,
          date: new Date().toISOString().substring(0, 10),
          note: '',
        });

        const title = `КП №${docNumber} — ${d.client?.name || 'без клиента'}`;
        await api.postRequest('/documents', {
          type: 'КП', title, content, items,
          orderId: order.id,
          clientId: d.client?.id || undefined,
        });
        showToast('КП создано и сохранено!');
        window.appModule.goToPage('documents');
      } catch (e) {
        showToast('Ошибка: ' + e.message);
      }
    });

    // Привязка событий правой панели
    bindRightPanelEvents(container, orderId);
  }

  function bindRightPanelEvents(container, orderId) {
    // ----- Чат -----
    container.querySelector('#btnSendMsg')?.addEventListener('click', async () => {
      const input = container.querySelector('#chatInput');
      const text = input?.value.trim();
      if (!text) return;
      try {
        await api.postRequest(`/orders/${orderId}/messages`, { text });
        input.value = '';
        await loadMessages(orderId);
        container.querySelector('#rightPanel').innerHTML = renderRightPanel();
        bindRightPanelEvents(container, orderId);
        // Прокрутить чат вниз
        const chatEl = container.querySelector('#chatMessages');
        if (chatEl) chatEl.scrollTop = chatEl.scrollHeight;
      } catch { showToast('Ошибка отправки'); }
    });

    container.querySelector('#chatInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') container.querySelector('#btnSendMsg')?.click();
    });

    // ----- Загрузка макетов -----
    container.querySelector('#btnUploadDesign')?.addEventListener('click', async () => {
      const fileInput = container.querySelector('#designFileInput');
      if (!fileInput?.files?.length) { showToast('Выберите файл'); return; }
      const formData = new FormData();
      formData.append('file', fileInput.files[0]);
      formData.append('orderId', orderId);
      formData.append('type', 'design');
      try {
        await api.uploadFile(formData);
        await loadDesigns(orderId);
        container.querySelector('#rightPanel').innerHTML = renderRightPanel();
        bindRightPanelEvents(container, orderId);
        showToast('Макет загружен');
      } catch { showToast('Ошибка загрузки'); }
    });

    // Удаление макетов
    container.querySelectorAll('.btn-del-design').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await api.deleteRequest(`/orders/${orderId}/designs/${btn.dataset.id}`);
          await loadDesigns(orderId);
          container.querySelector('#rightPanel').innerHTML = renderRightPanel();
          bindRightPanelEvents(container, orderId);
          showToast('Макет удалён');
        } catch { showToast('Ошибка удаления'); }
      });
    });

    // ----- Загрузка смет -----
    container.querySelector('#btnUploadEstimate')?.addEventListener('click', async () => {
      const fileInput = container.querySelector('#estimateFileInput');
      if (!fileInput?.files?.length) { showToast('Выберите файл'); return; }
      const formData = new FormData();
      formData.append('file', fileInput.files[0]);
      formData.append('orderId', orderId);
      formData.append('type', 'estimate');
      try {
        await api.uploadFile(formData);
        await loadEstimates(orderId);
        container.querySelector('#rightPanel').innerHTML = renderRightPanel();
        bindRightPanelEvents(container, orderId);
        showToast('Смета загружена');
      } catch { showToast('Ошибка загрузки'); }
    });

    // Удаление смет
    container.querySelectorAll('.btn-del-estimate').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await api.deleteRequest(`/orders/${orderId}/estimates/${btn.dataset.id}`);
          await loadEstimates(orderId);
          container.querySelector('#rightPanel').innerHTML = renderRightPanel();
          bindRightPanelEvents(container, orderId);
          showToast('Смета удалена');
        } catch { showToast('Ошибка удаления'); }
      });
    });

    // Обновление суммы сметы
    container.querySelectorAll('.estimate-amount').forEach(input => {
      input.addEventListener('change', async () => {
        try {
          await api.putRequest(`/orders/${orderId}/estimates/${input.dataset.id}`, {
            extractedAmount: parseFloat(input.value) || 0,
          });
          await loadEstimates(orderId);
          showToast('Сумма обновлена');
        } catch { showToast('Ошибка обновления'); }
      });
    });

    // ----- Разбивка -----
    container.querySelector('#btnAddBreakdown')?.addEventListener('click', async () => {
      const select = container.querySelector('#addBreakdownProd');
      const prodId = select?.value;
      if (!prodId) { showToast('Выберите производство'); return; }
      try {
        await api.postRequest(`/orders/${orderId}/breakdown`, { productionId: parseInt(prodId) });
        await loadBreakdown(orderId);
        container.querySelector('#rightPanel').innerHTML = renderRightPanel();
        bindRightPanelEvents(container, orderId);
        showToast('Производство добавлено');
      } catch { showToast('Ошибка добавления'); }
    });

    container.querySelectorAll('.btn-del-breakdown').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await api.deleteRequest(`/orders/${orderId}/breakdown/${btn.dataset.id}`);
          await loadBreakdown(orderId);
          container.querySelector('#rightPanel').innerHTML = renderRightPanel();
          bindRightPanelEvents(container, orderId);
          // Обновить нижний блок (себестоимость)
          render(container, orderId);
          showToast('Запись удалена');
        } catch { showToast('Ошибка удаления'); }
      });
    });

    container.querySelectorAll('.breakdown-amount').forEach(input => {
      // Сохранение на blur и Enter
      const saveAmount = async () => {
        try {
          await api.putRequest(`/orders/${orderId}/breakdown/${input.dataset.id}`, {
            amount: parseFloat(input.value) || 0,
          });
          const item = breakdown.find(b => b.id == input.dataset.id);
          if (item) item.amount = parseFloat(input.value) || 0;
          showToast('Сумма обновлена');
        } catch { showToast('Ошибка обновления'); }
      };
      input.addEventListener('change', saveAmount);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); saveAmount(); }
      });
      // Обновление итогов в реальном времени при вводе
      input.addEventListener('input', () => {
        const item = breakdown.find(b => b.id == input.dataset.id);
        if (item) item.amount = parseFloat(input.value) || 0;
        const total = getTotalCost();
        const margin = order.marginPercent || 20;
        const clientPrice = total * (1 + margin / 100);
        // Обновить итог в правой панели
        const panelTotal = container.querySelector('#breakdownTotal');
        if (panelTotal) panelTotal.innerHTML = `<span class="subtle">Общая себестоимость:</span> <b>${formatCurrency(total)}</b>`;
        // Обновить нижний блок
        const bottomCost = container.querySelector('#bottomCost');
        if (bottomCost) bottomCost.innerHTML = formatCurrency(total);
        const bottomClient = container.querySelector('#bottomClientPrice');
        if (bottomClient) bottomClient.innerHTML = formatCurrency(clientPrice);
      });
    });

    // ----- Заметки -----
    container.querySelector('#btnSaveNotes')?.addEventListener('click', async () => {
      const notes = container.querySelector('#orderNotes')?.value || '';
      try {
        await api.putRequest(`/orders/${orderId}`, { notes });
        order.notes = notes;
        showToast('Заметки сохранены');
      } catch { showToast('Ошибка сохранения'); }
    });

    // ----- Срок -----
    container.querySelector('#btnSaveDeadline')?.addEventListener('click', async () => {
      const deadline = container.querySelector('#orderDeadline')?.value || null;
      try {
        await api.putRequest(`/orders/${orderId}`, { deadline });
        order.deadline = deadline;
        showToast('Срок сохранён');
      } catch { showToast('Ошибка сохранения'); }
    });

    // ----- ТЗ -----
    container.querySelector('#btnSaveTechTasks')?.addEventListener('click', async () => {
      const fields = container.querySelectorAll('.tech-task-field');
      try {
        for (const field of fields) {
          await api.putRequest(`/orders/${orderId}/breakdown/${field.dataset.id}`, {
            techTask: field.value,
          });
        }
        await loadBreakdown(orderId);
        showToast('ТЗ сохранены');
      } catch { showToast('Ошибка сохранения ТЗ'); }
    });
  }

  // ===== Модальное окно маржи =====
  function showMarginModal(orderId, container) {
    const backdrop = document.getElementById('modalBackdrop');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');

    title.textContent = 'Настройка маржи';
    const currentMargin = order.marginPercent || 20;
    const totalCost = getTotalCost();
    const clientPrice = totalCost * (1 + currentMargin / 100);

    body.innerHTML = `
      <div class="field">
        <label>Процент маржи (%)</label>
        <input id="marginInput" type="number" value="${currentMargin}" min="0" max="500" step="1" 
          style="padding: 10px; border-radius: 8px; border: 1px solid var(--line); width: 100%;" />
      </div>
      <div style="margin-top: 12px; padding: 10px; background: rgba(134, 75, 18, 0.08); border-radius: 8px;" id="marginPreview">
        <div>Себестоимость: <b>${formatCurrency(totalCost)}</b></div>
        <div style="margin-top: 4px;">Маржа: <b>${currentMargin}%</b></div>
        <div style="margin-top: 4px;">Цена клиенту: <b style="color: var(--copper);">${formatCurrency(clientPrice)}</b></div>
      </div>
      <div class="row" style="margin-top: 12px; gap: 10px;">
        <button class="btn primary" id="btnSaveMargin">Сохранить</button>
        <button class="btn ghost" id="btnCancelMargin">Отмена</button>
      </div>
    `;

    backdrop.style.display = 'flex';

    // Живой пересчёт
    document.getElementById('marginInput').addEventListener('input', () => {
      const m = parseFloat(document.getElementById('marginInput').value) || 0;
      const cp = totalCost * (1 + m / 100);
      document.getElementById('marginPreview').innerHTML = `
        <div>Себестоимость: <b>${formatCurrency(totalCost)}</b></div>
        <div style="margin-top: 4px;">Маржа: <b>${m}%</b></div>
        <div style="margin-top: 4px;">Цена клиенту: <b style="color: var(--copper);">${formatCurrency(cp)}</b></div>
      `;
    });

    document.getElementById('btnSaveMargin').addEventListener('click', async () => {
      const marginPercent = parseInt(document.getElementById('marginInput').value) || 20;
      try {
        await api.putRequest(`/orders/${orderId}`, { marginPercent });
        order.marginPercent = marginPercent;
        backdrop.style.display = 'none';
        showToast('Маржа сохранена');
        render(container, orderId);
      } catch { showToast('Ошибка сохранения'); }
    });

    document.getElementById('btnCancelMargin').addEventListener('click', () => {
      backdrop.style.display = 'none';
    });
  }

  return { render };
})();

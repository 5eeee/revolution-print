const documentCreatePage = (() => {
  let docType = 'КП';
  let company = {};
  let clientName = '';
  let clientInn = '';
  let clientKpp = '';
  let clientAddr = '';
  let clientContact = '';
  let items = [];
  let orderId = null;
  let clientId = null;
  let orderTitle = '';
  let deadline = '';
  let paymentTerms = '100% предоплата';
  let deliveryTerms = '3 рабочих дня';
  let docNumber = '';
  let docDate = new Date().toISOString().substring(0, 10);
  let docNote = '';
  let basis = '';
  let ndsMode = 'none'; // none | included | separate
  let previewVisible = false;

  function genDocNumber() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 900 + 100)}`;
  }

  function calcItemTotal(item) {
    const base = (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
    const disc = parseFloat(item.discount) || 0;
    return base * (1 - disc / 100);
  }

  function getItemsTotal() {
    return items.reduce((s, i) => s + calcItemTotal(i), 0);
  }

  function getNdsLabel() {
    if (ndsMode === 'none') return 'Без НДС';
    return 'Вкл. НДС';
  }

  // ===== Загрузка данных из заказа =====
  async function loadFromOrder(oid) {
    try {
      const res = await api.getRequest(`/documents/generate/${oid}`);
      if (!res.success) return;
      const d = res.data;
      orderId = oid;
      orderTitle = d.order.title;
      clientName = d.client?.name || '';
      clientId = d.client?.id || null;
      deadline = d.order.deadline ? new Date(d.order.deadline).toLocaleDateString('ru-RU') : '';
      basis = orderTitle;
      items = d.items.length
        ? d.items.map(i => ({ ...i, discount: 0 }))
        : [{ num: 1, name: '', unit: 'шт', quantity: 1, price: 0, discount: 0 }];
      company = d.company || {};

      if (d.order.paymentStatus === 'paid') paymentTerms = '100% предоплата';
      else if (d.order.paymentStatus === '50%') paymentTerms = '50% предоплата, 50% по готовности';
      else paymentTerms = 'Постоплата по факту выполнения';

      if (deadline) deliveryTerms = `до ${deadline}`;
    } catch (e) {
      console.error('Ошибка загрузки данных заказа:', e);
    }
  }

  // ===== Загрузка настроек компании =====
  async function loadSettings() {
    try {
      const res = await api.getRequest('/admin/settings');
      if (res.success) company = res.data;
    } catch { /* используем дефолты */ }
  }

  // ===== Главный рендер =====
  async function render(container, params) {
    docNumber = genDocNumber();
    docDate = new Date().toISOString().substring(0, 10);
    items = [{ num: 1, name: '', unit: 'шт', quantity: 1, price: 0, discount: 0 }];

    if (params?.orderId) {
      await loadFromOrder(params.orderId);
    } else {
      await loadSettings();
    }

    renderPage(container);
  }

  function renderPage(container) {
    const total = getItemsTotal();

    container.innerHTML = `
      <div class="grid" style="margin-bottom: 0;">
        <div class="card" style="grid-column: span 12; padding: 16px 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div>
              <h2>Создание документа</h2>
              ${orderId ? `<span class="subtle">По заказу: ${escapeHtml(orderTitle)} #${orderId}</span>` : ''}
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn ${previewVisible ? 'ghost' : 'primary'}" id="btnEditMode">${icon('edit', 14)} Редактирование</button>
              <button class="btn ${previewVisible ? 'primary' : 'ghost'}" id="btnPreviewMode">${icon('eye', 14)} Предпросмотр</button>
            </div>
          </div>
        </div>
      </div>

      ${previewVisible ? renderPreview(total) : renderEditor(total)}
    `;

    bindEvents(container);
  }

  // ===== Редактор =====
  function renderEditor(total) {
    const inp = 'padding: 8px; border-radius: 8px; border: 1px solid var(--line); width: 100%;';
    return `
      <div class="grid">
        <div style="grid-column: span 8; display: flex; flex-direction: column; gap: 14px;">

          <!-- Тип, номер, дата -->
          <div class="card" style="padding: 16px;">
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
              <div class="field" style="flex: 1; min-width: 150px;">
                <label>Тип документа</label>
                <select id="docType" style="${inp}">
                  ${['КП', 'Смета', 'Акт'].map(t =>
                    `<option ${docType === t ? 'selected' : ''}>${t}</option>`
                  ).join('')}
                </select>
              </div>
              <div class="field" style="flex: 1; min-width: 150px;">
                <label>Номер</label>
                <input id="docNumber" value="${escapeHtml(docNumber)}" style="${inp}" />
              </div>
              <div class="field" style="flex: 1; min-width: 150px;">
                <label>Дата</label>
                <input id="docDate" type="date" value="${docDate}" style="${inp}" />
              </div>
              <div class="field" style="flex: 1; min-width: 150px;">
                <label>НДС</label>
                <select id="ndsMode" style="${inp}">
                  <option value="none" ${ndsMode === 'none' ? 'selected' : ''}>Без НДС</option>
                  <option value="included" ${ndsMode === 'included' ? 'selected' : ''}>НДС включён</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Получатель и Плательщик -->
          <div class="card" style="padding: 16px;">
            <div style="display: flex; gap: 16px; flex-wrap: wrap;">
              <div style="flex: 1; min-width: 250px;">
                <h3 style="margin-bottom: 8px;">Получатель (Исполнитель)</h3>
                <div class="field"><label>Компания</label>
                  <input id="compName" value="${escapeHtml(company.companyName || '')}" style="${inp}" /></div>
                <div class="field" style="margin-top: 6px;"><label>ИНН</label>
                  <input id="compInn" value="${escapeHtml(company.inn || '')}" style="${inp}" /></div>
                <div class="field" style="margin-top: 6px;"><label>КПП</label>
                  <input id="compKpp" value="${escapeHtml(company.kpp || '')}" style="${inp}" /></div>
                <div class="field" style="margin-top: 6px;"><label>Адрес</label>
                  <input id="compAddr" value="${escapeHtml(company.address || '')}" style="${inp}" /></div>
                <div class="field" style="margin-top: 6px;"><label>Телефон</label>
                  <input id="compPhone" value="${escapeHtml(company.phone || '')}" style="${inp}" /></div>
                <div class="field" style="margin-top: 6px;"><label>Email</label>
                  <input id="compEmail" value="${escapeHtml(company.email || '')}" style="${inp}" /></div>
              </div>
              <div style="flex: 1; min-width: 250px;">
                <h3 style="margin-bottom: 8px;">Плательщик (Заказчик)</h3>
                <div class="field"><label>Компания / ФИО</label>
                  <input id="clientName" value="${escapeHtml(clientName)}" placeholder="ООО Ромашка" style="${inp}" /></div>
                <div class="field" style="margin-top: 6px;"><label>ИНН</label>
                  <input id="clientInn" value="${escapeHtml(clientInn)}" placeholder="1234567890" style="${inp}" /></div>
                <div class="field" style="margin-top: 6px;"><label>КПП</label>
                  <input id="clientKpp" value="${escapeHtml(clientKpp)}" style="${inp}" /></div>
                <div class="field" style="margin-top: 6px;"><label>Адрес</label>
                  <input id="clientAddr" value="${escapeHtml(clientAddr)}" style="${inp}" /></div>
                <div class="field" style="margin-top: 6px;"><label>Контакт</label>
                  <input id="clientContact" value="${escapeHtml(clientContact)}" placeholder="Тел, email" style="${inp}" /></div>
              </div>
            </div>
          </div>

          <!-- Основание -->
          <div class="card" style="padding: 16px;">
            <div class="field"><label>Основание</label>
              <input id="basis" value="${escapeHtml(basis)}" placeholder="Услуги по печати..." style="${inp}" /></div>
          </div>

          <!-- Таблица позиций -->
          <div class="card" style="padding: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <h3>Позиции</h3>
              <button class="btn ghost" id="btnAddItem" style="font-size: 12px;">+ Добавить</button>
            </div>
            <div style="overflow-x: auto;">
            <table class="table" style="font-size: 12px;">
              <thead>
                <tr>
                  <th style="width: 30px;">№</th>
                  <th>Наименование</th>
                  <th style="width: 70px;">Кол-во</th>
                  <th style="width: 65px;">Ед.</th>
                  <th style="width: 90px;">Цена, ₽</th>
                  <th style="width: 55px;">% скид.</th>
                  <th style="width: 80px;">НДС</th>
                  <th style="width: 100px;">Сумма, ₽</th>
                  <th style="width: 30px;"></th>
                </tr>
              </thead>
              <tbody>
                ${items.map((item, idx) => {
                  const t = calcItemTotal(item);
                  return `
                  <tr>
                    <td style="text-align: center;">${idx + 1}</td>
                    <td><input class="item-name" data-idx="${idx}" value="${escapeHtml(item.name)}"
                      style="width: 100%; padding: 6px; border: 1px solid var(--line); border-radius: 6px; font-size: 12px;" /></td>
                    <td><input class="item-qty" data-idx="${idx}" type="number" value="${item.quantity}"
                      style="width: 100%; padding: 6px; border: 1px solid var(--line); border-radius: 6px; font-size: 12px;" /></td>
                    <td><input class="item-unit" data-idx="${idx}" value="${escapeHtml(item.unit || 'шт')}"
                      style="width: 100%; padding: 6px; border: 1px solid var(--line); border-radius: 6px; font-size: 12px;" /></td>
                    <td><input class="item-price" data-idx="${idx}" type="number" value="${item.price}"
                      style="width: 100%; padding: 6px; border: 1px solid var(--line); border-radius: 6px; font-size: 12px;" /></td>
                    <td><input class="item-disc" data-idx="${idx}" type="number" value="${item.discount || 0}"
                      style="width: 100%; padding: 6px; border: 1px solid var(--line); border-radius: 6px; font-size: 12px;" /></td>
                    <td class="item-nds" style="text-align: center; font-size: 11px;">${getNdsLabel()}</td>
                    <td class="item-total" data-idx="${idx}" style="text-align: right; font-weight: bold;">${formatCurrency(t)}</td>
                    <td><button class="btn ghost btn-del-item" data-idx="${idx}" style="padding: 2px 6px; font-size: 11px;">${icon('close', 12)}</button></td>
                  </tr>`;
                }).join('')}
              </tbody>
              <tfoot>
                <tr style="font-weight: bold;">
                  <td colspan="7" style="text-align: right;">ИТОГО:</td>
                  <td style="text-align: right;">${formatCurrency(total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
            </div>
          </div>

          <!-- Условия -->
          <div class="card" style="padding: 16px;">
            <h3 style="margin-bottom: 10px;">Условия</h3>
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
              <div class="field" style="flex: 1; min-width: 200px;">
                <label>Условия оплаты</label>
                <input id="paymentTerms" value="${escapeHtml(paymentTerms)}" style="${inp}" />
              </div>
              <div class="field" style="flex: 1; min-width: 200px;">
                <label>Сроки выполнения</label>
                <input id="deliveryTerms" value="${escapeHtml(deliveryTerms)}" style="${inp}" />
              </div>
            </div>
            <div class="field" style="margin-top: 10px;">
              <label>Примечание</label>
              <textarea id="docNote" style="padding: 8px; border-radius: 8px; border: 1px solid var(--line); width: 100%; min-height: 60px; font-size: 13px;">${escapeHtml(docNote)}</textarea>
            </div>
          </div>
        </div>

        <!-- Правая колонка -->
        <div style="grid-column: span 4; display: flex; flex-direction: column; gap: 14px;">
          <div class="card" style="padding: 16px;">
            <h3 style="margin-bottom: 10px;">Итого</h3>
            <div style="font-size: 24px; font-weight: bold; color: var(--copper);">${formatCurrency(total)}</div>
            <div class="subtle" style="margin-top: 4px;">${items.length} позиц. · ${getNdsLabel()}</div>
          </div>

          <div class="card" style="padding: 16px;">
            <h3 style="margin-bottom: 10px;">Действия</h3>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <button class="btn primary" id="btnSaveDoc" style="width: 100%;">${icon('save', 14)} Сохранить документ</button>
              <button class="btn ghost" id="btnPrintDoc" style="width: 100%;">${icon('printer', 14)} Печать / PDF</button>
              ${orderId ? `<button class="btn ghost" id="btnBackToOrder" style="width: 100%;">← К заказу #${orderId}</button>` : ''}
            </div>
          </div>

          <div class="card" style="padding: 16px;">
            <h3 style="margin-bottom: 10px;">Банковские реквизиты</h3>
            <div class="field" style="margin-top: 4px;"><label>Банк</label>
              <input id="bankName" value="${escapeHtml(company.bankName || '')}" placeholder='ООО "Банк Точка"' style="${inp}" /></div>
            <div class="field" style="margin-top: 6px;"><label>БИК</label>
              <input id="bik" value="${escapeHtml(company.bik || '')}" style="${inp}" /></div>
            <div class="field" style="margin-top: 6px;"><label>Кор. Счёт</label>
              <input id="corrAccount" value="${escapeHtml(company.corrAccount || '')}" style="${inp}" /></div>
            <div class="field" style="margin-top: 6px;"><label>Расч. Счёт</label>
              <input id="accountNumber" value="${escapeHtml(company.accountNumber || '')}" style="${inp}" /></div>
          </div>

          <div class="card" style="padding: 16px;">
            <h3 style="margin-bottom: 10px;">Подписант</h3>
            <div class="field"><label>ФИО подписанта</label>
              <input id="signerName" value="${escapeHtml(company.signerName || '')}" style="${inp}" /></div>
            <div class="field" style="margin-top: 6px;"><label>Должность</label>
              <input id="signerTitle" value="${escapeHtml(company.signerTitle || '')}" placeholder="Генеральный директор" style="${inp}" /></div>
          </div>
        </div>
      </div>
    `;
  }

  // ===== Предпросмотр (Счёт / КП) =====
  function renderPreview(total) {
    const dateStr = docDate
      ? new Date(docDate).toLocaleDateString('ru-RU')
      : new Date().toLocaleDateString('ru-RU');

    return `
      <div class="grid">
        <div style="grid-column: span 12;">
          <div id="printArea" style="background: #fff; padding: 40px; border-radius: 12px; box-shadow: var(--shadow); font-family: 'Times New Roman', serif; color: #000; font-size: 13px; line-height: 1.5;">
            ${buildInvoiceHtml(total, dateStr)}
          </div>
        </div>
      </div>
    `;
  }

  // ===== HTML-шаблон Счёта =====
  function buildInvoiceHtml(total, dateStr) {
    const companyName = company.companyName || '';
    const ndsText = getNdsLabel();
    const docTypeTitles = { 'КП': 'Счёт', 'Смета': 'Смета', 'Акт': 'Акт выполненных работ' };
    const docTitle = docTypeTitles[docType] || docType;

    const innCompany = company.inn || '';
    const signerLine = company.signerName
      ? `${(company.signerTitle || '').toUpperCase()}<br/>${company.signerName.toUpperCase()}`
      : companyName;

    return `
      <!-- Верхний блок: название компании + сумма -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:0;">
        <tr style="background:#2d2d2d;color:#fff;">
          <td style="padding:10px 14px;font-size:15px;font-weight:bold;">${escapeHtml(companyName)}</td>
          <td style="padding:10px 14px;text-align:right;font-size:18px;font-weight:bold;">${formatNumber(total)} ₽</td>
        </tr>
        <tr style="background:#2d2d2d;color:#aaa;font-size:11px;">
          <td style="padding:2px 14px 8px;">Получатель</td>
          <td style="padding:2px 14px 8px;text-align:right;">${ndsText}</td>
        </tr>
      </table>

      <!-- Банковские реквизиты -->
      <table style="width:100%;border-collapse:collapse;border:1px solid #000;">
        <tr>
          <td style="border:1px solid #000;padding:6px 10px;width:50%;font-size:12px;">
            ${escapeHtml(company.bankName || '')}<br/>
            <span style="font-size:10px;color:#666;">Банк получателя</span>
          </td>
          <td style="border:1px solid #000;padding:6px 10px;font-size:12px;">
            <b>БИК</b> ${escapeHtml(company.bik || '')}<br/>
            <b>Кор. Счёт</b> ${escapeHtml(company.corrAccount || '')}
          </td>
        </tr>
        <tr>
          <td style="border:1px solid #000;padding:6px 10px;font-size:12px;" rowspan="2">
            ИНН ${escapeHtml(innCompany)}${company.kpp ? ' / КПП ' + escapeHtml(company.kpp) : ''}<br/>
            ${escapeHtml(companyName)}<br/>
            <span style="font-size:10px;color:#666;">Получатель</span>
          </td>
          <td style="border:1px solid #000;padding:6px 10px;font-size:12px;">
            <b>Счёт</b> ${escapeHtml(company.accountNumber || '')}
          </td>
        </tr>
      </table>

      <!-- Заголовок документа -->
      <h2 style="text-align:center;margin:24px 0 16px;font-size:18px;">
        ${docTitle} №${escapeHtml(docNumber)} от ${dateStr}
      </h2>

      <!-- Получатель / Плательщик -->
      <table style="width:100%;border:none;margin-bottom:16px;font-size:13px;">
        <tr>
          <td style="padding:4px 0;width:120px;vertical-align:top;"><b>Получатель:</b></td>
          <td style="padding:4px 0;border-bottom:1px solid #000;">
            ${escapeHtml(companyName)}${innCompany ? ', ИНН ' + escapeHtml(innCompany) : ''}${company.kpp ? ', КПП ' + escapeHtml(company.kpp) : ''}${company.address ? ', ' + escapeHtml(company.address) : ''}
          </td>
        </tr>
        <tr>
          <td style="padding:4px 0;vertical-align:top;"><b>Плательщик:</b></td>
          <td style="padding:4px 0;border-bottom:1px solid #000;">
            ${escapeHtml(clientName || '—')}${clientInn ? ', ИНН ' + escapeHtml(clientInn) : ''}${clientKpp ? ', КПП ' + escapeHtml(clientKpp) : ''}${clientAddr ? ', ' + escapeHtml(clientAddr) : ''}
          </td>
        </tr>
        ${basis ? `<tr>
          <td style="padding:4px 0;vertical-align:top;"><b>Основание:</b></td>
          <td style="padding:4px 0;border-bottom:1px solid #000;">${escapeHtml(basis)}</td>
        </tr>` : ''}
      </table>

      <!-- Таблица позиций -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
        <thead>
          <tr>
            <th style="border:1px solid #000;padding:6px;background:#e8e8e8;text-align:center;width:30px;">№</th>
            <th style="border:1px solid #000;padding:6px;background:#e8e8e8;">Название товара или услуги</th>
            <th style="border:1px solid #000;padding:6px;background:#e8e8e8;text-align:center;width:65px;">Кол-во</th>
            <th style="border:1px solid #000;padding:6px;background:#e8e8e8;text-align:center;width:60px;">Ед. Изм.</th>
            <th style="border:1px solid #000;padding:6px;background:#e8e8e8;text-align:right;width:90px;">Цена</th>
            <th style="border:1px solid #000;padding:6px;background:#e8e8e8;text-align:center;width:45px;">%</th>
            <th style="border:1px solid #000;padding:6px;background:#e8e8e8;text-align:center;width:70px;">НДС</th>
            <th style="border:1px solid #000;padding:6px;background:#e8e8e8;text-align:right;width:100px;">Сумма</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item, idx) => {
            const t = calcItemTotal(item);
            const discVal = parseFloat(item.discount) || 0;
            return `
            <tr>
              <td style="border:1px solid #000;padding:5px;text-align:center;">${idx + 1}</td>
              <td style="border:1px solid #000;padding:5px;">${escapeHtml(item.name)}</td>
              <td style="border:1px solid #000;padding:5px;text-align:center;">${item.quantity}</td>
              <td style="border:1px solid #000;padding:5px;text-align:center;">${escapeHtml(item.unit || 'шт')}</td>
              <td style="border:1px solid #000;padding:5px;text-align:right;">${formatNumber(item.price)} ₽</td>
              <td style="border:1px solid #000;padding:5px;text-align:center;">${discVal ? discVal + '%' : '—'}</td>
              <td style="border:1px solid #000;padding:5px;text-align:center;font-size:11px;">${ndsText}</td>
              <td style="border:1px solid #000;padding:5px;text-align:right;font-weight:bold;">${formatNumber(t)} ₽</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>

      <!-- Итого -->
      <div style="margin-bottom:8px;font-size:13px;">
        Всего ${items.length} ${pluralItems(items.length)} на сумму ${numberToWords(total)}.
      </div>
      <div style="text-align:right;font-size:15px;margin-bottom:4px;">
        <b>Итог к оплате: ${formatNumber(total)} ₽</b>
      </div>
      <div style="text-align:right;font-size:12px;color:#666;margin-bottom:24px;">${ndsText}</div>

      <!-- Подписи -->
      <table style="width:100%;border:none;margin-top:30px;">
        <tr>
          <td style="width:50%;padding:0;">
            <div style="margin-bottom:8px;font-size:12px;">Получатель</div>
            <div style="border-bottom:1px solid #000;height:30px;margin-bottom:4px;display:flex;align-items:flex-end;">
              <span style="font-size:11px;margin-left:4px;"></span>
            </div>
            <div style="font-size:11px;line-height:1.3;">${signerLine}</div>
          </td>
          <td style="width:50%;padding:0 0 0 40px;">
            <div style="margin-bottom:8px;font-size:12px;">Плательщик</div>
            <div style="border-bottom:1px solid #000;height:30px;margin-bottom:4px;display:flex;align-items:flex-end;">
              <span style="font-size:11px;margin-left:4px;"></span>
            </div>
            <div style="font-size:11px;"> </div>
          </td>
        </tr>
      </table>
    `;
  }

  function pluralItems(n) {
    const m = n % 100;
    const n1 = m % 10;
    if (m > 10 && m < 20) return 'наименований';
    if (n1 === 1) return 'наименование';
    if (n1 > 1 && n1 < 5) return 'наименования';
    return 'наименований';
  }

  // ===== Привязка событий =====
  function bindEvents(container) {
    container.querySelector('#btnEditMode')?.addEventListener('click', () => {
      previewVisible = false;
      collectFormData(container);
      renderPage(container);
    });

    container.querySelector('#btnPreviewMode')?.addEventListener('click', () => {
      collectFormData(container);
      previewVisible = true;
      renderPage(container);
    });

    container.querySelector('#docType')?.addEventListener('change', (e) => {
      docType = e.target.value;
    });

    container.querySelector('#ndsMode')?.addEventListener('change', (e) => {
      collectFormData(container);
      ndsMode = e.target.value;
      renderPage(container);
    });

    container.querySelector('#btnAddItem')?.addEventListener('click', () => {
      collectFormData(container);
      items.push({ num: items.length + 1, name: '', unit: 'шт', quantity: 1, price: 0, discount: 0 });
      renderPage(container);
    });

    container.querySelectorAll('.btn-del-item').forEach(btn => {
      btn.addEventListener('click', () => {
        collectFormData(container);
        items.splice(parseInt(btn.dataset.idx), 1);
        renderPage(container);
      });
    });

    container.querySelectorAll('.item-qty, .item-price, .item-disc').forEach(input => {
      input.addEventListener('input', () => {
        const idx = parseInt(input.dataset.idx);
        const row = input.closest('tr');
        const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        const disc = parseFloat(row.querySelector('.item-disc')?.value) || 0;
        const total = qty * price * (1 - disc / 100);
        row.querySelector('.item-total').textContent = formatCurrency(total);
      });
    });

    // Сохранить документ
    container.querySelector('#btnSaveDoc')?.addEventListener('click', async () => {
      collectFormData(container);
      const title = `${docType} №${docNumber} — ${clientName || 'без клиента'}`;
      const content = JSON.stringify({
        docType, docNumber, clientName, clientInn, clientKpp, clientAddr, clientContact,
        company, items, basis, ndsMode,
        paymentTerms, deliveryTerms, orderId, orderTitle,
        date: docDate,
        note: docNote,
      });

      try {
        await api.postRequest('/documents', {
          type: docType,
          title,
          content,
          items,
          orderId: orderId || undefined,
          clientId: clientId || undefined,
        });
        showToast('Документ сохранён!');
        window.appModule.goToPage('documents');
      } catch (e) {
        showToast('Ошибка сохранения: ' + e.message);
      }
    });

    // Печать
    container.querySelector('#btnPrintDoc')?.addEventListener('click', () => {
      collectFormData(container);
      previewVisible = true;
      renderPage(container);
      setTimeout(() => {
        const printArea = document.getElementById('printArea');
        if (!printArea) return;
        const win = window.open('', '_blank');
        win.document.write(`<html><head><title>${escapeHtml(docType)} ${escapeHtml(docNumber)}</title>
          <style>body{font-family:'Times New Roman',serif;color:#000;font-size:13px;line-height:1.5;padding:20px;margin:0;}
          table{border-collapse:collapse;width:100%}
          @media print{body{padding:0}}</style></head>
          <body>${printArea.innerHTML}</body></html>`);
        win.document.close();
        win.focus();
        win.print();
      }, 200);
    });

    container.querySelector('#btnBackToOrder')?.addEventListener('click', () => {
      window.appModule.goToPage('orderDetail', { orderId });
    });
  }

  // ===== Собрать данные из формы =====
  function collectFormData(container) {
    docType = container.querySelector('#docType')?.value || docType;
    docNumber = container.querySelector('#docNumber')?.value || docNumber;
    docDate = container.querySelector('#docDate')?.value || docDate;
    ndsMode = container.querySelector('#ndsMode')?.value || ndsMode;
    clientName = container.querySelector('#clientName')?.value ?? clientName;
    clientInn = container.querySelector('#clientInn')?.value ?? clientInn;
    clientKpp = container.querySelector('#clientKpp')?.value ?? clientKpp;
    clientAddr = container.querySelector('#clientAddr')?.value ?? clientAddr;
    clientContact = container.querySelector('#clientContact')?.value ?? clientContact;
    paymentTerms = container.querySelector('#paymentTerms')?.value || paymentTerms;
    deliveryTerms = container.querySelector('#deliveryTerms')?.value || deliveryTerms;
    docNote = container.querySelector('#docNote')?.value || '';
    basis = container.querySelector('#basis')?.value || '';

    // Компания
    const cn = container.querySelector('#compName')?.value;
    if (cn !== undefined) company.companyName = cn;
    const ci = container.querySelector('#compInn')?.value;
    if (ci !== undefined) company.inn = ci;
    const ck = container.querySelector('#compKpp')?.value;
    if (ck !== undefined) company.kpp = ck;
    const ca = container.querySelector('#compAddr')?.value;
    if (ca !== undefined) company.address = ca;
    const cp = container.querySelector('#compPhone')?.value;
    if (cp !== undefined) company.phone = cp;
    const ce = container.querySelector('#compEmail')?.value;
    if (ce !== undefined) company.email = ce;

    // Банковские реквизиты
    const bn = container.querySelector('#bankName')?.value;
    if (bn !== undefined) company.bankName = bn;
    const bk = container.querySelector('#bik')?.value;
    if (bk !== undefined) company.bik = bk;
    const cr = container.querySelector('#corrAccount')?.value;
    if (cr !== undefined) company.corrAccount = cr;
    const an = container.querySelector('#accountNumber')?.value;
    if (an !== undefined) company.accountNumber = an;
    const sn = container.querySelector('#signerName')?.value;
    if (sn !== undefined) company.signerName = sn;
    const st = container.querySelector('#signerTitle')?.value;
    if (st !== undefined) company.signerTitle = st;

    // Позиции
    container.querySelectorAll('.item-name').forEach((el) => {
      const idx = parseInt(el.dataset.idx);
      if (items[idx]) {
        items[idx].name = el.value;
        items[idx].unit = container.querySelector(`.item-unit[data-idx="${idx}"]`)?.value || 'шт';
        items[idx].quantity = parseFloat(container.querySelector(`.item-qty[data-idx="${idx}"]`)?.value) || 0;
        items[idx].price = parseFloat(container.querySelector(`.item-price[data-idx="${idx}"]`)?.value) || 0;
        items[idx].discount = parseFloat(container.querySelector(`.item-disc[data-idx="${idx}"]`)?.value) || 0;
        items[idx].total = calcItemTotal(items[idx]);
      }
    });
  }

  return { render };
})();

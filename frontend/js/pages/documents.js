const documentsPage = (() => {
  let documents = [];
  let clients = [];
  let filterType = '';
  let filterClientId = '';
  let filterOrderId = '';

  async function loadDocuments() {
    try {
      const response = await api.getRequest('/documents');
      if (response.success) documents = response.data;
    } catch (error) {
      console.error('Ошибка загрузки документов:', error);
    }
  }

  async function loadClients() {
    try {
      const response = await api.getRequest('/clients');
      if (response.success) clients = response.data;
    } catch { /* ignore */ }
  }

  function getFiltered() {
    return documents.filter(d => {
      if (filterType && d.type !== filterType) return false;
      if (filterClientId && d.clientId != filterClientId) return false;
      if (filterOrderId && d.orderId != filterOrderId) return false;
      return true;
    });
  }

  // Получить уникальные заказы из документов
  function getUniqueOrders() {
    const map = {};
    documents.forEach(d => {
      if (d.orderId) {
        try {
          const parsed = JSON.parse(d.content);
          map[d.orderId] = parsed.orderTitle || `Заказ #${d.orderId}`;
        } catch {
          map[d.orderId] = `Заказ #${d.orderId}`;
        }
      }
    });
    return Object.entries(map);
  }

  async function render(container) {
    await Promise.all([loadDocuments(), loadClients()]);
    const filtered = getFiltered();
    const uniqueOrders = getUniqueOrders();

    const stats = {
      total: documents.length,
      kp: documents.filter(d => d.type === 'КП').length,
      smeta: documents.filter(d => d.type === 'Смета').length,
      act: documents.filter(d => d.type === 'Акт').length,
    };

    const html = `
      <div class="grid">
        <!-- Статистика -->
        <div class="card" style="grid-column: span 3; padding: 16px; text-align: center;">
          <div class="subtle">Всего</div>
          <div style="font-size: 28px; font-weight: bold;">${stats.total}</div>
        </div>
        <div class="card" style="grid-column: span 3; padding: 16px; text-align: center;">
          <div class="subtle">КП</div>
          <div style="font-size: 28px; font-weight: bold; color: var(--copper);">${stats.kp}</div>
        </div>
        <div class="card" style="grid-column: span 3; padding: 16px; text-align: center;">
          <div class="subtle">Сметы</div>
          <div style="font-size: 28px; font-weight: bold;">${stats.smeta}</div>
        </div>
        <div class="card" style="grid-column: span 3; padding: 16px; text-align: center;">
          <div class="subtle">Акты</div>
          <div style="font-size: 28px; font-weight: bold;">${stats.act}</div>
        </div>

        <!-- Список документов -->
        <div class="card" style="grid-column: span 12;">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div>
              <h2>Документы</h2>
              <p class="subtle">Счёт, смета, акт. Экспорт: Word / Excel / PDF (print).</p>
            </div>
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              <select id="filterType" style="padding: 6px 10px; border-radius: 8px; border: 1px solid var(--line); font-size: 12px;">
                <option value="">Все типы</option>
                <option value="КП" ${filterType === 'КП' ? 'selected' : ''}>КП</option>
                <option value="Смета" ${filterType === 'Смета' ? 'selected' : ''}>Сметы</option>
                <option value="Акт" ${filterType === 'Акт' ? 'selected' : ''}>Акты</option>
              </select>
              <select id="filterClient" style="padding: 6px 10px; border-radius: 8px; border: 1px solid var(--line); font-size: 12px;">
                <option value="">Все клиенты</option>
                ${clients.map(c => `<option value="${c.id}" ${filterClientId == c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
              </select>
              <select id="filterOrder" style="padding: 6px 10px; border-radius: 8px; border: 1px solid var(--line); font-size: 12px;">
                <option value="">Все заказы</option>
                ${uniqueOrders.map(([id, title]) => `<option value="${id}" ${filterOrderId == id ? 'selected' : ''}>${escapeHtml(title)}</option>`).join('')}
              </select>
              <button class="btn primary" id="btnNewDoc">+ Создать документ</button>
            </div>
          </div>

          ${filtered.length ? `
            <table class="table">
              <thead>
                <tr>
                  <th style="width: 80px;">Тип</th>
                  <th>Название</th>
                  <th style="width: 140px;">Дата</th>
                  <th style="width: 280px;"></th>
                </tr>
              </thead>
              <tbody>
                ${filtered.map(d => {
                  return `
                    <tr>
                      <td><span class="status"><i></i>${escapeHtml(d.type)}</span></td>
                      <td><b>${escapeHtml(d.title)}</b></td>
                      <td class="subtle">${new Date(d.createdAt).toLocaleString('ru-RU')}</td>
                      <td style="text-align: right; white-space: nowrap;">
                        <button class="btn ghost btn-view-doc" data-id="${d.id}" style="padding: 6px 12px; font-size: 12px;">Открыть</button>
                        <button class="btn ghost btn-word-doc" data-id="${d.id}" style="padding: 6px 12px; font-size: 12px;">Word</button>
                        <button class="btn ghost btn-excel-doc" data-id="${d.id}" style="padding: 6px 12px; font-size: 12px;">Excel</button>
                        <button class="btn ghost btn-pdf-doc" data-id="${d.id}" style="padding: 6px 12px; font-size: 12px;">PDF</button>
                        <button class="btn ghost btn-del-doc" data-id="${d.id}" style="padding: 6px 12px; font-size: 12px; color: #c33;">${icon('trash', 12)}</button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          ` : '<div class="empty" style="padding: 40px; text-align: center;">Документов пока нет. Создайте первый!</div>'}
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Фильтры
    document.getElementById('filterType').addEventListener('change', (e) => {
      filterType = e.target.value;
      render(container);
    });
    document.getElementById('filterClient').addEventListener('change', (e) => {
      filterClientId = e.target.value;
      render(container);
    });
    document.getElementById('filterOrder').addEventListener('change', (e) => {
      filterOrderId = e.target.value;
      render(container);
    });

    // Создать документ
    document.getElementById('btnNewDoc').addEventListener('click', () => {
      window.appModule.goToPage('documentCreate');
    });

    // Просмотр
    document.querySelectorAll('.btn-view-doc').forEach(btn => {
      btn.addEventListener('click', () => showDocModal(btn.dataset.id));
    });

    // Word
    document.querySelectorAll('.btn-word-doc').forEach(btn => {
      btn.addEventListener('click', () => exportWord(btn.dataset.id));
    });

    // Excel
    document.querySelectorAll('.btn-excel-doc').forEach(btn => {
      btn.addEventListener('click', () => exportExcel(btn.dataset.id));
    });

    // PDF (print)
    document.querySelectorAll('.btn-pdf-doc').forEach(btn => {
      btn.addEventListener('click', () => printDoc(btn.dataset.id));
    });

    // Удаление
    document.querySelectorAll('.btn-del-doc').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Удалить документ?')) return;
        try {
          await api.deleteRequest(`/documents/${btn.dataset.id}`);
          showToast('Документ удалён');
          documents = documents.filter(d => d.id != btn.dataset.id);
          render(container);
        } catch (e) { showToast('Ошибка: ' + e.message); }
      });
    });
  }

  // ===== Общий HTML-шаблон Счёта =====
  function buildDocHtml(parsed, doc) {
    const items = parsed.items || [];
    const total = items.reduce((s, i) => {
      const base = (parseFloat(i.quantity) || 0) * (parseFloat(i.price) || 0);
      const disc = parseFloat(i.discount) || 0;
      return s + base * (1 - disc / 100);
    }, 0);
    const co = parsed.company || {};
    const ndsText = parsed.ndsMode === 'included' ? 'Вкл. НДС' : 'Без НДС';
    const docTypeTitles = { 'КП': 'Счёт', 'Смета': 'Смета', 'Акт': 'Акт выполненных работ' };
    const docTitle = docTypeTitles[doc.type] || doc.type;
    const dateStr = parsed.date ? new Date(parsed.date).toLocaleDateString('ru-RU') : new Date(doc.createdAt).toLocaleDateString('ru-RU');
    const companyName = co.companyName || '';
    const signerLine = co.signerName
      ? `${(co.signerTitle || '').toUpperCase()}<br/>${co.signerName.toUpperCase()}`
      : companyName;

    return `
      <table style="width:100%;border-collapse:collapse;">
        <tr style="background:#2d2d2d;color:#fff;">
          <td style="padding:10px 14px;font-size:15px;font-weight:bold;">${escapeHtml(companyName)}</td>
          <td style="padding:10px 14px;text-align:right;font-size:18px;font-weight:bold;">${formatNumber(total)} ₽</td>
        </tr>
        <tr style="background:#2d2d2d;color:#aaa;font-size:11px;">
          <td style="padding:2px 14px 8px;">Получатель</td>
          <td style="padding:2px 14px 8px;text-align:right;">${ndsText}</td>
        </tr>
      </table>
      <table style="width:100%;border-collapse:collapse;border:1px solid #000;">
        <tr>
          <td style="border:1px solid #000;padding:6px 10px;width:50%;font-size:12px;">
            ${escapeHtml(co.bankName || '')}<br/><span style="font-size:10px;color:#666;">Банк получателя</span>
          </td>
          <td style="border:1px solid #000;padding:6px 10px;font-size:12px;">
            <b>БИК</b> ${escapeHtml(co.bik || '')}<br/><b>Кор. Счёт</b> ${escapeHtml(co.corrAccount || '')}
          </td>
        </tr>
        <tr>
          <td style="border:1px solid #000;padding:6px 10px;font-size:12px;" rowspan="2">
            ИНН ${escapeHtml(co.inn || '')}${co.kpp ? ' / КПП ' + escapeHtml(co.kpp) : ''}<br/>
            ${escapeHtml(companyName)}<br/><span style="font-size:10px;color:#666;">Получатель</span>
          </td>
          <td style="border:1px solid #000;padding:6px 10px;font-size:12px;">
            <b>Счёт</b> ${escapeHtml(co.accountNumber || '')}
          </td>
        </tr>
      </table>
      <h2 style="text-align:center;margin:20px 0 14px;font-size:18px;">${docTitle} №${escapeHtml(parsed.docNumber || '—')} от ${dateStr}</h2>
      <table style="width:100%;border:none;margin-bottom:14px;font-size:13px;">
        <tr><td style="padding:3px 0;width:110px;vertical-align:top;"><b>Получатель:</b></td>
          <td style="padding:3px 0;border-bottom:1px solid #000;">${escapeHtml(companyName)}${co.inn ? ', ИНН ' + escapeHtml(co.inn) : ''}${co.address ? ', ' + escapeHtml(co.address) : ''}</td></tr>
        <tr><td style="padding:3px 0;vertical-align:top;"><b>Плательщик:</b></td>
          <td style="padding:3px 0;border-bottom:1px solid #000;">${escapeHtml(parsed.clientName || '—')}${parsed.clientInn ? ', ИНН ' + escapeHtml(parsed.clientInn) : ''}${parsed.clientAddr ? ', ' + escapeHtml(parsed.clientAddr) : ''}</td></tr>
        ${parsed.basis ? `<tr><td style="padding:3px 0;vertical-align:top;"><b>Основание:</b></td>
          <td style="padding:3px 0;border-bottom:1px solid #000;">${escapeHtml(parsed.basis)}</td></tr>` : ''}
      </table>
      <table style="width:100%;border-collapse:collapse;margin-bottom:10px;">
        <thead><tr>
          <th style="border:1px solid #000;padding:5px;background:#e8e8e8;text-align:center;width:30px;">№</th>
          <th style="border:1px solid #000;padding:5px;background:#e8e8e8;">Название товара или услуги</th>
          <th style="border:1px solid #000;padding:5px;background:#e8e8e8;text-align:center;width:60px;">Кол-во</th>
          <th style="border:1px solid #000;padding:5px;background:#e8e8e8;text-align:center;width:55px;">Ед. Изм.</th>
          <th style="border:1px solid #000;padding:5px;background:#e8e8e8;text-align:right;width:80px;">Цена</th>
          <th style="border:1px solid #000;padding:5px;background:#e8e8e8;text-align:center;width:40px;">%</th>
          <th style="border:1px solid #000;padding:5px;background:#e8e8e8;text-align:center;width:65px;">НДС</th>
          <th style="border:1px solid #000;padding:5px;background:#e8e8e8;text-align:right;width:90px;">Сумма</th>
        </tr></thead>
        <tbody>${items.map((item, idx) => {
          const base = (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
          const disc = parseFloat(item.discount) || 0;
          const t = base * (1 - disc / 100);
          return `<tr>
            <td style="border:1px solid #000;padding:4px;text-align:center;">${idx + 1}</td>
            <td style="border:1px solid #000;padding:4px;">${escapeHtml(item.name)}</td>
            <td style="border:1px solid #000;padding:4px;text-align:center;">${item.quantity}</td>
            <td style="border:1px solid #000;padding:4px;text-align:center;">${escapeHtml(item.unit || 'шт')}</td>
            <td style="border:1px solid #000;padding:4px;text-align:right;">${formatNumber(item.price)} ₽</td>
            <td style="border:1px solid #000;padding:4px;text-align:center;">${disc ? disc + '%' : '—'}</td>
            <td style="border:1px solid #000;padding:4px;text-align:center;font-size:11px;">${ndsText}</td>
            <td style="border:1px solid #000;padding:4px;text-align:right;font-weight:bold;">${formatNumber(t)} ₽</td>
          </tr>`;
        }).join('')}</tbody>
      </table>
      <div style="font-size:12px;margin-bottom:6px;">Всего ${items.length} наименован. на сумму ${typeof numberToWords === 'function' ? numberToWords(total) : formatNumber(total) + ' руб.'}.</div>
      <div style="text-align:right;font-size:15px;"><b>Итог к оплате: ${formatNumber(total)} ₽</b></div>
      <div style="text-align:right;font-size:12px;color:#666;margin-bottom:20px;">${ndsText}</div>
      <table style="width:100%;border:none;margin-top:20px;"><tr>
        <td style="width:50%;padding:0;"><div style="font-size:12px;">Получатель</div><div style="border-bottom:1px solid #000;height:28px;"></div><div style="font-size:10px;">${signerLine}</div></td>
        <td style="width:50%;padding:0 0 0 30px;"><div style="font-size:12px;">Плательщик</div><div style="border-bottom:1px solid #000;height:28px;"></div><div style="font-size:10px;"> </div></td>
      </tr></table>
    `;
  }

  // ===== Просмотр документа =====
  function showDocModal(docId) {
    const doc = documents.find(d => d.id == docId);
    if (!doc) return;

    const backdrop = document.getElementById('modalBackdrop');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');

    title.textContent = doc.title;

    let parsed = null;
    try { parsed = JSON.parse(doc.content); } catch { /* plain text */ }

    if (parsed && parsed.items) {
      body.innerHTML = `<div style="font-family:'Times New Roman',serif;color:#000;font-size:13px;line-height:1.5;">${buildDocHtml(parsed, doc)}</div>`;
    } else {
      body.innerHTML = `<pre style="white-space: pre-wrap; font-size: 13px;">${escapeHtml(doc.content || 'Содержимое отсутствует')}</pre>`;
    }

    backdrop.style.display = 'flex';
  }

  // ===== Печать документа =====
  function printDoc(docId) {
    const doc = documents.find(d => d.id == docId);
    if (!doc) return;

    let parsed = null;
    try { parsed = JSON.parse(doc.content); } catch { /* plain text */ }

    const win = window.open('', '_blank');

    if (parsed && parsed.items) {
      win.document.write(`<html><head><title>${escapeHtml(doc.title)}</title>
        <style>body{font-family:'Times New Roman',serif;color:#000;font-size:13px;line-height:1.5;padding:20px;margin:0;}
        table{border-collapse:collapse;width:100%} @media print{body{padding:0}}</style></head>
        <body>${buildDocHtml(parsed, doc)}</body></html>`);
    } else {
      win.document.write(`<html><head><title>${escapeHtml(doc.title)}</title>
        <style>body{font-family:'Times New Roman',serif;padding:30px;font-size:14px;line-height:1.6}</style></head>
        <body><pre style="white-space:pre-wrap">${escapeHtml(doc.content || '')}</pre></body></html>`);
    }

    win.document.close();
    win.focus();
    win.print();
  }

  // ===== Экспорт в Word (.doc) =====
  function exportWord(docId) {
    const doc = documents.find(d => d.id == docId);
    if (!doc) return;

    let parsed = null;
    try { parsed = JSON.parse(doc.content); } catch { /* plain text */ }

    let htmlContent = '';

    if (parsed && parsed.items) {
      htmlContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="utf-8"><title>${escapeHtml(doc.title)}</title>
        <style>body{font-family:'Times New Roman',serif;font-size:13px;line-height:1.5;margin:20px}
        table{border-collapse:collapse;width:100%}</style></head>
        <body>${buildDocHtml(parsed, doc)}</body></html>`;
    } else {
      htmlContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="utf-8"><title>${escapeHtml(doc.title)}</title>
        <style>body{font-family:'Times New Roman',serif;font-size:14px;line-height:1.6;margin:30px}</style></head>
        <body><pre style="white-space:pre-wrap">${escapeHtml(doc.content || '')}</pre></body></html>`;
    }

    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${doc.title}.doc`;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast('Word-файл скачан');
  }

  // ===== Экспорт в Excel (.xls) =====
  function exportExcel(docId) {
    const doc = documents.find(d => d.id == docId);
    if (!doc) return;

    let parsed = null;
    try { parsed = JSON.parse(doc.content); } catch { /* plain text */ }

    let htmlContent = '';

    if (parsed && parsed.items) {
      const items = parsed.items || [];
      const total = items.reduce((s, i) => {
        const base = (parseFloat(i.quantity) || 0) * (parseFloat(i.price) || 0);
        const disc = parseFloat(i.discount) || 0;
        return s + base * (1 - disc / 100);
      }, 0);
      const ndsText = parsed.ndsMode === 'included' ? 'Вкл. НДС' : 'Без НДС';

      htmlContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="utf-8">
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
        <x:Name>${escapeHtml(doc.type)}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
        </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        <style>td,th{border:1px solid #000;padding:4px 8px;font-family:Arial;font-size:12px} th{background:#f0f0f0;font-weight:bold}</style></head><body>
        <table>
          <tr><td colspan="8" style="font-size:16px;font-weight:bold;text-align:center;border:none">${escapeHtml(doc.title)}</td></tr>
          <tr><td colspan="4" style="border:none"><b>Плательщик:</b> ${escapeHtml(parsed.clientName || '—')}</td>
          <td colspan="4" style="border:none"><b>Дата:</b> ${parsed.date ? new Date(parsed.date).toLocaleDateString('ru-RU') : new Date(doc.createdAt).toLocaleDateString('ru-RU')}</td></tr>
          <tr><td colspan="8" style="border:none"></td></tr>
          <tr><th>№</th><th>Наименование</th><th>Кол-во</th><th>Ед.</th><th>Цена, ₽</th><th>%</th><th>НДС</th><th>Сумма, ₽</th></tr>
          ${items.map((item, idx) => {
            const base = (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
            const disc = parseFloat(item.discount) || 0;
            const t = base * (1 - disc / 100);
            return `<tr><td>${idx+1}</td><td>${escapeHtml(item.name)}</td><td>${item.quantity}</td><td>${escapeHtml(item.unit||'шт')}</td><td>${item.price}</td><td>${disc||'—'}</td><td>${ndsText}</td><td>${t.toFixed(2)}</td></tr>`;
          }).join('')}
          <tr><td colspan="7" style="text-align:right;font-weight:bold">ИТОГО:</td><td style="font-weight:bold">${total.toFixed(2)}</td></tr>
        </table></body></html>`;
    } else {
      htmlContent = `<html><head><meta charset="utf-8"></head><body><table><tr><td>${escapeHtml(doc.content || '')}</td></tr></table></body></html>`;
    }

    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${doc.title}.xls`;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast('Excel-файл скачан');
  }

  return { render };
})();

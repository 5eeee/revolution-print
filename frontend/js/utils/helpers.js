function formatDateTime(timestamp) {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  return date.toLocaleString('ru-RU');
}

function formatDate(timestamp) {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  return date.toLocaleDateString('ru-RU');
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function limitText(text, length = 50) {
  if (!text) return '';
  return text.length > length ? text.substring(0, length) + '...' : text;
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function formatCurrency(amount) {
  if (isNaN(amount)) return '0 ₽';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
  }).format(amount);
}

function formatNumber(amount) {
  if (isNaN(amount)) return '0,00';
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Сумма прописью (рубли, копейки)
function numberToWords(amount) {
  const units = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
  const unitsF = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
  const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать',
    'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
  const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
  const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];

  function pluralize(n, one, two, five) {
    const m = Math.abs(n) % 100;
    const n1 = m % 10;
    if (m > 10 && m < 20) return five;
    if (n1 > 1 && n1 < 5) return two;
    if (n1 === 1) return one;
    return five;
  }

  function triplet(n, fem) {
    if (n === 0) return '';
    const u = fem ? unitsF : units;
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const o = n % 10;
    let r = '';
    if (h) r += hundreds[h] + ' ';
    if (t === 1) { r += teens[o] + ' '; return r; }
    if (t > 1) r += tens[t] + ' ';
    if (o) r += u[o] + ' ';
    return r;
  }

  if (isNaN(amount) || amount < 0) return '';
  const rub = Math.floor(Math.abs(amount));
  const kop = Math.round((Math.abs(amount) - rub) * 100);

  if (rub === 0) return `ноль рублей ${String(kop).padStart(2, '0')} ${pluralize(kop, 'копейка', 'копейки', 'копеек')}`;

  let result = '';
  const billions = Math.floor(rub / 1000000000);
  const millions = Math.floor((rub % 1000000000) / 1000000);
  const thousands = Math.floor((rub % 1000000) / 1000);
  const remainder = rub % 1000;

  if (billions) result += triplet(billions, false) + pluralize(billions, 'миллиард', 'миллиарда', 'миллиардов') + ' ';
  if (millions) result += triplet(millions, false) + pluralize(millions, 'миллион', 'миллиона', 'миллионов') + ' ';
  if (thousands) result += triplet(thousands, true) + pluralize(thousands, 'тысяча', 'тысячи', 'тысяч') + ' ';
  if (remainder) result += triplet(remainder, false);

  result += pluralize(rub, 'рубль', 'рубля', 'рублей');
  result += ` ${String(kop).padStart(2, '0')} ${pluralize(kop, 'копейка', 'копейки', 'копеек')}`;

  return result.replace(/\s+/g, ' ').trim();
}

// Функции доступны глобально через <script> подключение

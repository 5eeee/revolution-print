// API Client — единый объект для всех запросов к серверу
function getApiBaseUrl() {
  if (typeof window === 'undefined') return 'http://localhost:3100/api';
  const { protocol, hostname, port } = window.location;
  if (port === '3100') return `${protocol}//${hostname}:${port}/api`;
  return `http://${hostname}:3100/api`;
}

const api = {
  get baseUrl() {
    return getApiBaseUrl();
  },

  // Получить заголовки с токеном авторизации
  _headers() {
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  },

  // Обработка ответа сервера
  async _handleResponse(response) {
    const data = await response.json();
    if (!response.ok) {
      const message = data.error || `Ошибка HTTP ${response.status}`;
      throw new Error(message);
    }
    return data;
  },

  // GET-запрос
  async getRequest(endpoint) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: this._headers(),
    });
    return this._handleResponse(response);
  },

  // POST-запрос
  async postRequest(endpoint, body = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(body),
    });
    return this._handleResponse(response);
  },

  // PUT-запрос
  async putRequest(endpoint, body = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: this._headers(),
      body: JSON.stringify(body),
    });
    return this._handleResponse(response);
  },

  // DELETE-запрос
  async deleteRequest(endpoint) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: this._headers(),
    });
    return this._handleResponse(response);
  },

  // Загрузка файла (multipart/form-data)
  async uploadFile(formData) {
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${this.baseUrl}/upload/files`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return this._handleResponse(response);
  },
};

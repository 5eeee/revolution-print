// Модуль авторизации
const authModule = {
  _token: localStorage.getItem('token'),
  _user: (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })(),

  setToken(token) {
    this._token = token;
    localStorage.setItem('token', token);
  },

  setUser(user) {
    this._user = user;
    localStorage.setItem('user', JSON.stringify(user));
  },

  getToken() {
    return this._token;
  },

  getUser() {
    return this._user;
  },

  isAuthenticated() {
    return !!this._token;
  },

  async login(email, password) {
    const result = await api.postRequest('/auth/login', { email, password });
    if (result.success) {
      this.setToken(result.data.token);
      this.setUser(result.data.user);
      return true;
    }
    throw new Error(result.error || 'Ошибка входа');
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this._token = null;
    this._user = {};
  },
};

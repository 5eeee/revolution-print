function showToast(message, type = 'info', duration = 3000) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast toast-${type}`;
  toast.style.display = 'flex';

  setTimeout(() => {
    toast.style.display = 'none';
  }, duration);
}

function showSuccess(message) {
  showToast(message, 'success');
}

function showError(message) {
  showToast(message, 'error');
}

function showInfo(message) {
  showToast(message, 'info');
}

function showWarning(message) {
  showToast(message, 'warning');
}

// Функции доступны глобально через <script> подключение

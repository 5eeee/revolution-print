// Серверная валидация входных данных
// Простой middleware без внешних зависимостей

const required = (field, label) => (req) => {
  const val = req.body[field];
  if (val === undefined || val === null || (typeof val === 'string' && !val.trim())) {
    return `${label || field} обязательно`;
  }
  return null;
};

const isEmail = (field) => (req) => {
  const val = req.body[field];
  if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
    return 'Некорректный email';
  }
  return null;
};

const minLength = (field, min, label) => (req) => {
  const val = req.body[field];
  if (val && String(val).length < min) {
    return `${label || field}: минимум ${min} символов`;
  }
  return null;
};

const maxLength = (field, max, label) => (req) => {
  const val = req.body[field];
  if (val && String(val).length > max) {
    return `${label || field}: максимум ${max} символов`;
  }
  return null;
};

const isInt = (field, label) => (req) => {
  const val = req.body[field] ?? req.params[field];
  if (val !== undefined && val !== null && val !== '' && !Number.isInteger(Number(val))) {
    return `${label || field}: должно быть целым числом`;
  }
  return null;
};

const isNumber = (field, label) => (req) => {
  const val = req.body[field];
  if (val !== undefined && val !== null && val !== '' && isNaN(Number(val))) {
    return `${label || field}: должно быть числом`;
  }
  return null;
};

const isIn = (field, allowed, label) => (req) => {
  const val = req.body[field];
  if (val !== undefined && val !== null && val !== '' && !allowed.includes(val)) {
    return `${label || field}: недопустимое значение`;
  }
  return null;
};

const sanitizeString = (field) => (req) => {
  const val = req.body[field];
  if (typeof val === 'string') {
    req.body[field] = val.trim();
  }
  return null;
};

function validate(...checks) {
  return (req, res, next) => {
    const errors = [];
    for (const check of checks) {
      const error = check(req);
      if (error) errors.push(error);
    }
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: errors[0],
        errors,
      });
    }
    next();
  };
}

module.exports = {
  validate,
  required,
  isEmail,
  minLength,
  maxLength,
  isInt,
  isNumber,
  isIn,
  sanitizeString,
};

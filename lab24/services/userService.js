const User = require('../models/user');
const { AppError } = require('../errors');
const { log } = require('../log');

// Список с метаданными пагинации
async function getUsers(options) {
  log('SERVICE', 'Получение списка пользователей');
  const { items, total } = await User.findAll(options);
  const pagination = {
    total,
    page: options.page,
    limit: options.limit,
    pages: Math.ceil(total / options.limit),
  };
  return { items, pagination };
}

async function getUser(id) {
  log('SERVICE', 'Получение пользователя: ' + id);
  const user = await User.findById(id);
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  return user;
}

async function createUser(data) {
  log('SERVICE', 'Создание пользователя: ' + data.email);

  // Email должен быть уникальным
  log('SERVICE', 'Проверка уникальности email');
  const existing = await User.findByEmail(data.email);
  if (existing) {
    log('SERVICE', 'Email уже существует');
    throw new AppError(409, 'Email already exists');
  }

  const user = await User.create(data);

  // Отправку письма только имитируем
  log('SERVICE', 'Email отправлен: ' + user.email);
  return user;
}

async function updateUser(id, data) {
  log('SERVICE', 'Обновление пользователя: ' + id);

  // Новый email не должен принадлежать другому пользователю
  if (data.email) {
    log('SERVICE', 'Проверка уникальности email');
    const existing = await User.findByEmail(data.email);
    if (existing && String(existing._id) !== id) {
      log('SERVICE', 'Email уже существует');
      throw new AppError(409, 'Email already exists');
    }
  }

  const user = await User.update(id, data);
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  return user;
}

async function deleteUser(id) {
  log('SERVICE', 'Удаление пользователя: ' + id);
  const deleted = await User.delete(id);
  if (!deleted) {
    throw new AppError(404, 'User not found');
  }
}

async function searchUsers(q) {
  log('SERVICE', 'Поиск: ' + q);
  return User.search(q);
}

// Превращаем результат агрегации в удобный объект
async function getStats() {
  log('SERVICE', 'Подсчёт статистики');
  const raw = await User.getStats();

  const general = raw.general[0] || { total: 0, averageAge: 0 };

  const byGroup = {};
  for (const item of raw.byGroup) {
    byGroup[item._id] = item.count;
  }

  const byCourse = {};
  for (const item of raw.byCourse) {
    byCourse[item._id] = item.count;
  }

  return {
    total: general.total,
    averageAge: Math.round((general.averageAge || 0) * 10) / 10,
    byGroup,
    byCourse,
  };
}

// Значение для CSV: в кавычках, внутренние кавычки удваиваются
function csvCell(value) {
  if (value === undefined || value === null) {
    return '';
  }
  const text = value instanceof Date ? value.toISOString() : String(value);
  return '"' + text.replace(/"/g, '""') + '"';
}

async function exportCsv() {
  log('SERVICE', 'Экспорт в CSV');
  const users = await User.findForExport();
  const columns = ['_id', 'name', 'email', 'group_name', 'age', 'course', 'created_at'];

  const lines = [columns.join(',')];
  for (const user of users) {
    lines.push(columns.map((column) => csvCell(user[column])).join(','));
  }

  // BOM в начале, чтобы Excel правильно показал кириллицу
  return '\uFEFF' + lines.join('\n');
}

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  searchUsers,
  getStats,
  exportCsv,
};

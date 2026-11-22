const Joi = require('joi');

const groupRegex = /^ББМО-\d{2}-\d{2}$/;

// Поля, по которым разрешена сортировка
const sortFields = ['name', 'email', 'group_name', 'age', 'course', 'created_at'];
const sortValues = sortFields.flatMap((field) => [field, '-' + field]);

// Создание пользователя
const createUser = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().email().lowercase().required(),
  group_name: Joi.string().pattern(groupRegex).required(),
  age: Joi.number().integer().min(16).max(100),
  course: Joi.number().integer().min(1).max(4),
});

// Обновление: все поля необязательные, но хотя бы одно нужно
const updateUser = createUser
  .fork(['name', 'email', 'group_name'], (field) => field.optional())
  .min(1);

// Параметры списка: пагинация, фильтры, сортировка, поиск
const listQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1)
    .messages({ 'number.min': 'должно быть больше 0' }),
  limit: Joi.number().integer().min(1).max(100).default(10)
    .messages({ 'number.min': 'должно быть больше 0', 'number.max': 'не больше 100' }),
  sort: Joi.string().valid(...sortValues),
  group_name: Joi.string().pattern(groupRegex),
  course: Joi.number().integer().min(1).max(4),
  age_min: Joi.number().integer().min(0),
  age_max: Joi.number().integer().min(0),
  search: Joi.string().min(1).max(100),
});

// Параметры поиска /search
const searchQuery = Joi.object({
  q: Joi.string().min(1).max(100).required(),
});

module.exports = { createUser, updateUser, listQuery, searchQuery };

const { ObjectId } = require('mongodb');
const { getDb } = require('../db');
const { AppError } = require('../errors');
const { log } = require('../log');

const idRegex = /^[0-9a-fA-F]{24}$/;

function getCollection() {
  return getDb().collection('users');
}

// Проверка на уровне модели: основные поля должны быть строками
function checkData(data, needAll) {
  const details = [];
  for (const field of ['name', 'email', 'group_name']) {
    if (data[field] === undefined && !needAll) {
      continue;
    }
    if (typeof data[field] !== 'string' || data[field] === '') {
      details.push({ field, message: 'обязательное поле, строка' });
    }
  }
  if (details.length > 0) {
    throw new AppError(400, 'Validation failed', details);
  }
}

// Собираем фильтр Mongo из параметров
function buildFilter(options) {
  const { group_name, course, age_min, age_max, search } = options;
  const filter = {};

  if (group_name) filter.group_name = group_name;
  if (course) filter.course = course;

  if (age_min !== undefined || age_max !== undefined) {
    filter.age = {};
    if (age_min !== undefined) filter.age.$gte = age_min;
    if (age_max !== undefined) filter.age.$lte = age_max;
  }

  if (search) filter.$text = { $search: search };

  return filter;
}

class User {
  // Список с фильтрами, сортировкой и пагинацией
  static async findAll(options = {}) {
    const { page = 1, limit = 10, sort, search } = options;
    const filter = buildFilter(options);

    // Сортировка: "-name" значит по убыванию
    let sortObj = { _id: 1 };
    if (sort) {
      const field = sort.startsWith('-') ? sort.slice(1) : sort;
      sortObj = { [field]: sort.startsWith('-') ? -1 : 1, _id: 1 };
    } else if (search) {
      sortObj = { score: { $meta: 'textScore' } };
    }

    log('MODEL', 'find');
    let cursor = getCollection().find(filter);
    if (search) {
      cursor = cursor.project({ score: { $meta: 'textScore' } });
    }
    const items = await cursor
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    const total = await getCollection().countDocuments(filter);
    return { items, total };
  }

  static async findById(id) {
    if (!idRegex.test(id)) {
      return null;
    }
    log('MODEL', 'findOne by _id');
    return getCollection().findOne({ _id: new ObjectId(id) });
  }

  static async findByEmail(email) {
    if (typeof email !== 'string') {
      return null;
    }
    log('MODEL', 'findOne by email');
    return getCollection().findOne({ email });
  }

  static async create(data) {
    checkData(data, true);
    const doc = { ...data, created_at: new Date() };
    log('MODEL', 'insertOne');
    await getCollection().insertOne(doc);
    return doc;
  }

  static async update(id, data) {
    if (!idRegex.test(id)) {
      return null;
    }
    checkData(data, false);
    log('MODEL', 'updateOne');
    const result = await getCollection().updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...data, updated_at: new Date() } }
    );
    if (result.matchedCount === 0) {
      return null;
    }
    return User.findById(id);
  }

  static async delete(id) {
    if (!idRegex.test(id)) {
      return false;
    }
    log('MODEL', 'deleteOne');
    const result = await getCollection().deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  // Полнотекстовый поиск, сначала самые релевантные
  static async search(q) {
    log('MODEL', 'find (text search)');
    return getCollection()
      .find({ $text: { $search: q } })
      .project({ score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(50)
      .toArray();
  }

  // Статистика одним запросом через агрегацию
  static async getStats() {
    log('MODEL', 'aggregate');
    const [result] = await getCollection()
      .aggregate([
        {
          $facet: {
            general: [{ $group: { _id: null, total: { $sum: 1 }, averageAge: { $avg: '$age' } } }],
            byGroup: [{ $group: { _id: '$group_name', count: { $sum: 1 } } }],
            byCourse: [
              { $match: { course: { $exists: true } } },
              { $group: { _id: '$course', count: { $sum: 1 } } },
            ],
          },
        },
      ])
      .toArray();
    return result;
  }

  // Все пользователи для экспорта
  static async findForExport() {
    log('MODEL', 'find (export)');
    return getCollection().find({}).sort({ _id: 1 }).toArray();
  }
}

module.exports = User;

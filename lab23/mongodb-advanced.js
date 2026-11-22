const { MongoClient } = require('mongodb');
const { uri, dbName, group, header } = require('./config');

const TOTAL = 1000000;
const BATCH = 10000;
const groupNames = ['478', '479', '480', '481', '482'];
const curators = ['Кузьмина Е.А.', 'Орлов П.С.', 'Белова Т.Н.', 'Федоров А.В.', 'Захарова О.М.'];
const menFirst = ['Иван', 'Петр', 'Олег', 'Дмитрий', 'Сергей', 'Алексей'];
const menLast = ['Иванов', 'Петров', 'Сидоров', 'Кузнецов', 'Новиков', 'Волков'];
const womenFirst = ['Мария', 'Анна', 'Елена', 'Ольга', 'Наталья', 'Татьяна'];
const womenLast = ['Иванова', 'Петрова', 'Смирнова', 'Попова', 'Морозова', 'Соколова'];

const client = new MongoClient(uri);

const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];
const mb = (bytes) => Math.round(bytes / 1024 / 1024);
const sec = (start) => ((Date.now() - start) / 1000).toFixed(1);

function makeStudent(i) {
  const man = i % 2 === 0;
  const name = man ? pick(menFirst) + ' ' + pick(menLast) : pick(womenFirst) + ' ' + pick(womenLast);
  return {
    name,
    email: `student${i}@college.local`,
    group_name: pick(groupNames),
    course: 1 + rand(4),
    grade: Math.round((2 + Math.random() * 3) * 100) / 100,
    created_at: new Date()
  };
}

// генерация миллиона документов пачками по 10000
async function fillBig(coll) {
  console.log('=== Генерация данных ===');
  const count = await coll.estimatedDocumentCount();
  if (count === TOTAL) {
    console.log('В students_big уже ' + TOTAL + ' документов, генерацию пропускаем');
    return;
  }
  await coll.drop().catch(() => {});
  const start = Date.now();
  for (let i = 0; i < TOTAL; i += BATCH) {
    const batch = [];
    for (let j = i; j < i + BATCH; j++) {
      batch.push(makeStudent(j));
    }
    await coll.insertMany(batch, { ordered: false });
    if ((i + BATCH) % 100000 === 0) {
      console.log('Вставлено ' + (i + BATCH) + ' документов');
    }
  }
  console.log(`Генерация заняла ${sec(start)} сек`);
}

async function cursors(coll) {
  console.log('');
  console.log('=== Курсоры ===');
  // find возвращает курсор, сами данные ещё не загружены
  const cursor = coll.find({}).batchSize(1000);

  console.log('Итерация через for await (batchSize 1000):');
  let n = 0;
  let sum = 0;
  let peak = 0;
  const start = Date.now();
  for await (const doc of cursor) {
    sum += doc.grade; // обработка каждого документа
    n++;
    if (n % 10000 === 0) {
      peak = Math.max(peak, process.memoryUsage().heapUsed);
    }
  }
  console.log(`Получено ${n} документов за ${sec(start)} сек`);
  console.log('Средний балл (посчитан в цикле): ' + (sum / n).toFixed(2));
  console.log('Пик памяти: ' + mb(peak) + ' МБ');

  // next достаёт документы по одному
  const c2 = coll.find({});
  const first = await c2.next();
  const second = await c2.next();
  console.log('cursor.next(): ' + first.name + ' / ' + second.name);
  await c2.close();
  console.log('Курсор закрыт: ' + c2.closed);

  console.log('Через toArray(): см. отдельный запуск mongodb-toarray.js');
}

async function aggregations(db, coll) {
  console.log('');
  console.log('=== Агрегации ===');

  const avg = await coll
    .aggregate([
      { $group: { _id: '$group_name', avgGrade: { $avg: '$grade' } } },
      { $sort: { _id: 1 } }
    ])
    .toArray();
  console.log('Средний балл по группам:');
  avg.forEach((r) => console.log(`${r._id}: ${r.avgGrade.toFixed(2)}`));

  const byCourse = await coll
    .aggregate([
      { $group: { _id: '$course', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])
    .toArray();
  console.log('Количество по курсам:');
  byCourse.forEach((r) => console.log(`${r._id} курс: ${r.count}`));

  const top = await coll
    .aggregate([
      { $match: { group_name: group } },
      { $sort: { grade: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, name: 1, grade: 1 } }
    ])
    .toArray();
  console.log(`Топ-10 студентов группы ${group} по оценке:`);
  top.forEach((r) => console.log(JSON.stringify(r)));

  // коллекция groups нужна для $lookup
  const groups = db.collection('groups');
  await groups.deleteMany({});
  await groups.insertMany(groupNames.map((g, i) => ({ group_name: g, curator: curators[i] })));

  const joined = await coll
    .aggregate([
      { $group: { _id: '$group_name', students: { $sum: 1 } } },
      { $lookup: { from: 'groups', localField: '_id', foreignField: 'group_name', as: 'info' } },
      { $unwind: '$info' },
      { $project: { _id: 0, group_name: '$_id', students: 1, curator: '$info.curator' } },
      { $sort: { group_name: 1 } }
    ])
    .toArray();
  console.log('$lookup (JOIN с groups):');
  joined.forEach((r) => console.log(JSON.stringify(r)));
}

// план запроса: стадия, время и сколько документов просмотрено
async function explainQuery(coll, query, hint) {
  let cursor = coll.find(query);
  if (hint) {
    cursor = cursor.hint(hint);
  }
  const res = await cursor.explain('executionStats');
  let plan = res.queryPlanner.winningPlan;
  if (plan.queryPlan) {
    plan = plan.queryPlan; // в новых версиях MongoDB план вложен глубже
  }
  while (plan.inputStage) {
    plan = plan.inputStage;
  }
  return {
    stage: plan.stage,
    ms: res.executionStats.executionTimeMillis,
    examined: res.executionStats.totalDocsExamined,
    returned: res.executionStats.nReturned
  };
}

function printExplain(r) {
  console.log('stage: ' + r.stage);
  console.log('executionTimeMillis: ' + r.ms);
  console.log('totalDocsExamined: ' + r.examined);
  console.log('nReturned: ' + r.returned);
}

async function indexes(coll) {
  console.log('');
  console.log('=== Индексы ===');
  const query = { group_name: group, grade: 4.55 };

  // убираем старые индексы (кроме _id), чтобы честно сравнить
  await coll.dropIndexes();
  const before = await explainQuery(coll, query);

  console.log('Создан индекс: ' + (await coll.createIndex({ group_name: 1 })));
  const compound = { group_name: 1, grade: -1 };
  console.log('Создан индекс: ' + (await coll.createIndex(compound)));
  console.log('Создан уникальный индекс: ' + (await coll.createIndex({ email: 1 }, { unique: true })));

  // hint заставляет использовать составной индекс
  const after = await explainQuery(coll, query, compound);

  console.log('explain() без индекса:');
  printExplain(before);
  console.log('explain() с индексом:');
  printExplain(after);
  console.log('Ускорение примерно в ' + Math.round(before.ms / Math.max(after.ms, 1)) + ' раз (по executionTimeMillis)');
}

async function textSearch(coll) {
  console.log('');
  console.log('=== Текстовый поиск ===');
  // язык none, чтобы русские слова не обрабатывались как английские
  const name = await coll.createIndex({ name: 'text' }, { default_language: 'none' });
  console.log('Создан текстовый индекс: ' + name);

  const filter = { $text: { $search: 'Иван' } };
  const found = await coll.countDocuments(filter);
  console.log('find({ $text: { $search: "Иван" } }):');
  console.log('Найдено: ' + found + ' документов');

  // сортировка по релевантности
  const top = await coll
    .find(filter, { projection: { _id: 0, name: 1, score: { $meta: 'textScore' } } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(3)
    .toArray();
  top.forEach((d, i) => console.log(`Топ-${i + 1}: score=${d.score.toFixed(1)}, name="${d.name}"`));
}

async function main() {
  console.log(header);
  await client.connect();
  const db = client.db(dbName);
  const coll = db.collection('students_big');

  await fillBig(coll);
  await cursors(coll);
  await aggregations(db, coll);
  await indexes(coll);
  await textSearch(coll);
}

main()
  .catch((err) => console.log('Ошибка: ' + err.message))
  .finally(() => client.close());

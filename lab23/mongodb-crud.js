const { MongoClient } = require('mongodb');
const { uri, dbName, group, header } = require('./config');

const client = new MongoClient(uri);

// короткий вывод документа
function show(d) {
  console.log(JSON.stringify({ name: d.name, group_name: d.group_name, grade: d.grade }));
}

function makeStudent(name, course, grade) {
  return { name, group_name: group, course, grade, created_at: new Date() };
}

async function main() {
  console.log(header);
  await client.connect();
  const students = client.db(dbName).collection('students');

  // чистим коллекцию, чтобы скрипт можно было запускать много раз
  await students.deleteMany({});
  const indexName = await students.createIndex({ group_name: 1 });

  console.log(`=== Коллекция students (группа ${group}) ===`);
  console.log('Индекс создан: ' + indexName);

  console.log('--- INSERT ---');
  const one = await students.insertOne({
    name: 'Иван Иванов',
    group_name: group,
    course: 2,
    grade: 4.5,
    comment: 'староста',
    created_at: new Date()
  });
  console.log('Вставлен: insertedId=' + one.insertedId);

  const many = await students.insertMany([
    makeStudent('Мария Петрова', 2, 3.8),
    makeStudent('Петр Сидоров', 2, 4.2),
    makeStudent('Анна Смирнова', 1, 4.9),
    makeStudent('Олег Кузнецов', 3, 2.7),
    makeStudent('Елена Попова', 2, 3.2),
    makeStudent('Дмитрий Новиков', 1, 2.5),
    makeStudent('Ольга Морозова', 3, 4.7),
    makeStudent('Сергей Волков', 2, 2.9),
    makeStudent('Наталья Соколова', 1, 4.0)
  ]);
  console.log(`Вставлено ${many.insertedCount} документов: insertedIds=`);
  console.log(many.insertedIds);

  console.log('--- SELECT ---');
  // toArray грузит всё в память, для 10 документов можно, для больших данных опасно
  const all = await students.find({}).toArray();
  console.log(`Все документы (${all.length}):`);
  all.slice(0, 3).forEach(show);
  console.log('...');

  const byGroup = await students.find({ group_name: group }).toArray();
  console.log(`С фильтром по группе ${group} (${byGroup.length}):`);
  byGroup.slice(0, 3).forEach(show);
  console.log('...');

  console.log('С сортировкой по grade (по убыванию), первые 3:');
  const top = await students.find({ group_name: group }).sort({ grade: -1 }).limit(3).toArray();
  top.forEach(show);

  console.log('С пагинацией: sort grade -1, skip(3), limit(3):');
  const page = await students.find({ group_name: group }).sort({ grade: -1 }).skip(3).limit(3).toArray();
  page.forEach(show);

  const found = await students.findOne({ _id: one.insertedId });
  console.log('findOne по _id:');
  show(found);

  console.log('С проекцией (только name, grade):');
  const light = await students
    .find({}, { projection: { name: 1, grade: 1, _id: 0 } })
    .toArray();
  light.slice(0, 3).forEach((d) => console.log(JSON.stringify(d)));
  console.log('...');
  // сравниваем размер JSON полной выборки и выборки с проекцией
  console.log('Полная выборка: ' + JSON.stringify(all).length + ' символов');
  console.log('С проекцией: ' + JSON.stringify(light).length + ' символов');

  console.log('--- UPDATE ---');
  const u1 = await students.updateOne(
    { _id: one.insertedId },
    { $set: { grade: 4.8 }, $push: { achievements: 'олимпиада' } }
  );
  console.log(`updateOne ($set, $push): matchedCount=${u1.matchedCount}, modifiedCount=${u1.modifiedCount}`);

  const u2 = await students.updateOne({ _id: one.insertedId }, { $unset: { comment: '' } });
  console.log(`updateOne ($unset): matchedCount=${u2.matchedCount}, modifiedCount=${u2.modifiedCount}`);

  const u3 = await students.updateMany({ group_name: group }, { $inc: { course: 1 } });
  console.log(`updateMany (group=${group}, $inc: course+1): matchedCount=${u3.matchedCount}, modifiedCount=${u3.modifiedCount}`);

  console.log('--- DELETE ---');
  const d1 = await students.deleteOne({ name: 'Наталья Соколова' });
  console.log('deleteOne: deletedCount=' + d1.deletedCount);
  const d2 = await students.deleteMany({ grade: { $lt: 3 } });
  console.log('deleteMany (grade < 3): deletedCount=' + d2.deletedCount);

  console.log('Осталось документов: ' + (await students.countDocuments()));
}

main()
  .catch((err) => console.log('Ошибка: ' + err.message))
  .finally(() => client.close());

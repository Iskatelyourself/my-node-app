const { MongoClient } = require('mongodb');
const { uri, dbName, header } = require('./config');

const client = new MongoClient(uri);

async function main() {
  console.log(header);
  console.log('Через toArray():');
  await client.connect();
  const coll = client.db(dbName).collection('students_big');

  const start = Date.now();
  // весь миллион документов сразу в одном массиве
  const all = await coll.find({}).toArray();
  const used = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  console.log(`Получено ${all.length} документов за ${((Date.now() - start) / 1000).toFixed(1)} сек`);
  console.log('Память (heapUsed): ' + used + ' МБ');
}

main()
  .catch((err) => console.log('Ошибка: ' + err.message))
  .finally(() => client.close());

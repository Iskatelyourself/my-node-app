const { MongoClient } = require('mongodb');
const { header } = require('./config');

// без аргумента неверный порт, с аргументом pass неверный пароль
const mode = process.argv[2];
const badUri = mode === 'pass'
  ? 'mongodb://student:wrongpass@localhost:27017/bbmo_01_23'
  : 'mongodb://student:password@localhost:27018/bbmo_01_23';

// ждём сервер только 3 секунды, чтобы не висеть долго
const client = new MongoClient(badUri, { serverSelectionTimeoutMS: 3000 });

async function main() {
  console.log(header);
  console.log('=== Ошибка подключения ===');
  console.log('URI: ' + badUri.replace(/:[^:@]*@/, ':***@'));
  try {
    await client.connect();
    await client.db('bbmo_01_23').command({ ping: 1 });
    console.log('Подключение удалось, ошибки нет');
  } catch (err) {
    console.log('Ошибка: ' + err.name);
    console.log(err.message);
  } finally {
    await client.close();
  }
}

main();

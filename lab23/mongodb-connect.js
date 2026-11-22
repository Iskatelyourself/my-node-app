const { MongoClient } = require('mongodb');
const { uri, dbName, header } = require('./config');

// режим watch: ждём 60 секунд, чтобы успеть остановить и запустить сервер
const watchMode = process.argv[2] === 'watch';

const client = new MongoClient(uri, {
  heartbeatFrequencyMS: 2000, // проверка раз в 2 секунды, чтобы быстрее увидеть события
  serverSelectionTimeoutMS: 5000
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log(header);
  console.log('=== Подключение к MongoDB ===');

  // устанавливаем соединение с сервером
  await client.connect();
  // db() только возвращает объект базы, новое соединение не создаётся
  const db = client.db(dbName);
  // проверка соединения
  await db.command({ ping: 1 });
  console.log('Подключение установлено');

  const info = await client.db('admin').command({ buildInfo: 1 });
  const status = await db.command({ connectionStatus: 1 });
  const users = status.authInfo.authenticatedUsers;
  console.log('Версия MongoDB: ' + info.version);
  console.log('База данных: ' + dbName);
  console.log('Пользователь: ' + (users.length > 0 ? users[0].user : 'не определён'));

  console.log('');
  console.log('=== Информация о сервере ===');
  const dbs = await client.db().admin().listDatabases();
  console.log('Список БД:');
  dbs.databases.forEach((d) => console.log('- ' + d.name));

  // коллекций мало, поэтому toArray здесь безопасен
  const collections = await db.listCollections().toArray();
  console.log('Коллекции в ' + dbName + ':');
  if (collections.length === 0) {
    console.log('(пусто, БД создаётся лениво при первой вставке)');
  } else {
    collections.forEach((c) => console.log('- ' + c.name));
  }

  console.log('');
  console.log('=== Heartbeat ===');
  let failed = 0;

  // успешная проверка сервера
  client.on('serverHeartbeatSucceeded', () => {
    console.log('[HEARTBEAT] Успешно: ' + new Date().toISOString());
  });
  // неудачная проверка, драйвер потом сам пробует переподключиться
  client.on('serverHeartbeatFailed', (event) => {
    failed++;
    console.log('[HEARTBEAT] Ошибка: ' + new Date().toISOString() + ' ' + event.failure.message);
  });
  // смена состояния сервера, по ней видно переподключение
  client.on('serverDescriptionChanged', (event) => {
    console.log(`[SERVER] ${event.previousDescription.type} -> ${event.newDescription.type}`);
  });

  if (watchMode) {
    console.log('Режим watch: 60 секунд. Остановите и снова запустите mongod в другом терминале.');
  }
  await sleep(watchMode ? 60000 : 8000);

  if (failed === 0) {
    console.log('Соединение стабильно');
  } else {
    console.log('Сбоев heartbeat: ' + failed);
  }
}

main()
  .catch((err) => console.log('Ошибка подключения: ' + err.message))
  .finally(async () => {
    await client.close();
    console.log('Соединение закрыто');
  });

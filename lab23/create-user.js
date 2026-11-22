const { MongoClient } = require('mongodb');
const { dbName } = require('./config');

// пользователя ещё нет, поэтому подключаемся без логина
const client = new MongoClient('mongodb://localhost:27017');

async function main() {
  await client.connect();
  const db = client.db(dbName);
  try {
    // пользователь student с правами чтения и записи только в нашей базе
    await db.command({
      createUser: 'student',
      pwd: 'password',
      roles: [{ role: 'readWrite', db: dbName }]
    });
    console.log('Пользователь student создан');
  } catch (err) {
    if (err.code === 51003) {
      console.log('Пользователь student уже существует');
    } else {
      throw err;
    }
  }
}

main()
  .catch((err) => console.error('Ошибка: ' + err.message))
  .finally(() => client.close());

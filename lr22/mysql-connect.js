const mysql = require('mysql2/promise');
const config = require('./config');

// Разбираем самые частые ошибки подключения
function printError(err) {
  if (err.code === 'ECONNREFUSED') {
    console.log('Ошибка: сервер недоступен ' + config.host + ':' + config.port);
  } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
    console.log('Ошибка: неверный пароль для пользователя ' + config.user);
  } else {
    console.log('Ошибка: ' + err.code + ' ' + err.message);
  }
}

// Одиночное соединение: открыли, сделали запрос, закрыли
async function singleConnection() {
  console.log('=== Одиночное соединение ===');
  const connection = await mysql.createConnection(config);
  console.log('Подключение установлено');

  const [rows] = await connection.query(
    'SELECT VERSION() AS version, DATABASE() AS db, USER() AS user'
  );
  console.log('Версия MySQL: ' + rows[0].version);
  console.log('Текущая БД: ' + rows[0].db);
  console.log('Пользователь: ' + rows[0].user);

  await connection.end();
  console.log('Соединение закрыто');
}

// Пул соединений: соединения переиспользуются
async function poolConnection() {
  console.log('');
  console.log('=== Пул соединений ===');
  const pool = mysql.createPool({ ...config, connectionLimit: 10 });
  console.log('Пул создан (лимит: 10)');

  // pool.query сам берёт соединение и сам возвращает его в пул
  const [rows] = await pool.query(
    'SELECT VERSION() AS version, DATABASE() AS db, USER() AS user'
  );
  console.log('Версия MySQL: ' + rows[0].version);
  console.log('Текущая БД: ' + rows[0].db);
  console.log('Пользователь: ' + rows[0].user);

  // занимаем все 10 соединений сразу, чтобы пул их создал, и возвращаем обратно
  const list = [];
  for (let i = 0; i < 10; i++) {
    list.push(await pool.getConnection());
  }
  console.log('Соединений в пуле: ' + list.length);
  list.forEach((conn) => conn.release());

  console.log('Пул готов к работе');
  return pool;
}

async function main() {
  try {
    await singleConnection();
    await poolConnection();
  } catch (err) {
    printError(err);
    process.exit(1);
  }
  // пул остаётся открытым, поэтому завершаем скрипт вручную
  process.exit(0);
}

main();

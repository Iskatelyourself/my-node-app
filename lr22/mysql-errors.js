const mysql = require('mysql2/promise');
const config = require('./config');

const TOTAL = 100000;
let pool;

// Создаём пул и вешаем слушатель ошибок на сам пул
function makePool() {
  const p = mysql.createPool({ ...config, connectionLimit: 10 });
  p.pool.on('error', onPoolError);
  return p;
}

// Глобальные ошибки пула: логируем и пересоздаём пул, если ошибка критичная
function onPoolError(err) {
  console.log('[POOL ERROR] ' + err.code);
  if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.fatal) {
    console.log('[POOL] Пересоздание пула...');
    const old = pool;
    pool = makePool();
    old.end().catch(() => {});
  }
}

// Текущая память в мегабайтах
function heapMb() {
  return process.memoryUsage().heapUsed / 1024 / 1024;
}

function runGc() {
  if (global.gc) global.gc();
}

async function demoErrors() {
  console.log('=== Демонстрация ошибок ===');

  // сетевая: порт, на котором ничего не слушает
  try {
    await mysql.createConnection({ ...config, port: 9999 });
  } catch (err) {
    console.log('[' + err.code + '] Сервер недоступен: ' + config.host + ':9999');
  }

  // аутентификация: неверный пароль
  try {
    await mysql.createConnection({ ...config, password: 'wrong_password' });
  } catch (err) {
    console.log('[' + err.code + '] Неверный пароль для пользователя ' + config.user);
  }

  // синтаксис: опечатка в SELECT
  try {
    await pool.query('SELECT * FRM students');
  } catch (err) {
    console.log('[' + err.code + '] Синтаксическая ошибка: SELECT * FRM students');
  }

  // таблица для проверки дубликата и NULL
  await pool.query('DROP TABLE IF EXISTS err_demo');
  await pool.query('CREATE TABLE err_demo (id INT PRIMARY KEY, name VARCHAR(100) NOT NULL)');
  await pool.query('INSERT INTO err_demo (id, name) VALUES (?, ?)', [1, 'Иван']);

  // конфликт: такой id уже есть
  try {
    await pool.query('INSERT INTO err_demo (id, name) VALUES (?, ?)', [1, 'Мария']);
  } catch (err) {
    console.log('[' + err.code + '] Дублирование ключа: id=1');
  }

  // ограничение: NULL в NOT NULL столбце
  try {
    await pool.query('INSERT INTO err_demo (id, name) VALUES (?, ?)', [2, null]);
  } catch (err) {
    console.log('[' + err.code + '] NULL в NOT NULL столбце: name');
  }
}

async function demoPoolErrors() {
  console.log('');
  console.log('=== Обработка ошибок пула ===');

  // настоящую потерю соединения сложно вызвать, поэтому генерируем ошибку вручную
  const fake = new Error('Connection lost');
  fake.code = 'PROTOCOL_CONNECTION_LOST';
  fake.fatal = true;
  pool.pool.emit('error', fake);

  // проверяем, что новый пул работает
  const [rows] = await pool.query('SELECT 1 AS ok');
  console.log('Новый пул работает, SELECT 1 вернул: ' + rows[0].ok);
}

// Заполняем таблицу big_data пачками по 5000 строк
async function createBigData() {
  console.log('');
  console.log('=== Потоковый запрос ===');
  console.log('Генерация ' + TOTAL + ' записей...');
  await pool.query('DROP TABLE IF EXISTS big_data');
  await pool.query(`
    CREATE TABLE big_data (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100),
      value INT,
      payload VARCHAR(200)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  for (let i = 0; i < TOTAL; i += 5000) {
    const batch = [];
    for (let j = 1; j <= 5000; j++) {
      const n = i + j;
      batch.push(['user_' + n, n % 1000, 'text for row ' + n + ' ' + 'x'.repeat(100)]);
    }
    await pool.query('INSERT INTO big_data (name, value, payload) VALUES ?', [batch]);
  }
  const [cnt] = await pool.query('SELECT COUNT(*) AS c FROM big_data');
  console.log('Записей в таблице: ' + cnt[0].c);
}

// Чтение через stream: строки приходят по одной
function readStream() {
  return new Promise((resolve, reject) => {
    runGc();
    const base = heapMb();
    const start = Date.now();
    let count = 0;
    let peak = base;

    console.log('Чтение ' + TOTAL + ' записей...');
    const stream = pool.pool.query('SELECT * FROM big_data').stream();

    stream.on('data', () => {
      count++;
      if (count % 1000 === 0) peak = Math.max(peak, heapMb());
      if (count === TOTAL * 0.1 || count === TOTAL * 0.5 || count === TOTAL) {
        console.log('[STREAM] Получено: ' + count + ' (' + Math.round((count / TOTAL) * 100) + '%)');
      }
    });

    stream.on('end', () => {
      const sec = ((Date.now() - start) / 1000).toFixed(1);
      console.log('Обработано за ' + sec + ' сек');
      console.log('Прирост памяти (пик): ' + (peak - base).toFixed(1) + ' МБ');
      resolve();
    });

    stream.on('error', reject);
  });
}

// Для сравнения: весь результат сразу в массив
async function readAll() {
  console.log('');
  console.log('Сравнение: SELECT целиком');
  runGc();
  const base = heapMb();
  const [rows] = await pool.query('SELECT * FROM big_data');
  const used = heapMb() - base;
  console.log('Загружено в память: ' + rows.length + ' записей');
  console.log('Прирост памяти: ' + used.toFixed(1) + ' МБ');
}

// Транзакция: все INSERT или ничего
async function addStudents(list) {
  const connection = await pool.getConnection();
  let step = 0;
  try {
    await connection.beginTransaction();
    console.log('Начало транзакции');
    for (const s of list) {
      step++;
      await connection.query('INSERT INTO tx_demo (id, name) VALUES (?, ?)', [s[0], s[1]]);
      console.log('INSERT ' + step + ' выполнен');
    }
    await connection.commit();
    console.log('Commit выполнен');
  } catch (err) {
    console.log('INSERT ' + step + ' не выполнен (' + err.code + ')');
    await connection.rollback();
    console.log('Rollback выполнен');
  } finally {
    // соединение возвращаем в пул всегда
    connection.release();
    console.log('Соединение возвращено в пул');
  }
}

async function demoTransactions() {
  console.log('');
  console.log('=== Транзакция ===');
  await pool.query('DROP TABLE IF EXISTS tx_demo');
  await pool.query('CREATE TABLE tx_demo (id INT PRIMARY KEY, name VARCHAR(100) NOT NULL)');

  console.log('Успешная транзакция:');
  await addStudents([[1, 'Иван'], [2, 'Мария']]);

  console.log('');
  console.log('Транзакция с ошибкой:');
  // третий INSERT повторяет id=1, поэтому всё откатится
  await addStudents([[3, 'Петр'], [4, 'Олег'], [1, 'Анна']]);

  const [cnt] = await pool.query('SELECT COUNT(*) AS c FROM tx_demo');
  console.log('Записей в tx_demo после отката: ' + cnt[0].c);
}

async function main() {
  pool = makePool();
  try {
    await demoErrors();
    await demoPoolErrors();
    await createBigData();
    await readStream();
    await readAll();
    await demoTransactions();
  } catch (err) {
    console.log('Ошибка: ' + err.code + ' ' + err.message);
  }
  await pool.end();
}

main();

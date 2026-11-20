const mysql = require('mysql2/promise');
const config = require('./config');

const pool = mysql.createPool({ ...config, connectionLimit: 10 });
const GROUP = '478';

// Вывод списка студентов
function printRows(rows) {
  rows.forEach((s) => {
    console.log('id=' + s.id + ', name=' + s.name + ', group=' + s.group_name + ', grade=' + s.grade);
  });
}

// Проверка, есть ли таблица в базе
async function tableExists(name) {
  const [rows] = await pool.query('SHOW TABLES LIKE ?', [name]);
  return rows.length > 0;
}

async function createTable() {
  console.log('=== Создание таблицы ===');
  await pool.query('DROP TABLE IF EXISTS students');
  await pool.query(`
    CREATE TABLE students (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      group_name VARCHAR(20) NOT NULL,
      course INT NOT NULL,
      grade DECIMAL(3,2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('Таблица students создана');
}

async function insertData() {
  console.log('');
  console.log('=== INSERT ===');

  // один студент
  const [one] = await pool.query(
    'INSERT INTO students (name, group_name, course, grade) VALUES (?, ?, ?, ?)',
    ['Иван', GROUP, 2, 4.2]
  );
  console.log('Вставлен студент: id=' + one.insertId + ', affectedRows=' + one.affectedRows);

  // несколько студентов одним запросом
  const [many] = await pool.query(
    'INSERT INTO students (name, group_name, course, grade) VALUES ?',
    [[
      ['Мария', GROUP, 2, 3.8],
      ['Петр', GROUP, 2, 4.2],
      ['Анна', GROUP, 2, 4.7]
    ]]
  );
  console.log('Вставлено 3 студента: affectedRows=' + many.affectedRows);
}

async function selectData() {
  console.log('');
  console.log('=== SELECT ===');

  const [all] = await pool.query('SELECT * FROM students');
  console.log('Все студенты:');
  printRows(all);

  // фильтр по группе и сортировка по оценке
  const [sorted] = await pool.query(
    'SELECT * FROM students WHERE group_name = ? ORDER BY grade DESC',
    [GROUP]
  );
  console.log('Студенты группы ' + GROUP + ' (сортировка по grade):');
  printRows(sorted);

  // пагинация: по 2 записи, вторая страница
  const [page] = await pool.query(
    'SELECT * FROM students ORDER BY id LIMIT ? OFFSET ?',
    [2, 2]
  );
  console.log('Пагинация (LIMIT 2 OFFSET 2):');
  printRows(page);
}

async function updateData() {
  console.log('');
  console.log('=== UPDATE ===');

  const [first] = await pool.query('UPDATE students SET grade = ? WHERE id = ?', [4.5, 1]);
  console.log('Обновлён студент id=1: affectedRows=' + first.affectedRows + ', changedRows=' + first.changedRows);

  // то же значение второй раз: строка найдена, но не изменилась
  const [second] = await pool.query('UPDATE students SET grade = ? WHERE id = ?', [4.5, 1]);
  console.log('Повторное обновление: affectedRows=' + second.affectedRows + ', changedRows=' + second.changedRows);
}

async function deleteById() {
  console.log('');
  console.log('=== DELETE ===');
  const [res] = await pool.query('DELETE FROM students WHERE id = ?', [1]);
  console.log('Удалён студент id=1: affectedRows=' + res.affectedRows);
}

async function injectionDemo() {
  console.log('');
  console.log('=== Защита от SQL-инъекции ===');

  // отдельная таблица, чтобы не ломать students
  await pool.query('DROP TABLE IF EXISTS demo_inj');
  await pool.query('CREATE TABLE demo_inj (id INT PRIMARY KEY)');

  // после -- нужен пробел, иначе MySQL не считает это комментарием
  const evil = "'; DROP TABLE demo_inj; -- ";
  console.log('Попытка инъекции: "' + evil + '"');

  // плохой способ: склеиваем строку
  const unsafeSql = "SELECT * FROM students WHERE name = '" + evil + "'";
  console.log('Запрос при конкатенации: ' + unsafeSql);

  // по умолчанию драйвер не пускает два запроса сразу, поэтому включаем для демонстрации
  const unsafePool = mysql.createPool({ ...config, multipleStatements: true });
  await unsafePool.query(unsafeSql);
  await unsafePool.end();
  if (!(await tableExists('demo_inj'))) {
    console.log('Конкатенация привела к удалению таблицы demo_inj');
  }

  // хороший способ: плейсхолдер
  const [rows] = await pool.query('SELECT * FROM students WHERE name = ?', [evil]);
  console.log('Параметризованный запрос безопасен, найдено строк: ' + rows.length);
  console.log('Таблица students на месте: ' + (await tableExists('students')));
}

async function deleteGroup() {
  console.log('');
  console.log('=== Удаление группы ===');
  const [res] = await pool.query('DELETE FROM students WHERE group_name = ?', [GROUP]);
  console.log('Удалены студенты группы ' + GROUP + ': affectedRows=' + res.affectedRows);
}

async function main() {
  try {
    await createTable();
    await insertData();
    await selectData();
    await updateData();
    await deleteById();
    await injectionDemo();
    await deleteGroup();
  } catch (err) {
    console.log('Ошибка: ' + err.code + ' ' + err.message);
  }
  await pool.end();
}

main();

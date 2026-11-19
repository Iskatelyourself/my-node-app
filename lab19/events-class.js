const EventEmitter = require('events');

// класс базы данных, наследуется от EventEmitter
class DatabaseConnection extends EventEmitter {
  connect() {
    this.emit('connect', 'Подключение к БД...');
    this.emit('connected', 'Соединение установлено');
  }

  query(sql) {
    // результат запроса зависит от его типа
    let result = '50 записей';
    if (sql.startsWith('INSERT')) {
      result = '1 запись добавлена';
    }
    this.emit('query', sql, result);
  }

  close() {
    this.emit('close', 'Закрытие соединения');
    this.emit('closed', 'Соединение закрыто');
  }

  error(message) {
    this.emit('error', new Error(message));
  }
}

console.log('=== DatabaseConnection (группа 478) ===');

const db = new DatabaseConnection();

// подписка на все события
db.on('connect', (msg) => console.log(`[EVENT] ${msg}`));
db.on('connected', (msg) => console.log(`[EVENT] ${msg}`));
db.on('query', (sql, result) => {
  console.log(`[EVENT] Выполнение запроса: ${sql}`);
  console.log(`[EVENT] Результат: ${result}`);
});
db.on('close', (msg) => console.log(`[EVENT] ${msg}`));
db.on('closed', (msg) => console.log(`[EVENT] ${msg}`));
db.on('error', (err) => console.log(`[EVENT] Ошибка: ${err.message}`));

// последовательность операций
db.connect();
db.query('SELECT * FROM students');
db.query('INSERT INTO students');
db.close();

console.log('=== Демонстрация ошибки ===');
db.error('Connection timeout');

// второй экземпляр без слушателя error
const db2 = new DatabaseConnection();

if (process.argv[2] === 'crash') {
  // реальное падение процесса
  console.log('Эмитим error без слушателя:');
  db2.error('Connection timeout');
} else {
  // без crash ловим исключение, чтобы скрипт дошёл до конца
  try {
    db2.error('Connection timeout');
  } catch (err) {
    console.log(`Без слушателя error выброшено исключение: ${err.message}`);
  }
  console.log('(для реального падения запустите: node events-class.js crash)');
}

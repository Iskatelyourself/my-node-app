const { Readable } = require('stream');

// Данные, которые поток будет отдавать по частям
const lines = [
  'Группа: 478',
  'Студент: Юреня Даниил',
  'Лабораторная работа: №21',
  'Тема: Потоки в Node.js'
];

let index = 0;

const readable = new Readable({
  // Node сам вызывает _read, когда ему нужен следующий кусок
  read() {
    if (index < lines.length) {
      this.push(lines[index]);
      index++;
    } else {
      // null означает конец потока
      this.push(null);
    }
  }
});

let count = 0;
let totalSize = 0;

console.log('Демонстрация Readable-потока');

readable.on('data', (chunk) => {
  count++;
  totalSize += chunk.length;
  console.log(`[CHUNK ${count}] ${chunk.toString()}`);
});

readable.on('end', () => {
  console.log('[END] Поток завершён');
  console.log(`Всего получено чанков: ${count}`);
  console.log(`Общий размер данных: ${totalSize} байт`);
});

readable.on('error', (err) => {
  console.log('[ERROR] ' + err.message);
});

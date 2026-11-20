const { Writable } = require('stream');

const lines = [
  'Группа: 478',
  'Студент: Юреня Даниил',
  'Лабораторная работа: №21',
  'Тема: Потоки в Node.js'
];

let written = 0;

// highWaterMark 16 - очень маленький буфер, чтобы быстро получить false
const writable = new Writable({
  highWaterMark: 16,
  write(chunk, encoding, callback) {
    console.log(`[WRITE] ${chunk.toString()}`);
    written++;
    // имитация медленной записи
    setTimeout(callback, 100);
  }
});

writable.on('drain', () => {
  console.log('[DRAIN] Буфер освобождён, продолжаем запись');
  writeNext();
});

writable.on('finish', () => {
  console.log('[FINISH] Все данные записаны');
  console.log(`Всего записано: ${written} чанка`);
});

writable.on('error', (err) => {
  console.log('[ERROR] ' + err.message);
});

let i = 0;

function writeNext() {
  while (i < lines.length) {
    const ok = writable.write(lines[i]);
    i++;
    if (ok) {
      console.log('write() вернул: true');
    } else {
      console.log('write() вернул: false <- буфер переполнен!');
      // ждём drain, потом writeNext вызовется снова
      return;
    }
  }
  // всё отправили
  writable.end();
}

console.log('Демонстрация Writable-потока');
writeNext();

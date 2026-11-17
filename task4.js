const fs = require('fs/promises');
const { createReadStream, createWriteStream } = require('fs');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');
const readline = require('readline');
const N = require('./variant');
const { formatSize } = require('./utils');

const inputFile = 'data_' + N + '.txt';
const outputFile = 'processed_' + N + '.txt';
const LINES = 100000;

async function fileExists(name) {
  try {
    await fs.access(name);
    return true;
  } catch (err) {
    return false;
  }
}

// создаем файл через поток, чтобы не держать все строки в памяти
async function generateFile() {
  async function* makeLines() {
    for (let i = 1; i <= LINES; i++) {
      const num = Math.floor(Math.random() * 1000) + 1;
      yield i + ', ' + num + ', Вариант ' + N + '\n';
    }
  }
  await pipeline(Readable.from(makeLines()), createWriteStream(inputFile));
}

// медиана по частотам чисел (чтобы не хранить все числа)
function getMedian(freq, total) {
  const keys = [...freq.keys()].sort((a, b) => a - b);
  const pos1 = Math.floor((total - 1) / 2);
  const pos2 = Math.floor(total / 2);
  let acc = 0;
  let v1;
  let v2;

  for (const key of keys) {
    acc += freq.get(key);
    if (v1 === undefined && pos1 < acc) v1 = key;
    if (v2 === undefined && pos2 < acc) {
      v2 = key;
      break;
    }
  }
  return (v1 + v2) / 2;
}

async function main() {
  try {
    if (!(await fileExists(inputFile))) {
      console.log('Файл ' + inputFile + ' не найден, создаю...');
      await generateFile();
    }

    const startTime = Date.now();
    const fileInfo = await fs.stat(inputFile);
    console.log('Обработка файла: ' + inputFile);
    console.log('Размер файла: ' + formatSize(fileInfo.size) + '\n');

    // читаем потоком, буфер 64 КБ
    const input = createReadStream(inputFile, { highWaterMark: 64 * 1024 });
    const rl = readline.createInterface({ input: input, crlfDelay: Infinity });

    let count = 0;
    let sum = 0;
    let max = -Infinity;
    let min = Infinity;
    let badLines = 0;
    let doneBytes = 0;
    let nextMark = 10;
    const freq = new Map();

    for await (const line of rl) {
      doneBytes += Buffer.byteLength(line) + 1;
      if (line.trim() === '') continue;

      // строка вида: 1, 847, Вариант 16
      const parts = line.split(',');
      const num = parseInt(parts[1]);
      if (isNaN(num)) {
        badLines++;
        continue;
      }

      count++;
      sum += num;
      if (num > max) max = num;
      if (num < min) min = num;
      freq.set(num, (freq.get(num) || 0) + 1);

      // прогресс каждые 10%
      const percent = Math.floor(doneBytes / fileInfo.size * 100);
      while (nextMark <= 100 && percent >= nextMark) {
        console.log('Прогресс: ' + nextMark + '% (' + count.toLocaleString('en-US') + ' строк обработано)');
        nextMark += 10;
      }
    }

    if (count === 0) {
      console.log('В файле нет данных для обработки');
      return;
    }

    const average = sum / count;
    const median = getMedian(freq, count);
    const seconds = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('Обработка завершена');
    console.log('Результаты:');
    console.log('  - Всего строк: ' + count.toLocaleString('en-US'));
    console.log('  - Сумма чисел: ' + sum.toLocaleString('en-US'));
    console.log('  - Среднее значение: ' + average.toFixed(2));
    console.log('  - Максимальное число: ' + max);
    console.log('  - Минимальное число: ' + min);
    console.log('  - Медиана: ' + median);
    if (badLines > 0) console.log('  - Пропущено строк с ошибками: ' + badLines);

    // результаты в файл
    const result = [
      'Файл: ' + inputFile,
      'Всего строк: ' + count,
      'Сумма чисел: ' + sum,
      'Среднее значение: ' + average.toFixed(2),
      'Максимальное число: ' + max,
      'Минимальное число: ' + min,
      'Медиана: ' + median
    ];
    await fs.writeFile(outputFile, result.join('\n') + '\n', 'utf8');

    console.log('\nРезультаты сохранены в: ' + outputFile);
    console.log('Время выполнения: ' + seconds + ' сек');
  } catch (err) {
    console.error('Ошибка при обработке файла: ' + err.message);
  }
}

main();

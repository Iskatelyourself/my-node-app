const fs = require('fs');
const { pipeline, Transform } = require('stream');

// Если input.txt нет, создаём его размером ровно 1024 байта
if (!fs.existsSync('input.txt')) {
  let text = '';
  let n = 1;
  while (text.length < 1024) {
    text += `Line ${String(n).padStart(3, '0')}: stream test data\n`;
    n++;
  }
  fs.writeFileSync('input.txt', text.slice(0, 1024));
}

// Ждём заданное число миллисекунд
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 1. Успешное копирование через pipe()
function pipeOk() {
  return new Promise((resolve) => {
    console.log('Демонстрация pipe()');
    console.log('Чтение: input.txt');
    console.log('Запись: output-pipe.txt');
    const rs = fs.createReadStream('input.txt');
    const ws = fs.createWriteStream('output-pipe.txt');
    rs.pipe(ws);
    ws.on('finish', () => {
      console.log('Копирование завершено');
      console.log(`Размер: ${fs.statSync('output-pipe.txt').size} байт`);
      console.log('Файлы одинаковые: ' + fs.readFileSync('input.txt').equals(fs.readFileSync('output-pipe.txt')));
      console.log('');
      resolve();
    });
  });
}

// 2. pipe() с ошибкой: читаем файл, которого нет
async function pipeError() {
  console.log('Демонстрация pipe() с ошибкой');
  console.log('Чтение: missing.txt');
  const rs = fs.createReadStream('missing.txt');
  const ws = fs.createWriteStream('output-pipe-error.txt');
  rs.pipe(ws);
  rs.on('error', (err) => {
    console.log('Ошибка: ' + err.message);
  });
  await sleep(300);
  // pipe() сам ничего не закрыл, смотрим на состояние целевого потока
  if (!ws.destroyed) {
    console.log('Внимание: pipe() не закрыл целевой поток!');
    console.log('Возможна утечка памяти.');
  } else {
    console.log('Целевой поток закрыт');
  }
  // закрываем вручную, чтобы не оставлять открытый файл
  ws.destroy();
  console.log('');
}

// 3. Успешное копирование через pipeline()
function pipelineOk() {
  return new Promise((resolve) => {
    console.log('Демонстрация pipeline()');
    console.log('Чтение: input.txt');
    console.log('Запись: output-pipeline.txt');
    pipeline(
      fs.createReadStream('input.txt'),
      fs.createWriteStream('output-pipeline.txt'),
      (err) => {
        if (err) {
          console.log('Ошибка: ' + err.message);
        } else {
          console.log('Копирование завершено');
          console.log('Файлы одинаковые: ' + fs.readFileSync('input.txt').equals(fs.readFileSync('output-pipeline.txt')));
        }
        console.log('');
        resolve();
      }
    );
  });
}

// 4. pipeline() с ошибкой
function pipelineError() {
  return new Promise((resolve) => {
    console.log('Демонстрация pipeline() с ошибкой');
    console.log('Чтение: missing.txt');
    const rs = fs.createReadStream('missing.txt');
    const ws = fs.createWriteStream('output-pipeline-error.txt');
    pipeline(rs, ws, (err) => {
      if (err) {
        console.log('Ошибка: ' + err.message);
      }
      // у pipeline один колбэк на всё, потоки уже закрыты
      console.log('Поток чтения закрыт: ' + rs.destroyed);
      console.log('Поток записи закрыт: ' + ws.destroyed);
      if (rs.destroyed && ws.destroyed) {
        console.log('Все потоки автоматически закрыты');
        console.log('Утечек нет');
      }
      console.log('');
      resolve();
    });
  });
}

// 5. Цепочка: input.txt -> uppercase -> reverse -> output-chain.txt
function chain() {
  return new Promise((resolve) => {
    console.log('Цепочка потоков');
    console.log('input.txt -> uppercase -> reverse -> output-chain.txt');

    const upperCase = new Transform({
      transform(chunk, encoding, callback) {
        callback(null, chunk.toString().toUpperCase());
      }
    });

    // разворачиваем текст каждого чанка задом наперёд
    const reverse = new Transform({
      transform(chunk, encoding, callback) {
        callback(null, chunk.toString().split('').reverse().join(''));
      }
    });

    const ws = fs.createWriteStream('output-chain.txt');
    fs.createReadStream('input.txt').pipe(upperCase).pipe(reverse).pipe(ws);

    ws.on('finish', () => {
      console.log('Обработка завершена');
      console.log('Начало output-chain.txt:');
      console.log(fs.readFileSync('output-chain.txt', 'utf8').slice(0, 60));
      resolve();
    });
  });
}

async function main() {
  await pipeOk();
  await pipeError();
  await pipelineOk();
  await pipelineError();
  await chain();
}

main();

const fs = require('fs/promises');
const { createReadStream, createWriteStream } = require('fs');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');
const crypto = require('crypto');
const path = require('path');
const N = require('./variant');
const { formatSize, plural, formatDate } = require('./utils');

const sourceDir = 'source_' + N;
const backupDir = 'backup_' + N;
const reportFile = 'sync_report_' + N + '.txt';
const zipFile = backupDir + '.zip';

const KB = 1024;
const MB = 1024 * 1024;
const CHUNK = 512 * KB;

// эти расширения копируем потоками, остальные обычным способом
const streamExt = ['.txt', '.js', '.json'];

// файлы для тестовой папки: [имя, размер в байтах]
const sourceFiles = [
  ['notes.txt', 2 * KB],
  ['report.txt', 300 * KB],
  ['big_text.txt', 2 * MB],
  ['app.js', 4 * KB],
  ['utils.js', 6 * KB],
  ['big_script.js', 1200 * KB],
  ['config.json', 1 * KB],
  ['users.json', 20 * KB],
  ['readme.md', 1 * KB],
  ['todo.md', 2 * KB],
  ['styles.css', 3 * KB],
  ['index.html', 2 * KB],
  ['data.csv', 40 * KB],
  ['server.log', 8 * KB],
  ['photo1.jpg', 200 * KB],
  ['photo2.jpg', 800 * KB],
  ['logo.png', 50 * KB],
  ['banner.png', 1500 * KB],
  ['anim.gif', 120 * KB],
  ['icon.gif', 10 * KB],
  [path.join('docs', 'guide.txt'), 5 * KB],
  [path.join('docs', 'manual.md'), 3 * KB],
  [path.join('images', 'cat.jpg'), 150 * KB],
  [path.join('images', 'dog.png'), 90 * KB],
  [path.join('scripts', 'build.js'), 3 * KB],
  [path.join('scripts', 'deploy.js'), 2 * KB],
  [path.join('scripts', 'settings.json'), 1 * KB]
];

// содержимое файла нужного размера
function makeContent(name, size) {
  const ext = path.extname(name).toLowerCase();

  // картинки - просто случайные байты
  if (['.jpg', '.png', '.gif'].includes(ext)) {
    return crypto.randomBytes(size);
  }

  if (ext === '.json') {
    const head = '{"file":"' + path.basename(name) + '","data":"';
    const tail = '"}';
    return head + 'a'.repeat(Math.max(0, size - head.length - tail.length)) + tail;
  }

  let text = '';
  let i = 1;
  while (text.length < size) {
    text += 'line ' + i + ' of ' + path.basename(name) + '\n';
    i++;
  }
  return text.slice(0, size);
}

// рекурсивно собираем список файлов с размером и датой изменения
async function listFiles(dir, base) {
  const result = [];
  const items = await fs.readdir(dir, { withFileTypes: true });

  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      result.push(...await listFiles(full, base));
    } else if (item.isFile()) {
      const info = await fs.stat(full);
      result.push({
        rel: path.relative(base, full),
        full: full,
        size: info.size,
        mtimeMs: info.mtimeMs,
        ext: path.extname(item.name).toLowerCase()
      });
    }
  }
  return result;
}

async function createSource() {
  await fs.mkdir(sourceDir, { recursive: true });

  for (const [name, size] of sourceFiles) {
    const full = path.join(sourceDir, name);
    await fs.mkdir(path.dirname(full), { recursive: true });
    const content = makeContent(name, size);

    // большие файлы пишем потоком
    if (size > MB) {
      await pipeline(Readable.from([content]), createWriteStream(full));
    } else {
      await fs.writeFile(full, content);
    }
  }

  // manifest.json с описанием всех файлов
  const list = await listFiles(sourceDir, sourceDir);
  const manifest = list.map(f => ({
    path: f.rel.split(path.sep).join('/'),
    size: f.size,
    extension: f.ext
  }));
  await fs.writeFile(path.join(sourceDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
}

// копирование потоком (для больших файлов кусками по 512 КБ)
async function copyWithStream(src, dest, size) {
  const options = size > MB ? { highWaterMark: CHUNK } : {};
  await pipeline(createReadStream(src, options), createWriteStream(dest));
}

// обычное копирование, но большие файлы режем на куски по 512 КБ
async function copyInChunks(src, dest) {
  const from = await fs.open(src, 'r');
  const to = await fs.open(dest, 'w');
  try {
    const buffer = Buffer.alloc(CHUNK);
    let position = 0;
    while (true) {
      const { bytesRead } = await from.read(buffer, 0, CHUNK, position);
      if (bytesRead === 0) break;
      await to.write(buffer, 0, bytesRead, position);
      position += bytesRead;
    }
  } finally {
    await from.close();
    await to.close();
  }
}

// сравнение двух папок
async function compareDirs(srcDir, dstDir) {
  const srcList = await listFiles(srcDir, srcDir);
  const dstList = await listFiles(dstDir, dstDir);
  const srcMap = new Map(srcList.map(f => [f.rel, f]));
  const dstMap = new Map(dstList.map(f => [f.rel, f]));

  const result = { same: [], changed: [], added: [], removed: [] };

  for (const f of srcList) {
    const copy = dstMap.get(f.rel);
    if (!copy) {
      result.added.push(f.rel);
    } else {
      const reasons = [];
      if (f.size !== copy.size) reasons.push('size');
      // время может отличаться на миллисекунду из-за округления, поэтому допуск 2 мс
      if (Math.abs(f.mtimeMs - copy.mtimeMs) > 2) reasons.push('modified');
      if (reasons.length > 0) {
        result.changed.push(f.rel + ' (' + reasons.join(', ') + ')');
      } else {
        result.same.push(f.rel);
      }
    }
  }

  for (const f of dstList) {
    if (!srcMap.has(f.rel)) result.removed.push(f.rel);
  }
  return result;
}

function printCompare(title, r) {
  console.log(title);
  console.log('  - Совпадают: ' + r.same.length + ' ' + plural(r.same.length, ['файл', 'файла', 'файлов']));
  console.log('  - Изменены: ' + r.changed.length + ' ' + plural(r.changed.length, ['файл', 'файла', 'файлов']));
  console.log('  - Добавлены: ' + r.added.length + ' ' + plural(r.added.length, ['файл', 'файла', 'файлов']));
  console.log('  - Удалены: ' + r.removed.length + ' ' + plural(r.removed.length, ['файл', 'файла', 'файлов']));
}

function compareToText(title, r) {
  let text = title + '\n';
  text += 'Совпадают: ' + r.same.length + '\n';
  text += 'Изменены: ' + r.changed.length + '\n';
  r.changed.forEach(f => { text += '  ' + f + '\n'; });
  text += 'Добавлены (есть в ' + sourceDir + ', нет в ' + backupDir + '): ' + r.added.length + '\n';
  r.added.forEach(f => { text += '  ' + f + '\n'; });
  text += 'Удалены (есть в ' + backupDir + ', нет в ' + sourceDir + '): ' + r.removed.length + '\n';
  r.removed.forEach(f => { text += '  ' + f + '\n'; });
  return text;
}

// архив backup в zip (сторонний модуль archiver)
async function makeZip() {
  let archiver;
  try {
    archiver = require('archiver');
  } catch (err) {
    console.error('Модуль archiver не установлен, нужно выполнить: npm install archiver');
    return;
  }

  await new Promise((resolve, reject) => {
    const output = createWriteStream(zipFile);
    // в новых версиях archiver создается через класс ZipArchive, в старых - функцией
    const options = { zlib: { level: 9 } };
    const archive = typeof archiver === 'function' ? archiver('zip', options) : new archiver.ZipArchive(options);
    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(backupDir, false);
    archive.finalize();
  });

  const info = await fs.stat(zipFile);
  console.log('Создан архив: ' + zipFile + ' (' + formatSize(info.size) + ')');
}

async function main() {
  try {
    // чистим результаты прошлого запуска
    await fs.rm(sourceDir, { recursive: true, force: true });
    await fs.rm(backupDir, { recursive: true, force: true });
    await fs.rm(zipFile, { force: true });

    await createSource();
    const files = await listFiles(sourceDir, sourceDir);

    console.log('Исходная директория: ' + sourceDir);
    console.log('Директория назначения: ' + backupDir);
    console.log('Обнаружено файлов: ' + files.length);

    // группируем по расширениям для вывода
    const groups = {};
    for (const f of files) {
      const ext = f.ext || 'без расширения';
      if (!groups[ext]) groups[ext] = { count: 0, size: 0 };
      groups[ext].count++;
      groups[ext].size += f.size;
    }
    const exts = Object.keys(groups);
    exts.forEach((ext, i) => {
      const g = groups[ext];
      const method = streamExt.includes(ext) ? 'потоковое копирование' : 'обычное копирование';
      const mark = i === exts.length - 1 ? '└── ' : '├── ';
      console.log(mark + ext + ': ' + g.count + ' ' + plural(g.count, ['файл', 'файла', 'файлов']) + ' (' + formatSize(g.size) + ') - ' + method);
    });
    console.log('');

    // копируем
    const startTime = Date.now();
    let streamCount = 0;
    let normalCount = 0;
    let totalSize = 0;
    let done = 0;

    for (const f of files) {
      const dest = path.join(backupDir, f.rel);
      await fs.mkdir(path.dirname(dest), { recursive: true });

      if (streamExt.includes(f.ext)) {
        await copyWithStream(f.full, dest, f.size);
        streamCount++;
      } else {
        if (f.size > MB) {
          await copyInChunks(f.full, dest);
        } else {
          await fs.copyFile(f.full, dest);
        }
        normalCount++;
      }

      // ставим такую же дату изменения как у оригинала, чтобы потом сравнивать
      const date = new Date(f.mtimeMs);
      await fs.utimes(dest, date, date);

      totalSize += f.size;
      done++;
      process.stdout.write('\rПрогресс копирования: ' + done + '/' + files.length + ' файлов');
    }

    const seconds = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\nКопирование завершено');
    console.log('Статистика:');
    console.log('  - Скопировано файлов: ' + done);
    console.log('  - Потоковое копирование: ' + streamCount + ' ' + plural(streamCount, ['файл', 'файла', 'файлов']));
    console.log('  - Обычное копирование: ' + normalCount + ' ' + plural(normalCount, ['файл', 'файла', 'файлов']));
    console.log('  - Общий размер: ' + formatSize(totalSize));
    console.log('  - Время выполнения: ' + seconds + ' сек\n');

    // сравнение сразу после копирования
    const first = await compareDirs(sourceDir, backupDir);
    printCompare('Сравнение директорий после копирования:', first);

    // для моего варианта: архив в zip
    await makeZip();

    // чтобы проверить сравнение, меняем исходную папку
    await fs.appendFile(path.join(sourceDir, 'notes.txt'), 'новая строка\n');
    await fs.writeFile(path.join(sourceDir, 'new_file.txt'), 'новый файл\n');
    await fs.rm(path.join(sourceDir, 'todo.md'));
    console.log('\nВ ' + sourceDir + ' изменен notes.txt, добавлен new_file.txt, удален todo.md');

    const second = await compareDirs(sourceDir, backupDir);
    printCompare('Сравнение директорий после изменений:', second);

    // отчет
    const report = 'Отчет синхронизации, вариант ' + N + '\n' +
      'Дата: ' + formatDate(new Date()) + '\n\n' +
      compareToText('После копирования:', first) + '\n' +
      compareToText('После изменений в ' + sourceDir + ':', second);
    await fs.writeFile(reportFile, report, 'utf8');
    console.log('\nОтчет сохранен: ' + reportFile);
  } catch (err) {
    console.error('\nОшибка: ' + err.message);
  }
}

main();

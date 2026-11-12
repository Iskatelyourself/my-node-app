const fs = require('fs/promises');
const path = require('path');
const N = require('./variant');
const { formatSize, plural } = require('./utils');

// путь из аргументов, если нет - текущая папка
const startDir = process.argv[2] || '.';

// собираем все файлы и считаем папки
async function scan(dir, result) {
  let items;
  try {
    items = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    console.error('Не удалось прочитать ' + dir + ': ' + err.message);
    return;
  }

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      result.folders++;
      await scan(fullPath, result);
    } else if (item.isFile()) {
      try {
        const info = await fs.stat(fullPath);
        result.files.push({
          name: item.name,
          path: fullPath,
          size: info.size,
          ext: path.extname(item.name).toLowerCase() || 'без расширения'
        });
      } catch (err) {
        console.error('Не удалось получить размер ' + fullPath + ': ' + err.message);
      }
    }
  }
}

async function main() {
  try {
    const startInfo = await fs.stat(startDir);
    if (!startInfo.isDirectory()) {
      console.error('Это не директория: ' + startDir);
      return;
    }

    const result = { folders: 0, files: [] };
    await scan(startDir, result);
    const files = result.files;

    // общий размер
    let totalSize = 0;
    for (const f of files) totalSize += f.size;

    // группируем по расширениям
    const groups = {};
    for (const f of files) {
      if (!groups[f.ext]) groups[f.ext] = { count: 0, size: 0, files: [] };
      groups[f.ext].count++;
      groups[f.ext].size += f.size;
      groups[f.ext].files.push(f.path);
    }

    // топ-5 больших и маленьких
    const bySize = [...files].sort((a, b) => b.size - a.size);
    const biggest = bySize.slice(0, 5);
    const smallest = [...bySize].reverse().slice(0, 5);

    // для моего варианта: ищем файлы с номером варианта в названии
    const withVariant = files.filter(f => f.name.includes(String(N)));

    console.log('Анализ директории: ' + startDir);
    console.log('Общее количество папок: ' + result.folders);
    console.log('Общее количество файлов: ' + files.length);
    console.log('Общий размер: ' + formatSize(totalSize) + ' (' + totalSize.toLocaleString('en-US') + ' байт)');

    console.log('Расширения файлов:');
    const exts = Object.keys(groups).sort((a, b) => groups[b].size - groups[a].size);
    for (const ext of exts) {
      const g = groups[ext];
      console.log('  ' + ext + ': ' + g.count + ' ' + plural(g.count, ['файл', 'файла', 'файлов']) + ' (' + formatSize(g.size) + ')');
    }

    console.log('\nТоп-5 самых больших файлов:');
    biggest.forEach((f, i) => {
      console.log(' ' + (i + 1) + '. ' + f.name + ' (' + formatSize(f.size) + ') - ' + f.path);
    });

    console.log('\nТоп-5 самых маленьких файлов:');
    smallest.forEach((f, i) => {
      console.log(' ' + (i + 1) + '. ' + f.name + ' (' + formatSize(f.size) + ') - ' + f.path);
    });

    console.log('\nФайлы с номером варианта (' + N + ') в названии: ' + withVariant.length);
    withVariant.forEach(f => console.log('  ' + f.path));

    // сохраняем отчет в json
    const report = {
      directory: startDir,
      variant: N,
      foldersCount: result.folders,
      filesCount: files.length,
      totalSize: {
        bytes: totalSize,
        kb: Number((totalSize / 1024).toFixed(2)),
        mb: Number((totalSize / 1024 / 1024).toFixed(2))
      },
      extensions: groups,
      biggestFiles: biggest.map(f => ({ name: f.name, size: f.size, path: f.path })),
      smallestFiles: smallest.map(f => ({ name: f.name, size: f.size, path: f.path })),
      filesWithVariantInName: withVariant.map(f => f.path)
    };

    const reportName = 'report_' + N + '.json';
    await fs.writeFile(reportName, JSON.stringify(report, null, 2), 'utf8');
    console.log('\nОтчет сохранен: ' + reportName);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error('Директория не найдена: ' + startDir);
    } else {
      console.error('Ошибка: ' + err.message);
    }
  }
}

main();

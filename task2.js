const fs = require('fs/promises');
const path = require('path');
const N = require('./variant');
const { formatDate } = require('./utils');

const root = 'project_' + N;

// все папки и описание для info.txt
const folders = [
  { dir: root, info: 'Корневая папка проекта' },
  { dir: path.join(root, 'src'), info: 'Исходный код приложения' },
  { dir: path.join(root, 'src', 'modules'), info: 'Модули приложения' },
  { dir: path.join(root, 'src', 'components'), info: 'Компоненты' },
  { dir: path.join(root, 'src', 'utils'), info: 'Вспомогательные функции' },
  { dir: path.join(root, 'data'), info: 'Данные проекта' },
  { dir: path.join(root, 'data', 'input'), info: 'Входные данные' },
  { dir: path.join(root, 'data', 'output'), info: 'Результаты обработки' },
  { dir: path.join(root, 'temp'), info: 'Временные файлы' }
];

// рисуем дерево папок
async function printTree(dir, prefix) {
  const items = await fs.readdir(dir, { withFileTypes: true });
  items.sort((a, b) => a.name.localeCompare(b.name));

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const isLast = i === items.length - 1;
    const name = item.isDirectory() ? item.name + '/' : item.name;
    console.log(prefix + (isLast ? '└── ' : '├── ') + name);

    if (item.isDirectory()) {
      await printTree(path.join(dir, item.name), prefix + (isLast ? '    ' : '│   '));
    }
  }
}

async function showTree() {
  console.log(root + '/');
  await printTree(root, '');
}

async function main() {
  try {
    // если папка осталась с прошлого запуска, удаляем
    await fs.rm(root, { recursive: true, force: true });

    // создаем папки и info.txt в каждой
    for (const folder of folders) {
      await fs.mkdir(folder.dir, { recursive: true });
      await fs.writeFile(path.join(folder.dir, 'info.txt'), folder.info + '\n', 'utf8');

      // для четного варианта еще README.md с датой
      if (N % 2 === 0) {
        await fs.writeFile(path.join(folder.dir, 'README.md'), 'Дата создания: ' + formatDate(new Date()) + '\n', 'utf8');
      }
    }

    // для нечетного варианта 3 вложенные папки в src/components
    if (N % 2 !== 0) {
      for (let i = 1; i <= 3; i++) {
        await fs.mkdir(path.join(root, 'src', 'components', String(i)), { recursive: true });
      }
    }

    console.log('Создана структура:');
    await showTree();

    // перемещаем temp внутрь data
    await fs.rename(path.join(root, 'temp'), path.join(root, 'data', 'temp'));
    console.log('\nПапка temp перемещена в data');

    // переименовываем output в results
    await fs.rename(path.join(root, 'data', 'output'), path.join(root, 'data', 'results'));
    console.log('Папка data/output переименована в data/results');

    // удаляем temp вместе с файлами
    await fs.rm(path.join(root, 'data', 'temp'), { recursive: true });
    console.log('Папка data/temp удалена\n');

    console.log('Обновленная структура:');
    await showTree();
  } catch (err) {
    console.error('Ошибка: ' + err.message);
  }
}

main();

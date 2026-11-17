const fs = require('fs/promises');
const path = require('path');
const N = require('./variant');
const { formatDate } = require('./utils');

const fileName = path.join('student_' + N + '.txt');

const books = [
  '"Евгений Онегин" - А. Пушкин',
  '"Отцы и дети" - И. Тургенев',
  '"Герой нашего времени" - М. Лермонтов',
  '"Собачье сердце" - М. Булгаков',
  '"451 градус по Фаренгейту" - Р. Брэдбери'
];

async function main() {
  try {
    // собираем строки для файла
    const lines = [
      'Студент: Юреня Даниил',
      'Группа: 478',
      'Вариант: ' + N,
      'Дата: ' + formatDate(new Date()),
      '',
      'Любимые книги:'
    ];
    books.forEach((book, i) => {
      lines.push((i + 1) + '. ' + book);
    });

    await fs.writeFile(fileName, lines.join('\n') + '\n', 'utf8');
    console.log('Создан файл: ' + fileName);

    // считаем строки в файле, пустые не считаем
    const text = await fs.readFile(fileName, 'utf8');
    const count = text.split('\n').filter(line => line.trim() !== '').length;

    // дописываем в конец
    await fs.appendFile(fileName, '\n\nКоличество записей: ' + count + '\n', 'utf8');

    // читаем и выводим
    const result = await fs.readFile(fileName, 'utf8');
    console.log('Содержимое файла:');
    console.log('─'.repeat(33));
    console.log(result.trimEnd());
    console.log('─'.repeat(33));
  } catch (err) {
    console.error('Ошибка при работе с файлом: ' + err.message);
  }
}

main();

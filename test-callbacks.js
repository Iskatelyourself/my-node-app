const FileManager = require('./fileOperations');

const fileManager = new FileManager('./test-data');

fileManager.createFile('test1.txt', 'Привет, мир!', (err, filePath) => {
  if (err) {
    console.error('Ошибка создания:', err.message);
    return;
  }
  console.log(`Файл создан: ${filePath}`);

  fileManager.readFile('test1.txt', (err, content) => {
    if (err) {
      console.error('Ошибка чтения:', err.message);
      return;
    }
    console.log(`Содержимое: "${content}"`);

    fileManager.getFileStats('test1.txt', (err, stats) => {
      if (err) {
        console.error('Ошибка статистики:', err.message);
        return;
      }
      console.log('Статистика:');
      console.log(`  Размер: ${stats.size} байт`);
      console.log(`  Создан: ${stats.created}`);
      console.log(`  Изменён: ${stats.modified}`);

      fileManager.createFile('test2.txt', 'Второй файл', (err, filePath2) => {
        if (err) {
          console.error('Ошибка создания второго файла:', err.message);
          return;
        }
        console.log(`Второй файл создан: ${filePath2}`);

        fileManager.listFiles((err, files) => {
          if (err) {
            console.error('Ошибка получения списка:', err.message);
            return;
          }
          console.log('Файлы в директории:');
          files.forEach(file => console.log(`  ${file}`));

          fileManager.deleteFile('test1.txt', (err) => {
            if (err) {
              console.error('Ошибка удаления test1.txt:', err.message);
              return;
            }
            console.log('test1.txt удалён');

            fileManager.deleteFile('test2.txt', (err) => {
              if (err) {
                console.error('Ошибка удаления test2.txt:', err.message);
                return;
              }
              console.log('test2.txt удалён');
            });
          });
        });
      });
    });
  });
});

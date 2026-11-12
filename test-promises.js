const FileManagerPromises = require('./fileOperationsPromises');

const fileManager = new FileManagerPromises('./test-data-promises');

async function testFileOperations() {
  try {
    const filePath = await fileManager.createFile('test1.txt', 'Привет из промисов!');
    console.log(`Файл создан: ${filePath}`);

    const content = await fileManager.readFile('test1.txt');
    console.log(`Содержимое: "${content}"`);

    const stats = await fileManager.getFileStats('test1.txt');
    console.log('Статистика:');
    console.log(`  Размер: ${stats.size} байт`);
    console.log(`  Создан: ${stats.created}`);
    console.log(`  Изменён: ${stats.modified}`);

    const files = [
      { filename: 'test2.txt', content: 'Второй файл' },
      { filename: 'test3.txt', content: 'Третий файл' },
      { filename: 'test4.txt', content: 'Четвёртый файл' }
    ];
    const paths = await fileManager.createMultipleFiles(files);
    console.log(`Создано файлов: ${paths.length}`);
    paths.forEach(p => console.log(`  ${p}`));

    const fileList = await fileManager.listFiles();
    console.log(`Найдено файлов: ${fileList.length}`);
    fileList.forEach(f => console.log(`  ${f}`));

    const contents = await fileManager.readMultipleFiles(fileList);
    console.log('Содержимое файлов:');
    Object.entries(contents).forEach(([filename, text]) => {
      console.log(`  ${filename}: "${text}"`);
    });

    for (const file of fileList) {
      await fileManager.deleteFile(file);
      console.log(`${file} удалён`);
    }
  } catch (error) {
    console.error('Ошибка:', error.message);
  }
}

testFileOperations();

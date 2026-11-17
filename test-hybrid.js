const FileManagerHybrid = require('./fileOperationsHybrid');
const { FileOperationError } = FileManagerHybrid;

const manager = new FileManagerHybrid('./test-data-hybrid');

async function run() {
  console.log('Колбэки:');
  await new Promise((resolve) => {
    manager.createFile('hybrid1.txt', 'Колбэк', (err, filePath) => {
      if (err) {
        console.error(err.message);
        return resolve();
      }
      console.log(`Создан: ${filePath}`);
      manager.readFile('hybrid1.txt', (err, content) => {
        if (err) console.error(err.message);
        else console.log(`Прочитано: "${content}"`);
        resolve();
      });
    });
  });

  console.log('\nПромисы:');
  const filePath = await manager.createFile('hybrid2.txt', 'Промис');
  console.log(`Создан: ${filePath}`);
  console.log(`Прочитано: "${await manager.readFile('hybrid2.txt')}"`);

  await manager.listFiles().then(files => console.log(`Файлы: ${files.join(', ')}`));

  console.log('\nОшибки:');
  try {
    await manager.readFile('missing.txt');
  } catch (err) {
    console.log(`${err.name}: ${err.message} (${err.code})`);
  }

  await new Promise((resolve) => {
    manager.readFile('missing.txt', (err) => {
      console.log(`Колбэк: ${err.message}`);
      resolve();
    });
  });

  try {
    await manager.createFile('', 'x');
  } catch (err) {
    console.log(err.message);
  }

  try {
    await manager.readFile('../index.js');
  } catch (err) {
    console.log(err.message, err instanceof FileOperationError);
  }

  for (const name of await manager.listFiles()) {
    await manager.deleteFile(name);
    console.log(`${name} удалён`);
  }
}

run().catch(err => console.error('Ошибка:', err));

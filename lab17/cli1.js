// Задание 1: простое CLI без библиотек, только process.argv
const args = process.argv.slice(2);
const command = args[0];

// Справка по использованию
function showHelp() {
  console.log('Использование: my-cli <команда> [аргументы]');
  console.log('Доступные команды:');
  console.log('  greet <имя> - поприветствовать пользователя');
  console.log('  info - вывести информацию о группе');
}

// Без аргументов или с --help показываем справку
if (args.length === 0 || command === '--help') {
  showHelp();
  process.exit(0);
}

if (command === 'greet') {
  const name = args[1];
  if (!name) {
    console.error('Ошибка: не указано имя');
    console.error('Пример: my-cli greet "Иван"');
    process.exit(1);
  }
  console.log(`Привет, ${name}! Добро пожаловать в CLI-приложение группы 478.`);
  process.exit(0);
}

if (command === 'info') {
  // Дата берется текущая, в формате ГГГГ-ММ-ДД
  const date = new Date().toISOString().slice(0, 10);
  console.log('Группа: 478');
  console.log('Студент: Юреня Даниил');
  console.log('Лабораторная работа: №17');
  console.log(`Дата: ${date}`);
  process.exit(0);
}

// Все остальное - неизвестная команда
console.error(`Ошибка: неизвестная команда "${command}"`);
console.error('Для справки используйте: my-cli --help');
process.exit(1);

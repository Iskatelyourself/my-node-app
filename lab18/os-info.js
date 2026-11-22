const os = require('os');

const GROUP = '478';

// Переводим секунды в часы, минуты и секунды
function formatUptime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return hours + ' ч ' + minutes + ' мин ' + seconds + ' сек';
}

const platform = os.platform();

console.log('=== Информация о системе (группа ' + GROUP + ') ===');
console.log('Платформа: ' + platform);
console.log('Тип ОС: ' + os.type());
console.log('Архитектура: ' + os.arch());
console.log('Версия ОС: ' + os.release());
console.log('Имя хоста: ' + os.hostname());
console.log('Время работы: ' + formatUptime(os.uptime()));

// Выводим сообщение в зависимости от платформы
switch (platform) {
  case 'win32':
    console.log('Вы работаете в Windows');
    break;
  case 'linux':
    console.log('Вы работаете в Linux');
    break;
  case 'darwin':
    console.log('Вы работаете в macOS');
    break;
  default:
    console.log('Неизвестная платформа');
}

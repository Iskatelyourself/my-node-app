const os = require('os');

const GROUP = '478';

// Оставляем первые три части MAC-адреса, остальные заменяем звёздочками
function maskMac(mac) {
  const parts = mac.split(':');
  return parts.map((part, i) => (i < 3 ? part.toUpperCase() : '**')).join(':');
}

// Сетевые интерфейсы
const interfaces = os.networkInterfaces();
const names = Object.keys(interfaces);
let mainName = null;
let mainAddress = null;

console.log('=== Сетевые интерфейсы ===');
for (const name of names) {
  let ipv4 = null;
  let ipv6 = null;
  let mac = null;
  let internal = false;

  for (const item of interfaces[name]) {
    if (item.family === 'IPv4' && !ipv4) ipv4 = item.address;
    if (item.family === 'IPv6' && !ipv6) ipv6 = item.address;
    mac = item.mac;
    internal = item.internal;

    // Основной интерфейс: первый внешний IPv4
    if (item.family === 'IPv4' && !item.internal && !mainName) {
      mainName = name;
      mainAddress = item.address;
    }
  }

  console.log('Интерфейс: ' + name);
  console.log('IPv4: ' + (ipv4 || 'нет'));
  console.log('IPv6: ' + (ipv6 || 'нет'));
  console.log('MAC: ' + (mac ? maskMac(mac) : 'нет'));
  console.log('Внутренний: ' + (internal ? 'да' : 'нет'));
  console.log('');
}

console.log('Всего интерфейсов: ' + names.length);
if (mainName) {
  console.log('Основной интерфейс: ' + mainName + ' (' + mainAddress + ')');
} else {
  console.log('Основной интерфейс: не найден');
}

// Информация о пользователе
const user = os.userInfo();

console.log('');
console.log('=== Информация о пользователе ===');
console.log('Имя пользователя: ' + user.username);
console.log('UID: ' + user.uid);
console.log('GID: ' + user.gid);
console.log('Домашняя директория: ' + user.homedir);
console.log('Оболочка по умолчанию: ' + (user.shell || 'не определена'));
console.log('Группа: ' + GROUP);

// Проверка, что пользователь не root (uid 0)
if (user.uid === 0) {
  console.log('Проверка root: да, запуск от root не рекомендуется');
} else {
  console.log('Проверка root: нет');
}

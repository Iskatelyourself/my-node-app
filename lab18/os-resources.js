const os = require('os');

const GROUP = '478';
const BYTES_IN_GB = 1024 * 1024 * 1024;

// Если запустить с флагом --low, память считается почти закончившейся
// (нужно только чтобы сделать скриншот предупреждения)
const lowMode = process.argv.includes('--low');

// Процессор
const cpus = os.cpus();
let speedSum = 0;
for (const cpu of cpus) {
  speedSum += cpu.speed;
}
const avgSpeed = Math.round(speedSum / cpus.length);

console.log('=== Информация о процессоре ===');
console.log('Количество логических ядер: ' + cpus.length);
console.log('Модель процессора: ' + cpus[0].model);
cpus.forEach((cpu, i) => {
  console.log('Ядро ' + (i + 1) + ': ' + cpu.speed + ' МГц');
});
console.log('Средняя частота: ' + avgSpeed + ' МГц');

// Память
const total = os.totalmem();
const free = lowMode ? total * 0.1 : os.freemem();
const used = total - free;
const freePercent = (free / total) * 100;
const usedPercent = (used / total) * 100;

console.log('');
console.log('=== Информация о памяти ===');
console.log('Общий объём: ' + (total / BYTES_IN_GB).toFixed(2) + ' ГБ');
console.log('Свободно: ' + (free / BYTES_IN_GB).toFixed(2) + ' ГБ');
console.log('Использовано: ' + (used / BYTES_IN_GB).toFixed(2) + ' ГБ (' + usedPercent.toFixed(1) + '%)');

// Средняя загрузка системы
console.log('');
console.log('=== Средняя загрузка системы ===');
if (os.platform() === 'win32') {
  console.log('Недоступно в Windows');
} else {
  const load = os.loadavg();
  console.log('За 1 минуту: ' + load[0].toFixed(2));
  console.log('За 5 минут: ' + load[1].toFixed(2));
  console.log('За 15 минут: ' + load[2].toFixed(2));
}

// Итог
console.log('');
console.log('Группа: ' + GROUP);
if (freePercent < 20) {
  console.log('Предупреждение: свободной памяти меньше 20%');
} else {
  console.log('Память в норме');
}

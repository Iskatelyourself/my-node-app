const EventEmitter = require('events');

const emitter = new EventEmitter();

// слушатели на три события
emitter.on('greet', (name) => {
  console.log(`[greet] Привет, ${name}!`);
});

emitter.on('info', (group) => {
  console.log(`[info] Группа: ${group}`);
});

emitter.on('bye', () => {
  console.log('[bye] До свидания!');
});

console.log('=== Демонстрация EventEmitter ===');

// вызываем события по очереди
emitter.emit('greet', 'Иван');
emitter.emit('info', '478');
emitter.emit('bye');

// emit возвращает true, если слушатели были, и false, если нет
const unknownResult = emitter.emit('unknown');
console.log(`Событие "unknown" без слушателей: ${unknownResult}`);

const greetResult = emitter.emit('greet', 'Иван');
console.log(`Событие "greet" со слушателями: ${greetResult}`);

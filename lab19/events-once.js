const EventEmitter = require('events');

const emitter = new EventEmitter();

let onCount = 0;
let onceCount = 0;
let tickNumber = 0;

// on вызывается при каждом событии
function onTick() {
  onCount++;
  console.log(`[tick #${tickNumber}] on-слушатель`);
}

// once сработает только один раз
function onceTick() {
  onceCount++;
  console.log(`[tick #${tickNumber}] once-слушатель`);
}

console.log('=== Сравнение on и once ===');
emitter.on('tick', onTick);
emitter.once('tick', onceTick);

// эмитим tick три раза
for (let i = 1; i <= 3; i++) {
  tickNumber = i;
  emitter.emit('tick');
}

console.log(`on-слушатель вызван: ${onCount} раза`);
console.log(`once-слушатель вызван: ${onceCount} раз`);

console.log('=== Управление подписками ===');
const emitter2 = new EventEmitter();

function a() {}
function b() {}
function c() {}

emitter2.on('data', a);
emitter2.addListener('data', b);
emitter2.on('data', c);

console.log(`Слушателей до удаления: ${emitter2.listenerCount('data')}`);
console.log(`Массив слушателей: ${emitter2.listeners('data').length} функции`);

// удаляем один конкретный слушатель
emitter2.removeListener('data', b);
console.log(`Слушателей после удаления одного: ${emitter2.listenerCount('data')}`);

// удаляем всех
emitter2.removeAllListeners('data');
console.log(`Слушателей после removeAllListeners: ${emitter2.listenerCount('data')}`);

console.log('=== Порядок вызова ===');
const emitter3 = new EventEmitter();

// слушатели вызываются в порядке добавления
emitter3.on('order', () => console.log('1. Первый слушатель (группа 478)'));
emitter3.on('order', () => console.log('2. Второй слушатель'));
emitter3.on('order', () => console.log('3. Третий слушатель'));

emitter3.emit('order');

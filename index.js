// Подключаем встроенный модуль для создания HTTP-сервера
const http = require('http');

// Подключаем встроенный модуль EventEmitter - он умеет "испускать" события
const EventEmitter = require('events');

// Подключаем наш файл логирования
const logger = require('./logger');

// Создаём класс сервера. Он "наследуется" от EventEmitter,
// то есть получает все его возможности (умеет emit и on)
class AppServer extends EventEmitter {

  // Метод для запуска сервера
  start(port) {
    // Создаём сам HTTP-сервер
    // Каждый раз когда кто-то делает запрос, срабатывает эта функция
    this.server = http.createServer(function (req, res) {
      // Испускаем событие "request:received" и передаёт данные о запросе
      this.emit('request:received', {
        url: req.url,
        method: req.method
      });

      // Отправляем ответ браузеру
      res.end('Hello from Event-Driven Server!');
    }.bind(this)); // нужен, чтобы внутри функции работал this.emit

    // Запускаем сервер на нужном порту
    this.server.listen(port, function () {
      // Когда сервер запустился - испускаем событие
      this.emit('server:started', port);
    }.bind(this));
  }

  // Метод для остановки сервера
  stop() {
    this.server.close(function () {
      this.emit('server:stopped');
    }.bind(this));
  }
}

// Создаём объект нашего сервера
const app = new AppServer();

// Подписываемся на событие "сервер запущен"
app.on('server:started', function (port) {
  console.log('Сервер запущен на порту ' + port);
});

// Подписываемся на событие "получен запрос"
app.on('request:received', function (data) {
  console.log('Получен запрос: ' + data.method + ' ' + data.url);
});

// Подписываемся на событие "сервер остановлен"
app.on('server:stopped', function () {
  console.log('Сервер остановлен');
});

// Подключаем логирование - теперь логгер тоже будет слушать события
logger.setupLogger(app);

// Запускаем сервер на порту 3000
app.start(3000);

// Через 10 секунд (10000 миллисекунд) сервер сам остановится
setTimeout(function () {
  app.stop();
}, 10000);
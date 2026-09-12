// Юреня Даниил Александрович, группа 478
const http = require('http');

const EventEmitter = require('events');

const logger = require('./logger');

function arctan(x, scale) {
  let sum = scale / BigInt(x);
  let term = sum;
  const x2 = BigInt(x * x);
  for (let k = 1n; term !== 0n; k++) {
    term /= x2;
    sum += (k % 2n === 0n ? 1n : -1n) * (term / (2n * k + 1n));
  }
  return sum;
}

function calcPi(digits) {
  const scale = 10n ** BigInt(digits + 10); // запас точности
  const pi = 4n * (4n * arctan(5, scale) - arctan(239, scale));
  const str = (pi / 10n ** 10n).toString();
  return `${str[0]}.${str.slice(1, 1 + digits)}`;
}

class AppServer extends EventEmitter {

  start(port) {

    this.server = http.createServer(function (req, res) {
      this.emit('request:received', {
        url: req.url,
        method: req.method
      });

      res.end('Hello from Event-Driven Server!');
    }.bind(this)); 

    this.server.listen(port, function () {
      this.emit('server:started', port);
    }.bind(this));
  }

  stop() {
    this.server.close(function () {
      this.emit('server:stopped');
    }.bind(this));
  }
}

const app = new AppServer();

app.on('server:started', function (port) {
  console.log('Сервер запущен на порту ' + port);
});

app.on('request:received', function (data) {
  console.log('Получен запрос: ' + data.method + ' ' + data.url);
});

app.on('server:stopped', function () {
  console.log('Сервер остановлен');
});

logger.setupLogger(app);

app.start(3000);

setTimeout(function () {
  app.stop();
}, 10000);
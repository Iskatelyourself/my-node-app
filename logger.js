// Подключаем модуль для работы с файлами
const fs = require('fs');

// Функция, которая настраивает логирование для переданного сервера
function setupLogger(app) {

  // Вспомогательная функция - записывает одну строку в файл logs.txt
  function writeLog(eventName, data) {
    // Получаем текущее время в читаемом виде
    const time = new Date().toLocaleString();

    // Собираем строку для записи в файл
    const line = '[' + time + '] ' + eventName + ': ' + JSON.stringify(data) + '\n';

    // Дописываем строку в конец файла (асинхронно, как требуется в задании)
    fs.appendFile('logs.txt', line, function (err) {
      if (err) {
        console.log('Ошибка записи в лог: ' + err);
      }
    });
  }

  // Подписываемся на каждое из трёх событий сервера
  app.on('server:started', function (port) {
    writeLog('server:started', port);
  });

  app.on('request:received', function (data) {
    writeLog('request:received', data);
  });

  app.on('server:stopped', function () {
    writeLog('server:stopped', 'сервер остановлен');
  });
}

// Экспортируем функцию, чтобы её можно было использовать в index.js
module.exports = { setupLogger: setupLogger };
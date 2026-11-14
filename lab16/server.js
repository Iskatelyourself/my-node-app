const express = require('express');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const variant = require('./variant');

const app = express();
const PORT = 3000;

// Контакты, впиши свои данные
const contacts = {
  email: '123123@gmail.com',
  phone: '+375 00 000-00-00'
};

// Книги хранятся в памяти
let books = [
  { id: 1, title: 'Война и мир', author: 'Толстой', year: 1869 },
  { id: 2, title: 'Анна Каренина', author: 'Толстой', year: 1877 },
  { id: 3, title: 'Преступление и наказание', author: 'Достоевский', year: 1866 },
  { id: 4, title: 'Мастер и Маргарита', author: 'Булгаков', year: 1967 }
];
let nextId = 5;

// Создание ошибки с кодом статуса
function createError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// Дата в формате 2024-01-15 14:30:25
function formatDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}

// Логгер: запоминаем начало, пишем строку когда ответ отправлен
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const time = Date.now() - start;
    console.log('[' + formatDate(new Date()) + '] ' + req.method + ' ' +
      req.originalUrl + ' ' + res.statusCode + ' - ' + time + 'ms');
  });
  next();
});

// Сжатие ответов (gzip и deflate выбираются по Accept-Encoding)
app.use(compression({ threshold: 0 }));

// Ограничение: 100 запросов в минуту с одного IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: true,
  handler: (req, res, next) => {
    next(createError(429, 'Слишком много запросов, попробуйте позже'));
  }
});
app.use(limiter);

// Разбор JSON из тела запроса
app.use(express.json());

// Шаблон HTML-страницы
function page(title, body) {
  return '<!DOCTYPE html>' +
    '<html lang="ru"><head><meta charset="utf-8"><title>' + title + '</title>' +
    '<style>body{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;padding:0 15px;}' +
    'h1{color:#2c3e50;}li{margin:4px 0;}</style></head><body>' + body + '</body></html>';
}

// Главная страница
app.get('/', (req, res) => {
  const now = new Date().toLocaleString('ru-RU');
  res.send(page('Лабораторная работа №16',
    '<h1>Лабораторная работа №16</h1>' +
    '<p>Группа: 478</p>' +
    '<p>Текущая дата и время: ' + now + '</p>' +
    '<p>Добро пожаловать на сервер Express.js!</p>' +
    '<h2>Доступные маршруты</h2>' +
    '<ul>' +
    '<li><a href="/">/</a></li>' +
    '<li><a href="/about">/about</a></li>' +
    '<li><a href="/contacts">/contacts</a></li>' +
    '<li><a href="/api/books">/api/books</a></li>' +
    '<li><a href="/api/books/search?author=Толстой">/api/books/search?author=Толстой</a></li>' +
    '<li><a href="/error">/error</a></li>' +
    '<li><a href="/async-error">/async-error</a></li>' +
    '</ul>'));
});

// Страница о разработчике
app.get('/about', (req, res) => {
  res.send(page('О разработчике',
    '<h1>О разработчике</h1>' +
    '<p>Студент: Юреня Даниил</p>' +
    '<p>Группа: 478</p>' +
    '<p>Вариант: ' + variant + '</p>' +
    '<p>Предмет: Бэкенд на Node.js</p>' +
    '<p><a href="/">На главную</a></p>'));
});

// Страница контактов
app.get('/contacts', (req, res) => {
  res.send(page('Контакты',
    '<h1>Контакты</h1>' +
    '<p>Email: ' + contacts.email + '</p>' +
    '<p>Телефон: ' + contacts.phone + '</p>' +
    '<p><a href="/">На главную</a></p>'));
});

// Проверка данных книги, возвращает текст ошибки или null
// partial = true для PUT: проверяем только те поля, которые пришли
function validateBook(data, partial) {
  if (!partial || data.title !== undefined) {
    if (typeof data.title !== 'string' || data.title.trim() === '') {
      return 'Название должно быть непустой строкой';
    }
  }
  if (!partial || data.author !== undefined) {
    if (typeof data.author !== 'string' || data.author.trim() === '') {
      return 'Автор должен быть непустой строкой';
    }
  }
  if (!partial || data.year !== undefined) {
    const maxYear = new Date().getFullYear();
    if (!Number.isInteger(data.year) || data.year < 1 || data.year > maxYear) {
      return 'Год должен быть целым числом от 1 до ' + maxYear;
    }
  }
  return null;
}

// Список всех книг
app.get('/api/books', (req, res) => {
  res.json(books);
});

// Поиск по автору, должен стоять выше маршрута с :id
app.get('/api/books/search', (req, res, next) => {
  const author = req.query.author;
  if (!author) {
    return next(createError(400, 'Укажите параметр author'));
  }
  const result = books.filter((b) =>
    b.author.toLowerCase() === String(author).toLowerCase());
  res.json(result);
});

// Одна книга по id
app.get('/api/books/:id', (req, res, next) => {
  const book = books.find((b) => b.id === Number(req.params.id));
  if (!book) {
    return next(createError(404, 'Книга не найдена'));
  }
  res.json(book);
});

// Добавление книги
app.post('/api/books', (req, res, next) => {
  const data = req.body || {};
  const error = validateBook(data, false);
  if (error) {
    return next(createError(400, error));
  }
  const book = {
    id: nextId++,
    title: data.title.trim(),
    author: data.author.trim(),
    year: data.year
  };
  books.push(book);
  res.status(201).json(book);
});

// Обновление книги
app.put('/api/books/:id', (req, res, next) => {
  const book = books.find((b) => b.id === Number(req.params.id));
  if (!book) {
    return next(createError(404, 'Книга не найдена'));
  }
  const data = req.body || {};
  if (data.title === undefined && data.author === undefined && data.year === undefined) {
    return next(createError(400, 'Нет данных для обновления'));
  }
  const error = validateBook(data, true);
  if (error) {
    return next(createError(400, error));
  }
  if (data.title !== undefined) book.title = data.title.trim();
  if (data.author !== undefined) book.author = data.author.trim();
  if (data.year !== undefined) book.year = data.year;
  res.json(book);
});

// Удаление книги
app.delete('/api/books/:id', (req, res, next) => {
  const index = books.findIndex((b) => b.id === Number(req.params.id));
  if (index === -1) {
    return next(createError(404, 'Книга не найдена'));
  }
  books.splice(index, 1);
  res.json({ message: 'Книга удалена' });
});

// Маршрут с обычной ошибкой
app.get('/error', (req, res) => {
  throw new Error('Тестовая ошибка');
});

// Маршрут с асинхронной ошибкой
app.get('/async-error', async (req, res, next) => {
  try {
    await new Promise((resolve) => setTimeout(resolve, 100));
    throw new Error('Тестовая асинхронная ошибка');
  } catch (err) {
    next(err);
  }
});

// Несуществующий маршрут
app.use((req, res, next) => {
  next(createError(404, 'Маршрут не найден'));
});

// Центральная обработка ошибок
app.use((err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message;
  if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Невалидный JSON в теле запроса';
  }
  res.status(status).json({ error: message, status: status });
});

app.listen(PORT, () => {
  console.log('Сервер запущен на http://localhost:' + PORT);
});

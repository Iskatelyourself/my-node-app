const Koa = require('koa');
const Router = require('@koa/router');
const { bodyParser } = require('@koa/bodyparser');
const variant = require('./variant');

const app = new Koa();
const router = new Router();

// Пользователи хранятся в памяти, пока работает сервер
let users = [
  { id: 1, name: 'Иванов Иван', group: '478' },
  { id: 2, name: 'Петров Петр', group: '478' },
  { id: 3, name: 'Сидоров Сидор', group: '478' }
];
let nextId = 4;

// Дата в виде 2024-01-15 14:30:25
function formatDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
    ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
}

// Middleware логирования: время начала, метод, путь и время выполнения
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const end = Date.now();
  console.log(`[${formatDate(new Date(start))}] ${ctx.method} ${ctx.path} - ${end - start}ms`);
});

// Middleware обработки ошибок: любая ошибка превращается в JSON
app.use(async (ctx, next) => {
  try {
    await next();
    // Если ни один маршрут не подошел
    if (ctx.status === 404 && !ctx.body) {
      ctx.throw(404, 'Маршрут не найден');
    }
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) {
      console.error(err);
    }
    ctx.status = status;
    ctx.body = {
      error: status >= 500 ? 'Внутренняя ошибка сервера' : err.message,
      status: status
    };
  }
});

// Разбор JSON из тела запроса
app.use(bodyParser());

// Middleware авторизации: нужен заголовок Authorization
async function checkAuth(ctx, next) {
  if (!ctx.get('Authorization')) {
    ctx.throw(401, 'Требуется авторизация');
  }
  await next();
}

// Проверка данных пользователя из тела запроса
function getUserData(ctx) {
  const body = ctx.request.body;
  if (!body || typeof body.name !== 'string' || body.name.trim() === '' ||
      typeof body.group !== 'string' || body.group.trim() === '') {
    ctx.throw(400, 'Нужны непустые поля name и group');
  }
  return { name: body.name.trim(), group: body.group.trim() };
}

// Поиск пользователя по id из адреса, если нет, то ошибка 404
function findUserIndex(ctx) {
  const id = Number(ctx.params.id);
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) {
    ctx.throw(404, 'Пользователь не найден');
  }
  return index;
}

// Задание 1: HTML-страница
router.get('/', (ctx) => {
  ctx.type = 'html';
  ctx.body = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Лабораторная работа №15</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 40px auto; }
    h1 { color: #2c3e50; }
  </style>
</head>
<body>
  <h1>Лабораторная работа №15</h1>
  <p>Группа: 478</p>
  <p>Вариант: ${variant}</p>
  <p>Студент: Юреня Даниил</p>
  <p>Текущая дата и время: ${new Date().toLocaleString('ru-RU')}</p>
  <p>Добро пожаловать на сервер, написанный на Koa.js!</p>
</body>
</html>`;
});

// Задание 2: REST API пользователей
router.get('/api/users', (ctx) => {
  ctx.body = users;
});

router.post('/api/users', (ctx) => {
  const data = getUserData(ctx);
  const user = { id: nextId++, name: data.name, group: data.group };
  users.push(user);
  ctx.status = 201;
  ctx.body = user;
});

router.put('/api/users/:id', (ctx) => {
  const index = findUserIndex(ctx);
  const data = getUserData(ctx);
  users[index] = { id: users[index].id, name: data.name, group: data.group };
  ctx.body = users[index];
});

router.delete('/api/users/:id', (ctx) => {
  const index = findUserIndex(ctx);
  users.splice(index, 1);
  ctx.body = { message: 'Пользователь удален' };
});

// Задание 3: защищенный маршрут и маршрут для проверки ошибок
router.get('/protected', checkAuth, (ctx) => {
  ctx.body = { message: 'Доступ разрешен' };
});

router.get('/error', () => {
  throw new Error('Тестовая ошибка');
});

app.use(router.routes());

app.listen(3000, () => {
  console.log('Сервер запущен: http://localhost:3000');
});

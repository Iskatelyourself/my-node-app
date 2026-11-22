const Koa = require('koa');
const { connectDb } = require('./db');
const { group } = require('./variant');
const loggerMiddleware = require('./middleware/logger');
const errorMiddleware = require('./middleware/error');
const dbMiddleware = require('./middleware/db');
const bodyMiddleware = require('./middleware/body');
const usersRouter = require('./routes/users');

const PORT = process.env.PORT || 3000;

async function start() {
  // Подключаемся к MongoDB один раз при старте
  await connectDb();
  console.log('[INFO] MongoDB подключена');

  const app = new Koa();

  // Заголовок X-Group во всех ответах, в том числе с ошибками
  app.use(async (ctx, next) => {
    ctx.set('X-Group', group);
    await next();
  });

  // Порядок важен: логгер снаружи, ошибки перед остальным
  app.use(loggerMiddleware);
  app.use(errorMiddleware);
  app.use(dbMiddleware);
  app.use(bodyMiddleware);
  app.use(usersRouter.routes());

  app.listen(PORT, () => {
    console.log(`[INFO] Koa-сервер на порту ${PORT}`);
    console.log(`[INFO] Группа: ${group}`);
  });
}

start().catch((err) => {
  console.error('[ERROR] Не удалось запустить сервер:', err.message);
  process.exit(1);
});

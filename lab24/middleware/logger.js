const { log } = require('../log');

// Пишем в лог каждый запрос: метод, адрес, статус, время
async function loggerMiddleware(ctx, next) {
  const start = Date.now();
  await next();
  log('HTTP', `${ctx.method} ${ctx.url} ${ctx.status} ${Date.now() - start}ms`);
}

module.exports = loggerMiddleware;

const { getDb } = require('../db');

// Кладём базу в ctx.db, чтобы она была доступна в обработчиках
async function dbMiddleware(ctx, next) {
  ctx.db = getDb();
  await next();
}

module.exports = dbMiddleware;

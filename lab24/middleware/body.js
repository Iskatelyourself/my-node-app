const { AppError } = require('../errors');

// В Koa нет встроенного разбора тела, читаем JSON сами
async function bodyMiddleware(ctx, next) {
  if (ctx.method === 'POST' || ctx.method === 'PUT') {
    const chunks = [];
    for await (const chunk of ctx.req) {
      chunks.push(chunk);
    }
    const raw = Buffer.concat(chunks).toString('utf8');

    try {
      ctx.request.body = raw ? JSON.parse(raw) : {};
    } catch (err) {
      throw new AppError(400, 'Invalid JSON');
    }
  }
  await next();
}

module.exports = bodyMiddleware;

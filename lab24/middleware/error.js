const { AppError } = require('../errors');
const { log } = require('../log');

// Единое место для всех ошибок
async function errorMiddleware(ctx, next) {
  try {
    await next();

    // Маршрут не найден
    if (ctx.status === 404 && ctx.body == null) {
      ctx.status = 404;
      ctx.body = { error: 'Not found', status: 404 };
    }
  } catch (err) {
    let status = err.status || 500;
    let message = err.message;

    // Дубликат ключа в MongoDB
    if (err.code === 11000) {
      status = 409;
      message = 'Email already exists';
    }

    // Ошибки валидации отдаём со списком полей
    if (err instanceof AppError && err.details) {
      ctx.status = status;
      ctx.body = { error: message, details: err.details };
      return;
    }

    // Внутренние ошибки не показываем клиенту
    if (status >= 500) {
      log('ERROR', err.message);
      status = 500;
      message = 'Internal server error';
    }

    ctx.status = status;
    ctx.body = { error: message, status };
  }
}

module.exports = errorMiddleware;

// Своя ошибка с HTTP-статусом и списком деталей
class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

module.exports = { AppError };

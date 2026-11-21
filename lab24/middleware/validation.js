const { AppError } = require('../errors');

// Сообщения Joi на русском
const messages = {
  'any.required': 'обязательное поле',
  'any.only': 'недопустимое значение',
  'object.base': 'нужен JSON-объект',
  'object.unknown': 'недопустимое поле',
  'object.min': 'нужно передать хотя бы одно поле',
  'string.base': 'должно быть строкой',
  'string.empty': 'не должно быть пустым',
  'string.min': 'минимум {#limit} символа',
  'string.max': 'максимум {#limit} символов',
  'string.email': 'неверный формат',
  'string.pattern.base': 'неверный формат',
  'number.base': 'должно быть числом',
  'number.integer': 'должно быть целым числом',
  'number.min': 'минимум {#limit}',
  'number.max': 'максимум {#limit}',
};

// source: 'body' или 'query'. Результат кладём в ctx.state
function validate(schema, source) {
  return async (ctx, next) => {
    const data = source === 'query' ? { ...ctx.query } : ctx.request.body;

    const { value, error } = schema.validate(data, { abortEarly: false, messages });

    if (error) {
      const details = error.details.map((item) => ({
        field: item.path.join('.') || 'body',
        message: item.message,
      }));
      throw new AppError(400, 'Validation failed', details);
    }

    ctx.state[source] = value;
    await next();
  };
}

module.exports = validate;

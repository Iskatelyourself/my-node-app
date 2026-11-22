const userService = require('../services/userService');

// Контроллеры только вызывают сервисы и формируют ответ.
// Данные уже проверены Joi в validationMiddleware (ctx.state).

async function list(ctx) {
  const result = await userService.getUsers(ctx.state.query);
  ctx.body = { data: result.items, pagination: result.pagination };
}

async function getOne(ctx) {
  const user = await userService.getUser(ctx.params.id);
  ctx.body = { data: user };
}

async function create(ctx) {
  const user = await userService.createUser(ctx.state.body);
  ctx.status = 201;
  ctx.body = { data: user };
}

async function update(ctx) {
  const user = await userService.updateUser(ctx.params.id, ctx.state.body);
  ctx.body = { data: user };
}

async function remove(ctx) {
  await userService.deleteUser(ctx.params.id);
  ctx.body = { data: { deleted: true, _id: ctx.params.id } };
}

async function search(ctx) {
  const users = await userService.searchUsers(ctx.state.query.q);
  ctx.body = { found: users.length, data: users };
}

async function stats(ctx) {
  ctx.body = await userService.getStats();
}

async function exportCsv(ctx) {
  const csv = await userService.exportCsv();
  ctx.attachment('users.csv');
  ctx.body = csv;
}

module.exports = { list, getOne, create, update, remove, search, stats, exportCsv };

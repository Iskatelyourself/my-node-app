const Router = require('@koa/router');
const controller = require('../controllers/userController');
const validate = require('../middleware/validation');
const schemas = require('../schemas/userSchemas');

const router = new Router({ prefix: '/api/users' });

// Специальные маршруты стоят выше /:id, иначе "search" примется за id
router.get('/search', validate(schemas.searchQuery, 'query'), controller.search);
router.get('/stats', controller.stats);
router.get('/export', controller.exportCsv);

router.get('/', validate(schemas.listQuery, 'query'), controller.list);
router.get('/:id', controller.getOne);
router.post('/', validate(schemas.createUser, 'body'), controller.create);
router.put('/:id', validate(schemas.updateUser, 'body'), controller.update);
router.delete('/:id', controller.remove);

module.exports = router;

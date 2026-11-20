const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
const variant = require('./variant');

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('В .env нет MONGO_URI');
  process.exit(1);
}

const dbName = 'bbmo_01_23';
const group = '478';
const header = `Юреня Даниил, группа ${group}, вариант ${variant}`;

module.exports = { uri, dbName, group, header };

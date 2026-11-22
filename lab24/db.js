const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const dbName = 'bbmo_01_23';

// Клиент создаётся один раз при старте
const client = new MongoClient(uri);
let db;

async function connectDb() {
  await client.connect();
  db = client.db(dbName);

  // Уникальный email и текстовый индекс для поиска
  const users = db.collection('users');
  await users.createIndex({ email: 1 }, { unique: true });
  await users.createIndex({ name: 'text', email: 'text' }, { default_language: 'none' });

  return db;
}

function getDb() {
  if (!db) {
    throw new Error('БД не подключена');
  }
  return db;
}

module.exports = { connectDb, getDb, client };

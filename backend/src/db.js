const mysql = require("mysql2/promise");

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

let pool;

function createPoolFromEnv() {
  const host = getRequiredEnv("DB_HOST");
  const user = getRequiredEnv("DB_USER");
  const password = process.env.DB_PASSWORD || "";
  const database = getRequiredEnv("DB_NAME");
  const port = Number(process.env.DB_PORT) || 3306;
  const connectionLimit = Number(process.env.DB_CONNECTION_LIMIT) || 10;

  return mysql.createPool({
    host,
    user,
    password,
    database,
    port,
    waitForConnections: true,
    connectionLimit,
    queueLimit: 0,
    enableKeepAlive: true,
  });
}

function getPool() {
  if (!pool) {
    pool = createPoolFromEnv();
  }
  return pool;
}

async function ping() {
  const activePool = getPool();
  await activePool.query("SELECT 1");
}

module.exports = {
  getPool,
  ping,
};

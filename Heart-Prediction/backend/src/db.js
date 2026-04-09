const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const dataDir = path.join(__dirname, "..", "data");
const dbPath = path.join(dataDir, "app.db");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    input_json TEXT NOT NULL,
    result_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

function nowIso() {
  return new Date().toISOString();
}

function createUser(username, passwordHash, salt) {
  const stmt = db.prepare("INSERT INTO users (username, password_hash, salt, created_at) VALUES (?, ?, ?, ?)");
  const info = stmt.run(username, passwordHash, salt, nowIso());
  return getUserById(Number(info.lastInsertRowid));
}

function getUserByUsername(username) {
  const stmt = db.prepare("SELECT * FROM users WHERE username = ?");
  return stmt.get(username) || null;
}

function getUserById(id) {
  const stmt = db.prepare("SELECT id, username, created_at FROM users WHERE id = ?");
  return stmt.get(id) || null;
}

function createSession(token, userId) {
  const stmt = db.prepare("INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)");
  stmt.run(token, userId, nowIso());
}

function getSession(token) {
  const stmt = db.prepare(`
    SELECT sessions.token, sessions.user_id, users.username, users.created_at
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token = ?
  `);
  return stmt.get(token) || null;
}

function deleteSession(token) {
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

function savePrediction(userId, input, result) {
  const stmt = db.prepare("INSERT INTO predictions (user_id, input_json, result_json, created_at) VALUES (?, ?, ?, ?)");
  stmt.run(userId, JSON.stringify(input), JSON.stringify(result), nowIso());
}

function getPredictionHistory(userId, limit = 12) {
  const stmt = db.prepare(`
    SELECT id, input_json, result_json, created_at
    FROM predictions
    WHERE user_id = ?
    ORDER BY id DESC
    LIMIT ?
  `);
  return stmt.all(userId, limit).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    input: JSON.parse(row.input_json),
    result: JSON.parse(row.result_json)
  }));
}

module.exports = {
  createUser,
  getUserByUsername,
  getUserById,
  createSession,
  getSession,
  deleteSession,
  savePrediction,
  getPredictionHistory,
  dbPath
};

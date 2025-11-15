const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

let db;

function getDb(dbPath) {
  if (!db) {
    db = new Database(dbPath);
    db.exec("PRAGMA journal_mode=WAL");
    db.exec(
      "CREATE TABLE IF NOT EXISTS session_files (filename TEXT PRIMARY KEY, content TEXT, mtime INTEGER)"
    );
  }
  return db;
}

function listFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...listFiles(p));
    else files.push(p);
  }
  return files;
}

function backupSessionsToSqlite(sessionDir, dbPath) {
  const database = getDb(dbPath);
  const stmt = database.prepare(
    "INSERT OR REPLACE INTO session_files (filename, content, mtime) VALUES (?, ?, ?)"
  );
  const files = listFiles(sessionDir);
  for (const file of files) {
    const rel = path.relative(sessionDir, file).replace(/\\/g, "/");
    const stat = fs.statSync(file);
    const content = fs.readFileSync(file, "utf8");
    stmt.run(rel, content, stat.mtimeMs);
  }
}

module.exports = { backupSessionsToSqlite };
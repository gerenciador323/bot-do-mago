const { BufferJSON, initAuthCreds, proto } = require("baileys");
const path = require("path");
const raiz = require("../root");
const fs = require("fs");
const Database = require("better-sqlite3");

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

async function useSQLiteAuthState(dbPath) {
  ensureDir(path.dirname(dbPath));
  const db = new Database(dbPath);
  db.exec(
    "CREATE TABLE IF NOT EXISTS creds (id INTEGER PRIMARY KEY CHECK (id=1), value TEXT NOT NULL);"
  );
  db.exec(
    "CREATE TABLE IF NOT EXISTS keys (type TEXT NOT NULL, id TEXT NOT NULL, value TEXT, PRIMARY KEY (type, id));"
  );

  const readData = (tableKey) => {
    const row = db.prepare("SELECT value FROM creds WHERE id=1").get();
    if (!row) return null;
    try {
      return JSON.parse(row.value, BufferJSON.reviver);
    } catch {
      return null;
    }
  };

  const writeData = (data) => {
    const json = JSON.stringify(data, BufferJSON.replacer);
    db.prepare(
      "INSERT INTO creds (id, value) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET value=excluded.value"
    ).run(json);
  };

  const removeKey = (type, id) => {
    db.prepare("DELETE FROM keys WHERE type=? AND id=?").run(type, id);
  };

  const writeKey = (type, id, value) => {
    const json = value != null ? JSON.stringify(value, BufferJSON.replacer) : null;
    if (json == null) {
      removeKey(type, id);
      return;
    }
    db.prepare(
      "INSERT INTO keys (type, id, value) VALUES (?, ?, ?) ON CONFLICT(type, id) DO UPDATE SET value=excluded.value"
    ).run(type, id, json);
  };

  const getKey = (type, id) => {
    const row = db.prepare("SELECT value FROM keys WHERE type=? AND id=?").get(type, id);
    if (!row) return null;
    try {
      let v = JSON.parse(row.value, BufferJSON.reviver);
      if (type === "app-state-sync-key" && v) {
        v = proto.Message.AppStateSyncKeyData.fromObject(v);
      }
      return v;
    } catch {
      return null;
    }
  };

  const creds = readData() || initAuthCreds();

  const state = {
    creds,
    keys: {
      get: async (type, ids) => {
        const data = {};
        for (const id of ids) data[id] = getKey(type, id);
        return data;
      },
      set: async (data) => {
        for (const category of Object.keys(data)) {
          for (const id of Object.keys(data[category])) {
            writeKey(category, id, data[category][id]);
          }
        }
      },
    },
  };

  return {
    state,
    saveCreds: async () => writeData(state.creds),
  };
}

async function getAuthState() {
  const dbFile = path.join(raiz, "data", "auth.sqlite");
  return await useSQLiteAuthState(dbFile);
}

module.exports = { getAuthState };

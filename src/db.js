const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const raiz = require("../root");

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

const dbFile = path.join(raiz, "data", "app.sqlite");
ensureDir(path.dirname(dbFile));
const db = new Database(dbFile);

db.exec(
  "CREATE TABLE IF NOT EXISTS agents (id INTEGER PRIMARY KEY, name TEXT NOT NULL, code TEXT, description TEXT, role TEXT, objective TEXT, policies TEXT, task TEXT, personality TEXT, provider TEXT, active INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME)"
);

db.exec(
  "CREATE TABLE IF NOT EXISTS tools (id INTEGER PRIMARY KEY, name TEXT NOT NULL, description TEXT, tool_type TEXT, tool_scope TEXT, params TEXT, curl_command TEXT, code_python TEXT, substitute INTEGER, response_map TEXT, output TEXT, channel TEXT, post_instruction TEXT, next_tool TEXT, print_output_var TEXT, active INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME)"
);

db.exec(
  "CREATE TABLE IF NOT EXISTS agent_tools (agent_id INTEGER NOT NULL, tool_id INTEGER NOT NULL, PRIMARY KEY(agent_id, tool_id))"
);

db.exec(
  "CREATE TABLE IF NOT EXISTS providers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, base_url TEXT, api_key TEXT, description TEXT, active INTEGER, status TEXT, config TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME)"
);

function listAgents() {
  return db.prepare("SELECT * FROM agents ORDER BY id DESC").all();
}

function createAgent(a) {
  const stmt = db.prepare(
    "INSERT INTO agents (name, code, description, role, objective, policies, task, personality, provider, active, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)"
  );
  const info = stmt.run(
    a.name,
    a.code || null,
    a.description || null,
    a.role || null,
    a.objective || null,
    a.policies || null,
    a.task || null,
    a.personality ? JSON.stringify(a.personality) : null,
    a.provider || null,
    a.active ? 1 : 0
  );
  return info.lastInsertRowid;
}

function getAgentByNameCode(name, code) {
  return db.prepare("SELECT * FROM agents WHERE name=? AND COALESCE(code,'')=COALESCE(?, '')").get(name, code || null);
}

function getAgentById(id) {
  return db.prepare("SELECT * FROM agents WHERE id=?").get(id);
}

function updateAgentProvider(id, provider) {
  db.prepare("UPDATE agents SET provider=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").run(provider, id);
}

function listProviders() {
  return db.prepare("SELECT * FROM providers ORDER BY id DESC").all();
}

function createProvider(p) {
  const stmt = db.prepare(
    "INSERT INTO providers (name, base_url, api_key, description, active, status, config, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)"
  );
  const info = stmt.run(
    p.name,
    p.base_url || null,
    p.api_key || null,
    p.description || null,
    p.active ? 1 : 0,
    p.status || null,
    p.config ? JSON.stringify(p.config) : null
  );
  return info.lastInsertRowid;
}

function getProviderByName(name) {
  return db.prepare("SELECT * FROM providers WHERE name=?").get(name);
}

function getProviderById(id) {
  return db.prepare("SELECT * FROM providers WHERE id=?").get(id);
}

function updateProvider(id, fields) {
  const row = getProviderById(id);
  if (!row) return;
  const data = {
    name: fields.name ?? row.name,
    base_url: fields.base_url ?? row.base_url,
    api_key: fields.api_key ?? row.api_key,
    description: fields.description ?? row.description,
    active: typeof fields.active === "boolean" ? (fields.active ? 1 : 0) : row.active,
    status: fields.status ?? row.status,
    config: fields.config ?? row.config,
  };
  db.prepare(
    "UPDATE providers SET name=?, base_url=?, api_key=?, description=?, active=?, status=?, config=?, updated_at=CURRENT_TIMESTAMP WHERE id=?"
  ).run(
    data.name,
    data.base_url,
    data.api_key,
    data.description,
    data.active,
    data.status,
    data.config,
    id
  );
}

function listToolsForAgent(agentId) {
  const rows = db
    .prepare(
      "SELECT t.* FROM tools t JOIN agent_tools at ON at.tool_id=t.id WHERE at.agent_id=? ORDER BY t.id DESC"
    )
    .all(agentId);
  return rows;
}

function createTool(t) {
  const stmt = db.prepare(
    "INSERT INTO tools (name, description, tool_type, tool_scope, params, curl_command, code_python, substitute, response_map, output, channel, post_instruction, next_tool, print_output_var, active, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)"
  );
  const info = stmt.run(
    t.name,
    t.description || null,
    t.tool_type || null,
    t.tool_scope || null,
    t.params || null,
    t.curl_command || null,
    t.code_python || null,
    t.substitute ? 1 : 0,
    t.response_map || null,
    t.output || null,
    t.channel || null,
    t.post_instruction || null,
    t.next_tool || null,
    t.print_output_var || null,
    t.active ? 1 : 0
  );
  return info.lastInsertRowid;
}

function getToolByName(name) {
  return db.prepare("SELECT * FROM tools WHERE name=?").get(name);
}

function linkAgentTool(agentId, toolId) {
  db.prepare(
    "INSERT OR IGNORE INTO agent_tools (agent_id, tool_id) VALUES (?, ?)"
  ).run(agentId, toolId);
}

module.exports = {
  db,
  listAgents,
  createAgent,
  getAgentByNameCode,
  getAgentById,
  updateAgentProvider,
  listProviders,
  createProvider,
  getProviderByName,
  getProviderById,
  updateProvider,
  listToolsForAgent,
  createTool,
  getToolByName,
  linkAgentTool,
};
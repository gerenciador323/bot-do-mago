const Database = require("better-sqlite3");
const {
  createAgent,
  getAgentByNameCode,
  createTool,
  getToolByName,
  linkAgentTool,
  createProvider,
  getProviderByName,
} = require("./db");

function findMappingTable(src) {
  const tables = src
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%agentes%'"
    )
    .all()
    .map((r) => r.name);
  for (const name of tables) {
    if (name.includes("ferramenta") || name.includes("ferramentas")) return name;
  }
  const candidates = src
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%ferrament%'"
    )
    .all();
  return candidates.find((r) => r.name.includes("agente"))?.name || null;
}

function importAgentMaria(fromPath) {
  const src = new Database(fromPath, { readonly: true });
  const agente = src
    .prepare(
      "SELECT * FROM agentes WHERE nome LIKE '%Maria%' AND (descricao LIKE '%Padaria%' OR agente_papel LIKE '%Padaria%' OR agente_objetivo LIKE '%Padaria%') ORDER BY id LIMIT 1"
    )
    .get();
  const fallback = !agente
    ? src
        .prepare(
          "SELECT * FROM agentes WHERE nome LIKE '%Atendente%' ORDER BY id LIMIT 1"
        )
        .get()
    : null;
  const a = agente || fallback;
  if (!a) throw new Error("Agente Maria não encontrado no banco origem");

  const newAgentId = createAgent({
    name: a.nome,
    code: a.codigo,
    description: a.descricao,
    role: a.agente_papel,
    objective: a.agente_objetivo,
    policies: a.agente_politicas,
    task: a.agente_tarefa,
    personality: {
      publico: a.agente_publico,
      restricoes: a.agente_restricoes,
      objetivo_explicito: a.agente_objetivo_explicito,
    },
    provider: a.modelo_llm,
    active: a.ativo === 1,
  });

  const mappingTable = findMappingTable(src);
  let ferramentaIds = [];
  if (mappingTable) {
    const cols = src
      .prepare(
        `PRAGMA table_info(${mappingTable})`
      )
      .all();
    const agenteCol = cols.find((c) => c.name.includes("agente"))?.name;
    const ferramentaCol = cols.find((c) => c.name.includes("ferrament"))?.name;
    if (agenteCol && ferramentaCol) {
      const rows = src
        .prepare(
          `SELECT ${ferramentaCol} AS ferramenta_id FROM ${mappingTable} WHERE ${agenteCol}=?`
        )
        .all(a.id);
      ferramentaIds = rows.map((r) => r.ferramenta_id);
    }
  }
  if (ferramentaIds.length === 0) {
    const rows = src
      .prepare("SELECT id FROM ferramentas WHERE ativa=1")
      .all();
    ferramentaIds = rows.map((r) => r.id);
  }

  const ferrQuery = src.prepare("SELECT * FROM ferramentas WHERE id=?");
  for (const fid of ferramentaIds) {
    const f = ferrQuery.get(fid);
    if (!f) continue;
    const newToolId = createTool({
      name: f.nome,
      description: f.descricao,
      tool_type: f.tool_type,
      tool_scope: f.tool_scope,
      params: f.params,
      curl_command: f.curl_command,
      code_python: f.codigo_python,
      substitute: f.substituir === 1,
      response_map: f.response_map,
      output: f.output,
      channel: f.channel,
      post_instruction: f.post_instruction,
      next_tool: f.next_tool,
      print_output_var: f.print_output_var,
      active: f.ativa === 1,
    });
    linkAgentTool(newAgentId, newToolId);
  }
  return newAgentId;
}

function importProviders(fromPath) {
  const src = new Database(fromPath, { readonly: true });
  const rows = src
    .prepare("SELECT id, nome, base_url, api_key, descricao, ativo, status, configuracao FROM provedores_llm")
    .all();
  let count = 0;
  for (const r of rows) {
    const exists = getProviderByName(r.nome);
    if (!exists) {
      createProvider({
        name: r.nome,
        base_url: r.base_url,
        api_key: r.api_key,
        description: r.descricao,
        active: r.ativo === 1,
        status: r.status,
        config: r.configuracao ? JSON.parse(r.configuracao) : null,
      });
      count++;
    }
  }
  return count;
}

function importTools(fromPath) {
  const src = new Database(fromPath, { readonly: true });
  const rows = src
    .prepare(
      "SELECT id, nome, descricao, tool_type, tool_scope, params, curl_command, codigo_python, substituir, response_map, output, channel, post_instruction, next_tool, print_output_var, ativa FROM ferramentas"
    )
    .all();
  const idMap = new Map();
  for (const r of rows) {
    const exists = getToolByName(r.nome);
    const newId = exists
      ? exists.id
      : createTool({
          name: r.nome,
          description: r.descricao,
          tool_type: r.tool_type,
          tool_scope: r.tool_scope,
          params: r.params,
          curl_command: r.curl_command,
          code_python: r.codigo_python,
          substitute: r.substituir === 1,
          response_map: r.response_map,
          output: r.output,
          channel: r.channel,
          post_instruction: r.post_instruction,
          next_tool: r.next_tool,
          print_output_var: r.print_output_var,
          active: r.ativa === 1,
        });
    idMap.set(r.id, newId);
  }
  return idMap;
}

function importAgents(fromPath) {
  const src = new Database(fromPath, { readonly: true });
  const rows = src
    .prepare(
      "SELECT id, codigo, nome, descricao, agente_papel, agente_objetivo, agente_politicas, agente_tarefa, agente_objetivo_explicito, agente_publico, agente_restricoes, modelo_llm, temperatura, max_tokens, top_p, ativo FROM agentes"
    )
    .all();
  const idMap = new Map();
  for (const r of rows) {
    const exists = getAgentByNameCode(r.nome, r.codigo);
    const newId = exists
      ? exists.id
      : createAgent({
          name: r.nome,
          code: r.codigo,
          description: r.descricao,
          role: r.agente_papel,
          objective: r.agente_objetivo,
          policies: r.agente_politicas,
          task: r.agente_tarefa,
          personality: {
            publico: r.agente_publico,
            restricoes: r.agente_restricoes,
            objetivo_explicito: r.agente_objetivo_explicito,
            temperatura: r.temperatura,
            max_tokens: r.max_tokens,
            top_p: r.top_p,
          },
          provider: r.modelo_llm,
          active: r.ativo === 1,
        });
    idMap.set(r.id, newId);
  }
  return idMap;
}

function importLinks(fromPath, agentIdMap, toolIdMap) {
  const src = new Database(fromPath, { readonly: true });
  const mapTable = findMappingTable(src);
  if (!mapTable) return 0;
  const cols = src.prepare(`PRAGMA table_info(${mapTable})`).all();
  const agenteCol = cols.find((c) => c.name.includes("agente"))?.name;
  const ferramentaCol = cols.find((c) => c.name.includes("ferrament"))?.name;
  if (!agenteCol || !ferramentaCol) return 0;
  const rows = src
    .prepare(`SELECT ${agenteCol} AS agente_id, ${ferramentaCol} AS ferramenta_id FROM ${mapTable}`)
    .all();
  let count = 0;
  for (const r of rows) {
    const aid = agentIdMap.get(r.agente_id);
    const tid = toolIdMap.get(r.ferramenta_id);
    if (aid && tid) {
      linkAgentTool(aid, tid);
      count++;
    }
  }
  return count;
}

function importAllFluxi(fromPath) {
  const p = importProviders(fromPath);
  const toolMap = importTools(fromPath);
  const agentMap = importAgents(fromPath);
  const links = importLinks(fromPath, agentMap, toolMap);
  return { providers: p, agents: agentMap.size, tools: toolMap.size, links };
}

module.exports = { importAgentMaria, importAllFluxi };
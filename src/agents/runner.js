const { db, getProviderByName, listToolsForAgent } = require("../db");
const { callLLM } = require("../llm/providers");

function getAgentById(id) {
  return db.prepare("SELECT * FROM agents WHERE id=?").get(id);
}

function buildSystemPrompt(a) {
  const p = a.personality ? JSON.parse(a.personality) : {};
  const parts = [];
  if (a.role) parts.push(`Papel: ${a.role}`);
  if (a.objective) parts.push(`Objetivo: ${a.objective}`);
  if (a.policies) parts.push(`Políticas: ${a.policies}`);
  if (a.task) parts.push(`Tarefa: ${a.task}`);
  if (p.publico) parts.push(`Público: ${p.publico}`);
  if (p.restricoes) parts.push(`Restrições: ${p.restricoes}`);
  if (p.objetivo_explicito) parts.push(`Objetivo explícito: ${p.objetivo_explicito}`);
  return parts.join("\n");
}

async function runAgent(agentId, inputText) {
  const a = getAgentById(agentId);
  if (!a) throw new Error("Agente não encontrado");
  const systemPrompt = buildSystemPrompt(a);
  const provider = getProviderByName((a.provider || "openrouter").split(":")[0]) || {
    name: "openrouter",
    base_url: "https://openrouter.ai/api/v1",
    api_key: process.env.OPENROUTER_API_KEY || "",
  };
  const model = (a.provider || "openrouter")
    .split(":")
    .slice(1)
    .join(":") || "openai/gpt-oss-20b:free";
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: inputText },
  ];
  const answer = await callLLM({
    provider: provider.name,
    base_url: provider.base_url,
    api_key: provider.api_key,
    model,
    messages,
  });
  const tools = listToolsForAgent(agentId);
  return { answer, tools };
}

module.exports = { runAgent };
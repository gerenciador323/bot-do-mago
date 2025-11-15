const express = require("express");
const path = require("path");
const {
  listAgents,
  createAgent,
  listProviders,
  createProvider,
  getAgentById,
  listToolsForAgent,
  updateAgentProvider,
} = require("../db");
const { importAgentMaria, importAllFluxi } = require("../importFluxi");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index", { agents: listAgents(), providers: listProviders() });
});

app.get("/agents", (req, res) => {
  res.render("agents", { agents: listAgents() });
});

app.post("/agents", (req, res) => {
  createAgent({
    name: req.body.name,
    code: req.body.code,
    description: req.body.description,
    role: req.body.role,
    objective: req.body.objective,
    policies: req.body.policies,
    task: req.body.task,
    personality: { publico: req.body.publico },
    provider: req.body.provider,
    active: true,
  });
  res.redirect("/agents");
});

app.get("/agents/:id", (req, res) => {
  const a = getAgentById(Number(req.params.id));
  const tools = a ? listToolsForAgent(a.id) : [];
  res.render("agent_detail", { agent: a, tools, result: null });
});

app.post("/agents/:id/update", (req, res) => {
  const id = Number(req.params.id);
  const provider = req.body.provider;
  updateAgentProvider(id, provider);
  res.redirect(`/agents/${id}`);
});

app.post("/agents/:id/run", async (req, res) => {
  const id = Number(req.params.id);
  const a = getAgentById(id);
  const tools = a ? listToolsForAgent(a.id) : [];
  try {
    const { runAgent } = require("../agents/runner");
    const r = await runAgent(id, req.body.text);
    res.render("agent_detail", { agent: a, tools, result: r });
  } catch (e) {
    res.render("agent_detail", { agent: a, tools, result: { error: String(e.message || e) } });
  }
});

app.post("/agents/:id/tools/:toolId/exec", async (req, res) => {
  const id = Number(req.params.id);
  const toolId = Number(req.params.toolId);
  const a = getAgentById(id);
  const tools = a ? listToolsForAgent(a.id) : [];
  const tool = tools.find((t) => t.id === toolId);
  try {
    const { executeTool } = require("../tools/executor");
    const r = tool ? await executeTool(tool, req.body.input) : { error: "tool not found" };
    res.render("agent_detail", { agent: a, tools, result: r });
  } catch (e) {
    res.render("agent_detail", { agent: a, tools, result: { error: String(e.message || e) } });
  }
});

app.get("/providers", (req, res) => {
  res.render("providers", { providers: listProviders() });
});

app.post("/providers", (req, res) => {
  createProvider({
    name: req.body.name,
    base_url: req.body.base_url,
    api_key: req.body.api_key,
    description: req.body.description,
    active: true,
    status: "ativo",
  });
  res.redirect("/providers");
});

app.get("/providers/:id", (req, res) => {
  const { getProviderById } = require("../db");
  const p = getProviderById(Number(req.params.id));
  res.render("provider_detail", { provider: p });
});

app.post("/providers/:id/update", (req, res) => {
  const { updateProvider } = require("../db");
  const id = Number(req.params.id);
  updateProvider(id, {
    base_url: req.body.base_url,
    api_key: req.body.api_key,
    description: req.body.description,
  });
  res.redirect(`/providers/${id}`);
});

app.get("/library", (req, res) => {
  res.render("library");
});

app.post("/import/maria", (req, res) => {
  const from = req.body.path || "e:\\2026\\projetos\\fluxi\\fluxi.db";
  try {
    importAgentMaria(from);
    res.redirect("/agents");
  } catch (e) {
    res.status(500).send(String(e.message || e));
  }
});

app.post("/import/full", (req, res) => {
  const from = req.body.path || "e:\\2026\\projetos\\fluxi\\fluxi.db";
  try {
    const r = importAllFluxi(from);
    res.render("library", { result: r });
  } catch (e) {
    res.status(500).send(String(e.message || e));
  }
});

app.get("/run", (req, res) => {
  res.render("run", { agents: listAgents(), result: null });
});

app.post("/run", async (req, res) => {
  const { agent_id, text } = req.body;
  try {
    const { runAgent } = require("../agents/runner");
    const r = await runAgent(Number(agent_id), text);
    res.render("run", { agents: listAgents(), result: r });
  } catch (e) {
    res.render("run", { agents: listAgents(), result: { error: String(e.message || e) } });
  }
});

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(port, () => {
  console.log(`http://localhost:${port}/`);
});
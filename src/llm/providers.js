const fetch = require("node-fetch");

async function callOpenRouter({ base_url, api_key, model, messages }) {
  const url = (base_url || "https://openrouter.ai/api/v1") + "/chat/completions";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${api_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages }),
  });
  if (!res.ok) throw new Error(`openrouter ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callOpenAI({ base_url, api_key, model, messages }) {
  const url = (base_url || "https://api.openai.com/v1") + "/chat/completions";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${api_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages }),
  });
  if (!res.ok) throw new Error(`openai ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callAnthropic({ base_url, api_key, model, messages }) {
  const url = (base_url || "https://api.anthropic.com") + "/v1/messages";
  const content = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ type: "text", text: m.content }));
  const system = messages.find((m) => m.role === "system")?.content;
  const body = { model, max_tokens: 1024, messages: [{ role: "user", content }] };
  if (system) body.system = system;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "x-api-key": api_key,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const data = await res.json();
  const parts = data.content?.[0];
  return parts?.text || "";
}

async function callLLM({ provider, base_url, api_key, model, messages }) {
  const name = (provider || "").toLowerCase();
  if (name.includes("openrouter")) return callOpenRouter({ base_url, api_key, model, messages });
  if (name.includes("openai")) return callOpenAI({ base_url, api_key, model, messages });
  if (name.includes("anthropic")) return callAnthropic({ base_url, api_key, model, messages });
  return callOpenRouter({ base_url, api_key, model, messages });
}

module.exports = { callLLM };
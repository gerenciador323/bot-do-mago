function interpolate(obj, ctx) {
  const str = JSON.stringify(obj || {});
  const out = str.replace(/\{\{(\w+)\}\}/g, (_, k) => (ctx && ctx[k] != null ? String(ctx[k]) : ""));
  return JSON.parse(out);
}

async function execHttp(params, input) {
  const p = interpolate(params, { input });
  const url = p.url;
  const method = (p.method || "GET").toUpperCase();
  const headers = p.headers || {};
  const body = p.body ? JSON.stringify(p.body) : undefined;
  const res = await globalThis.fetch(url, { method, headers, body });
  const text = await res.text();
  return { status: res.status, body: text };
}

async function executeTool(tool, input) {
  const type = (tool.tool_type || "").toLowerCase();
  const params = tool.params ? JSON.parse(tool.params) : {};
  if (type === "http" || type === "rest") return execHttp(params, input);
  return { status: 200, body: "ok" };
}

module.exports = { executeTool };
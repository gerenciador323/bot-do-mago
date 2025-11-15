// bloquear logs internos
require("./utils/filterLogs")();

// baileys
const P = require("pino");
const {
  default: makeWASocket,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = require("baileys");

// módulos itnernos
const { getAuthState } = require("./auth");
const eventsConfig = require("./events");
const http = require("http");
const path = require("path");
const raiz = require("../root");
const { backupSessionsToSqlite } = require("./utils/sessionSqlite");

// cache para controle interno do baileys
const { NodeCache } = require("@cacheable/node-cache");
const msgRetryCounterCache = new NodeCache();
const webState = { connection: "init", qr: null, qrAscii: null };

function startWebServer() {
  const server = http.createServer((req, res) => {
    const parsed = new URL(req.url, `http://${req.headers.host}`);
    if (parsed.pathname === "/status") {
      const body = JSON.stringify({
        connection: webState.connection,
        qr: webState.qr,
        qrAscii: webState.qrAscii,
      });
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      });
      res.end(body);
      return;
    }
    if (parsed.pathname === "/") {
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Alfred do Mago</title><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;margin:0;background:#0f172a;color:#e2e8f0}header{background:#111827;padding:16px 20px;border-bottom:1px solid #1f2937}main{padding:20px;max-width:900px;margin:0 auto}h1{font-size:20px;margin:0}section{background:#111827;border:1px solid #1f2937;border-radius:10px;padding:16px;margin-top:16px}code,pre{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}pre{background:#0b1020;color:#7dd3fc;padding:12px;border-radius:8px;overflow:auto}#status{display:inline-block;padding:6px 10px;border-radius:999px;background:#1f2937}#status.ok{background:#064e3b;color:#a7f3d0}#status.close{background:#7f1d1d;color:#fecaca}#status.init{background:#1f2937;color:#93c5fd}footer{opacity:.7;text-align:center;padding:20px}</style></head><body><header><h1>Alfred do Mago — Interface Web</h1></header><main><section><div>Status: <span id="status" class="init">iniciando</span></div></section><section><h2>QR Code</h2><p>Escaneie o QR para conectar ao WhatsApp.</p><pre id="qrAscii">aguardando QR...</pre></section></main><footer>Feito com Node.js</footer><script>async function refresh(){try{const r=await fetch('/status');const s=await r.json();const el=document.getElementById('status');el.textContent=s.connection||'desconhecido';el.className=s.connection||'init';const pre=document.getElementById('qrAscii');if(s.qrAscii){pre.textContent=s.qrAscii;}else if(s.qr){pre.textContent='QR disponível';}else{pre.textContent='aguardando QR...';}}catch(e){console.error(e)}}refresh();setInterval(refresh,1000);</script></body></html>`;
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html);
      return;
    }
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  });
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  server.listen(port);
}

async function startSock() {
  const { state, saveCreds } = await getAuthState();
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(
    `💻 versão do websocket v${version[0]}.${version[1]}\n💻 última versão: ${
      isLatest == true ? "sim" : "não"
    }`
  );

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys),
    },
    msgRetryCounterCache,
    generateHighQualityLinkPreview: true,
    logger: P({ level: "silent" }),
  });
  eventsConfig(sock, saveCreds, (u) => {
    if (typeof u.connection !== "undefined") webState.connection = u.connection;
    if (typeof u.qr !== "undefined") webState.qr = u.qr;
    if (typeof u.qrAscii !== "undefined") webState.qrAscii = u.qrAscii;
  });
  const sessionDir = path.join(raiz, "sessions", "alfred-do-mago");
  const dbPath = path.join(raiz, "sessions", "alfred-do-mago.db");
  try {
    backupSessionsToSqlite(sessionDir, dbPath);
  } catch (_) {}
  setInterval(() => {
    try {
      backupSessionsToSqlite(sessionDir, dbPath);
    } catch (_) {}
  }, 15000);
}

module.exports = startSock; // necessário reiniciar caso a conexão caia (não apagar)

if (require.main === module) {
  startWebServer();
  startSock();
}

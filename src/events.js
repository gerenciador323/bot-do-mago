// libs externas
const qrcode = require("qrcode-terminal");
const mime = require("mime-types");

// libs node
const raiz = require("../root");
const fs = require("fs");
const path = require("path");

//baileys
const { DisconnectReason } = require("baileys");

// configurações
const processedMessages = new Set();
const { processResponse } = require("./utils/waitMessage");
const { db } = require("./db");
const { runAgent } = require("./agents/runner");

// debugar eventos
const { eventsAudit } = require("./utils/auditEvents");

function eventsConfig(sock, saveCreds) {
  // eventsAudit(sock);

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type === "notify" || type === "append") {
      for (const msg of messages) {
        // propriedades
        const idMensagem = msg.key.id;
        const text = (
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          ""
        )
          .trim()
          .toLowerCase();
        const from = msg.key.remoteJid;
        const fromMe = msg.key.fromMe;
        const idUnico = msg.key.participant;

        // verifica se a mensagem já foi processada
        if (processedMessages.has(idMensagem)) continue;
        processedMessages.add(idMensagem);

        // verifica se a mensagem é de um grupo
        let number;
        if (msg.key.participant) {
          number = msg.key.participantAlt.split("@")[0];
        } else if (msg.key.remoteJid && msg.key.remoteJid.includes("@")) {
          number = msg.key.remoteJid.split("@")[0];
        }

        // verifica se o texto da mensagem é válido
        if (!text || !from) continue;
        console.log(`${number}: ${text}`);

        // verifica se há resposta para a Promise
        const resolveu = processResponse(from, idUnico, text);
        if (resolveu) continue;

        switch (text) {
          case "jarvis":
            await sock.sendMessage(from, {
              text: "Olá senhor, estou aqui para servi-lo.",
            });
            break;

          case "imagem":
            const caminhoImagem = path.join(raiz, "media", "tony.jpg");
            await sock.sendMessage(from, {
              image: fs.readFileSync(caminhoImagem),
              caption: `*aqui está sua imagem senhor*`,
            });
            break;

          case "documento":
            const caminhoPDF = console.log(caminhoPDF);
            const mimeType =
              mime.lookup(caminhoPDF) || "application/octet-stream";
            await sock.sendMessage(from, {
              document: fs.readFileSync(caminhoPDF),
              fileName: path.basename(caminhoPDF),
              mimetype: mimeType,
              caption: `aqui está seu documento senhor`,
            });
            break;
        }

        if (text.startsWith("usar agente ")) {
          const nome = text.replace("usar agente ", "").trim();
          db.exec("UPDATE agents SET active=0");
          db.prepare("UPDATE agents SET active=1 WHERE name=?").run(nome);
          await sock.sendMessage(from, { text: `Agente ativo: ${nome}` });
          continue;
        }

        if (text.startsWith("agente ")) {
          const rest = text.replace("agente ", "");
          const [nome, ...p] = rest.split(":");
          const prompt = p.join(":").trim();
          const agent = db
            .prepare("SELECT id FROM agents WHERE name=?")
            .get(nome.trim());
          if (agent) {
            const r = await runAgent(agent.id, prompt);
            await sock.sendMessage(from, { text: r.answer || "" });
            continue;
          }
        }

        const active = db.prepare("SELECT id FROM agents WHERE active=1 LIMIT 1").get();
        if (active) {
          const r = await runAgent(active.id, text);
          await sock.sendMessage(from, { text: r.answer || "" });
          continue;
        }
      }
    }
  });

  // bloco de código responsável pela reconexão com o websocket
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) qrcode.generate(qr, { small: true });

    if (connection === "close") {
      // auditoria de desconexão
      // console.log("❌ Conexão encerrada. Verificando motivo...");
      // console.log(
      //   `📡 Auditoria de Desconexão: ${JSON.stringify(update, null, 2)}`
      // );
      // console.log(
      //   `📡 Auditoria de Desconexão: ${JSON.stringify(lastDisconnect, null, 2)}`
      // );

      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;

      console.log(
        "❌ conexão encerrada. ",
        shouldReconnect == true
          ? "reconectando"
          : "reconexão automática está desativada"
      );

      if (shouldReconnect) require("./main")();
    }

    if (connection === "open") {
      console.log("✅ Conectado ao WhatsApp!");
    }
  });
}

module.exports = eventsConfig;

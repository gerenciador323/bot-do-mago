const { useMultiFileAuthState } = require("baileys");
const path = require("path");
const raiz = require("../root");

async function getAuthState() {
  return await useMultiFileAuthState(
    path.join(raiz, "sessions", "jarvis-do-mago")
  );
}

module.exports = { getAuthState };

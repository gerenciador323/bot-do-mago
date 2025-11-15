const { useMultiFileAuthState } = require("baileys");
const path = require("path");
const fs = require("fs");
const raiz = require("../root");

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

async function getAuthState() {
  const oldPath = path.join(raiz, "sessions", "jarvis-do-mago");
  const newPath = path.join(raiz, "sessions", "alfred-do-mago");
  try {
    if (fs.existsSync(oldPath) && !fs.existsSync(newPath)) {
      copyDir(oldPath, newPath);
    }
  } catch (_) {}
  return await useMultiFileAuthState(newPath);
}

module.exports = { getAuthState };

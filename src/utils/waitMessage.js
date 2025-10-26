const waitingForResponse = new Map();

function waitResponse(remoteJid, participant = null, timeout = 30000) {
  const chave = participant ? `${remoteJid}:${participant}` : remoteJid;
  // console.log(`Chave Esperando: ${chave}`)

  return new Promise((resolve, reject) => {
    waitingForResponse.set(chave, resolve);

    setTimeout(() => {
      if (waitingForResponse.has(chave)) {
        waitingForResponse.delete(chave);
        //resolve(null)
        reject(new Error("⏱️ Tempo esgotado."));
      }
    }, timeout);
  });
}

function processResponse(remoteJid, participant = null, texto) {
  const chave = participant ? `${remoteJid}:${participant}` : remoteJid;
  // console.log(`Chave Resolvendo: ${chave}`)

  if (waitingForResponse.has(chave)) {
    const resolver = waitingForResponse.get(chave);
    waitingForResponse.delete(chave);
    resolver(texto);
    // console.log('Promise true')
    return true;
  }
  // console.log('Promise falso')
  return false;
}

module.exports = { waitResponse, processResponse };

function eventsAudit(sock) {
  // Auditoria de Eventos
  sock.ev.process(async (events) => {
    for (const key in events) {
      console.log(`📡 Evento detectado: ${key}`);
      //console.log(JSON.stringify(events[key], null, 2));
      eventName = "messages.upsert";
      if (key == eventName) {
        console.log(
          `event type "${eventName}" - result: ${JSON.stringify(
            events[key],
            null,
            2
          )}`
        );
      }
    }
  });
  // console.log(`Motivos de Desconexão? ${JSON.stringify(DisconnectReason, null, 2)}`) // Exibe os motivos de desconexão disponíveis
}
module.exports = { eventsAudit };

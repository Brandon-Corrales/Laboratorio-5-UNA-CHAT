// Lab 7 - Parte 2: OpenTelemetry se carga primero para instrumentar Express, HTTP y Socket.IO.
var otel = require('./otel');
// Lab 7 - Parte 1.2: Sentry (solo se activa en Vercel, donde existe SENTRY_DSN).
var Sentry = require('./instrument');
var telemetria = require('./telemetria');

// npm install para descargar los paquetes...

// libreriuas
var validation = require('./libs/unalib');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

// root: presentar html
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

// Lab 7 - Parte 2: fallo controlado para la prueba de monitoreo.
// Solo funciona con la telemetria activa (ejecucion local con .env): el mensaje "!fallo"
// provoca un error al procesarlo, que queda registrado en logs, metricas y trazas.
function esFalloControlado(msg) {
  try { return otel.habilitado && (JSON.parse(msg).mensaje || '').trim() === '!fallo'; }
  catch (e) { return false; }
}

// escuchar una conexion por socket
io.on('connection', function(socket){
  // si se escucha "chat message"
  socket.on('Evento-Mensaje-Server', function(msg){

    // Lab 7 - Parte 2: cada mensaje genera una traza con sus pasos (spans), metricas y logs.
    telemetria.tracer.startActiveSpan('chat.procesar_mensaje', function(span){
      var inicio = Date.now();
      var clase = { resultado: 'error', tipo: 'desconocido' };
      try {
        if (esFalloControlado(msg)) {
          throw new Error('Fallo controlado de prueba - Laboratorio 7');
        }

        var validado = telemetria.tracer.startActiveSpan('unalib.validateMessage', function(s){
          try { return validation.validateMessage(msg); } finally { s.end(); }
        });
        clase = telemetria.clasificar(validado);

        telemetria.tracer.startActiveSpan('socketio.emitir_mensaje', function(s){
          // volvemos a emitir el mismo mensaje
          io.emit('Evento-Mensaje-Server', validado);
          s.setAttribute('chat.clientes_conectados', io.engine.clientsCount);
          s.end();
        });

        telemetria.log(clase.resultado === 'ok' ? 'INFO' : 'WARN',
          'Mensaje procesado: resultado=' + clase.resultado + ' tipo=' + clase.tipo,
          { 'chat.resultado': clase.resultado, 'chat.tipo': clase.tipo });
      } catch (error) {
        clase = { resultado: 'error', tipo: 'fallo' };
        span.recordException(error);
        span.setStatus({ code: telemetria.api.SpanStatusCode.ERROR, message: error.message });
        telemetria.errores.add(1);
        telemetria.log('ERROR', 'Error al procesar el mensaje: ' + error.message,
          { 'chat.resultado': 'error', 'error.type': error.name });
        socket.emit('Evento-Mensaje-Server', JSON.stringify({
          nombre: 'Sistema', mensaje: 'Error al procesar el mensaje', color: '#000000'
        }));
      } finally {
        var ms = Date.now() - inicio;
        span.setAttribute('chat.resultado', clase.resultado);
        span.setAttribute('chat.tipo', clase.tipo);
        telemetria.mensajes.add(1, { resultado: clase.resultado, tipo: clase.tipo });
        telemetria.duracion.record(ms, { resultado: clase.resultado });
        span.end();
      }
    });
  });
});

// Lab 5: el servidor solo se inicia si se ejecuta directamente (npm start).
// Cuando lo importan las pruebas de integracion, la prueba lo inicia y lo cierra.
if (require.main === module) {
  http.listen(port, function(){
    console.log('listening on *:' + port);
    telemetria.log('INFO', 'UNA Chat iniciado en el puerto ' + port, { 'server.port': Number(port) });
  });
}

// Lab 7: Vercel usa la exportacion por defecto (el servidor HTTP con Socket.IO).
// Se conservan app, http e io para las pruebas de integracion.
module.exports = http;
module.exports.app = app;
module.exports.http = http;
module.exports.io = io;
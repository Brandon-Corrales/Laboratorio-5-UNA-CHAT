// Lab 7 - Parte 2: OpenTelemetry se carga primero para instrumentar Express, HTTP y Socket.IO.
var otel = require('./otel');
// Lab 7 - Parte 1.2: Sentry (solo se activa en Vercel, donde existe SENTRY_DSN).
var Sentry = require('./instrument');
var telemetria = require('./telemetria');

// npm install para descargar los paquetes...

// libreriuas
var validation = require('./libs/unalib');
// Lab 8: login con Auth0; el Client Secret se lee desde Supabase Vault al arrancar.
var authGate = require('./server/auth');
var vault = require('./server/vault');
var app = require('express')();
app.set('trust proxy', 1);
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

// root: presentar html
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

// Lab 8: rutas de inicio de sesion. Sin AUTH0_DOMAIN y AUTH0_CLIENT_ID el chat queda abierto
// (asi corren las pruebas del pipeline y el despliegue de Vercel).
app.get('/auth/config', function(req, res){
  var settings = authGate.authSettings();
  if (!settings) {
    res.json({ enabled: false });
    return;
  }
  res.json({ enabled: true, domain: settings.domain, clientId: settings.clientId });
});

app.get('/auth/login', function(req, res){
  if (!authGate.authSettings()) {
    res.status(404).json({ error: 'Login is disabled.' });
    return;
  }
  authGate.beginLogin(req, res);
});

app.get('/auth/callback', function(req, res){
  if (!authGate.authSettings()) {
    res.redirect('/');
    return;
  }
  authGate.finishLogin(req, res);
});

app.get('/auth/logout', function(req, res){
  authGate.logout(req, res);
});

app.get('/sala', function(req, res){
  if (!authGate.authSettings()) {
    res.json({ enabled: false });
    return;
  }
  authGate.readSession(req, res);
});

// Lab 8: con Auth0 activo, solo se conectan al chat los sockets con una sesion valida.
io.use(function(socket, next){
  if (!authGate.authSettings()) {
    next();
    return;
  }
  authGate.authorizeSocket(socket, next);
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

        // Lab 8: con sesion iniciada, el nombre del mensaje es el del usuario de Auth0.
        if (socket.data && socket.data.user && socket.data.user.name) {
          msg = authGate.stampSender(msg, socket.data.user.name);
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

// Lab 8: antes de abrir el puerto se lee el Client Secret desde Supabase Vault
// y se comprueba contra Auth0. Si falla, el servidor no arranca.
function boot() {
  if (!authGate.authSettings()) return Promise.resolve();
  if (process.env.AUTH0_CLIENT_SECRET) {
    console.warn('AUTH0_CLIENT_SECRET is set and is ignored. The client secret is loaded from Supabase Vault.');
  }
  return vault.loadAuth0ClientSecret().then(function(secret){
    return authGate.initAuth0(secret).catch(function(err){
      var message = err && err.message ? String(err.message) : '';
      if (message.indexOf('Auth0 ') === 0 && message.length < 120) throw new Error(message);
      throw new Error(vault.redact(message, secret));
    });
  });
}

// Lab 5: el servidor solo se inicia si se ejecuta directamente (npm start).
// Cuando lo importan las pruebas de integracion, la prueba lo inicia y lo cierra.
if (require.main === module) {
  boot().then(function(){
    http.listen(port, function(){
      console.log('listening on *:' + port);
      telemetria.log('INFO', 'UNA Chat iniciado en el puerto ' + port, { 'server.port': Number(port) });
    });
  }).catch(function(err){
    console.error(err && err.message ? err.message : 'Auth0 startup failed.');
    process.exit(1);
  });
}

// Lab 7: Vercel usa la exportacion por defecto (el servidor HTTP con Socket.IO).
// Se conservan app, http e io para las pruebas de integracion.
module.exports = http;
module.exports.app = app;
module.exports.http = http;
module.exports.io = io;
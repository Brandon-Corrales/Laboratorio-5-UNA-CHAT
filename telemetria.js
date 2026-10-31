// Lab 7 - Parte 2: utilidades de telemetria del chat (trazas, metricas y logs).
// Usa la API de OpenTelemetry: si el SDK no esta activo (Vercel, Render, pruebas),
// todas estas llamadas no hacen nada y el chat funciona igual.
var api = require('@opentelemetry/api');
var apiLogs = require('@opentelemetry/api-logs');

var tracer = api.trace.getTracer('una-chat');
var meter = api.metrics.getMeter('una-chat');
var logger = apiLogs.logs.getLogger('una-chat');

// Metricas de los mensajes del chat
var mensajes = meter.createCounter('chat_mensajes', {
  description: 'Mensajes del chat procesados, por resultado y tipo',
});
var errores = meter.createCounter('chat_mensajes_error', {
  description: 'Mensajes del chat que fallaron al procesarse',
});
var duracion = meter.createHistogram('chat_mensaje_duracion', {
  description: 'Tiempo de procesamiento de un mensaje del chat',
  unit: 'ms',
});

var NIVELES = {
  INFO: apiLogs.SeverityNumber.INFO,
  WARN: apiLogs.SeverityNumber.WARN,
  ERROR: apiLogs.SeverityNumber.ERROR,
};

// Envia un log a Grafana (Loki) y lo muestra en la consola.
// Si se llama dentro de un span activo, el log lleva su trace_id y span_id.
function log(nivel, mensaje, atributos) {
  logger.emit({
    severityNumber: NIVELES[nivel] || NIVELES.INFO,
    severityText: nivel,
    body: mensaje,
    attributes: atributos || {},
  });
  var span = api.trace.getActiveSpan();
  var traza = span ? ' trace_id=' + span.spanContext().traceId : '';
  console.log('[' + nivel + '] ' + mensaje + traza);
}

// Clasifica el resultado de validateMessage sin guardar el contenido del mensaje.
function clasificar(validadoJson) {
  var texto = '';
  try { texto = JSON.parse(validadoJson).mensaje || ''; } catch (e) { return { resultado: 'rechazado', tipo: 'formato_invalido' }; }
  if (texto.indexOf('<img') === 0) return { resultado: 'ok', tipo: 'imagen' };
  if (texto.indexOf('<iframe') === 0) return { resultado: 'ok', tipo: 'video' };
  if (texto.indexOf('Mensaje bloqueado') === 0) return { resultado: 'rechazado', tipo: 'script_bloqueado' };
  if (texto.indexOf('URL no permitida') === 0) return { resultado: 'rechazado', tipo: 'url_no_permitida' };
  if (texto.indexOf('Mensaje demasiado largo') === 0) return { resultado: 'rechazado', tipo: 'demasiado_largo' };
  if (texto.indexOf('Mensaje con formato invalido') === 0) return { resultado: 'rechazado', tipo: 'formato_invalido' };
  return { resultado: 'ok', tipo: 'texto' };
}

module.exports = {
  api: api,
  tracer: tracer,
  mensajes: mensajes,
  errores: errores,
  duracion: duracion,
  log: log,
  clasificar: clasificar,
};
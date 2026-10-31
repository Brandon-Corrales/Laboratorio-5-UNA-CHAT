// Lab 7 - Parte 2: OpenTelemetry (logs, metricas y trazas) hacia Grafana Cloud por OTLP/HTTP.
// Este archivo se carga antes que cualquier otro modulo de la aplicacion.
// Solo se activa si OTEL_EXPORTER_OTLP_ENDPOINT tiene valor (archivo .env local).
// En Vercel, en Render, en GitHub Actions y en las pruebas automaticas queda apagado.
require('dotenv').config({ quiet: true });

var endpoint = (process.env.OTEL_EXPORTER_OTLP_ENDPOINT || '').trim();
var habilitado = endpoint !== '' && process.env.NODE_ENV !== 'test';

function entorno() {
  var m = /(?:^|,)\s*deployment\.environment=([^,]+)/.exec(process.env.OTEL_RESOURCE_ATTRIBUTES || '');
  return m ? m[1].trim() : 'local';
}

if (habilitado) {
  var NodeSDK = require('@opentelemetry/sdk-node').NodeSDK;
  var getNodeAutoInstrumentations = require('@opentelemetry/auto-instrumentations-node').getNodeAutoInstrumentations;
  var OTLPTraceExporter = require('@opentelemetry/exporter-trace-otlp-proto').OTLPTraceExporter;
  var OTLPMetricExporter = require('@opentelemetry/exporter-metrics-otlp-proto').OTLPMetricExporter;
  var OTLPLogExporter = require('@opentelemetry/exporter-logs-otlp-proto').OTLPLogExporter;
  var PeriodicExportingMetricReader = require('@opentelemetry/sdk-metrics').PeriodicExportingMetricReader;
  var sdkLogs = require('@opentelemetry/sdk-logs');
  var apiLogs = require('@opentelemetry/api-logs');
  var resourceFromAttributes = require('@opentelemetry/resources').resourceFromAttributes;

  var servicio = process.env.OTEL_SERVICE_NAME || 'una-chat-api';
  var hostGateway = new URL(endpoint).host;

  var recurso = resourceFromAttributes({
    'service.name': servicio,
    'deployment.environment': entorno(),
    'deployment.environment.name': entorno(),
  });

  // Trazas y metricas: las gestiona el SDK de Node.
  // Los exportadores leen el endpoint, los headers y el protocolo de las variables OTEL_*
  // y agregan /v1/traces y /v1/metrics al endpoint.
  var sdk = new NodeSDK({
    resource: recurso,
    traceExporter: new OTLPTraceExporter(),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter(),
      exportIntervalMillis: 10000,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // No se trazan las llamadas al propio gateway de Grafana (evita un bucle).
        '@opentelemetry/instrumentation-http': {
          ignoreIncomingRequestHook: function (req) { return (req.url || '').indexOf('/otlp') === 0; },
          ignoreOutgoingRequestHook: function (req) { return (req.hostname || req.host || '').indexOf(hostGateway.split(':')[0]) === 0; },
        },
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-dns': { enabled: false },
        '@opentelemetry/instrumentation-net': { enabled: false },
        // Los mensajes del chat se trazan manualmente en server.js.
        '@opentelemetry/instrumentation-socket.io': { enabled: false },
      }),
    ],
  });
  sdk.start();

  // Logs: el proveedor se crea y se registra manualmente para garantizar que los logs
  // se envien a Grafana (Loki) por /v1/logs, con el trace_id del span activo.
  var proveedorLogs = new sdkLogs.LoggerProvider({
    resource: recurso,
    processors: [new sdkLogs.BatchLogRecordProcessor({ exporter: new OTLPLogExporter() })],
  });
  apiLogs.logs.setGlobalLoggerProvider(proveedorLogs);

  console.log('[otel] Telemetria activa: servicio=' + servicio + ' entorno=' + entorno() + ' destino=' + hostGateway);

  // Al detener el chat (Ctrl + C o docker stop) se envian los datos pendientes.
  var cerrar = function () {
    Promise.all([sdk.shutdown(), proveedorLogs.shutdown()])
      .catch(function () {})
      .then(function () { process.exit(0); });
  };
  process.once('SIGINT', cerrar);
  process.once('SIGTERM', cerrar);
}

module.exports = { habilitado: habilitado };
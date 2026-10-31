// Lab 7 - Parte 1.2: inicializa Sentry para registrar errores.
// Solo se activa si existe la variable SENTRY_DSN (configurada unicamente en Vercel).
// En local, en las pruebas y en Render queda desactivado. El DSN no se guarda en el codigo.
const Sentry = require('@sentry/node');

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV ? 'vercel-' + process.env.VERCEL_ENV : 'local',
    release: process.env.VERCEL_GIT_COMMIT_SHA,
  });
}

module.exports = Sentry;
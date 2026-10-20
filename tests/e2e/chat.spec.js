// Pruebas end-to-end del Laboratorio 5 (UNA Chat) con Playwright
// Recorren el flujo completo: navegador -> frontend -> Socket.IO -> backend -> una-lib -> navegador.

const { test, expect } = require('@playwright/test');

const IMAGEN = 'https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png';
const VIDEO = 'https://www.youtube.com/watch?v=qYwlqx-JLok';
const SCRIPT = "<script>alert('Inyección de script');</script>";

// Llena el formulario del chat y envia el mensaje
async function enviarMensaje(page, nombre, mensaje) {
  await page.getByRole('textbox', { name: 'Username' }).fill(nombre);
  await page.getByRole('textbox', { name: 'Escriba un mensaje' }).fill(mensaje);
  await page.getByRole('button', { name: 'Send' }).click();
}

// El servidor reenvia cada mensaje a todos los navegadores conectados,
// por eso cada prueba usa un nombre unico y busca solo su propio mensaje.
function mensajeDe(page, nombre) {
  return page.locator('#messages li', { hasText: nombre });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Chat Socket.IO UNA');
});

test('enviar una URL de imagen muestra la imagen y termina de cargarla', async ({ page }) => {
  const nombre = 'e2e-imagen-' + Date.now();
  await enviarMensaje(page, nombre, IMAGEN);

  const imagen = mensajeDe(page, nombre).locator('img');
  await expect(imagen).toBeVisible();
  await expect(imagen).toHaveAttribute('src', IMAGEN);
  // la imagen termino de descargarse y tiene dimensiones reales
  await expect
    .poll(() => imagen.evaluate((img) => img.complete && img.naturalWidth > 0), { timeout: 15000 })
    .toBe(true);
});

test('enviar una URL de video muestra el reproductor y carga el contenido', async ({ page }) => {
  const nombre = 'e2e-video-' + Date.now();
  await enviarMensaje(page, nombre, VIDEO);

  const reproductor = mensajeDe(page, nombre).locator('iframe');
  await expect(reproductor).toBeVisible();
  await expect(reproductor).toHaveAttribute('src', 'https://www.youtube.com/embed/qYwlqx-JLok');
  // dentro del iframe se cargo el reproductor de YouTube sin error
  const contenido = reproductor.contentFrame();
  await expect(contenido.locator('.html5-video-player')).toBeVisible({ timeout: 20000 });
  await expect(contenido.locator('.ytp-error')).toBeHidden();
});

test('enviar el script del paso 2 no ejecuta el alert y el mensaje se bloquea', async ({ page }) => {
  const nombre = 'e2e-script-' + Date.now();

  // se registra ANTES del envio: si aparece cualquier alert, queda anotado y la prueba falla
  const dialogos = [];
  page.on('dialog', async (dialogo) => {
    dialogos.push(dialogo.message());
    await dialogo.dismiss();
  });

  await enviarMensaje(page, nombre, SCRIPT);

  const mensaje = mensajeDe(page, nombre);
  await expect(mensaje).toContainText('Mensaje bloqueado: contenido no permitido');
  await expect(mensaje.locator('script')).toHaveCount(0);
  expect(dialogos, 'El script no debe ejecutar ningun alert').toEqual([]);
});
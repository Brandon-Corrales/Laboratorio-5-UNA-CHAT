// Pruebas unitarias del Laboratorio 5 (UNA Chat)
// Cubren: URLs de imagenes, URLs de videos y prevencion de inyeccion de scripts.

var val = require('../libs/unalib');
var assert = require('assert');

// arma el mensaje igual que el frontend y devuelve el objeto ya validado por el backend
function enviar(mensaje, nombre, color) {
  var entrada = JSON.stringify({
    nombre: nombre === undefined ? 'Brandon' : nombre,
    mensaje: mensaje,
    color: color === undefined ? '#AA00CC' : color
  });
  return JSON.parse(val.validateMessage(entrada));
}

// validateMessage escribe mensajes con console.log ("Es una imagen!", etc.);
// se silencian durante estas pruebas para que la salida muestre solo los resultados
var logOriginal = console.log;
before(function () { console.log = function () {}; });
after(function () { console.log = logOriginal; });

describe('Lab 5 - Validacion de URLs de imagenes', function () {

  it('acepta una URL https de imagen .png', function () {
    assert.strictEqual(val.is_valid_url_image('https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png'), true);
  });

  it('acepta una URL de imagen .jpeg con parametros', function () {
    assert.strictEqual(val.is_valid_url_image('https://example.com/fotos/gato.jpeg?size=large'), true);
  });

  it('rechaza una URL que no es de imagen (.pdf)', function () {
    assert.strictEqual(val.is_valid_url_image('https://example.com/documento.pdf'), false);
  });

  it('rechaza una imagen sin protocolo http/https', function () {
    assert.strictEqual(val.is_valid_url_image('ftp://example.com/imagen.png'), false);
  });

  it('rechaza una URL de imagen con comillas para inyectar atributos', function () {
    assert.strictEqual(val.is_valid_url_image('http://a.com/a.jpg" onerror="alert(1)'), false);
  });

  it('validateMessage muestra la imagen con una etiqueta <img> y la URL correcta', function () {
    var url = 'https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png';
    var r = enviar(url);
    assert.ok(r.mensaje.indexOf('<img src="' + url + '"') === 0);
  });

});

describe('Lab 5 - Validacion de URLs de videos', function () {

  it('acepta una URL de YouTube con watch?v=', function () {
    assert.strictEqual(val.is_valid_yt_video('https://www.youtube.com/watch?v=qYwlqx-JLok'), true);
  });

  it('acepta una URL corta de YouTube (youtu.be)', function () {
    assert.strictEqual(val.is_valid_yt_video('https://youtu.be/qYwlqx-JLok'), true);
  });

  it('rechaza una URL de YouTube sin id de video', function () {
    assert.strictEqual(val.is_valid_yt_video('https://www.youtube.com/watch?v='), false);
  });

  it('rechaza una URL que no es de YouTube', function () {
    assert.strictEqual(val.is_valid_yt_video('https://vimeo.com/123456'), false);
  });

  it('validateMessage integra el reproductor (iframe) con la URL embed correcta', function () {
    var r = enviar('https://www.youtube.com/watch?v=qYwlqx-JLok');
    assert.ok(r.mensaje.indexOf('<iframe') === 0);
    assert.ok(r.mensaje.indexOf('src="https://www.youtube.com/embed/qYwlqx-JLok"') > -1);
  });

});

describe('Lab 5 - Prevencion de inyeccion de scripts', function () {

  it('detecta la etiqueta <script> del paso 2', function () {
    assert.strictEqual(val.is_script_injection("<script>alert('Inyección de script');</script>"), true);
  });

  it('detecta una etiqueta <img> con onerror', function () {
    assert.strictEqual(val.is_script_injection('<img src=x onerror=alert(1)>'), true);
  });

  it('detecta el protocolo javascript:', function () {
    assert.strictEqual(val.is_script_injection('javascript:alert(1)'), true);
  });

  it('no marca como inyeccion un texto normal', function () {
    assert.strictEqual(val.is_script_injection('Hola, como estan?'), false);
  });

  it('validateMessage bloquea el script y no devuelve la etiqueta <script>', function () {
    var r = enviar("<script>alert('Inyección de script');</script>");
    assert.strictEqual(r.mensaje, 'Mensaje bloqueado: contenido no permitido');
    assert.strictEqual(r.mensaje.indexOf('<script'), -1);
  });

  it('validateMessage escapa el HTML en el nombre de usuario', function () {
    var r = enviar('Hola', '<b onmouseover=alert(1)>X</b>');
    assert.strictEqual(r.nombre.indexOf('<'), -1);
    assert.ok(r.nombre.indexOf('&lt;b') === 0);
  });

  it('validateMessage reemplaza un color manipulado por #000000', function () {
    var r = enviar('Hola', 'Brandon', "red'><script>alert(1)</script>");
    assert.strictEqual(r.color, '#000000');
  });

  it('validateMessage rechaza una URL que no es imagen ni video', function () {
    var r = enviar('https://www.google.com');
    assert.strictEqual(r.mensaje, 'URL no permitida: solo se aceptan imagenes o videos');
  });

  it('validateMessage escapa los caracteres especiales de un texto normal', function () {
    var r = enviar('5 > 3 & 2 < 4');
    assert.strictEqual(r.mensaje, '5 &gt; 3 &amp; 2 &lt; 4');
  });

  it('validateMessage no devuelve el mensaje original si el JSON es invalido', function () {
    var r = JSON.parse(val.validateMessage('{"mensaje": "<script>alert(1)</script>"'));
    assert.strictEqual(r.mensaje, 'Mensaje con formato invalido');
  });

});

describe('OpenSpec - Limite de longitud de mensajes', function () {

  it('acepta un mensaje de exactamente 500 caracteres', function () {
    var texto = 'a'.repeat(500);
    var r = enviar(texto);
    assert.strictEqual(r.mensaje, texto);
  });

  it('rechaza un mensaje de 501 caracteres', function () {
    var r = enviar('a'.repeat(501));
    assert.strictEqual(r.mensaje, 'Mensaje demasiado largo: maximo 500 caracteres');
  });

  it('rechaza un script largo por longitud sin devolver la etiqueta <script>', function () {
    var r = enviar('<script>alert(1)</script>' + 'a'.repeat(600));
    assert.strictEqual(r.mensaje, 'Mensaje demasiado largo: maximo 500 caracteres');
    assert.strictEqual(r.mensaje.indexOf('<script'), -1);
  });

});
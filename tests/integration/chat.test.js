// Pruebas de integracion del Laboratorio 5 (UNA Chat)
// Verifican que el backend Node.js (Express + Socket.IO) y la libreria una-lib trabajan juntos.

const request = require('supertest');
const { io: ioClient } = require('socket.io-client');
const unalib = require('../../libs/unalib');
const { app, http, io } = require('../../server');

const EVENTO = 'Evento-Mensaje-Server';
let url;
let spyValidar;

// Envia un mensaje por el evento real de Socket.IO y espera la respuesta del servidor
function enviarPorSocket(datos) {
  return new Promise((resolve, reject) => {
    const cliente = ioClient(url, { transports: ['websocket'], forceNew: true, reconnection: false });
    const limite = setTimeout(() => {
      cliente.disconnect();
      reject(new Error('El servidor no respondio a tiempo'));
    }, 5000);

    cliente.on('connect', () => {
      cliente.emit(EVENTO, JSON.stringify(datos));
    });
    cliente.on(EVENTO, (respuesta) => {
      clearTimeout(limite);
      cliente.disconnect();
      resolve(JSON.parse(respuesta));
    });
    cliente.on('connect_error', (error) => {
      clearTimeout(limite);
      cliente.disconnect();
      reject(error);
    });
  });
}

beforeAll((done) => {
  // se silencian los console.log del servidor ("Es una imagen!", etc.)
  jest.spyOn(console, 'log').mockImplementation(() => {});
  // se inicia el servidor real en un puerto libre
  http.listen(0, '127.0.0.1', () => {
    url = 'http://127.0.0.1:' + http.address().port;
    done();
  });
});

beforeEach(() => {
  // espia sobre validateMessage de una-lib para comprobar que el backend la llama
  spyValidar = jest.spyOn(unalib, 'validateMessage');
});

afterEach(() => {
  spyValidar.mockRestore();
});

afterAll((done) => {
  console.log.mockRestore();
  // cierra Socket.IO y el servidor HTTP que abrio la prueba
  io.close(() => done());
});

describe('Integracion backend Node.js + una-lib', () => {

  test('GET / responde 200 y entrega el frontend del chat (Supertest)', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toContain('Chat Socket.IO UNA');
    expect(res.text).toContain(EVENTO);
  });

  test('URL de imagen valida: el backend acepta el mensaje y devuelve la etiqueta <img>', async () => {
    const imagen = 'https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png';
    const datos = { nombre: 'Brandon', mensaje: imagen, color: '#AA00CC' };

    const respuesta = await enviarPorSocket(datos);

    expect(spyValidar).toHaveBeenCalledWith(JSON.stringify(datos));
    expect(respuesta.mensaje).toBe('<img src="' + imagen + '" style="max-height: 400px;max-width: 400px;">');
    expect(respuesta.nombre).toBe('Brandon');
  });

  test('URL de video valida: el backend acepta el mensaje y devuelve el reproductor <iframe>', async () => {
    const datos = { nombre: 'Brandon', mensaje: 'https://www.youtube.com/watch?v=qYwlqx-JLok', color: '#AA00CC' };

    const respuesta = await enviarPorSocket(datos);

    expect(spyValidar).toHaveBeenCalledWith(JSON.stringify(datos));
    expect(respuesta.mensaje).toContain('<iframe');
    expect(respuesta.mensaje).toContain('src="https://www.youtube.com/embed/qYwlqx-JLok"');
  });

  test('Script: la validacion rechaza la inyeccion y no devuelve la etiqueta <script>', async () => {
    const datos = { nombre: 'Brandon', mensaje: "<script>alert('Inyección de script');</script>", color: '#AA00CC' };

    const respuesta = await enviarPorSocket(datos);

    expect(spyValidar).toHaveBeenCalledWith(JSON.stringify(datos));
    expect(respuesta.mensaje).toBe('Mensaje bloqueado: contenido no permitido');
    expect(JSON.stringify(respuesta)).not.toContain('<script');
  });

  test('URL no permitida: la validacion rechaza una URL que no es imagen ni video', async () => {
    const datos = { nombre: 'Brandon', mensaje: 'https://www.google.com', color: '#AA00CC' };

    const respuesta = await enviarPorSocket(datos);

    expect(spyValidar).toHaveBeenCalledWith(JSON.stringify(datos));
    expect(respuesta.mensaje).toBe('URL no permitida: solo se aceptan imagenes o videos');
  });

});
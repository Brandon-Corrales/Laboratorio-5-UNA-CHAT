
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

// escuchar una conexion por socket
io.on('connection', function(socket){
  // si se escucha "chat message"
  socket.on('Evento-Mensaje-Server', function(msg){

    msg =  validation.validateMessage(msg);
    // volvemos a emitir el mismo mensaje
    io.emit('Evento-Mensaje-Server', msg);
  });
});

// Lab 5: el servidor solo se inicia si se ejecuta directamente (npm start).
// Cuando lo importan las pruebas de integracion, la prueba lo inicia y lo cierra.
if (require.main === module) {
  http.listen(port, function(){
    console.log('listening on *:' + port);
  });
}

// Lab 7: Vercel usa la exportacion por defecto (el servidor HTTP con Socket.IO).
// Se conservan app, http e io para las pruebas de integracion.
module.exports = http;
module.exports.app = app;
module.exports.http = http;
module.exports.io = io;
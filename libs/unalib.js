// modulo de ejemplo.

module.exports = {


    // logica que valida si un telefono esta correcto...
    is_valid_phone: function (phone) {
      // inicializacion lazy
      var isValid = false;
      // expresion regular copiada de StackOverflow
      var re = /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/i;

      // validacion Regex
      try {
        isValid = re.test(phone);
      } catch (e) {
        console.log(e);
      } finally {
          return isValid;
      }
      // fin del try-catch block
    },

    is_valid_url_image: function (url) {

      // inicializacion lazy
      var isValid = false;
      // Lab 5: la URL completa (^...$) debe ser http/https y terminar en una extension de imagen.
      // No se permiten espacios, comillas, < > ni ` para que la URL no pueda romper el atributo src.
      var re = /^https?:\/\/[^\s"'<>`]+\.(?:jpg|jpeg|png|gif|bmp|webp)(?:\?[^\s"'<>`]*)?$/i;

      // validacion Regex
      try {
        isValid = typeof url === 'string' && re.test(url);
      } catch (e) {
        console.log(e);
      } finally {
          return isValid;
      }
      // fin del try-catch block
    },

    is_valid_yt_video: function (url) {

      // inicializacion lazy
      var isValid = false;
      // Lab 5: el id del video (11 caracteres) es obligatorio y no se permiten espacios, comillas, < > ni `
      var re = /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?[^\s"'<>`]+&v=))((\w|-){11})$/i;

      // validacion Regex
      try {
        isValid = typeof url === 'string' && re.test(url);
      } catch (e) {
        console.log(e);
      } finally {
          return isValid;
      }
      // fin del try-catch block
    },

    // Lab 5: detecta intentos de inyeccion de scripts o HTML.
    // - cualquier etiqueta HTML: < seguido de letra, / o ! (ej. <script>, </div>, <img ...>, <!-- -->)
    // - el protocolo javascript:
    // - manejadores de eventos como onerror= u onload=
    is_script_injection: function (texto) {
      if (typeof texto !== 'string') {
        return false;
      }
      var reEtiqueta = /<\s*[a-z\/!]/i;
      var reJavascript = /javascript\s*:/i;
      var reEvento = /\bon[a-z]+\s*=/i;
      return reEtiqueta.test(texto) || reJavascript.test(texto) || reEvento.test(texto);
    },

    // Lab 5: detecta si el texto contiene una URL (http, https o www.)
    contains_url: function (texto) {
      return typeof texto === 'string' && /(https?:\/\/|www\.)\S+/i.test(texto);
    },

    // Lab 5: convierte los caracteres especiales de HTML en texto plano para que el navegador no los ejecute
    escapeHtml: function (texto) {
      return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/`/g, '&#96;');
    },

    // Lab 5: solo se acepta un color hexadecimal (#RRGGBB); cualquier otro valor se reemplaza
    sanitizeColor: function (color) {
      return (typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)) ? color : '#000000';
    },

    getYTVideoId: function(url){

      // Lab 5: solo se extrae un id valido de 11 caracteres (letras, numeros, _ o -)
      return url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?[^\s"'<>`]+&v=))([\w-]{11})/i)[1];
    },

    getEmbeddedCode: function (url){
      var id = this.getYTVideoId(url);
      var code = '<iframe width="560" height="315" src="https://www.youtube.com/embed/'+id+ '" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
      return code;
    },

    getImageTag: function(url){
      var tag = '<img src="'+url+'" style="max-height: 400px;max-width: 400px;">';
      return tag;
    },

    validateMessage: function(msg){
      // Handle invalid input
      if (!msg || typeof msg !== 'string') {
        return JSON.stringify({ mensaje: '' });
      }

      try {
        var obj = JSON.parse(msg);

        // Lab 5: se construye un objeto nuevo solo con los campos esperados (se descarta cualquier otro)
        var nombre = (obj && typeof obj.nombre === 'string') ? obj.nombre.trim().substring(0, 30) : '';
        var mensaje = (obj && typeof obj.mensaje === 'string') ? obj.mensaje.trim() : '';
        var limpio = {
          nombre: this.escapeHtml(nombre || 'Anonimo'),
          mensaje: '',
          color: this.sanitizeColor(obj && obj.color)
        };

        if (this.is_script_injection(mensaje)) {
          // Lab 5: se detecta el intento de inyeccion y se bloquea el mensaje
          console.log("Inyeccion de script bloqueada!");
          limpio.mensaje = 'Mensaje bloqueado: contenido no permitido';
        }
        else if (this.is_valid_url_image(mensaje)) {
          console.log("Es una imagen!");
          limpio.mensaje = this.getImageTag(mensaje);
        }
        else if (this.is_valid_yt_video(mensaje)) {
          console.log("Es un video!");
          limpio.mensaje = this.getEmbeddedCode(mensaje);
        }
        else if (this.contains_url(mensaje)) {
          // Lab 5: solo se permiten URLs de imagenes o videos
          console.log("URL no permitida!");
          limpio.mensaje = 'URL no permitida: solo se aceptan imagenes o videos';
        }
        else {
          console.log("Es un texto!");
          // Lab 5: el texto normal se envia escapado
          limpio.mensaje = this.escapeHtml(mensaje);
        }

        return JSON.stringify(limpio);
      } catch (e) {
        console.log('Error processing message:', e);
        // Lab 5: ya no se devuelve el mensaje original sin validar
        return JSON.stringify({ nombre: 'Sistema', mensaje: 'Mensaje con formato invalido', color: '#000000' });
      }
    }

  // fin del modulo
  };
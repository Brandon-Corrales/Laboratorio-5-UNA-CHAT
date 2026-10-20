# Proposal

## Why

UNA Chat valida el contenido de los mensajes (bloquea scripts y solo permite URLs de imágenes o videos), pero no limita su tamaño. Un usuario puede enviar mensajes enormes que el servidor procesa con expresiones regulares y reenvía a todos los clientes conectados, lo que permite saturar el chat (denegación de servicio) y degradar la experiencia de los demás usuarios.

## What Changes

- `validateMessage` en `libs/unalib.js` rechazará los mensajes de más de 500 caracteres y devolverá el aviso "Mensaje demasiado largo: maximo 500 caracteres" en lugar del contenido.
- El límite se define en la constante `MAX_LONGITUD_MENSAJE` de la librería una-lib.
- El campo de mensaje de `index.html` tendrá `maxlength="500"` para avisar al usuario desde el navegador; el control real se mantiene en el servidor.
- Se agregan pruebas unitarias para el límite de longitud.

## Capabilities

### New Capabilities
- `validacion-mensajes`: reglas que aplica el backend de UNA Chat para validar cada mensaje antes de reenviarlo a los usuarios conectados.

### Modified Capabilities

## Impact

- Código: `libs/unalib.js` (método `validateMessage`) e `index.html` (campo de mensaje).
- Pruebas: `test/lab5.test.js`.
- Sin nuevas dependencias ni cambios en el protocolo de Socket.IO.
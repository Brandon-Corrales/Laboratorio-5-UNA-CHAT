# Design

## Context

UNA Chat recibe los mensajes por el evento de Socket.IO `Evento-Mensaje-Server`. El servidor los valida con `validateMessage` de `libs/unalib.js` y los reenvia con `io.emit` a todos los clientes conectados. La validacion actual bloquea scripts y URLs no permitidas, pero no controla el tamano del texto.

## Goals / Non-Goals

**Goals:**
- Rechazar en el servidor los mensajes de mas de 500 caracteres.
- Informar al usuario con un aviso claro en el chat.
- Limitar la escritura desde el navegador como ayuda visual.

**Non-Goals:**
- Limitar la cantidad de mensajes por segundo (rate limiting).
- Cambiar el formato del mensaje o el protocolo de Socket.IO.

## Decisions

- **Validar en el servidor, dentro de `validateMessage`:** es el unico punto que un atacante no puede saltarse; el `maxlength` del navegador se puede quitar desde las herramientas de desarrollo.
- **Revisar la longitud antes que las demas validaciones:** asi un texto enorme se descarta sin ejecutar sobre el las expresiones regulares de scripts y URLs.
- **Limite de 500 caracteres en la constante `MAX_LONGITUD_MENSAJE`:** alcanza para mensajes de chat y URLs de imagenes o videos, y queda en un solo lugar para ajustarlo.
- **Reemplazar el contenido por un aviso en lugar de cortarlo:** cortar el texto podria dejar etiquetas o URLs incompletas.

## Risks / Trade-offs

- Un mensaje legitimo de mas de 500 caracteres se rechaza completo -> el usuario recibe el aviso y el `maxlength` evita que lo escriba desde el navegador.
- El limite no evita que un usuario envie muchos mensajes cortos seguidos -> fuera del alcance de este cambio.
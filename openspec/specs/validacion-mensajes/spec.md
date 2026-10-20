# validacion-mensajes Specification

## Purpose
Reglas que aplica el backend de UNA Chat para validar cada mensaje antes de reenviarlo a los usuarios conectados.

## Requirements

### Requirement: Longitud maxima del mensaje
El sistema SHALL rechazar todo mensaje cuyo texto, sin espacios al inicio ni al final, supere los 500 caracteres, y SHALL reemplazar su contenido por el aviso "Mensaje demasiado largo: maximo 500 caracteres" antes de reenviarlo a los usuarios conectados.

#### Scenario: Mensaje dentro del limite
- **WHEN** un usuario envia un mensaje de 500 caracteres o menos
- **THEN** el mensaje continua con las demas validaciones y se muestra normalmente en el chat

#### Scenario: Mensaje que supera el limite
- **WHEN** un usuario envia un mensaje de 501 caracteres o mas
- **THEN** el chat muestra "Mensaje demasiado largo: maximo 500 caracteres" en lugar del contenido enviado

#### Scenario: Script que supera el limite
- **WHEN** un usuario envia un script de mas de 500 caracteres
- **THEN** el mensaje se rechaza por longitud y la respuesta no contiene la etiqueta script

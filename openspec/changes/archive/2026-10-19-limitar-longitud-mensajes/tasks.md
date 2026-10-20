# Tasks

## 1. Implementacion

- [x] 1.1 Agregar la constante MAX_LONGITUD_MENSAJE con valor 500 en libs/unalib.js (verificar que el modulo la exporta)
- [x] 1.2 Rechazar en validateMessage los mensajes de mas de 500 caracteres antes de las demas validaciones (verificar enviando un texto de 501 caracteres en el chat)
- [x] 1.3 Agregar maxlength="500" al campo de mensaje en index.html (verificar que el campo no permite escribir mas de 500 caracteres)

## 2. Pruebas

- [x] 2.1 Agregar pruebas unitarias del limite de longitud en test/lab5.test.js (verificar con npm test: 29 passing)
- [x] 2.2 Ejecutar las suites de integracion y end-to-end (verificar 5 passed y 3 passed)
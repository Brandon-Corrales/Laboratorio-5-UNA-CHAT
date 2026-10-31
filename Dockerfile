# Lab 7 - Parte 3: imagen de UNA Chat con Node.js
FROM node:24-alpine

WORKDIR /app

# Se instalan solo las dependencias de produccion, con las versiones exactas del package-lock.json
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Codigo de la aplicacion (.dockerignore excluye .env, node_modules y las pruebas)
COPY . .

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# El contenedor no se ejecuta como root
USER node

# Comando de inicio definido en package.json ("start": "node server.js")
CMD ["npm", "start"]
FROM node:22.8

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY server.js .
COPY runMigrations.js .
COPY migrations ./migrations

EXPOSE 443

CMD ["node", "server.js"]
